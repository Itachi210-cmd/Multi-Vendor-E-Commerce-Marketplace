import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getAdminPayoutsHandler,
  retryPayoutHandler,
} from '../controllers/payout.controller.js';

const router = express.Router();

// Admin only: List all payouts with status and vendor filters
router.get('/', requireAuth, requireRole('admin'), getAdminPayoutsHandler);

// Admin only: Retry failed payout transfer
router.post('/:id/retry', requireAuth, requireRole('admin'), retryPayoutHandler);

export default router;
