import { Router } from 'express';
import { register, login, getMe } from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import validate from '../../middleware/validate.js';
import { registerSchema, loginSchema } from '../../validations/auth.validation.js';
import passport from 'passport';
import generateToken from '../../utils/token.js';
import config from '../../config/env.js';

const router = Router();

// ============================================================
// SWAGGER SCHEMA DEFINITIONS
// ============================================================
// These define reusable data structures for Swagger documentation

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
// 1. authLimiter → Max 20 requests per 15 minutes
// 2. validate(registerSchema) → Check name, email, password format
// 3. register → Controller function (creates user)

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
 *         description: User data retrieved
 *       401:
 *         description: Not authenticated
 */
router.get('/me', requireAuth, getMe);
// requireAuth middleware checks the token
// If valid, getMe controller returns the user's data
// ============================================================
// GOOGLE OAUTH ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     description: Redirects to Google's login page
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    // scope = what data we're requesting from Google
    // 'profile' = name, profile picture
    // 'email' = email address
    session: false,
    // session: false = we're using JWT, not sessions
    // Passport normally creates a session, but we don't need that
  })
);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     description: Handles the redirect from Google after authentication
 *     responses:
 *       302:
 *         description: Redirect to frontend with token
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.clientUrl}/login?error=google_auth_failed`,
    // If Google auth fails, redirect to login page with error message
  }),
  (req, res) => {
    // If we reach here, Google auth was successful
    // req.user was set by Passport's callback function
    const token = generateToken(req.user);

    // Redirect to frontend with the token in the URL
    // The frontend will extract this token and store it
    res.redirect(`${config.clientUrl}/auth/callback?token=${token}`);
  }
);
export default router;