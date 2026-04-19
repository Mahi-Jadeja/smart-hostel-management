import cron from 'node-cron';
import Outpass from '../models/Outpass.js';
import Student from '../models/Student.js';
import { sendEmail } from './email.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { processPaymentReminders } from './paymentReminder.js';

/**
 * Auto-expire pending outpasses where from_date has passed
 */
const expireOutpasses = async () => {
  try {
    const now = new Date();

    const result = await Outpass.updateMany(
      {
        status: 'pending',
        token_expires_at: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    if (result.matchedCount > 0) {
      logger.info(`🕰️ Cron: Expired ${result.modifiedCount} pending outpass(es)`);
    }
  } catch (error) {
    logger.error('❌ Cron: Failed to expire outpasses:', error.message);
  }
};

/**
 * Retry sending guardian emails for pending outpasses that failed initially
 */
const retryFailedOutpassEmails = async () => {
  try {
    const pendingOutpasses = await Outpass.find({
      status: 'pending',
      email_sent: false,
    }).populate('student_id', 'name');

    for (const outpass of pendingOutpasses) {
      try {
        const approvalUrl = `${config.clientUrl}/outpass/guardian-action/${outpass.approval_token}`;

        await sendEmail({
          to: outpass.guardian_email,
          subject: `Outpass Approval Request for ${outpass.student_id?.name || 'Student'}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Outpass Approval Required</h2>
              <p>Dear Guardian,</p>
              <p><strong>${outpass.student_id?.name}</strong> requested an outpass:</p>
              <ul>
                <li><strong>From:</strong> ${new Date(outpass.from_date).toLocaleDateString()}</li>
                <li><strong>To:</strong> ${new Date(outpass.to_date).toLocaleDateString()}</li>
                <li><strong>Reason:</strong> ${outpass.reason}</li>
              </ul>
              <p style="margin: 20px 0;">
                <a href="${approvalUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Approve or Reject Request
                </a>
              </p>
            </div>
          `,
          text: `Guardian approval needed for ${outpass.student_id?.name}. Link: ${approvalUrl}`,
        });

        // Mark as successfully sent
        outpass.email_sent = true;
        await outpass.save();
      } catch (emailError) {
        logger.warn(`⚠️ Cron: Email retry failed for outpass ${outpass._id}: ${emailError.message}`);
      }
    }
  } catch (error) {
    logger.error('❌ Cron: Failed to retry outpass emails:', error.message);
  }
};

/**
 * Initialize scheduled tasks
 *
 * Runs daily at 1:00 AM server time
 * '0 1 * * *' = minute=0, hour=1, every day, every month, every day of week
 */
export const initScheduledTasks = () => {
  cron.schedule('0 1 * * *', async () => {
    logger.info('🕰️ Cron: Running daily scheduled tasks...');

    await expireOutpasses();
    await retryFailedOutpassEmails();
    // Payment Reminders
    await processPaymentReminders();

    logger.info('✅ Cron: Daily tasks completed.');
  });

  logger.info('✅ Scheduled tasks initialized (runs daily at 1:00 AM)');
};