import { Router } from 'express';
import {
  register,
  loginHandler,
  refresh,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import {
  registerValidationRules,
  loginValidationRules,
} from '../middleware/validator.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/auth/register
router.post('/register', authRateLimiter, registerValidationRules, register);

// POST /api/auth/login
router.post('/login', authRateLimiter, loginValidationRules, loginHandler);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

export default router;
