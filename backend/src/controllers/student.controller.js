import Student from '../models/Student.js';
import Room from '../models/Room.js';
import Complaint from '../models/Complaint.js';
import Outpass from '../models/Outpass.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Get student profile
 *
 * GET /api/v1/student/profile
 *
 * Finds the Student document linked to the authenticated user.
 * Returns full profile data (personal, academic, hostel, guardian).
 */
export const getProfile = async (req, res, next) => {
  try {
    // req.user.id was set by requireAuth middleware
    // It contains the User document's _id
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    sendSuccess(res, 200, 'Profile retrieved successfully', { student });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student profile
 *
 * PUT /api/v1/student/profile
 *
 * Updates ONLY the fields that are present in req.body.
 * req.body has already been validated and cleaned by Zod middleware.
 * Fields not in the Zod schema are automatically stripped.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    // Get the validated data from req.body
    // Zod has already stripped any unauthorized fields
    const updates = req.body;

    // Handle guardian nested object separately
    // If updates include guardian, we need to MERGE with existing
    // not replace the entire guardian object
    if (updates.guardian) {
      // Object.assign merges properties
      // Existing guardian: { name: "Mom", phone: "123" }
      // Update: { guardian: { phone: "456" } }
      // Result: { name: "Mom", phone: "456" }  ← name preserved!
      student.guardian = {
        ...student.guardian.toObject(),
        // .toObject() converts Mongoose subdocument to plain JS object
        // Required because Mongoose subdocuments have special prototype
        ...updates.guardian,
      };
      delete updates.guardian;
      // Remove from updates so it doesn't get set again below
    }

    // Apply remaining updates
    // Object.keys gives us an array of the field names in updates
    // We loop through and set each one on the student document
    Object.keys(updates).forEach((key) => {
      student[key] = updates[key];
    });

    // If name was updated, also update the User document
    // Keep name in sync between User and Student
    if (updates.name) {
      await User.findByIdAndUpdate(req.user.id, { name: updates.name });
    }

    // Save the student document
    // This triggers any pre-save hooks and validators
    await student.save();

    sendSuccess(res, 200, 'Profile updated successfully', { student });
  } catch (error) {
    next(error);
  }
};
/**
 * Get current student's room preference
 *
 * GET /api/v1/student/room-preference
 */
