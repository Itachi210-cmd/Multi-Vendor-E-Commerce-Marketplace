import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validateCouponHandler } from '../controllers/coupon.controller.js';

const router = express.Router();

// Customer: validate coupon against current cart subtotal
router.post('/validate', authenticate, authorizeRoles('customer'), validateCouponHandler);

export default router;
