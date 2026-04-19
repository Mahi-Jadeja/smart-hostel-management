import Complaint from '../models/Complaint.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import paginate from '../utils/pagination.js';
import checkEscalation from '../utils/escalation.js';

/**
 * Create a new complaint (student only)
 *
 * POST /api/v1/complaints
 *
 * Auto-fills: student_id, room_no, hostel_block
 * Auto-escalates priority if many similar complaints exist
 */
export const createComplaint = async (req, res, next) => {
  try {
    const { category, description } = req.body;

    // Get the student profile for the authenticated user
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    // Check for auto-escalation
    // If 3+ complaints of the same category in the last 24 hours → HIGH priority
    const priority = await checkEscalation(category);

    // Create the complaint
    const complaint = await Complaint.create({
      student_id: student._id,
      category,
      description,
      room_no: student.room_no || '',
      hostel_block: student.hostel_block || '',
      priority,
      status: 'pending',
    });

    // If priority was escalated, include a note in the response
    const message =
      priority === 'high'
        ? 'Complaint submitted with HIGH priority (auto-escalated due to similar recent complaints)'
        : 'Complaint submitted successfully';

    sendSuccess(res, 201, message, { complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * Get complaints for the current student
 *
 * GET /api/v1/complaints/mine
 *
 * Returns only the authenticated student's complaints
 * Sorted by newest first
 */
export const getMyComplaints = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    // Get query parameters for pagination
    const { page = 1, limit = 10 } = req.query;

    // Use our pagination utility
    const result = await paginate(
      Complaint,
      { student_id: student._id },
      {
        page,
        limit,
        sort: '-createdAt', // Newest first
      }
    );

    sendSuccess(res, 200, 'Complaints retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all complaints (admin only)
 *
 * GET /api/v1/complaints
 *
 * Supports filtering by:
 *   - status: ?status=pending
 *   - priority: ?priority=high
 *   - category: ?category=plumbing
 *
 * Supports pagination:
 *   - ?page=1&limit=20
 *
 * Populates student info (name, email, room)
 */
export const getAllComplaints = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority, category } = req.query;

    // Build filter object based on query params
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (category) {
      filter.category = category;
    }

    // Use pagination utility with populate
    const result = await paginate(Complaint, filter, {
      page,
      limit,
      sort: '-createdAt',
      populate: {
        path: 'student_id',
        select: 'name email room_no hostel_block college_id phone',
        // Only include these fields from the Student document
      },
    });

    sendSuccess(res, 200, 'Complaints retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single complaint by ID
 *
 * GET /api/v1/complaints/:id
 *
 * Students can only view their own complaints
 * Admins can view any complaint
 */
export const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id).populate(
      'student_id',
      'name email room_no hostel_block college_id phone'
    );

    if (!complaint) {
      return next(new AppError('Complaint not found', 404));
    }

    // If user is a student, verify they own this complaint
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user_id: req.user.id });

      if (!student || complaint.student_id._id.toString() !== student._id.toString()) {
        return next(new AppError('You can only view your own complaints', 403));
      }
    }

    sendSuccess(res, 200, 'Complaint retrieved successfully', { complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a complaint (admin only)
 *
 * PATCH /api/v1/complaints/:id
 *
 * Admins can update:
 *   - status
 *   - priority
 *   - admin_remark
 *
 * Automatically sets resolved_at when status changes to 'resolved'
 */
export const updateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, admin_remark } = req.body;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return next(new AppError('Complaint not found', 404));
    }

    // Update fields if provided
    if (status) {
      complaint.status = status;

      // If marking as resolved, set the resolution timestamp
      if (status === 'resolved' && !complaint.resolved_at) {
        complaint.resolved_at = new Date();
      }
    }

    if (priority) {
      complaint.priority = priority;
    }

    if (admin_remark !== undefined) {
      // !== undefined allows empty string (admin might clear the remark)
      complaint.admin_remark = admin_remark;
    }

    await complaint.save();

    // Populate student info for the response
    await complaint.populate('student_id', 'name email room_no hostel_block');

    sendSuccess(res, 200, 'Complaint updated successfully', { complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a complaint (student only, pending only)
 *
 * DELETE /api/v1/complaints/:id
 *
 * Students can only delete:
 *   - Their own complaints
 *   - Complaints that are still 'pending'
 *
 * Once a complaint is in_progress or resolved, it cannot be deleted
 */
export const deleteComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the student profile
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    // Find the complaint
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return next(new AppError('Complaint not found', 404));
    }

    // Verify ownership
    if (complaint.student_id.toString() !== student._id.toString()) {
      return next(new AppError('You can only delete your own complaints', 403));
    }

    // Verify status is pending
    if (complaint.status !== 'pending') {
      return next(
        new AppError(
          `Cannot delete a complaint that is ${complaint.status}. Only pending complaints can be deleted.`,
          400
        )
      );
    }

    // Delete the complaint
    await complaint.deleteOne();

    sendSuccess(res, 200, 'Complaint deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get complaint statistics (admin only)
 *
 * GET /api/v1/complaints/stats
 *
 * Returns aggregated counts for dashboard widgets
 */
export const getComplaintStats = async (req, res, next) => {
  try {
    // Use MongoDB aggregation for efficient counting
    const stats = await Complaint.aggregate([
      {
        // Group ALL documents and count by status/priority
        $facet: {
          // $facet runs multiple aggregation pipelines in parallel
          // and returns results in a single document

          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            // Groups documents by status field
            // Counts how many in each group
            // Result: [{ _id: 'pending', count: 10 }, { _id: 'resolved', count: 5 }]
          ],

          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
          ],

          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }, // Sort by count descending
            { $limit: 5 }, // Top 5 categories
          ],

          total: [
            { $count: 'count' },
            // Counts total number of documents
            // Result: [{ count: 15 }]
          ],
        },
      },
    ]);

    // Transform the aggregation result into a cleaner format
    const result = stats[0];

    // Convert array format to object format for easier frontend use
    const statusCounts = {};
    result.byStatus.forEach((item) => {
      statusCounts[item._id] = item.count;
    });

    const priorityCounts = {};
    result.byPriority.forEach((item) => {
      priorityCounts[item._id] = item.count;
    });

    sendSuccess(res, 200, 'Complaint statistics retrieved', {
      total: result.total[0]?.count || 0,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      topCategories: result.byCategory,
    });
  } catch (error) {
    next(error);
  }
};