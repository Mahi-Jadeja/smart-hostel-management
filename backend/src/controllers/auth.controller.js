import User from '../models/User.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import generateToken from '../utils/token.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Register a new user (student only)
 *
 * POST /api/v1/auth/register
 * Body: { name, email, password, gender, branch, guardian }
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, gender, branch, guardian } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 409));
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      provider: 'local',
    });

    // Create Student profile with all required fields
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

    const token = generateToken(user);

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
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (user.provider === 'google' && !user.password) {
      return next(
        new AppError(
          'This account uses Google login. Please sign in with Google.',
          400
        )
      );
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = generateToken(user);

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
 *
 * KEY ADDITION: Now returns profile_complete flag for Google OAuth users.
 * This tells the frontend whether to redirect to /complete-profile.
 *
 * A student profile is considered complete when gender is set.
 * Google OAuth creates students with only name + email (no gender/branch/guardian).
 * Local registration always includes these fields so they're always complete.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // For student role, check if their profile is complete
    // Admins are always considered complete
    let profile_complete = true;

    if (user.role === 'student') {
      const student = await Student.findOne({ user_id: user._id })
        .select('gender branch guardian');

      if (student) {
        // Profile is complete if gender is set
        // gender is the minimum required field for room allocation
        // (branch and guardian can be set later via profile page)
        profile_complete = Boolean(student.gender);
      }
    }

    sendSuccess(res, 200, 'User retrieved successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        profile_complete, // NEW — frontend uses this to redirect
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete profile for Google OAuth users
 *
 * PATCH /api/v1/auth/complete-profile
 * Requires: Valid JWT token
 * Body: { gender, branch, guardian: { name, phone, email } }
 *
 * Only applicable for students who signed up via Google OAuth.
 * Local registration already collects these fields.
 */
export const completeProfile = async (req, res, next) => {
  try {
    const { gender, branch, guardian } = req.body;

    // Find the student linked to this user
    const student = await Student.findOne({ user_id: req.user.id });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    // Prevent local registered users from using this endpoint
    // (they already provided this info during registration)
    const user = await User.findById(req.user.id);
    if (user.provider === 'local') {
      return next(
        new AppError(
          'This endpoint is only for Google OAuth users',
          400
        )
      );
    }

    // Update student profile with the missing fields
    student.gender = gender;
    student.branch = branch;
    student.guardian = {
      name: guardian.name,
      phone: guardian.phone,
      email: guardian.email,
    };

    await student.save();

    sendSuccess(res, 200, 'Profile completed successfully', {
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        gender: student.gender,
        branch: student.branch,
      },
    });
  } catch (error) {
    next(error);
  }
};