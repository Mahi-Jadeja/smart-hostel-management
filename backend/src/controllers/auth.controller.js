import crypto from 'crypto';
import User from '../models/User.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import generateToken from '../utils/token.js';
import { sendSuccess } from '../utils/response.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import config from '../config/env.js';


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


/**
 * Request a password reset link
 *
 * POST /api/v1/auth/forgot-password
 * Body: { email }
 *
 * Security note:
 *   We ALWAYS return the same generic success message
 *   regardless of whether the email exists in our database.
 *   This prevents "user enumeration" attacks where an attacker
 *   could discover which emails are registered by testing responses.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Try to find the user (but do NOT reveal if not found)
    const user = await User.findOne({ email });

    // If no user found — return generic success (no enumeration)
    // We still return 200 so the attacker learns nothing
    if (!user) {
      return sendSuccess(
        res,
        200,
        'If that email is registered, a password reset link has been sent.'
      );
    }

    // Block Google OAuth users from using this flow
    // They have no password — they must use Google to sign in
    if (user.provider === 'google' && !user.password) {
      return sendSuccess(
        res,
        200,
        'If that email is registered, a password reset link has been sent.'
      );
      // Note: We return the same generic message here too.
      // Returning a specific "use Google" message would reveal
      // that the email IS registered (enumeration vulnerability).
    }

    // Generate the reset token (raw = goes in email, hashed = stored in DB)
    // This method sets user.resetPasswordToken and user.resetPasswordExpire
    // but does NOT save — we save below
    const rawToken = user.createPasswordResetToken();

    // Save the user with the new token fields
    // validateBeforeSave: false skips full schema validation
    // We only changed two fields, no need to re-validate name/email/etc.
    await user.save({ validateBeforeSave: false });

    // Build the full reset URL that goes into the email
    // rawToken is the plain token — ResetPassword page extracts it from URL
    const resetUrl = `${config.clientUrl}/reset-password/${rawToken}`;

    // Attempt to send the email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch (emailError) {
      // If email fails, roll back the token fields
      // We do NOT want a token sitting in the DB if the email never arrived
      // (user would have no way to get the raw token to use it)
      console.error('❌ Password reset email failed:', emailError.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError('Failed to send reset email. Please try again later.', 500)
      );
    }

    // Generic success — same message whether user exists or not
    sendSuccess(
      res,
      200,
      'If that email is registered, a password reset link has been sent.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using the token from the email link
 *
 * PATCH /api/v1/auth/reset-password/:token
 * Params: token (raw token from email URL)
 * Body: { password, confirmPassword }
 *
 * Flow:
 *   1. Hash the incoming raw token
 *   2. Find user where stored hash matches AND token is not expired
 *   3. Update password → pre('save') hook auto-hashes it
 *   4. Clear the reset token fields (one-time use enforced)
 *   5. Return success (user must log in manually with new password)
 */
export const resetPassword = async (req, res, next) => {
  try {
    // Step 1: Hash the raw token from the URL
    // We stored the hashed version in DB, so we must hash the incoming
    // token before comparing — never store or compare raw tokens
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Step 2: Find user with matching token that has NOT expired
    // Both conditions must be true — expired tokens are rejected
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
      // $gt: Date.now() means: expiry date is GREATER THAN now (still valid)
    });

    // If no user found, token is either invalid or expired
    if (!user) {
      return next(
        new AppError('Reset link is invalid or has expired. Please request a new one.', 400)
      );
    }

    // Step 3: Set the new password
    // The pre('save') hook in User.js will automatically bcrypt hash this
    // We do NOT hash manually here — the hook handles it
    user.password = req.body.password;

    // Step 4: Clear the reset token fields — enforce one-time use
    // Setting to undefined removes the field from the document
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Step 5: Save — this triggers the pre('save') bcrypt hook
    // No validateBeforeSave: false here — we WANT full validation
    // to ensure the new password meets the minlength: 6 rule
    await user.save();

    // Step 6: Return success — user must now log in with new password
    // We deliberately do NOT return a JWT token here.
    // Reason: The reset link could have been clicked by someone else
    // (e.g., email forwarded). Requiring manual login is safer.
    sendSuccess(res, 200, 'Password reset successful. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
};