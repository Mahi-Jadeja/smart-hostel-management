import { z } from 'zod';

/**
 * Create Outpass Schema
 *
 * Student must provide:
 * - from_date
 * - to_date
 * - reason
 */
export const createOutpassSchema = z
  .object({
    from_date: z
      .string({ required_error: 'From date is required' })
      .trim()
      .min(1, 'From date is required'),

    to_date: z
      .string({ required_error: 'To date is required' })
      .trim()
      .min(1, 'To date is required'),

    reason: z
      .string({ required_error: 'Reason is required' })
      .trim()
      .min(5, 'Reason must be at least 5 characters')
      .max(300, 'Reason cannot exceed 300 characters'),
  })
  .refine(
    (data) => {
      const from = new Date(data.from_date);
      const to = new Date(data.to_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // from_date cannot be before today
      if (from < today) return false;
      // to_date must be strictly after from_date
      return to > from;
    },
    {
      message: 'From date cannot be in the past, and return date must be after leave date',
      path: ['to_date'],
    }
  );
// .refine() lets us write custom cross-field validation
// Here we compare two fields together

/**
 * Decision Schema
 *
 * Admin can:
 * - approve OR reject
 * - optionally add admin_remark
 */
export const decideOutpassSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({
      message: 'Status must be approved or rejected',
    }),
  }),

  admin_remark: z
    .string()
    .trim()
    .max(300, 'Admin remark cannot exceed 300 characters')
    .optional(),
});