// Helper function to create test users quickly
// Instead of writing 10 lines of user creation code in every test,
// we write it ONCE here and import it

import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';

/**
 * Creates a test user with optional role
 *
 * @param {object} overrides - Fields to override defaults
 * @returns {object} { user, student } - Created documents
 *
 * Usage:
 *   const { user } = await createTestUser();
 *   const { user: admin } = await createTestUser({ role: 'admin' });
 *   const { user: custom } = await createTestUser({ name: 'Jane', email: 'jane@test.com' });
 */
export const createTestUser = async (overrides = {}) => {
  // Default values — can be overridden
  const userData = {
    name: 'Test User',
    email: `test-${Date.now()}@test.com`, // Unique email using timestamp
    password: 'Password123!',
    role: 'student',
    ...overrides, // Spread operator: overrides replace defaults
  };

  // Create the user
  const user = await User.create(userData);

  // If the user is a student, create their student profile too
  let student = null;
  if (userData.role === 'student') {
    student = await Student.create({
      user_id: user._id,
      name: userData.name,
      email: userData.email,
    });
  }

  return { user, student };
};

export default createTestUser;