export const getRoomPreference = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id }).populate(
      'room_preference.preferred_roommate',
      'name email college_id branch year gender room_no hostel_block'
    );

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const preferredRoommate = student.room_preference?.preferred_roommate || null;

    let isMutual = false;

    if (preferredRoommate?._id) {
      const reverseStudent = await Student.findById(preferredRoommate._id).select(
        'room_preference.preferred_roommate'
      );

      isMutual =
        reverseStudent?.room_preference?.preferred_roommate?.toString() ===
        student._id.toString();
    }

    sendSuccess(res, 200, 'Room preference retrieved successfully', {
      preference: {
        preferred_roommate: preferredRoommate,
        is_mutual: isMutual,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search roommate options for current student
 *
 * GET /api/v1/student/roommate-options?q=john
 *
 * Rules:
 * - same gender only
 * - active hostellers only
 * - exclude self
 */
export const searchRoommateOptions = async (req, res, next) => {
  try {
    const { q = '', limit = 10 } = req.query;

    const currentStudent = await Student.findOne({ user_id: req.user.id });

    if (!currentStudent) {
      return next(new AppError('Student profile not found', 404));
    }

    if (!currentStudent.gender) {
      return next(
        new AppError(
          'Please complete your profile gender before selecting a preferred roommate',
          400
        )
      );
    }

    const filter = {
      _id: { $ne: currentStudent._id },
      is_active: true,
      is_hosteller: true,
      gender: currentStudent.gender,
    };

    if (q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } },
        { college_id: { $regex: q.trim(), $options: 'i' } },
        { branch: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    const students = await Student.find(filter)
      .sort({ name: 1 })
      .limit(Number(limit))
      .select(
        'name email college_id branch year gender room_no hostel_block room_preference.preferred_roommate'
      );

    const options = students.map((student) => ({
      _id: student._id,
      name: student.name,
      email: student.email,
      college_id: student.college_id,
      branch: student.branch,
      year: student.year,
      gender: student.gender,
      room_no: student.room_no,
      hostel_block: student.hostel_block,
      is_allocated: Boolean(student.room_no && student.hostel_block),
      has_selected_you:
        student.room_preference?.preferred_roommate?.toString() ===
        currentStudent._id.toString(),
    }));

    sendSuccess(res, 200, 'Roommate options retrieved successfully', {
      options,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set or clear preferred roommate
 *
 * PUT /api/v1/student/room-preference
 */
export const updateRoomPreference = async (req, res, next) => {
  try {
    const { preferred_roommate_id } = req.body;

    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    if (!student.gender) {
      return next(
        new AppError(
          'Please complete your profile gender before selecting a preferred roommate',
          400
        )
      );
    }

    // Clear preference
    if (preferred_roommate_id === null) {
      student.room_preference = {
        preferred_roommate: null,
      };

      await student.save();

      return sendSuccess(res, 200, 'Room preference cleared successfully', {
        preference: {
          preferred_roommate: null,
          is_mutual: false,
        },
      });
    }

    // Prevent choosing self
    if (preferred_roommate_id === student._id.toString()) {
      return next(new AppError('You cannot select yourself as a roommate', 400));
    }

    const preferredRoommate = await Student.findById(preferred_roommate_id).select(
      'name email college_id branch year gender room_no hostel_block is_active is_hosteller room_preference.preferred_roommate'
    );

    if (!preferredRoommate) {
      return next(new AppError('Preferred roommate student not found', 404));
    }

    if (!preferredRoommate.is_active || !preferredRoommate.is_hosteller) {
      return next(
        new AppError(
          'You can only select an active hosteller student as preferred roommate',
          400
        )
      );
    }

    // Since hostel blocks are gender-separated,
    // preferred roommates must be same gender
    if (preferredRoommate.gender !== student.gender) {
      return next(
        new AppError(
          'Preferred roommate must have the same gender for hostel allocation',
          400
        )
      );
    }

    student.room_preference = {
      preferred_roommate: preferredRoommate._id,
    };

    await student.save();

    const isMutual =
      preferredRoommate.room_preference?.preferred_roommate?.toString() ===
      student._id.toString();

    sendSuccess(res, 200, 'Room preference updated successfully', {
      preference: {
        preferred_roommate: {
          _id: preferredRoommate._id,
          name: preferredRoommate.name,
          email: preferredRoommate.email,
          college_id: preferredRoommate.college_id,
          branch: preferredRoommate.branch,
          year: preferredRoommate.year,
          gender: preferredRoommate.gender,
          room_no: preferredRoommate.room_no,
          hostel_block: preferredRoommate.hostel_block,
        },
        is_mutual: isMutual,
      },
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Get room allocation info
 *
 * GET /api/v1/student/room
 *
 * Fetches the student's room from the ROOM MODEL (not student fields).
 * This gives us accurate, real-time room data including roommates.
 *
 * FIX from teammate's code:
 * She read room info from student.hostel_details — that's a COPY that
 * could be stale. We query the Room model directly for fresh data.
 */
export const getRoom = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    // Check if student has a room assigned
    if (!student.room_no || !student.hostel_block) {
      return sendSuccess(res, 200, 'No room allocated yet', {
        room: null,
        bed_no: null,
      });
    }

    // Find the room from the Room model
    // populate('students') replaces student ObjectIds with actual documents
    const room = await Room.findOne({
      room_no: student.room_no,
      hostel_block: student.hostel_block,
    }).populate('students', 'name email college_id branch year phone bed_no profile_pic');
    // Second argument to populate = which fields to include
    // Only fetches the fields we need (not the entire student document)

    if (!room) {
      return sendSuccess(res, 200, 'Room not found in system', {
        room: null,
        bed_no: student.bed_no,
      });
    }

    sendSuccess(res, 200, 'Room info retrieved successfully', {
      room: {
        room_no: room.room_no,
        hostel_block: room.hostel_block,
        floor: room.floor,
        capacity: room.capacity,
        occupied: room.occupied,
        status: room.status,
        roommates: room.students.filter(
          (s) => s._id.toString() !== student._id.toString()
        ),
        // Filter out the current student from the roommates list
        // They don't need to see themselves as a "roommate"
      },
      bed_no: student.bed_no,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 *
 * GET /api/v1/student/dashboard-stats
 *
 * Aggregates data from multiple collections to give the
 * student an overview of their hostel life.
 *
 * Returns all data in ONE API call instead of 5 separate calls.
 * This is better for performance (fewer HTTP requests).
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const studentId = student._id;

    // Run ALL queries in parallel using Promise.all
    // This is MUCH faster than running them one by one
    //
    // Sequential: Query1 (50ms) → Query2 (50ms) → Query3 (50ms) = 150ms
    // Parallel:   Query1 (50ms) ↗
    //             Query2 (50ms) → = ~50ms (all at the same time!)
    //             Query3 (50ms) ↘
    const [
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      totalOutpasses,
      pendingOutpasses,
      approvedOutpasses,
      pendingPayments,
      recentComplaints,
      recentOutpasses,
    ] = await Promise.all([
      // Complaint counts
      Complaint.countDocuments({ student_id: studentId }),
      Complaint.countDocuments({ student_id: studentId, status: 'pending' }),
      Complaint.countDocuments({ student_id: studentId, status: 'resolved' }),

      // Outpass counts
      Outpass.countDocuments({ student_id: studentId }),
      Outpass.countDocuments({ student_id: studentId, status: 'pending' }),
      Outpass.countDocuments({ student_id: studentId, status: 'approved' }),

      // Pending payments (need full documents for amount calculation)
      Payment.find({ student_id: studentId, status: 'pending' }),

      // Recent activity (last 5 of each, newest first)
      Complaint.find({ student_id: studentId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('category status priority createdAt'),
      // .select() picks only the fields we need (less data transferred)

      Outpass.find({ student_id: studentId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('reason status from_date to_date createdAt'),
    ]);

    // Calculate total pending payment amount
    const totalPendingAmount = pendingPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    // .reduce() iterates through array and accumulates a value
    // Starting value = 0
    // Each iteration: sum = previous sum + current payment.amount
    // Example: [500, 300, 200].reduce((sum, val) => sum + val, 0) = 1000

    sendSuccess(res, 200, 'Dashboard stats retrieved', {
      room: {
        room_no: student.room_no || null,
        hostel_block: student.hostel_block || null,
        floor: student.floor,
        bed_no: student.bed_no,
      },
      complaints: {
        total: totalComplaints,
        pending: pendingComplaints,
        resolved: resolvedComplaints,
      },
      outpasses: {
        total: totalOutpasses,
        pending: pendingOutpasses,
        approved: approvedOutpasses,
      },
      payments: {
        pendingCount: pendingPayments.length,
        totalPendingAmount,
      },
      recent: {
        complaints: recentComplaints,
        outpasses: recentOutpasses,
      },
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Get the layout of the student's current floor with privacy rules.
 *
 * GET /api/v1/student/room-layout
 *
 * Rules:
 * 1. Returns all rooms on the student's assigned floor.
 * 2. If a room is NOT the student's room:
 *    - Return only room_no, status, capacity, occupied.
 *    - DO NOT return student names or details.
 * 3. If a room IS the student's room:
 *    - Return full details including roommates.
 */
export const getStudentFloorLayout = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    // Check if allocated
    if (!student.hostel_block || !student.floor) {
      return sendSuccess(res, 200, 'Student not allocated to a room', {
        allocated: false,
        layout: null,
        my_room: null,
      });
    }

    // Fetch all rooms on this specific floor
    // We do NOT populate students yet for performance and privacy
    const rooms = await Room.find({
      hostel_block: student.hostel_block,
      floor: student.floor,
    }).sort({ room_no: 1 });

    // Transform rooms to apply privacy
    const layout = rooms.map((room) => {
      const isMyRoom = room._id.toString() === student._id.toString() || 
                       (room.room_no === student.room_no); 
      // Note: Comparing IDs is safer, but room_no check is a fallback if logic changes.
      // Actually, better to check if the room contains the student ID.
      
      // Let's refine the check:
      const isMyRoomCheck = room.students.some(
        (sId) => sId.toString() === student._id.toString()
      );

      if (isMyRoomCheck) {
        // It's my room -> Return full details (populated later)
        return {
          ...room.toObject(),
          is_my_room: true,
        };
      } else {
        // Not my room -> Strip student data
        return {
          _id: room._id,
          room_no: room.room_no,
          hostel_block: room.hostel_block,
          floor: room.floor,
          capacity: room.capacity,
          occupied: room.occupied,
          status: room.status,
          is_my_room: false,
          // Students array is intentionally omitted
        };
      }
    });

    // Now populate ONLY my room to get roommate details
    const myRoomData = rooms.find((r) =>
      r.students.some((sId) => sId.toString() === student._id.toString())
    );

    let myRoomFull = null;
    if (myRoomData) {
      await myRoomData.populate(
        'students',
        'name email college_id branch year phone bed_no profile_pic'
      );

      // Filter out self from roommates list
      const roommates = myRoomData.students
        .filter((s) => s._id.toString() !== student._id.toString())
        .map((s) => ({
          id: s._id,
          name: s.name,
          branch: s.branch,
          year: s.year,
          bed_no: s.bed_no,
        }));

      myRoomFull = {
        room_no: myRoomData.room_no,
        floor: myRoomData.floor,
        block: myRoomData.hostel_block,
        status: myRoomData.status,
        capacity: myRoomData.capacity,
        occupied: myRoomData.occupied,
        bed_no: student.bed_no,
        roommates,
      };
    }

    sendSuccess(res, 200, 'Floor layout retrieved', {
      allocated: true,
      my_room: myRoomFull,
      floor: student.floor,
      block: student.hostel_block,
      layout,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public preview of a floor layout for unallocated students.
 *
 * GET /api/v1/student/layout-preview?block=A&floor=1
 *
 * Rules:
 * - Returns room structure only.
 * - NO student names or personal details.
 * - Only status (Empty/Partial/Full) and occupancy counts.
 */
export const getLayoutPreview = async (req, res, next) => {
  try {
    const { block, floor } = req.query;

    if (!block || !floor) {
      return next(new AppError('Block and Floor are required', 400));
    }

    const rooms = await Room.find({
      hostel_block: block.toUpperCase(),
      floor: Number(floor),
    }).sort({ room_no: 1 });

    // Strip all sensitive data
    const safeLayout = rooms.map((room) => ({
      room_no: room.room_no,
      status: room.status,
      capacity: room.capacity,
      occupied: room.occupied,
    }));

    sendSuccess(res, 200, 'Layout preview retrieved', {
      block: block.toUpperCase(),
      floor: Number(floor),
      rooms: safeLayout,
    });
  } catch (error) {
    next(error);
  }
};



