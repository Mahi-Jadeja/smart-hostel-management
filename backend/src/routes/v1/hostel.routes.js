import { Router } from 'express';
import {
  upsertHostelConfig,
  getHostelConfigs,
  generateRooms,
  getRooms,
  getRoomLayout,
  getEligibleStudents,
  allocateStudentToRoom,
  deallocateStudent,
  previewBulkAllocation,
  executeBulkAllocation,
} from '../../controllers/hostel.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  hostelConfigSchema,
  generateRoomsSchema,
  allocateRoomSchema,
  previewBulkAllocationSchema,
  executeBulkAllocationSchema,
} from '../../validations/hostel.validation.js';

const router = Router();

// All hostel routes are admin-only
router.use(requireAuth, requireRole('admin'));

/**
 * @swagger
 * tags:
 *   name: Hostel
 *   description: Hostel block, room generation, and allocation management
 */

/**
 * @swagger
 * /api/v1/hostel/config:
 *   post:
 *     summary: Create or update hostel block config
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Config saved successfully
 */
router.post('/config', validate(hostelConfigSchema), upsertHostelConfig);

/**
 * @swagger
 * /api/v1/hostel/config:
 *   post:
 *     summary: Create or update hostel block config
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hostel_name
 *               - hostel_block
 *               - block_gender
 *               - total_floors
 *               - rooms_per_floor
 *             properties:
 *               hostel_name:
 *                 type: string
 *               hostel_block:
 *                 type: string
 *                 example: A
 *               block_gender:
 *                 type: string
 *                 enum: [male, female]
 *               total_floors:
 *                 type: integer
 *               rooms_per_floor:
 *                 type: integer
 *               default_capacity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Config saved successfully
 */
router.get('/config', getHostelConfigs);

/**
 * @swagger
 * /api/v1/hostel/generate-rooms:
 *   post:
 *     summary: Generate rooms for a hostel block
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Rooms generated successfully
 */
router.post('/generate-rooms', validate(generateRoomsSchema), generateRooms);

/**
 * @swagger
 * /api/v1/hostel/rooms:
 *   get:
 *     summary: Get rooms with optional filters
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rooms list
 */
router.get('/rooms', getRooms);

/**
 * @swagger
 * /api/v1/hostel/layout:
 *   get:
 *     summary: Get room layout grouped by floor
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Layout data
 */
router.get('/layout', getRoomLayout);

/**
 * @swagger
 * /api/v1/hostel/eligible-students:
 *   get:
 *     summary: Get unallocated students eligible for room allocation
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Eligible students list
 */
router.get('/eligible-students', getEligibleStudents);
/**
 * @swagger
 * /api/v1/hostel/allocate/preview:
 *   post:
 *     summary: Preview bulk room allocation (admin only)
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Allocation preview generated
 */
router.post(
  '/allocate/preview',
  validate(previewBulkAllocationSchema),
  previewBulkAllocation
);

/**
 * @swagger
 * /api/v1/hostel/allocate/execute:
 *   post:
 *     summary: Execute bulk room allocation (admin only)
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk allocation executed
 */
router.post(
  '/allocate/execute',
  validate(executeBulkAllocationSchema),
  executeBulkAllocation
);
/**
 * @swagger
 * /api/v1/hostel/allocate:
 *   post:
 *     summary: Allocate a student to a room
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student allocated
 */
router.post('/allocate', validate(allocateRoomSchema), allocateStudentToRoom);

/**
 * @swagger
 * /api/v1/hostel/deallocate/{studentId}:
 *   delete:
 *     summary: Deallocate a student from their room
 *     tags: [Hostel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student deallocated
 */
router.delete('/deallocate/:studentId', deallocateStudent);

export default router;