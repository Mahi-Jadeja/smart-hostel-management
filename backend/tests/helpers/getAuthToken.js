// Helper to quickly get a JWT token for authenticated test requests
// Many tests need an authenticated user, so this saves repetition

import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for a user
 *
 * @param {object} user - User document from MongoDB
 * @returns {string} JWT token
 *
 * Usage in tests:
 *   const { user } = await createTestUser();
 *   const token = getAuthToken(user);
 *   const res = await request(app)
 *     .get('/api/v1/student/profile')
 *     .set('Authorization', `Bearer ${token}`);
 */
export const getAuthToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'test-secret-key-for-testing-only',
    { expiresIn: '1h' }
  );
};

export default getAuthToken;