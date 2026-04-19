import Outpass from '../models/Outpass.js';
import Student from '../models/Student.js';
import { sendEmail } from '../utils/email.js';
import config from '../config/env.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import paginate from '../utils/pagination.js';
/**
 * Create a new outpass request
 *
 * POST /api/v1/outpass
 *
 * Flow:
 * 1. Find student profile
 * 2. Validate guardian email exists
 * 3. Create outpass with token + expiry
 * 4. Send approval email to guardian
 * 5. Return success (even if email fails, outpass is saved)
 */
export const createOutpass = async (req, res, next) => {
  try {
    const { from_date, to_date, reason } = req.body;

    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const guardianEmail = student.guardian?.email;

    if (!guardianEmail) {
      return next(
        new AppError(
          'Guardian email is missing in your profile. Please update it before requesting an outpass.',
          400
        )
      );
    }

    // Calculate expiry: 00:00:00 on the from_date
    const fromDate = new Date(from_date);
    const tokenExpiry = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0);

    const outpass = await Outpass.create({
      student_id: student._id,
      from_date,
      to_date,
      reason,
      guardian_email: guardianEmail,
      status: 'pending',
      token_expires_at: tokenExpiry,
    });

    // Attempt to send guardian email
    try {
      const approvalUrl = `${config.clientUrl}/outpass/guardian-action/${outpass.approval_token}`;

      await sendEmail({
        to: guardianEmail,
        subject: `Outpass Approval Request for ${student.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Outpass Approval Required</h2>
            <p>Dear Guardian,</p>
            <p><strong>${student.name}</strong> has requested an outpass with the following details:</p>
            <ul>
              <li><strong>From:</strong> ${new Date(from_date).toLocaleDateString()}</li>
              <li><strong>To:</strong> ${new Date(to_date).toLocaleDateString()}</li>
              <li><strong>Reason:</strong> ${reason}</li>
            </ul>
            <p style="margin: 20px 0;">
              <a href="${approvalUrl}" 
                 style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                 Approve or Reject Request
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">
              This link will expire on ${tokenExpiry.toLocaleDateString()}.
            </p>
          </div>
        `,
        text: `Dear Guardian, ${student.name} requested an outpass from ${new Date(from_date).toLocaleDateString()} to ${new Date(to_date).toLocaleDateString()}. Reason: ${reason}. Approve or reject here: ${approvalUrl}`,
      });
    } catch (emailError) {
      // We intentionally DO NOT fail the outpass creation if email fails.
      // The outpass is still saved as 'pending'.
      // Admin can retry later via cron or manual resend.
      console.error('❌ Guardian email failed for outpass:', outpass._id, emailError.message);
    }

    sendSuccess(res, 201, 'Outpass request submitted successfully', { outpass });
  } catch (error) {
    next(error);
  }
};
/**
 * Get outpass details for guardian approval page
 *
 * GET /api/v1/outpass/guardian-action/:token
 *
 * No authentication required.
 * Validates token, checks expiry, returns safe public data.
 */
