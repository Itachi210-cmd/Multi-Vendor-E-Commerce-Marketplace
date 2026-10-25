import mongoose from 'mongoose';
import Review from '../models/review.model.js';
import Product from '../models/product.model.js';
import Order from '../models/order.model.js';
import Vendor from '../models/vendor.model.js';
import { searchService } from './search.service.js';

/**
 * Recompute a product's ratingAvg (1 decimal) and ratingCount using MongoDB aggregation,
 * save to Product document, and sync to Elasticsearch (non-blocking).
 */
export const recomputeProductRating = async (productId) => {
  const pId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  const stats = await Review.aggregate([
    { $match: { productId: pId } },
    {
      $group: {
        _id: '$productId',
        ratingAvg: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const ratingAvg = stats.length > 0 ? Number(stats[0].ratingAvg.toFixed(1)) : 0;
  const ratingCount = stats.length > 0 ? stats[0].ratingCount : 0;

  await Product.findByIdAndUpdate(productId, { ratingAvg, ratingCount });

  // Non-blocking sync to Elasticsearch (failures only logged)
  try {
    await searchService.updateRating(pId.toString(), ratingAvg, ratingCount);
  } catch (error) {
    console.warn(`[ReviewService] ES rating sync failed for product ${pId}:`, error.message);
  }

  return { ratingAvg, ratingCount };
};

/**
 * Check customer review eligibility for a product
 */
export const checkEligibility = async (productId, user) => {
  if (!user) {
    return { canReview: false, reason: 'Authentication required to review products' };
  }

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  // Vendors cannot review their own products
  const vendor = await Vendor.findOne({ userId: user._id });
  if (vendor && vendor._id.toString() === product.vendorId.toString()) {
    return { canReview: false, reason: 'Vendors cannot review their own products' };
  }

  // Check if customer has already reviewed
  const existingReview = await Review.findOne({
    productId: product._id,
    customerId: user._id,
  });

  if (existingReview) {
    return {
      canReview: false,
      reason: 'You have already reviewed this product',
      reviewId: existingReview._id,
      rating: existingReview.rating,
      comment: existingReview.comment,
    };
  }

  // Check if customer has a delivered subOrder containing this product from a paid order
  const deliveredOrder = await Order.findOne({
    customerId: user._id,
    'payment.status': 'paid',
    subOrders: {
      $elemMatch: {
        status: 'delivered',
        'items.productId': product._id,
      },
    },
  });

  if (!deliveredOrder) {
    return {
      canReview: false,
      reason: 'You can only review products that have been delivered to you',
    };
  }

  return {
    canReview: true,
    reason: '',
    orderId: deliveredOrder._id,
  };
};

/**
 * Create a new review for a product
 */
export const createReview = async (productId, user, { rating, comment }) => {
  const numRating = parseInt(rating, 10);
  if (!numRating || numRating < 1 || numRating > 5) {
    const err = new Error('Rating must be an integer between 1 and 5');
    err.statusCode = 400;
    throw err;
  }

  const cleanComment = (comment || '').trim();
  if (cleanComment.length > 1000) {
    const err = new Error('Comment cannot exceed 1000 characters');
    err.statusCode = 400;
    throw err;
  }

  const eligibility = await checkEligibility(productId, user);
  if (!eligibility.canReview) {
    if (eligibility.reason.includes('already reviewed')) {
      const err = new Error('You have already reviewed this product');
      err.statusCode = 409; // Conflict
      throw err;
    }
    const err = new Error(eligibility.reason);
    err.statusCode = 403; // Forbidden
    throw err;
  }

  try {
    const review = await Review.create({
      productId,
      customerId: user._id,
      orderId: eligibility.orderId,
      rating: numRating,
      comment: cleanComment,
      verifiedPurchase: true,
    });

    await recomputeProductRating(productId);

    return review;
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('You have already reviewed this product');
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Update an existing review (owner only)
 */
export const updateReview = async (reviewId, user, { rating, comment }) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    const err = new Error('Review not found');
    err.statusCode = 404;
    throw err;
  }

  // Owner only
  if (review.customerId.toString() !== user._id.toString()) {
    const err = new Error('Forbidden: You can only edit your own reviews');
    err.statusCode = 403;
    throw err;
  }

  if (rating !== undefined) {
    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      const err = new Error('Rating must be an integer between 1 and 5');
      err.statusCode = 400;
      throw err;
    }
    review.rating = numRating;
  }

  if (comment !== undefined) {
    const cleanComment = comment.trim();
    if (cleanComment.length > 1000) {
      const err = new Error('Comment cannot exceed 1000 characters');
      err.statusCode = 400;
      throw err;
    }
    review.comment = cleanComment;
  }

  await review.save();
  await recomputeProductRating(review.productId);

  return review;
};

/**
 * Delete a review (owner or admin)
 */
export const deleteReview = async (reviewId, user) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    const err = new Error('Review not found');
    err.statusCode = 404;
    throw err;
  }

  // Owner or admin
  const isOwner = review.customerId.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden: You do not have permission to delete this review');
    err.statusCode = 403;
    throw err;
  }

  const productId = review.productId;
  await Review.findByIdAndDelete(reviewId);
  await recomputeProductRating(productId);

  return { message: 'Review deleted successfully', productId };
};

/**
 * Get reviews for a product with pagination, reviewer names, and star breakdown
 */
export const getProductReviews = async (productId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const pId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  const [reviews, total, breakdown, product] = await Promise.all([
    Review.find({ productId: pId })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Review.countDocuments({ productId: pId }),
    Review.aggregate([
      { $match: { productId: pId } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]),
    Product.findById(pId).select('ratingAvg ratingCount').lean(),
  ]);

  const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdown.forEach((b) => {
    if (starCounts[b._id] !== undefined) {
      starCounts[b._id] = b.count;
    }
  });

  return {
    reviews: reviews.map((r) => ({
      _id: r._id,
      productId: r.productId,
      customerId: r.customerId?._id || r.customerId,
      customerName: r.customerId?.name || 'Customer',
      orderId: r.orderId,
      rating: r.rating,
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
    summary: {
      average: product?.ratingAvg || 0,
      totalCount: product?.ratingCount || 0,
      counts: starCounts,
    },
  };
};

export const reviewService = {
  createReview,
  updateReview,
  deleteReview,
  getProductReviews,
  checkEligibility,
  recomputeProductRating,
};

export default reviewService;
