import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import { sendPaymentReminder } from './email.js';
import logger from '../config/logger.js';

/**
 * Calculate days difference between two dates (ignoring time).
 */
const getDaysDiff = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d1 - d2;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Process payment reminders for all pending payments.
 *
 * Milestones:
 * - 7 days before
 * - 3 days before
 * - 1 day before
 * - Due date (0 days)
 * - Overdue (negative days)
 */
export const processPaymentReminders = async () => {
  try {
    const today = new Date();

    // Find all pending payments with a due date
    const pendingPayments = await Payment.find({
      status: 'pending',
      due_date: { $ne: null },
    }).populate({
      path: 'student_id',
      select: 'name email guardian',
    });

    let emailsSent = 0;

    for (const payment of pendingPayments) {
      const student = payment.student_id;
      if (!student) continue; // Should not happen, but safety check

      const daysUntilDue = getDaysDiff(payment.due_date, today);

      let shouldSend = false;
      let reminderType = null;

      // Determine milestone
      if (daysUntilDue === 7) {
        reminderType = '7_days';
        shouldSend = true;
      } else if (daysUntilDue === 3) {
        reminderType = '3_days';
        shouldSend = true;
      } else if (daysUntilDue === 1) {
        reminderType = '1_day';
        shouldSend = true;
      } else if (daysUntilDue === 0) {
        reminderType = 'due_date';
        shouldSend = true;
      } else if (daysUntilDue < 0) {
        reminderType = 'overdue';
        shouldSend = true;
      }

      // Check if we already sent this specific reminder type
      // For overdue, we allow sending every day, so we only check if sent TODAY
      if (shouldSend) {
        const lastSent = payment.last_reminder_sent_at;
        const lastType = payment.last_reminder_type;

        if (reminderType === 'overdue') {
          // For overdue, only send if we haven't sent today
          const lastSentToday = lastSent && getDaysDiff(today, lastSent) === 0;
          if (lastSentToday) {
            shouldSend = false;
          }
        } else {
          // For other milestones, check if we already sent THIS specific type
          if (lastType === reminderType) {
            shouldSend = false;
          }
        }
      }

      // Send email if needed
      if (shouldSend) {
        try {
          await sendPaymentReminder(payment, student);

          // Update tracking fields
          payment.last_reminder_sent_at = new Date();
          payment.last_reminder_type = reminderType;
          payment.reminder_count = (payment.reminder_count || 0) + 1;
          await payment.save();

          emailsSent++;
          logger.info(`✅ Reminder sent: ${reminderType} for payment ${payment._id}`);
        } catch (error) {
          logger.error(`❌ Failed to process reminder for payment ${payment._id}:`, error.message);
        }
      }
    }

    logger.info(`📧 Payment Reminder Job Complete: ${emailsSent} emails sent.`);
    return emailsSent;
  } catch (error) {
    logger.error('❌ Payment Reminder Job Failed:', error.message);
    throw error;
  }
};
export default processPaymentReminders;