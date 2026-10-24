import Vendor from '../models/vendor.model.js';
import User from '../models/user.model.js';

/**
 * Apply for a vendor store (Customer role)
 */
export const applyForVendor = async (userId, { storeName, description = '', logoUrl = '' }) => {
  const existingVendor = await Vendor.findOne({ userId });
  if (existingVendor) {
    const error = new Error('A vendor application has already been submitted for this account');
    error.statusCode = 409;
    throw error;
  }

  const vendor = await Vendor.create({
    userId,
    storeName: storeName.trim(),
    description: description.trim(),
    logoUrl: logoUrl.trim(),
    status: 'pending',
    commissionPct: 10,
  });

  return vendor;
};

/**
 * Get current user's vendor profile
 */
export const getMyVendorProfile = async (userId) => {
  const vendor = await Vendor.findOne({ userId });
  return vendor;
};

/**
 * Update current vendor profile (storeName, description, logoUrl)
 */
export const updateMyVendorProfile = async (userId, { storeName, description, logoUrl }) => {
  const vendor = await Vendor.findOne({ userId });
  if (!vendor) {
    const error = new Error('Vendor profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (storeName) vendor.storeName = storeName.trim();
  if (description !== undefined) vendor.description = description.trim();
  if (logoUrl !== undefined) vendor.logoUrl = logoUrl.trim();

  await vendor.save();
  return vendor;
};

/**
 * Admin: list all vendors with optional status filter
 */
export const listVendorsAdmin = async ({ status, page = 1, limit = 50 }) => {
  const query = {};
  if (status) {
    query.status = status;
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  const [vendors, total] = await Promise.all([
    Vendor.find(query)
      .populate('userId', 'name email role createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Vendor.countDocuments(query),
  ]);

  return {
    vendors,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Admin: approve vendor application and upgrade user role to 'vendor'
 */
export const approveVendor = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor application not found');
    error.statusCode = 404;
    throw error;
  }

  vendor.status = 'approved';
  vendor.rejectionReason = '';
  await vendor.save();

  // Upgrade user role to vendor
  await User.findByIdAndUpdate(vendor.userId, { role: 'vendor' });

  return vendor;
};

/**
 * Admin: reject vendor application with optional reason
 */
export const rejectVendor = async (vendorId, reason = '') => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor application not found');
    error.statusCode = 404;
    throw error;
  }

  vendor.status = 'rejected';
  vendor.rejectionReason = reason;
  await vendor.save();

  return vendor;
};

/**
 * Admin: set vendor commission percentage (0-50%)
 */
export const updateCommissionPct = async (vendorId, commissionPct) => {
  const pct = Number(commissionPct);
  if (isNaN(pct) || pct < 0 || pct > 50) {
    const error = new Error('Commission percentage must be between 0 and 50');
    error.statusCode = 400;
    throw error;
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  vendor.commissionPct = pct;
  await vendor.save();

  return vendor;
};
