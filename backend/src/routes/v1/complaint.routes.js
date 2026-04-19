import { Router } from 'express';
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getComplaintStats,
} from '../../controllers/complaint.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createComplaintSchema,
  updateComplaintSchema,
} from '../../validations/complaint.validation.js';

const router = Router();

// All complaint routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * components:
 *   schemas:
 *     Complaint:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         student_id:
 *           type: string
 *         category:
 *           type: string
 *           enum: [plumbing, electrical, furniture, cleaning, food, laundry, internet, security, medical, noise, other]
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, in_progress, resolved]
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *         admin_remark:
 *           type: string
 *         room_no:
 *           type: string
 *         hostel_block:
 *           type: string
 *         resolved_at:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/complaints:
 *   post:
 *     summary: Create a new complaint (student only)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - description
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [plumbing, electrical, furniture, cleaning, food, laundry, internet, security, medical, noise, other]
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Complaint created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.post('/', validate(createComplaintSchema), createComplaint);

/**
 * @swagger
 * /api/v1/complaints/mine:
 *   get:
 *     summary: Get my complaints (student)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of complaints with pagination
 */
router.get('/mine', getMyComplaints);

/**
 * @swagger
 * /api/v1/complaints/stats:
 *   get:
 *     summary: Get complaint statistics (admin only)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated complaint statistics
 *       403:
 *         description: Admin access required
 */
router.get('/stats', requireRole('admin'), getComplaintStats);

/**
 * @swagger
 * /api/v1/complaints:
 *   get:
 *     summary: Get all complaints (admin only)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, resolved]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all complaints with pagination
 *       403:
 *         description: Admin access required
 */
router.get('/', requireRole('admin'), getAllComplaints);

/**
 * @swagger
 * /api/v1/complaints/{id}:
 *   get:
 *     summary: Get a single complaint by ID
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Complaint details
 *       403:
 *         description: Can only view own complaints (students)
 *       404:
 *         description: Complaint not found
 */
router.get('/:id', getComplaintById);

/**
 * @swagger
 * /api/v1/complaints/{id}:
 *   patch:
 *     summary: Update a complaint (admin only)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, resolved]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               admin_remark:
 *                 type: string
 *     responses:
 *       200:
 *         description: Complaint updated successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Complaint not found
 */
router.patch(
  '/:id',
  requireRole('admin'),
  validate(updateComplaintSchema),
  updateComplaint
);

/**
 * @swagger
 * /api/v1/complaints/{id}:
 *   delete:
 *     summary: Delete a complaint (student only, pending only)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Complaint deleted successfully
 *       400:
 *         description: Can only delete pending complaints
 *       403:
 *         description: Can only delete own complaints
 *       404:
 *         description: Complaint not found
 */
router.delete('/:id', deleteComplaint);

export default router;