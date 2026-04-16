/**
 * Official branch list used across the application.
 *
 * We keep this in ONE place so:
 * - model validation
 * - request validation
 * - migration scripts
 * - filters
 * all use the exact same values.
 */
export const BRANCHES = Object.freeze([
  'Artificial Intelligence and Machine Learning',
  'Electronics and Telecommunication',
  'Computer Science',
  'Robotics and Automation',
  'Mechanical Engineering',
  'Civil Engineering',
]);

/**
 * Student gender values.
 *
 * You selected only two valid values:
 * - male
 * - female
 */
export const STUDENT_GENDERS = Object.freeze(['male', 'female']);

/**
 * Hostel block gender assignment options.
 *
 * Each block must be marked as either:
 * - male
 * - female
 */
export const BLOCK_GENDERS = Object.freeze(['male', 'female']);