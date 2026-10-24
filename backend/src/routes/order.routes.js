import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import {
  checkoutHandler,
  getCustomerOrdersHandler,
  getOrderByIdHandler,
  cancelOrderHandler,
} from '../controllers/order.controller.js';

const router = express.Router();

// Customer checkout
router.post('/checkout', authenticate, authorizeRoles('customer'), checkoutHandler);

// Customer view own orders
router.get('/', authenticate, authorizeRoles('customer'), getCustomerOrdersHandler);

// View single order (Customer owner, Admin, or Vendor with sub-order)
router.get('/:id', authenticate, getOrderByIdHandler);

// Customer cancel order
router.patch('/:id/cancel', authenticate, authorizeRoles('customer'), cancelOrderHandler);

export default router;
