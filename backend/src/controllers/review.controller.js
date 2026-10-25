import {
  createReview,
  updateReview,
  deleteReview,
  getProductReviews,
  checkEligibility,
} from '../services/review.service.js';

export const createReviewHandler = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const { rating, comment } = req.body;
    const review = await createReview(productId, req.user, { rating, comment });
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReviewHandler = async (req, res, next) => {
  try {
    const { id: reviewId } = req.params;
    const { rating, comment } = req.body;
    const review = await updateReview(reviewId, req.user, { rating, comment });
    res.json({
      success: true,
      message: 'Review updated successfully',
      review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReviewHandler = async (req, res, next) => {
  try {
    const { id: reviewId } = req.params;
    const result = await deleteReview(reviewId, req.user);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductReviewsHandler = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const { page, limit } = req.query;
    const data = await getProductReviews(productId, { page, limit });
    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

export const checkEligibilityHandler = async (req, res, next) => {
  try {
    const { id: productId } = req.params;
    const eligibility = await checkEligibility(productId, req.user);
    res.json({
      success: true,
      ...eligibility,
    });
  } catch (error) {
    next(error);
  }
};
