import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import {
  createCouponHandler,
  getAdminCouponsHandler,
  updateCouponHandler,
} from '../controllers/coupon.controller.js';

const router = express.Router();

// Admin only: create coupon
router.post('/', authenticate, authorizeRoles('admin'), createCouponHandler);

// Admin only: list coupons with pagination & filter
router.get('/', authenticate, authorizeRoles('admin'), getAdminCouponsHandler);

// Admin only: update coupon (soft deactivate, edit limits)
router.patch('/:id', authenticate, authorizeRoles('admin'), updateCouponHandler);

export default router;
