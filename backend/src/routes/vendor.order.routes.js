import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import {
  getVendorOrdersHandler,
  updateVendorSubOrderStatusHandler,
} from '../controllers/order.controller.js';

const router = express.Router();

// All vendor order routes require authenticated vendor
router.use(authenticate, authorizeRoles('vendor'));

// Vendor view own sub-orders from paid orders
router.get('/', getVendorOrdersHandler);

// Vendor advance own sub-order status (placed -> packed -> shipped -> delivered)
router.patch('/:orderId/status', updateVendorSubOrderStatusHandler);

export default router;
