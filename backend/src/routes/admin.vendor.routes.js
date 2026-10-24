import { Router } from 'express';
import {
  adminListVendors,
  adminApproveVendor,
  adminRejectVendor,
  adminUpdateCommission,
} from '../controllers/vendor.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Protect all admin vendor routes
router.use(authenticate, authorizeRoles('admin'));

// GET /api/admin/vendors?status=
router.get('/', adminListVendors);

// PATCH /api/admin/vendors/:id/approve
router.patch('/:id/approve', adminApproveVendor);

// PATCH /api/admin/vendors/:id/reject
router.patch('/:id/reject', adminRejectVendor);

// PATCH /api/admin/vendors/:id/commission
router.patch('/:id/commission', adminUpdateCommission);

export default router;
