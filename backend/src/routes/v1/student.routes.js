import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getRoom,
  getDashboardStats,
  getRoomPreference,
  searchRoommateOptions,
  updateRoomPreference,
  getLayoutPreview,
  getStudentFloorLayout,
} from '../../controllers/student.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  updateProfileSchema,
  updateRoomPreferenceSchema,
} from '../../validations/student.validation.js';

const router = Router();

// All student routes require authentication
// Instead of adding requireAuth to each route individually,
// we apply it to ALL routes in this router
router.use(requireAuth);

/**
 * @swagger
 * /api/v1/student/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Profile not found
 */
router.get('/profile', getProfile);

/**
 * @swagger
 * /api/v1/student/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               college_id:
 *                 type: string
 *               branch:
 *                 type: string
 *                 enum:
 *                   - Artificial Intelligence and Machine Learning
 *                   - Electronics and Telecommunication
 *                   - Computer Science
 *                   - Robotics and Automation
 *                   - Mechanical Engineering
 *                   - Civil Engineering
 *               year:
 *                 type: number
 *               semester:
 *                 type: number
 *               guardian:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 */
router.put('/profile', validate(updateProfileSchema), updateProfile);
/**
 * @swagger
 * /api/v1/student/room-preference:
 *   get:
 *     summary: Get current student's preferred roommate
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current room preference
 */
router.get('/room-preference', getRoomPreference);

/**
 * @swagger
 * /api/v1/student/room-preference:
 *   put:
 *     summary: Set or clear preferred roommate
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Room preference updated
 */
router.put(
  '/room-preference',
  validate(updateRoomPreferenceSchema),
  updateRoomPreference
);

/**
 * @swagger
 * /api/v1/student/roommate-options:
 *   get:
 *     summary: Search roommate options for current student
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roommate search results
 */
router.get('/roommate-options', searchRoommateOptions);
/**
 * @swagger
 * /api/v1/student/room:
 *   get:
 *     summary: Get room allocation info with roommates
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Room data (null if not allocated)
 */
router.get('/room', getRoom);
/**
 * @swagger
 * /api/v1/student/room-layout:
 *   get:
 *     summary: Get floor layout with privacy rules (Allocated students)
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Floor layout data
 */
router.get('/room-layout', getStudentFloorLayout);

/**
 * @swagger
 * /api/v1/student/layout-preview:
 *   get:
 *     summary: View floor layout anonymously (Unallocated students)
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: block
 *         schema:
 *           type: string
 *       - in: query
 *         name: floor
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Safe layout preview
 */
router.get('/layout-preview', getLayoutPreview);
/**
 * @swagger
 * /api/v1/student/dashboard-stats:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated stats from all modules
 */
router.get('/dashboard-stats', getDashboardStats);

export default router;