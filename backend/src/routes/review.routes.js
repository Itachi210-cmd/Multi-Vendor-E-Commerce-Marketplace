import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  updateReviewHandler,
  deleteReviewHandler,
} from '../controllers/review.controller.js';

const router = express.Router();

// Owner only: edit review
router.put('/:id', authenticate, updateReviewHandler);

// Owner or Admin: delete review
router.delete('/:id', authenticate, deleteReviewHandler);

export default router;
