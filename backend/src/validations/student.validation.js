import { z } from 'zod';
import { BRANCHES, STUDENT_GENDERS } from '../constants/enums.js';

/**
 * Profile update validation schema
 *
 * Students can update:
 *   ✅ Personal: name, phone, gender, dob, profile_pic
 *   ✅ Academic: college_id, branch, year, semester
 *   ✅ Guardian: guardian.name, guardian.phone, guardian.email
 *
 * Students CANNOT update:
 *   ❌ email, user_id
 *   ❌ room_no, hostel_block, floor, bed_no
 *   ❌ is_active, is_hosteller
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),

  phone: z
    .string()
    .trim()
    .max(15, 'Phone number cannot exceed 15 characters')
    .optional(),

  gender: z
    .enum(STUDENT_GENDERS, {
      errorMap: () => ({
        message: 'Gender must be either male or female',
      }),
    })
    .optional(),

  dob: z.string().optional(),

  profile_pic: z
    .string()
    .max(500000, 'Profile picture data is too large')
    .optional(),

  college_id: z
    .string()
    .trim()
    .max(30, 'College ID cannot exceed 30 characters')
    .optional(),

  branch: z
    .enum(BRANCHES, {
      errorMap: () => ({
        message: 'Please select a valid branch',
      }),
    })
    .optional(),

  year: z
    .number()
    .int('Year must be a whole number')
    .min(1, 'Year must be between 1 and 5')
    .max(5, 'Year must be between 1 and 5')
    .optional(),

  semester: z
    .number()
    .int('Semester must be a whole number')
    .min(1, 'Semester must be between 1 and 10')
    .max(10, 'Semester must be between 1 and 10')
    .optional(),

  guardian: z
    .object({
      name: z
        .string()
        .trim()
        .max(50, 'Guardian name too long')
        .optional(),

      phone: z
        .string()
        .trim()
        .max(15, 'Guardian phone too long')
        .optional(),

      email: z
        .string()
        .trim()
        .email('Please provide a valid guardian email')
        .optional(),
    })
    .optional(),
});
/**
 * Update room preference schema
 *
 * preferred_roommate_id:
 * - string student ID → set preference
 * - null              → clear preference
 */
export const updateRoomPreferenceSchema = z.object({
  preferred_roommate_id: z.union([
    z
      .string()
      .trim()
      .min(1, 'Preferred roommate ID is required'),
    z.null(),
  ]),
});