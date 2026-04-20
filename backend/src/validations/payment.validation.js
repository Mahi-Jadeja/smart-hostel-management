import { z } from 'zod';

/**
 * Allowed payment types
 */
export const PAYMENT_TYPES = [
  'hostel_fee',
  'mess_fee',
  'fine',
  'maintenance',
  'other',
];

/**
 * Create Payment Schema
 *
 * Used by admin when creating a payment record.
 */
export const createPaymentSchema = z.object({
  student_id: z
    .string({ required_error: 'Student ID is required' })
    .trim()
    .min(1, 'Student ID is required'),

  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0'),

  type: z
    .enum(PAYMENT_TYPES, {
      errorMap: () => ({
        message: `Type must be one of: ${PAYMENT_TYPES.join(', ')}`,
      }),
    })
    .optional(),

  description: z
    .string()
    .trim()
    .max(200, 'Description cannot exceed 200 characters')
    .optional(),

  due_date: z
    .string()
    .trim()
    .optional(),
  // Optional because not every payment must have a due date
});

/**
 * Mark Payment Paid Schema
 *
 * Used by student to mark a payment as paid.
 */
export const markPaymentPaidSchema = z.object({
  transaction_id: z
    .string()
    .trim()
    .max(100, 'Transaction ID cannot exceed 100 characters')
    .optional(),
});