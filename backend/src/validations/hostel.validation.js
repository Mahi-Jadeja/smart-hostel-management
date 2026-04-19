import { z } from 'zod';
import { BLOCK_GENDERS } from '../constants/enums.js';

/**
 * Hostel block configuration validation
 */
export const hostelConfigSchema = z.object({
  hostel_name: z
    .string({ required_error: 'Hostel name is required' })
    .trim()
    .min(2, 'Hostel name must be at least 2 characters')
    .max(100, 'Hostel name cannot exceed 100 characters'),

  hostel_block: z
    .string({ required_error: 'Hostel block is required' })
    .trim()
    .min(1, 'Hostel block is required')
    .max(1, 'Hostel block must be a single character')
    .transform((value) => value.toUpperCase()),

  block_gender: z.enum(BLOCK_GENDERS, {
    errorMap: () => ({
      message: 'Block gender must be either male or female',
    }),
  }),

  total_floors: z.coerce
    .number({ required_error: 'Total floors is required' })
    .int('Total floors must be a whole number')
    .min(1, 'Must have at least 1 floor')
    .max(10, 'Cannot exceed 10 floors'),

  rooms_per_floor: z.coerce
    .number({ required_error: 'Rooms per floor is required' })
    .int('Rooms per floor must be a whole number')
    .min(1, 'Must have at least 1 room per floor')
    .max(20, 'Cannot exceed 20 rooms per floor'),

  default_capacity: z.coerce
    .number()
    .int('Default capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(6, 'Capacity cannot exceed 6')
    .default(3),
});

/**
 * Generate rooms validation
 */
export const generateRoomsSchema = z.object({
  hostel_block: z
    .string({ required_error: 'Hostel block is required' })
    .trim()
    .min(1, 'Hostel block is required')
    .max(1, 'Hostel block must be a single character')
    .transform((value) => value.toUpperCase()),
});

/**
 * Manual allocate validation
 */
export const allocateRoomSchema = z.object({
  student_id: z
    .string({ required_error: 'Student ID is required' })
    .trim()
    .min(1, 'Student ID is required'),

  room_id: z
    .string({ required_error: 'Room ID is required' })
    .trim()
    .min(1, 'Room ID is required'),
});

/**
 * Bulk allocation scopes
 *
 * unallocated               → only students with no room allocation
 * reshuffle_selected_blocks → reshuffle only students currently in selected blocks
 * reshuffle_all             → reshuffle all eligible students
 */
const BULK_ALLOCATION_SCOPES = [
  'unallocated',
  'reshuffle_selected_blocks',
  'reshuffle_all',
];

/**
 * Preview bulk allocation
 *
 * NOTE:
 * Part 1 supports only RANDOM mode.
 * We will expand this to preference + branch in the next parts.
 */
export const previewBulkAllocationSchema = z
  .object({
    mode: z.enum(['random', 'preference', 'branch'], {
      errorMap: () => ({
        message: 'Mode must be random, preference, or branch',
      }),
    }),

    scope: z.enum(BULK_ALLOCATION_SCOPES, {
      errorMap: () => ({
        message:
          'Scope must be unallocated, reshuffle_selected_blocks, or reshuffle_all',
      }),
    }),

    selected_blocks: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Block cannot be empty')
          .max(1, 'Block must be a single character')
          .transform((value) => value.toUpperCase())
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    // If admin chooses "reshuffle selected blocks",
    // they MUST tell us which blocks to reshuffle
    if (
      data.scope === 'reshuffle_selected_blocks' &&
      (!data.selected_blocks || data.selected_blocks.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selected_blocks'],
        message:
          'Please provide at least one selected block for reshuffle_selected_blocks scope',
      });
    }
  });

/**
 * Execute bulk allocation
 *
 * Same as preview, but requires the seed returned by preview
 * so random allocation remains deterministic and reproducible.
 */
export const executeBulkAllocationSchema = previewBulkAllocationSchema.extend({
  seed: z
    .string({ required_error: 'Seed is required' })
    .trim()
    .min(8, 'Valid preview seed is required'),
});