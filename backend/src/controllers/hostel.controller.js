import HostelConfig from '../models/HostelConfig.js';
import Room from '../models/Room.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import {
  createAllocationSeed,
  simulateBulkAllocation,
  executeBulkAllocationPlan,
} from '../utils/allocation.js';

/**
 * Helper: find the next available bed number in a room
 *
 * Example:
 * Capacity = 3
 * Occupied bed numbers = [1, 3]
 * Next available = 2
 */
const findNextAvailableBedNo = async (room) => {
  const occupants = await Student.find({
    _id: { $in: room.students },
  }).select('bed_no');

  const occupiedBeds = new Set(
    occupants.map((student) => student.bed_no).filter(Boolean)
  );

  for (let bed = 1; bed <= room.capacity; bed++) {
    if (!occupiedBeds.has(bed)) {
      return bed;
    }
  }

  return null;
};

/**
 * Create or update hostel config
 *
 * POST /api/v1/hostel/config
 */
export const upsertHostelConfig = async (req, res, next) => {
  try {
    const {
      hostel_name,
      hostel_block,
      block_gender,
      total_floors,
      rooms_per_floor,
      default_capacity = 3,
    } = req.body;

    const config = await HostelConfig.findOneAndUpdate(
      { hostel_block },
      {
        hostel_name,
        hostel_block,
        block_gender,
        total_floors,
        rooms_per_floor,
        default_capacity,
      },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    sendSuccess(res, 200, 'Hostel configuration saved successfully', { config });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all hostel configs
 *
 * GET /api/v1/hostel/config
 */
export const getHostelConfigs = async (req, res, next) => {
  try {
    const configs = await HostelConfig.find().sort({ hostel_block: 1 });

    sendSuccess(res, 200, 'Hostel configurations retrieved successfully', {
      configs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate rooms for a block
 *
 * POST /api/v1/hostel/generate-rooms
 *
 * IMPORTANT SAFETY RULE:
 * If this block already has occupied rooms, we refuse generation.
 * Why?
 * Because deleting existing rooms with students inside would corrupt data.
 */
export const generateRooms = async (req, res, next) => {
  try {
    const { hostel_block } = req.body;

    const config = await HostelConfig.findOne({ hostel_block });

    if (!config) {
      return next(new AppError('Hostel config not found for this block', 404));
    }

    // Safety check: don't allow regeneration if occupied rooms exist
    const occupiedRoomsCount = await Room.countDocuments({
      hostel_block,
      occupied: { $gt: 0 },
    });

    if (occupiedRoomsCount > 0) {
      return next(
        new AppError(
          'Cannot regenerate rooms because some rooms in this block are occupied. Deallocate students first.',
          400
        )
      );
    }

    // Delete existing empty rooms for this block
    await Room.deleteMany({ hostel_block });

    const roomsToCreate = [];

    for (let floor = 1; floor <= config.total_floors; floor++) {
      for (let roomIndex = 1; roomIndex <= config.rooms_per_floor; roomIndex++) {
        const paddedRoomNumber = String(roomIndex).padStart(2, '0');
        const room_no = `${floor}${paddedRoomNumber}`;
        // Examples:
        // floor=1, roomIndex=1  -> 101
        // floor=1, roomIndex=10 -> 110
        // floor=2, roomIndex=3  -> 203

        roomsToCreate.push({
          room_no,
          hostel_block,
          floor,
          capacity: config.default_capacity,
          students: [],
        });
      }
    }

    const rooms = await Room.insertMany(roomsToCreate);

    sendSuccess(res, 201, 'Rooms generated successfully', {
      hostel_block,
      generatedCount: rooms.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all rooms with optional filters
 *
 * GET /api/v1/hostel/rooms?block=A&floor=1&status=partial
 */
export const getRooms = async (req, res, next) => {
  try {
    const { block, floor, status } = req.query;

    const filter = {};

    if (block) {
      filter.hostel_block = block.toUpperCase();
    }

    if (floor) {
      filter.floor = Number(floor);
    }

    if (status) {
      filter.status = status;
    }

    const rooms = await Room.find(filter)
      .sort({ hostel_block: 1, floor: 1, room_no: 1 })
      // FIX: Added 'gender' to populate select so student gender is available
      .populate('students', 'name email college_id branch year phone bed_no gender');

    sendSuccess(res, 200, 'Rooms retrieved successfully', { rooms });
  } catch (error) {
    next(error);
  }
};

/**
 * Get room layout grouped by floor
 *
 * GET /api/v1/hostel/layout?block=A
 */
export const getRoomLayout = async (req, res, next) => {
  try {
    let selectedBlock = req.query.block?.toUpperCase();

    // If no block is given, use the first available config block
    if (!selectedBlock) {
      const firstConfig = await HostelConfig.findOne().sort({ hostel_block: 1 });
      selectedBlock = firstConfig?.hostel_block || null;
    }

    // If no config exists at all
    if (!selectedBlock) {
      return sendSuccess(res, 200, 'No hostel config found yet', {
        block: null,
        config: null,
        floors: [],
        stats: {
          totalRooms: 0,
          totalBeds: 0,
          occupiedBeds: 0,
          availableBeds: 0,
          emptyRooms: 0,
          partialRooms: 0,
          fullRooms: 0,
          maintenanceRooms: 0,
        },
      });
    }

    const config = await HostelConfig.findOne({ hostel_block: selectedBlock });

    if (!config) {
      return next(new AppError('Hostel config not found for this block', 404));
    }

    const rooms = await Room.find({ hostel_block: selectedBlock })
      .sort({ floor: 1, room_no: 1 })
      // FIX: Added 'gender' to populate select so student gender is
      // available when AdminStudents page extracts allocated students
      // from layout data. Without gender, frontend gender filtering
      // always returns 0 results.
      .populate('students', 'name email college_id branch year phone bed_no gender');

    // Group rooms floor-wise
    const floorsMap = {};

    rooms.forEach((room) => {
      if (!floorsMap[room.floor]) {
        floorsMap[room.floor] = [];
      }
      floorsMap[room.floor].push(room);
    });

    const floors = Object.keys(floorsMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((floor) => ({
        floor: Number(floor),
        rooms: floorsMap[floor],
      }));

    // Calculate stats
    const totalRooms = rooms.length;
    const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const occupiedBeds = rooms.reduce((sum, room) => sum + room.occupied, 0);

    const stats = {
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      emptyRooms: rooms.filter((room) => room.status === 'empty').length,
      partialRooms: rooms.filter((room) => room.status === 'partial').length,
      fullRooms: rooms.filter((room) => room.status === 'full').length,
      maintenanceRooms: rooms.filter((room) => room.status === 'maintenance').length,
    };

    sendSuccess(res, 200, 'Room layout retrieved successfully', {
      block: selectedBlock,
      config,
      floors,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get students eligible for room allocation
 *
 * GET /api/v1/hostel/eligible-students?q=john
 *
 * We return:
 * - active hostellers
 * - students without room allocation
 */
export const getEligibleStudents = async (req, res, next) => {
  try {
    const { q = '', limit = 50 } = req.query;

    const filter = {
      is_active: true,
      is_hosteller: true,
      $or: [
        { room_no: '' },
        { room_no: null },
        { room_no: { $exists: false } },
      ],
    };

    if (q.trim()) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: q.trim(), $options: 'i' } },
            { email: { $regex: q.trim(), $options: 'i' } },
            { college_id: { $regex: q.trim(), $options: 'i' } },
            { branch: { $regex: q.trim(), $options: 'i' } },
          ],
        },
      ];
    }

    const students = await Student.find(filter)
      .sort({ name: 1 })
      .limit(Number(limit))
      // FIX: Added 'gender' to select projection.
      // Without this, student.gender is undefined on the frontend.
      // The RoomLayout manual allocation modal filters eligible students
      // by gender to match the block's gender type.
      // Previously: student.gender === 'male' → undefined === 'male' → false
      // Every student was filtered OUT → 0 eligible students shown.
      // Now gender is included → filtering works correctly.
      .select('name email college_id branch year phone gender');

    sendSuccess(res, 200, 'Eligible students retrieved successfully', {
      students,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Preview bulk room allocation
 *
 * POST /api/v1/hostel/allocate/preview
 *
 * This does NOT change the database.
 * It only returns the planned result.
 */
export const previewBulkAllocation = async (req, res, next) => {
  try {
    const seed = createAllocationSeed();

    const preview = await simulateBulkAllocation({
      ...req.body,
      seed,
    });

    sendSuccess(res, 200, 'Bulk allocation preview generated successfully', {
      preview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute bulk room allocation
 *
 * POST /api/v1/hostel/allocate/execute
 *
 * This re-runs the same deterministic preview using the provided seed
 * and applies the result to the database.
 */
export const executeBulkAllocation = async (req, res, next) => {
  try {
    const result = await executeBulkAllocationPlan(req.body);

    sendSuccess(res, 200, 'Bulk allocation executed successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Allocate a student to a room
 *
 * POST /api/v1/hostel/allocate
 *
 * Rules:
 * - room must exist
 * - student must exist
 * - room must not be full
 * - room must not be under maintenance
 * - if student already had another room, remove from old room first
 * - assign smallest available bed number automatically
 */
export const allocateStudentToRoom = async (req, res, next) => {
  try {
    const { student_id, room_id } = req.body;

    const student = await Student.findById(student_id);

    if (!student) {
      return next(new AppError('Student not found', 404));
    }

    if (!student.is_active || !student.is_hosteller) {
      return next(
        new AppError('Only active hosteller students can be allocated a room', 400)
      );
    }

    const room = await Room.findById(room_id);

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    if (room.status === 'maintenance') {
      return next(new AppError('Cannot allocate student to a maintenance room', 400));
    }

    if (room.occupied >= room.capacity) {
      return next(new AppError('Room is already full', 400));
    }

    // If student is already in this exact room, reject
    if (
      student.room_no === room.room_no &&
      student.hostel_block === room.hostel_block
    ) {
      return next(new AppError('Student is already allocated to this room', 400));
    }

    const nextBedNo = await findNextAvailableBedNo(room);

    if (!nextBedNo) {
      return next(new AppError('No available bed found in this room', 400));
    }

    // If student was allocated elsewhere, remove from old room first
    if (student.room_no && student.hostel_block) {
      const oldRoom = await Room.findOne({
        room_no: student.room_no,
        hostel_block: student.hostel_block,
      });

      if (oldRoom) {
        oldRoom.students.pull(student._id);
        await oldRoom.save();
      }
    }

    room.students.push(student._id);
    await room.save();

    student.room_no = room.room_no;
    student.hostel_block = room.hostel_block;
    student.floor = room.floor;
    student.bed_no = nextBedNo;
    await student.save();

    await room.populate('students', 'name email college_id branch year phone bed_no gender');

    sendSuccess(res, 200, 'Student allocated successfully', {
      room,
      student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deallocate student from room
 *
 * DELETE /api/v1/hostel/deallocate/:studentId
 */
export const deallocateStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);

    if (!student) {
      return next(new AppError('Student not found', 404));
    }

    if (!student.room_no || !student.hostel_block) {
      return next(new AppError('Student is not allocated to any room', 400));
    }

    const room = await Room.findOne({
      room_no: student.room_no,
      hostel_block: student.hostel_block,
    });

    if (room) {
      room.students.pull(student._id);
      await room.save();
    }

    student.room_no = '';
    student.hostel_block = '';
    student.floor = null;
    student.bed_no = null;
    await student.save();

    sendSuccess(res, 200, 'Student deallocated successfully', { student });
  } catch (error) {
    next(error);
  }
};