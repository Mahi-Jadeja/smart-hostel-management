import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * Middleware: Require Authentication
 *
 * Checks for a valid JWT token in the Authorization header.
 * If valid, attaches the user object to req.user.
 * If invalid or missing, throws a 401 error.
 *
 * Usage:
 *   router.get('/profile', requireAuth, profileController);
 *
 * Expected header format:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 */
export const requireAuth = async (req, res, next) => {
  try {
    // Step 1: Extract the token from the Authorization header
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      // "Bearer eyJhbGciOiJIUzI1NiIs..." → extract just the token part
      token = req.headers.authorization.split(' ')[1];
      // split(' ') splits by space: ["Bearer", "eyJhbG..."]
      // [1] gets the second element (the actual token)
    }

    // If no token found, user is not logged in
    if (!token) {
      return next(new AppError('Not authenticated. Please log in.', 401));
    }

    // Step 2: Verify the token
    // jwt.verify() does THREE things:
    // 1. Checks if the token was signed with our secret
    // 2. Checks if the token has expired
    // 3. Decodes the payload (id, email, role)
    // If ANY check fails, it throws an error
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtError) {
      // jwt.verify throws specific error types:
      // - TokenExpiredError: token is valid but expired
      // - JsonWebTokenError: token is malformed or wrong signature
      if (jwtError.name === 'TokenExpiredError') {
        return next(new AppError('Token expired. Please log in again.', 401));
      }
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // Step 3: Check if the user still exists in the database
    // Why? The user might have been deleted AFTER the token was issued
    // The token would still be valid (not expired) but the user is gone
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // Step 4: Attach user info to the request object
    // Now every controller after this middleware can access req.user
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    // Continue to the next middleware or controller
    next();
  } catch (error) {
    next(new AppError('Authentication failed.', 401));
  }
};

/**
 * Middleware: Require Role
 *
 * Checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER requireAuth (needs req.user to exist).
 *
 * Usage:
 *   router.post('/generate-rooms', requireAuth, requireRole('admin'), controller);
 *   router.get('/data', requireAuth, requireRole('admin', 'student'), controller);
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'student')
 * @returns {function} Express middleware function
 */
export const requireRole = (...roles) => {
  // This is a FACTORY FUNCTION (also called "higher-order function")
  // It takes roles as arguments and RETURNS a middleware function
  //
  // Why not just: const requireRole = (req, res, next) => { ... } ?
  // Because we need to pass the allowed roles somehow.
  // We can't do: router.use(requireRole, 'admin') — that's not how Express works
  // We do: router.use(requireRole('admin')) — this returns the actual middleware

  return (req, res, next) => {
    // req.user was set by requireAuth middleware
    // If requireAuth didn't run first, req.user is undefined
    if (!req.user) {
      return next(new AppError('Not authenticated. Please log in.', 401));
    }

    // Check if the user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action.',
          403
        )
      );
      // 401 = Not authenticated (WHO are you?)
      // 403 = Not authorized (I know WHO you are, but you CAN'T do this)
    }

    next();
  };
};