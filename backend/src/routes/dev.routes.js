import express from 'express';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { fakePayOrderHandler } from '../controllers/dev.controller.js';

const router = express.Router();

const devOnlyGuard = (req, res, next) => {
  if (env.nodeEnv !== 'development' || !env.enableFakePay) {
    return res.status(404).json({
      success: false,
      message: 'Not found',
    });
  }
  next();
};

// Development-only fake-pay endpoint
router.post('/orders/:id/fake-pay', devOnlyGuard, authenticate, fakePayOrderHandler);

export default router;
