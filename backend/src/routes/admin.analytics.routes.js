import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getAdminAnalyticsHandler } from '../controllers/analytics.controller.js';

const router = express.Router();

// Admin only: get analytics dashboard data
router.get('/', authenticate, authorizeRoles('admin'), getAdminAnalyticsHandler);

export default router;
