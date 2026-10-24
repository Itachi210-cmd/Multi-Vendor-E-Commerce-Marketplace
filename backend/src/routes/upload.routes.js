import { Router } from 'express';
import { presignUpload } from '../controllers/upload.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// POST /api/uploads/presign (approved vendor only)
router.post('/presign', authenticate, authorizeRoles('vendor'), presignUpload);

export default router;
