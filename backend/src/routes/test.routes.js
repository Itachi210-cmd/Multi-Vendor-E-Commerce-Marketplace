import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// GET /api/test/customer - accessible only by customers
router.get('/customer', authenticate, authorizeRoles('customer'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: Customer role verified',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// GET /api/test/vendor - accessible only by vendors
router.get('/vendor', authenticate, authorizeRoles('vendor'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: Vendor role verified',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// GET /api/test/admin - accessible only by administrators
router.get('/admin', authenticate, authorizeRoles('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: Administrator role verified',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
