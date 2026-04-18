import User from '../models/User.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import generateToken from '../utils/token.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Register a new user (student only)
 *
 * POST /api/v1/auth/register
 * Body: { name, email, password }
 *
 * Flow:
 * 1. Check if email already exists
 * 2. Create User document (password auto-hashed by pre-save hook)
 * 3. Create Student profile document (linked to user)
 * 4. Generate JWT token
 * 5. Return token + user info
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, gender, branch, guardian } = req.body;

    // Step 1: Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 409));
    }

    // Step 2: Create User
    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      provider: 'local',
    });

    // Step 3: Create Student profile with required hostel-related fields
    await Student.create({
      user_id: user._id,
      name: user.name,
      email: user.email,
      gender,
      branch,
      guardian: {
        name: guardian.name,
        phone: guardian.phone,
        email: guardian.email,
      },
    });

    // Step 4: Generate token
    const token = generateToken(user);

    // Step 5: Send response
    sendSuccess(res, 201, 'Registration successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login an existing user
 *
 * POST /api/v1/auth/login
 * Body: { email, password }
 *
 * Flow:
 * 1. Find user by email (include password field)
 * 2. Verify password
 * 3. Generate JWT token
 * 4. Return token + user info
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Step 1: Find user by email
    // .select('+password') overrides the select: false on the model
    // We NEED the password hash to compare it
    const user = await User.findOne({ email }).select('+password');

    // If user not found
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
      // We don't say "email not found" for security reasons
      // That would tell an attacker which emails exist in our system
      // Generic "invalid email or password" reveals nothing
    }

    // Step 2: Check if this is a Google OAuth user trying to login with password
    if (user.provider === 'google' && !user.password) {
      return next(
        new AppError(
          'This account uses Google login. Please sign in with Google.',
          400
        )
      );
    }

    // Step 3: Verify password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password', 401));
      // Same generic message — don't reveal if email exists but password is wrong
    }

    // Step 4: Generate JWT token
    const token = generateToken(user);

    // Step 5: Send response
    sendSuccess(res, 200, 'Login successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's info
 *
 * GET /api/v1/auth/me
 * Requires: Valid JWT token in Authorization header
 *
 * This is used by the frontend to:
 * 1. Verify the stored token is still valid
 * 2. Get fresh user data on page refresh
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user was set by the requireAuth middleware
    // It contains { id, email, role, name }
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    sendSuccess(res, 200, 'User retrieved successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
      },
    });
  } catch (error) {
    next(error);
  }
};