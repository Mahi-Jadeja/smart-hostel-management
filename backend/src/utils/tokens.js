import jwt from 'jsonwebtoken';
import config from '../config/env.js';

/**
 * Generate a JWT token for a user
 *
 * @param {object} user - User document from MongoDB
 * @returns {string} JWT token string
 *
 * The token contains:
 *   - id: User's MongoDB _id
 *   - email: User's email
 *   - role: User's role (student/admin)
 *
 * The token is signed with JWT_SECRET and expires based on JWT_EXPIRES_IN
 */
const generateToken = (user) => {
  // jwt.sign(payload, secret, options)
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn, // e.g., '7d' (7 days)
    }
  );
};

export default generateToken;