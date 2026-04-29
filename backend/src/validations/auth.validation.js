import { z } from 'zod';
import { BRANCHES, STUDENT_GENDERS } from '../constants/enums.js';

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),

  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),

  gender: z.enum(STUDENT_GENDERS, {
    errorMap: () => ({ message: 'Gender must be either male or female' }),
  }),

  branch: z.enum(BRANCHES, {
    errorMap: () => ({ message: 'Please select a valid branch' }),
  }),

  guardian: z.object({
    name: z
      .string({ required_error: 'Guardian name is required' })
      .trim()
      .min(2, 'Guardian name must be at least 2 characters')
      .max(50, 'Guardian name cannot exceed 50 characters'),

    phone: z
      .string({ required_error: 'Guardian phone is required' })
      .trim()
      .min(7, 'Guardian phone must be at least 7 characters')
      .max(15, 'Guardian phone cannot exceed 15 characters'),

    email: z
      .string({ required_error: 'Guardian email is required' })
      .trim()
      .email('Please provide a valid guardian email')
      .toLowerCase(),
  }),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Complete Profile Schema — for Google OAuth users only
 *
 * Same fields as registration except name/email/password
 * (those are already set from Google profile data)
 */
export const completeProfileSchema = z.object({
  gender: z.enum(STUDENT_GENDERS, {
    errorMap: () => ({ message: 'Gender must be either male or female' }),
  }),

  branch: z.enum(BRANCHES, {
    errorMap: () => ({ message: 'Please select a valid branch' }),
  }),

  guardian: z.object({
    name: z
      .string({ required_error: 'Guardian name is required' })
      .trim()
      .min(2, 'Guardian name must be at least 2 characters')
      .max(50, 'Guardian name cannot exceed 50 characters'),

    phone: z
      .string({ required_error: 'Guardian phone is required' })
      .trim()
      .min(7, 'Guardian phone must be at least 7 characters')
      .max(15, 'Guardian phone cannot exceed 15 characters'),

    email: z
      .string({ required_error: 'Guardian email is required' })
      .trim()
      .email('Please provide a valid guardian email')
      .toLowerCase(),
  }),
});

/**
 * Forgot Password Schema
 *
 * Only needs email — we find the user by email
 * and send a reset link to that address.
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email')
    .toLowerCase(),
});

/**
 * Reset Password Schema
 *
 * Collects new password and confirmation.
 * .refine() checks that both passwords match.
 * The token itself comes from req.params (URL), not req.body,
 * so it is NOT validated here — it is handled in the controller.
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password cannot exceed 100 characters'),

    confirmPassword: z
      .string({ required_error: 'Please confirm your password' })
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    // If passwords don't match, point the error at confirmPassword field
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });