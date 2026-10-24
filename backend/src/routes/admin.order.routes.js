import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getAdminOrdersHandler } from '../controllers/order.controller.js';

const router = express.Router();

// Admin-only order list
router.use(authenticate, authorizeRoles('admin'));

router.get('/', getAdminOrdersHandler);

export default router;
