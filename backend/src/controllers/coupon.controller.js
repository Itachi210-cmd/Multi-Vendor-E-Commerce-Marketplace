import {
  validateCoupon,
  createCoupon,
  getAdminCoupons,
  updateCoupon,
} from '../services/coupon.service.js';

export const validateCouponHandler = async (req, res, next) => {
  try {
    const { code } = req.body;
    const result = await validateCoupon(code, req.user._id);
    res.json({
      success: true,
      valid: result.valid,
      discount: result.discount,
      code: result.code || code,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const createCouponHandler = async (req, res, next) => {
  try {
    const coupon = await createCoupon(req.body);
    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminCouponsHandler = async (req, res, next) => {
  try {
    const { page, limit, active } = req.query;
    const data = await getAdminCoupons({ page, limit, active });
    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCouponHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await updateCoupon(id, req.body);
    res.json({
      success: true,
      message: 'Coupon updated successfully',
      coupon,
    });
  } catch (error) {
    next(error);
  }
};
