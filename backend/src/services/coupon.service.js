import Coupon from '../models/coupon.model.js';
import { getCart } from './cart.service.js';

/**
 * Validate a coupon for a given customer and cart/order subtotal
 * @param {string} code
 * @param {string|ObjectId} userId
 * @param {number} subtotalInPaise - optional, if not provided, reads from customer's Redis cart
 */
export const validateCoupon = async (code, userId, subtotalInPaise = null) => {
  if (!code || !code.trim()) {
    return { valid: false, discount: 0, message: 'Coupon code is required' };
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: cleanCode });

  if (!coupon) {
    return { valid: false, discount: 0, message: 'Invalid coupon code' };
  }

  // 1. Active status check
  if (!coupon.isActive) {
    return { valid: false, discount: 0, message: 'Coupon is inactive' };
  }

  // 2. Expiration check
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, discount: 0, message: 'Coupon has expired' };
  }

  // 3. Global usage limit check
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, discount: 0, message: 'Coupon usage limit has been reached' };
  }

  // 4. Per-user usage limit check
  if (userId) {
    const userUsage = coupon.userUsages.find(
      (u) => u.userId.toString() === userId.toString()
    );
    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      return {
        valid: false,
        discount: 0,
        message: `You have reached the usage limit (${coupon.perUserLimit}) for this coupon`,
      };
    }
  }

  // 5. Determine order subtotal in paise
  let totalPaise = subtotalInPaise;
  if (totalPaise === null) {
    const cart = await getCart(userId);
    totalPaise = Math.round((cart.subtotal || 0) * 100);
  }

  if (totalPaise <= 0) {
    return { valid: false, discount: 0, message: 'Order subtotal must be greater than zero' };
  }

  // 6. Minimum order check
  const minOrderPaise = Math.round(coupon.minOrder * 100);
  if (totalPaise < minOrderPaise) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order subtotal of ₹${coupon.minOrder} is required for this coupon`,
    };
  }

  // 7. Calculate discount in paise
  let discountPaise = 0;
  if (coupon.type === 'percent') {
    discountPaise = Math.round((totalPaise * coupon.value) / 100);
    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
      const maxDiscountPaise = Math.round(coupon.maxDiscount * 100);
      if (discountPaise > maxDiscountPaise) {
        discountPaise = maxDiscountPaise;
      }
    }
  } else if (coupon.type === 'flat') {
    discountPaise = Math.round(coupon.value * 100);
  }

  // Discount can never exceed subtotal
  if (discountPaise > totalPaise) {
    discountPaise = totalPaise;
  }

  const discount = Number((discountPaise / 100).toFixed(2));

  return {
    valid: true,
    discount,
    discountPaise,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    message: 'Coupon applied successfully',
    coupon,
  };
};

/**
 * Distribute total discount in paise proportionally across sub-orders using the Largest Remainder Method
 * @param {Array<{ subtotalPaise: number, vendorId: string }>} subOrderInfos
 * @param {number} totalDiscountPaise
 * @returns {Array<number>} array of discountPaise allocated to each subOrder
 */
export const distributeDiscountLargestRemainder = (subOrderInfos, totalDiscountPaise) => {
  if (!subOrderInfos || subOrderInfos.length === 0) return [];
  if (totalDiscountPaise <= 0) {
    return subOrderInfos.map(() => 0);
  }

  const grandSubtotalPaise = subOrderInfos.reduce((sum, s) => sum + s.subtotalPaise, 0);
  if (grandSubtotalPaise <= 0) {
    return subOrderInfos.map(() => 0);
  }

  // Ensure discount does not exceed grand subtotal
  const cappedDiscount = Math.min(totalDiscountPaise, grandSubtotalPaise);

  const exactShares = subOrderInfos.map((s, idx) => {
    const exact = (s.subtotalPaise * cappedDiscount) / grandSubtotalPaise;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return { idx, floor, remainder, subtotalPaise: s.subtotalPaise };
  });

  const sumFloors = exactShares.reduce((sum, s) => sum + s.floor, 0);
  let remainingPaise = cappedDiscount - sumFloors;

  // Sort descending by remainder, breaking ties by index
  const sortedShares = [...exactShares].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.idx - b.idx;
  });

  const allocated = new Array(subOrderInfos.length).fill(0);
  sortedShares.forEach((share, rank) => {
    allocated[share.idx] = share.floor + (rank < remainingPaise ? 1 : 0);
  });

  return allocated;
};

/**
 * Record atomic coupon usage when an order becomes paid
 * Guarded by usageLimit and perUserLimit
 */
export const recordCouponUsage = async (couponCode, userId) => {
  if (!couponCode) return null;
  const cleanCode = couponCode.trim().toUpperCase();

  const coupon = await Coupon.findOne({ code: cleanCode });
  if (!coupon) return null;

  // Guarded update: check usageLimit and per-user limit
  const userUsage = coupon.userUsages.find(
    (u) => u.userId.toString() === userId.toString()
  );
  const currentCount = userUsage ? userUsage.count : 0;

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    const err = new Error('Coupon usage limit reached during payment processing');
    err.statusCode = 409;
    throw err;
  }

  if (currentCount >= coupon.perUserLimit) {
    const err = new Error('Coupon per-user limit exceeded during payment processing');
    err.statusCode = 409;
    throw err;
  }

  // Atomic update
  if (userUsage) {
    await Coupon.findOneAndUpdate(
      { code: cleanCode, 'userUsages.userId': userId },
      {
        $inc: {
          usedCount: 1,
          'userUsages.$.count': 1,
        },
      }
    );
  } else {
    await Coupon.findOneAndUpdate(
      { code: cleanCode },
      {
        $inc: { usedCount: 1 },
        $push: { userUsages: { userId, count: 1 } },
      }
    );
  }

  return true;
};

/**
 * Restore coupon usage when an order is cancelled or refunded
 */
export const restoreCouponUsage = async (couponCode, userId) => {
  if (!couponCode) return null;
  const cleanCode = couponCode.trim().toUpperCase();

  const coupon = await Coupon.findOne({ code: cleanCode });
  if (!coupon) return null;

  const userUsage = coupon.userUsages.find(
    (u) => u.userId.toString() === userId.toString()
  );

  if (userUsage && userUsage.count > 0) {
    await Coupon.findOneAndUpdate(
      { code: cleanCode, 'userUsages.userId': userId },
      {
        $inc: {
          usedCount: -1,
          'userUsages.$.count': -1,
        },
      }
    );
  } else {
    await Coupon.findOneAndUpdate(
      { code: cleanCode },
      {
        $inc: { usedCount: -1 },
      }
    );
  }

  return true;
};

/**
 * Admin: Create coupon
 */
export const createCoupon = async (data) => {
  const { code, type, value, minOrder, maxDiscount, expiresAt, usageLimit, perUserLimit, isActive } =
    data;

  if (!code || !code.trim()) {
    const err = new Error('Coupon code is required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (existing) {
    const err = new Error('A coupon with this code already exists');
    err.statusCode = 409;
    throw err;
  }

  const coupon = await Coupon.create({
    code: code.trim().toUpperCase(),
    type,
    value: Number(value),
    minOrder: minOrder !== undefined ? Number(minOrder) : 0,
    maxDiscount: maxDiscount !== undefined && maxDiscount !== null && maxDiscount !== '' ? Number(maxDiscount) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    usageLimit: usageLimit !== undefined && usageLimit !== null && usageLimit !== '' ? Number(usageLimit) : null,
    perUserLimit: perUserLimit !== undefined && perUserLimit !== null && perUserLimit !== '' ? Number(perUserLimit) : 1,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  return coupon;
};

/**
 * Admin: List coupons with pagination
 */
export const getAdminCoupons = async ({ page = 1, limit = 20, active } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (active !== undefined && active !== 'all') {
    filter.isActive = active === 'true' || active === true;
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Coupon.countDocuments(filter),
  ]);

  return {
    coupons,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
  };
};

/**
 * Admin: Update coupon (soft deactivate, no hard delete)
 */
export const updateCoupon = async (id, data) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    const err = new Error('Coupon not found');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    'value',
    'minOrder',
    'maxDiscount',
    'expiresAt',
    'usageLimit',
    'perUserLimit',
    'isActive',
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      if (field === 'expiresAt') {
        coupon.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      } else if (field === 'maxDiscount' || field === 'usageLimit') {
        coupon[field] = data[field] === null || data[field] === '' ? null : Number(data[field]);
      } else if (field === 'isActive') {
        coupon.isActive = Boolean(data.isActive);
      } else if (['value', 'minOrder', 'perUserLimit'].includes(field)) {
        coupon[field] = Number(data[field]);
      }
    }
  });

  await coupon.save();
  return coupon;
};

export const couponService = {
  validateCoupon,
  distributeDiscountLargestRemainder,
  recordCouponUsage,
  restoreCouponUsage,
  createCoupon,
  getAdminCoupons,
  updateCoupon,
};

export default couponService;
