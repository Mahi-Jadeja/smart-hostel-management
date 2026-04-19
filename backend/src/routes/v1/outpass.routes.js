import { Router } from 'express';
import {
  createOutpass,
  getMyOutpasses,
  getAllOutpasses,
  getOutpassById,
  decideOutpass,
  getGuardianOutpassDetails,
  decideGuardianOutpass,
} from '../../controllers/outpass.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createOutpassSchema,
  decideOutpassSchema,
} from '../../validations/outpass.validation.js';

const router = Router();
/**
 * @swagger
 * /api/v1/outpass/guardian-action/{token}:
 *   get:
 *     summary: Get outpass details for guardian approval (no login)
 *     tags: [Outpass]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Outpass details for guardian review
 */
router.get('/guardian-action/:token', getGuardianOutpassDetails);

/**
 * @swagger
 * /api/v1/outpass/guardian-action/{token}/decision:
 *   patch:
 *     summary: Approve or reject outpass as guardian (no login)
 *     tags: [Outpass]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guardian decision recorded
 */
router.patch('/guardian-action/:token/decision', decideGuardianOutpass);

// All outpass routes require authentication (except the two above)
router.use(requireAuth);


/**
 * @swagger
 * components:
 *   schemas:
 *     Outpass:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         student_id:
 *           type: string
 *         from_date:
 *           type: string
 *           format: date-time
 *         to_date:
 *           type: string
 *           format: date-time
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         admin_remark:
 *           type: string
 *         approved_by:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/outpass:
 *   post:
 *     summary: Create a new outpass request
 *     tags: [Outpass]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from_date
 *               - to_date
 *               - reason
 *             properties:
 *               from_date:
 *                 type: string
 *                 format: date
 *               to_date:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Outpass request created
 */
router.post('/', validate(createOutpassSchema), createOutpass);

/**
 * @swagger
 * /api/v1/outpass/mine:
 *   get:
 *     summary: Get current student's outpass history
 *     tags: [Outpass]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student outpass history
 */
router.get('/mine', getMyOutpasses);

/**
 * @swagger
 * /api/v1/outpass:
 *   get:
 *     summary: Get all outpass requests (admin only)
 *     tags: [Outpass]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of outpass requests
 *       403:
 *         description: Admin access required
 */
router.get('/', requireRole('admin'), getAllOutpasses);

/**
 * @swagger
 * /api/v1/outpass/{id}:
 *   get:
 *     summary: Get a single outpass by ID
 *     tags: [Outpass]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Outpass details
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Outpass not found
 */
router.get('/:id', getOutpassById);

/**
 * @swagger
 * /api/v1/outpass/{id}/decision:
 *   patch:
 *     summary: Approve or reject outpass (admin only)
 *     tags: [Outpass]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Outpass decision saved
 *       400:
 *         description: Already decided
 *       403:
 *         description: Admin access required
 */
router.patch(
  '/:id/decision',
  requireRole('admin'),
  validate(decideOutpassSchema),
  decideOutpass
);

export default router;