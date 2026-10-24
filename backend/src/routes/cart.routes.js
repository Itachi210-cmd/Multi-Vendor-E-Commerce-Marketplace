import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import {
  getCartHandler,
  addToCartHandler,
  updateCartItemHandler,
  removeFromCartHandler,
  clearCartHandler,
} from '../controllers/cart.controller.js';

const router = express.Router();

// All cart routes require customer login
router.use(authenticate, authorizeRoles('customer'));

router.get('/', getCartHandler);
router.post('/items', addToCartHandler);
router.patch('/items/:productId', updateCartItemHandler);
router.delete('/items/:productId', removeFromCartHandler);
router.delete('/', clearCartHandler);

export default router;
