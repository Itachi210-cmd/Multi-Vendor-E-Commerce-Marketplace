import { Router } from 'express';
import {
  create,
  update,
  remove,
  getById,
  listPublic,
  getSuggestions,
} from '../controllers/product.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { suggestRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public: GET /api/products (paginated list of active products with search & facets)
router.get('/', listPublic);

// Public: GET /api/products/suggest?q= (prefix suggestions with rate limiter)
router.get('/suggest', suggestRateLimiter, getSuggestions);

// Public: GET /api/products/:id (single active product)
router.get('/:id', getById);

// Vendor: POST /api/products (create product)
router.post('/', authenticate, authorizeRoles('vendor'), create);

// Vendor: PUT /api/products/:id (update owning product)
router.put('/:id', authenticate, authorizeRoles('vendor'), update);

// Vendor: DELETE /api/products/:id (soft delete owning product)
router.delete('/:id', authenticate, authorizeRoles('vendor'), remove);

export default router;
