import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createPaymentOrder, verifyPayment } from '../controllers/payment.controller.js';

const router = express.Router();

// Customer only: Create provider payment order
router.post('/create-order', requireAuth, requireRole('customer'), createPaymentOrder);

// Customer only: Verify payment HMAC signature and capture order
router.post('/verify', requireAuth, requireRole('customer'), verifyPayment);

export default router;
