import { Router } from 'express';
import {
  register,
  login,
  getMe,
  completeProfile,  // NEW — for Google OAuth users
} from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import validate from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  completeProfileSchema,  // NEW
} from '../../validations/auth.validation.js';
import passport from 'passport';
import generateToken from '../../utils/token.js';
import config from '../../config/env.js';

const router = Router();

// ============================================================
// SWAGGER SCHEMA DEFINITIONS
// ============================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - gender
 *         - branch
 *         - guardian
 *       properties:
 *         name:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: Password123
 *         gender:
 *           type: string
 *           enum: [male, female]
 *           example: male
 *         branch:
 *           type: string
 *           enum:
 *             - Artificial Intelligence and Machine Learning
 *             - Electronics and Telecommunication
 *             - Computer Science
 *             - Robotics and Automation
 *             - Mechanical Engineering
 *             - Civil Engineering
 *           example: Computer Science
 *         guardian:
 *           type: object
 *           required:
 *             - name
 *             - phone
 *             - email
 *           properties:
 *             name:
 *               type: string
 *               example: Suresh Patil
 *             phone:
 *               type: string
 *               example: 9876543210
 *             email:
 *               type: string
 *               format: email
 *               example: guardian@example.com
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: Password123
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *     CompleteProfileInput:
 *       type: object
 *       required:
 *         - gender
 *         - branch
 *         - guardian
 *       properties:
 *         gender:
 *           type: string
 *           enum: [male, female]
 *           example: male
 *         branch:
 *           type: string
 *           example: Computer Science
 *         guardian:
 *           type: object
 *           required:
 *             - name
 *             - phone
 *             - email
 *           properties:
 *             name:
 *               type: string
 *               example: Suresh Patil
 *             phone:
 *               type: string
 *               example: 9876543210
 *             email:
 *               type: string
 *               format: email
 *               example: guardian@example.com
 */

// ============================================================
// ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new student account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post('/register', authLimiter, validate(registerSchema), register);
// Middleware chain:
// 1. authLimiter   → Max 20 requests per 15 minutes (brute force protection)
// 2. validate()    → Zod schema check (name, email, password, gender, branch, guardian)
// 3. register      → Controller creates User + Student documents

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validate(loginSchema), login);
// Middleware chain:
// 1. authLimiter  → Rate limiting
// 2. validate()   → Email + password format check
// 3. login        → Controller verifies credentials and returns token

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     provider:
 *                       type: string
 *                     profile_complete:
 *                       type: boolean
 *                       description: >
 *                         False for Google OAuth students who haven't
 *                         filled in gender/branch/guardian yet.
 *                         Always true for admin and local-registered students.
 *       401:
 *         description: Not authenticated
 */
router.get('/me', requireAuth, getMe);
// requireAuth middleware validates the JWT token
// If valid, sets req.user = { id, email, role, name }
// getMe controller returns user info + profile_complete flag

/**
 * @swagger
 * /api/v1/auth/complete-profile:
 *   patch:
 *     summary: Complete profile for Google OAuth users
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Google OAuth creates student accounts with only name and email.
 *       This endpoint collects the remaining required fields:
 *       gender, branch, and guardian details.
 *       Only applicable for students who signed up via Google OAuth.
 *       Local registered students already provide these at sign-up.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteProfileInput'
 *     responses:
 *       200:
 *         description: Profile completed successfully
 *       400:
 *         description: Validation error or not a Google OAuth user
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Student profile not found
 */
router.patch(
  '/complete-profile',
  requireAuth,           // Must be logged in (Google OAuth gives them a token)
  validate(completeProfileSchema),  // Validate gender, branch, guardian
  completeProfile        // Controller updates the Student document
);

// ============================================================
// GOOGLE OAUTH ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     description: Redirects user to Google's login/consent page
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    // scope = what data we're requesting from Google
    // 'profile' → name, profile picture
    // 'email'   → email address
    session: false,
    // session: false = we use JWT, not server-side sessions
  })
);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback URL
 *     tags: [Auth]
 *     description: >
 *       Handles the redirect from Google after the user
 *       authenticates. Generates a JWT and redirects to
 *       the frontend callback page with the token.
 *       Frontend then calls /auth/me to check profile_complete.
 *     responses:
 *       302:
 *         description: Redirect to frontend /auth/callback?token=...
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.clientUrl}/login?error=google_auth_failed`,
    // On Google auth failure → redirect to login with error param
  }),
  (req, res) => {
    // Google auth succeeded — req.user set by Passport callback
    // Generate JWT token for the user
    const token = generateToken(req.user);

    // Redirect to frontend OAuthCallback page with token in URL.
    // Frontend extracts token → calls loginWithToken()
    // → calls /auth/me → checks profile_complete
    // → redirects to /complete-profile if needed
    // → redirects to /student/dashboard if profile is complete
    res.redirect(`${config.clientUrl}/auth/callback?token=${token}`);
  }
);

export default router;