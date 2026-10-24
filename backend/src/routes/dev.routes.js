import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { fakePayOrderHandler } from '../controllers/dev.controller.js';

const router = express.Router();

// Development-only fake-pay endpoint
router.post('/orders/:id/fake-pay', authenticate, fakePayOrderHandler);

export default router;
