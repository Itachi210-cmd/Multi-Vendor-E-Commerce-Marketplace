import { Router } from 'express';
import { apply, getMyProfile, updateMyProfile } from '../controllers/vendor.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/vendors/apply (logged-in customer)
router.post('/apply', authenticate, apply);

// GET /api/vendors/me (logged-in user)
router.get('/me', authenticate, getMyProfile);

// PUT /api/vendors/me (logged-in vendor)
router.put('/me', authenticate, updateMyProfile);

export default router;
