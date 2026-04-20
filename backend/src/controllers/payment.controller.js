import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import paginate from '../utils/pagination.js';
import getPaymentReminders from '../utils/paymentReminder.js';
import { processPaymentReminders } from '../utils/paymentReminder.js';
import { sendPaymentReminder } from '../utils/email.js';
/**
 * Create a payment record (admin only)
 *
 * POST /api/v1/payments
 */
export const createPayment = async (req, res, next) => {
  try {
    const { student_id, amount, type = 'hostel_fee', description = '', due_date } = req.body;

    // Verify the student exists
    const student = await Student.findById(student_id);

    if (!student) {
      return next(new AppError('Student not found', 404));
    }

    const payment = await Payment.create({
      student_id,
      amount,
      type,
      description,
      due_date: due_date || null,
      status: 'pending',
    });

    await payment.populate('student_id', 'name email room_no hostel_block college_id');

    sendSuccess(res, 201, 'Payment created successfully', { payment });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current student's payments + reminders
 *
 * GET /api/v1/payments/mine
 */
export const getMyPayments = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const { page = 1, limit = 10 } = req.query;

    // Get paginated payment history
    const paymentsResult = await paginate(
      Payment,
      { student_id: student._id },
      {
        page,
        limit,
        sort: '-createdAt',
      }
    );

    // Get reminders separately
    const reminders = await getPaymentReminders(student._id);

    sendSuccess(res, 200, 'Payments retrieved successfully', {
      payments: paymentsResult.data,
      pagination: paymentsResult.pagination,
      reminders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments (admin only)
 *
 * GET /api/v1/payments
 *
 * Filters:
 * - status
 * - student_id
 * - type
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, student_id, type } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (student_id) {
      filter.student_id = student_id;
    }

    if (type) {
      filter.type = type;
    }

    const result = await paginate(Payment, filter, {
      page,
      limit,
      sort: '-createdAt',
      populate: {
        path: 'student_id',
        select: 'name email room_no hostel_block college_id branch year phone',
      },
    });

    sendSuccess(res, 200, 'Payments retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single payment by ID
 *
 * GET /api/v1/payments/:id
 *
 * Student can only access own payment
 * Admin can access any payment
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id).populate(
      'student_id',
      'name email room_no hostel_block college_id branch year phone'
    );

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (req.user.role === 'student') {
      const student = await Student.findOne({ user_id: req.user.id });

      if (!student || payment.student_id._id.toString() !== student._id.toString()) {
        return next(new AppError('You can only view your own payments', 403));
      }
    }

    sendSuccess(res, 200, 'Payment retrieved successfully', { payment });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark payment as paid (student only)
 *
 * PATCH /api/v1/payments/:id/pay
 */
export const markPaymentPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transaction_id = '' } = req.body;

    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Student can only pay own payment
    if (payment.student_id.toString() !== student._id.toString()) {
      return next(new AppError('You can only pay your own payments', 403));
    }

    // Prevent paying an already paid payment
    if (payment.status === 'paid') {
      return next(new AppError('This payment is already marked as paid', 400));
    }

    payment.status = 'paid';
    payment.payment_date = new Date();
    payment.transaction_id = transaction_id;

    await payment.save();
    await payment.populate('student_id', 'name email room_no hostel_block');

    sendSuccess(res, 200, 'Payment marked as paid successfully', { payment });
  } catch (error) {
    next(error);
  }
};
/**
 * Manually trigger payment reminders
 *
 * POST /api/v1/payments/reminders
 *
 * Admin can:
 * - Send reminders for all eligible payments (default)
 * - Send reminder for a specific payment (pass payment_id in body)
 */
export const triggerPaymentReminders = async (req, res, next) => {
  try {
    const { payment_id } = req.body;
    let emailsSent = 0;

    if (payment_id) {
      // Single payment reminder
      const payment = await Payment.findById(payment_id).populate('student_id', 'name email guardian');

      if (!payment || payment.status !== 'pending' || !payment.due_date) {
        return next(new AppError('Invalid or paid payment selected for reminder', 400));
      }

      await sendPaymentReminder(payment, payment.student_id);

      payment.last_reminder_sent_at = new Date();
      payment.last_reminder_type = 'manual';
      payment.reminder_count = (payment.reminder_count || 0) + 1;
      await payment.save();

      emailsSent = 1;
    } else {
      // Bulk reminder
      emailsSent = await processPaymentReminders();
    }

    sendSuccess(res, 200, `Reminders processed successfully. ${emailsSent} email(s) sent.`, { emailsSent });
  } catch (error) {
    next(error);
  }
};