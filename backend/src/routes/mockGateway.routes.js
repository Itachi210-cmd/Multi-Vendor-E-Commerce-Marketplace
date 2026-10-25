import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { processMockPayment } from '../controllers/mockGateway.controller.js';

const router = express.Router();

// Customer only, process simulated sandbox payment
router.post('/pay', requireAuth, requireRole('customer'), processMockPayment);

export default router;
