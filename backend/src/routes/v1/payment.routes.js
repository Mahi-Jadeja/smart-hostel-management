import { Router } from 'express';
import {
  createPayment,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  markPaymentPaid,
  triggerPaymentReminders,
} from '../../controllers/payment.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createPaymentSchema,
  markPaymentPaidSchema,
} from '../../validations/payment.validation.js';
import { z } from 'zod';

const triggerReminderSchema = z.object({
  payment_id: z.string().trim().optional(),
});

const router = Router();

// All payment routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         student_id:
 *           type: string
 *         amount:
 *           type: number
 *         type:
 *           type: string
 *           enum: [hostel_fee, mess_fee, fine, maintenance, other]
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, paid]
 *         due_date:
 *           type: string
 *           format: date-time
 *         payment_date:
 *           type: string
 *           format: date-time
 *         transaction_id:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a payment record (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Payment created
 *       403:
 *         description: Admin access required
 */
router.post('/', requireRole('admin'), validate(createPaymentSchema), createPayment);

/**
 * @swagger
 * /api/v1/payments/mine:
 *   get:
 *     summary: Get current student's payments and reminders
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments and reminders
 */
router.get('/mine', getMyPayments);

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Get all payments (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all payments
 *       403:
 *         description: Admin access required
 */
router.get('/', requireRole('admin'), getAllPayments);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get single payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment details
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Payment not found
 */
router.get('/:id', getPaymentById);

/**
 * @swagger
 * /api/v1/payments/{id}/pay:
 *   patch:
 *     summary: Mark payment as paid (student only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment marked as paid
 *       400:
 *         description: Already paid
 */
router.patch('/:id/pay', validate(markPaymentPaidSchema), markPaymentPaid);
/**
 * @swagger
 * /api/v1/payments/reminders:
 *   post:
 *     summary: Manually trigger payment reminders (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reminders sent successfully
 */
router.post('/reminders', requireRole('admin'), triggerPaymentReminders);
export default router;