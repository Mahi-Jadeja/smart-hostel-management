import { z } from 'zod';

// List of valid complaint categories
// Defined once here, can be imported elsewhere if needed
export const COMPLAINT_CATEGORIES = [
  'plumbing',
  'electrical',
  'furniture',
  'cleaning',
  'food',
  'laundry',
  'internet',
  'security',
  'medical',
  'noise',
  'other',
];

/**
 * Schema for creating a new complaint (student action)
 *
 * Students provide:
 *   - category (required, from fixed list)
 *   - description (required, 10-500 chars)
 *
 * The following are set automatically by the controller:
 *   - student_id (from auth token)
 *   - room_no, hostel_block (from student profile)
 *   - priority (default 'low', may be auto-escalated)
 *   - status (default 'pending')
 */
export const createComplaintSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORIES, {
    errorMap: () => ({
      message: `Category must be one of: ${COMPLAINT_CATEGORIES.join(', ')}`,
    }),
  }),

  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description cannot exceed 500 characters'),
});

/**
 * Schema for updating a complaint (admin action)
 *
 * Admins can update:
 *   - status (pending → in_progress → resolved)
 *   - priority (low, medium, high)
 *   - admin_remark (their response/notes)
 *
 * All fields are optional — admin might only update one thing
 */
export const updateComplaintSchema = z.object({
  status: z
    .enum(['pending', 'in_progress', 'resolved'], {
      errorMap: () => ({
        message: 'Status must be pending, in_progress, or resolved',
      }),
    })
    .optional(),

  priority: z
    .enum(['low', 'medium', 'high'], {
      errorMap: () => ({
        message: 'Priority must be low, medium, or high',
      }),
    })
    .optional(),

  admin_remark: z
    .string()
    .trim()
    .max(500, 'Admin remark cannot exceed 500 characters')
    .optional(),
});