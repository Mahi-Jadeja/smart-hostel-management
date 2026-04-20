import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import complaintRoutes from './complaint.routes.js';
import outpassRoutes from './outpass.routes.js';
import paymentRoutes from './payment.routes.js';
import hostelRoutes from './hostel.routes.js';
const router = Router();

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/complaints', complaintRoutes);

// We'll add more as we build them:
 router.use('/hostel', hostelRoutes);
 router.use('/outpass', outpassRoutes);
 router.use('/payments', paymentRoutes);
// router.use('/admin', adminRoutes);

export default router;