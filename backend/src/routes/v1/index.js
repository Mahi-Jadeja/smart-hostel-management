// This file combines ALL route modules into a single router
// Then app.js mounts this entire router under /api/v1/

import { Router } from 'express';

const router = Router();

// Each route module will be imported and mounted here as we build them
// Example (we'll uncomment these as we build each feature):
//
// import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import hostelRoutes from './hostel.routes.js';
// import complaintRoutes from './complaints.routes.js';
// import outpassRoutes from './outpass.routes.js';
// import paymentRoutes from './payments.routes.js';
// import adminRoutes from './admin.routes.js';
//
// router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/hostel', hostelRoutes);
// router.use('/complaints', complaintRoutes);
// router.use('/outpass', outpassRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/admin', adminRoutes);

// Temporary: A simple test route to verify v1 routing works
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is working',
  });
});

export default router;