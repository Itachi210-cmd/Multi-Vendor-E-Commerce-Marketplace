import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getVendorEarningsHandler } from '../controllers/payout.controller.js';

const router = express.Router();

// Vendor only: Retrieve own earnings and payouts
router.get('/', requireAuth, requireRole('vendor'), getVendorEarningsHandler);

export default router;