export const getGuardianOutpassDetails = async (req, res, next) => {
  try {
    const { token } = req.params;

    const outpass = await Outpass.findOne({ approval_token: token })
      .populate('student_id', 'name email college_id branch year room_no hostel_block');

    if (!outpass) {
      return next(new AppError('Invalid or expired outpass link', 404));
    }

    // Check expiry
    const now = new Date();
    if (outpass.token_expires_at && now > outpass.token_expires_at) {
      return next(new AppError('This approval link has expired', 400));
    }

    // Already decided
    if (outpass.status !== 'pending') {
      return next(new AppError(`This outpass has already been ${outpass.status}`, 400));
    }

    sendSuccess(res, 200, 'Outpass details retrieved', {
      outpass: {
        id: outpass._id,
        student_name: outpass.student_id?.name || 'Unknown',
        from_date: outpass.from_date,
        to_date: outpass.to_date,
        reason: outpass.reason,
        guardian_email: outpass.guardian_email,
        token: outpass.approval_token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Guardian approves or rejects outpass
 *
 * PATCH /api/v1/outpass/guardian-action/:token/decision
 *
 * No authentication required.
 * Validates token, checks expiry, updates status.
 */
export const decideGuardianOutpass = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { decision } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(decision)) {
      return next(new AppError('Decision must be approved or rejected', 400));
    }

    const outpass = await Outpass.findOne({ approval_token: token });

    if (!outpass) {
      return next(new AppError('Invalid or expired outpass link', 404));
    }

    const now = new Date();
    if (outpass.token_expires_at && now > outpass.token_expires_at) {
      return next(new AppError('This approval link has expired', 400));
    }

    if (outpass.status !== 'pending') {
      return next(new AppError(`This outpass has already been ${outpass.status}`, 400));
    }

    // Update status
    outpass.status = decision === 'approved' ? 'approved' : 'guardian_rejected';
    await outpass.save();

    const message = decision === 'approved'
      ? 'Outpass approved successfully'
      : 'Outpass rejected by guardian';

    sendSuccess(res, 200, message, {
      status: outpass.status,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Get current student's outpass history
 *
 * GET /api/v1/outpass/mine
 *
 * Supports pagination.
 */
export const getMyOutpasses = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const { page = 1, limit = 10 } = req.query;

    const result = await paginate(
      Outpass,
      { student_id: student._id },
      {
        page,
        limit,
        sort: '-createdAt',
      }
    );

    sendSuccess(res, 200, 'Outpass history retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all outpass requests (admin only)
 *
 * GET /api/v1/outpass
 *
 * Supports:
 * - pagination
 * - filtering by status
 */
export const getAllOutpasses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const result = await paginate(Outpass, filter, {
      page,
      limit,
      sort: '-createdAt',
      populate: {
        path: 'student_id',
        select: 'name email room_no hostel_block college_id phone branch year',
      },
    });

    sendSuccess(res, 200, 'Outpass requests retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single outpass by ID
 *
 * GET /api/v1/outpass/:id
 *
 * Student can view only own outpass.
 * Admin can view any outpass.
 */
export const getOutpassById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const outpass = await Outpass.findById(id)
      .populate('student_id', 'name email room_no hostel_block college_id phone branch year')
      .populate('approved_by', 'name email role');

    if (!outpass) {
      return next(new AppError('Outpass not found', 404));
    }

    // If requester is student, ensure ownership
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user_id: req.user.id });

      if (!student || outpass.student_id._id.toString() !== student._id.toString()) {
        return next(new AppError('You can only view your own outpasses', 403));
      }
    }

    sendSuccess(res, 200, 'Outpass retrieved successfully', { outpass });
  } catch (error) {
    next(error);
  }
};

/**
 * Decide an outpass request (admin only)
 *
 * PATCH /api/v1/outpass/:id/decision
 *
 * Admin can approve or reject pending outpasses.
 * Once approved/rejected, decision cannot be changed.
 */
export const decideOutpass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_remark } = req.body;

    const outpass = await Outpass.findById(id);

    if (!outpass) {
      return next(new AppError('Outpass not found', 404));
    }

    // Prevent re-decision
    if (outpass.status !== 'pending') {
      return next(
        new AppError(
          `This outpass has already been ${outpass.status}. Decision cannot be changed.`,
          400
        )
      );
    }

    // ✅ FIX: Map API payload to valid Mongoose enum before saving
    if (status === 'rejected') {
      outpass.status = 'guardian_rejected';
    } else if (status === 'approved') {
      outpass.status = 'approved';
    } else {
      return next(new AppError('Invalid status. Must be "approved" or "rejected".', 400));
    }

    outpass.approved_by = req.user.id;

    if (admin_remark !== undefined) {
      outpass.admin_remark = admin_remark;
    }

    await outpass.save();

    await outpass.populate('student_id', 'name email room_no hostel_block');
    await outpass.populate('approved_by', 'name email role');

    sendSuccess(res, 200, `Outpass ${status} successfully`, { outpass });
  } catch (error) {
    next(error);
  }
};