import {
  applyForVendor,
  getMyVendorProfile,
  updateMyVendorProfile,
  listVendorsAdmin,
  approveVendor,
  rejectVendor,
  updateCommissionPct,
} from '../services/vendor.service.js';

/**
 * Apply to become a vendor
 * POST /api/vendors/apply
 */
export const apply = async (req, res, next) => {
  try {
    const { storeName, description, logoUrl } = req.body;
    if (!storeName || !storeName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Store name is required',
      });
    }

    const vendor = await applyForVendor(req.user._id, {
      storeName,
      description,
      logoUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully and is pending review',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's vendor profile & status
 * GET /api/vendors/me
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const vendor = await getMyVendorProfile(req.user._id);
    res.status(200).json({
      success: true,
      vendor: vendor || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current vendor profile
 * PUT /api/vendors/me
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const { storeName, description, logoUrl } = req.body;
    const vendor = await updateMyVendorProfile(req.user._id, {
      storeName,
      description,
      logoUrl,
    });

    res.status(200).json({
      success: true,
      message: 'Vendor profile updated successfully',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: list vendors with optional status filter
 * GET /api/admin/vendors?status=
 */
export const adminListVendors = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const result = await listVendorsAdmin({ status, page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: approve vendor
 * PATCH /api/admin/vendors/:id/approve
 */
export const adminApproveVendor = async (req, res, next) => {
  try {
    const vendor = await approveVendor(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Vendor application approved. User upgraded to vendor role.',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: reject vendor
 * PATCH /api/admin/vendors/:id/reject
 */
export const adminRejectVendor = async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const vendor = await rejectVendor(req.params.id, reason);
    res.status(200).json({
      success: true,
      message: 'Vendor application rejected',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: set commission percentage
 * PATCH /api/admin/vendors/:id/commission
 */
export const adminUpdateCommission = async (req, res, next) => {
  try {
    const { commissionPct } = req.body;
    const vendor = await updateCommissionPct(req.params.id, commissionPct);
    res.status(200).json({
      success: true,
      message: 'Vendor commission percentage updated successfully',
      vendor,
    });
  } catch (error) {
    next(error);
  }
};
