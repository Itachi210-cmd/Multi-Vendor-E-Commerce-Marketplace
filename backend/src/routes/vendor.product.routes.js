import { Router } from 'express';
import { listVendorOwn } from '../controllers/product.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// GET /api/vendor/products (the logged-in vendor's own products)
router.get('/', authenticate, authorizeRoles('vendor'), listVendorOwn);

export default router;
