import {
  getVendorEarnings,
  getAdminPayouts,
  retryPayout,
} from '../services/payout.service.js';

/**
 * GET /api/vendor/earnings
 * Vendor only: gross sales, commission paid, net payout, and paginated payout history
 */
export const getVendorEarningsHandler = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await getVendorEarnings(req.user._id, { page, limit });
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/payouts
 * Admin only: all platform payouts with status & vendor filters, paginated
 */
export const getAdminPayoutsHandler = async (req, res, next) => {
  try {
    const { status, vendorId, page, limit } = req.query;
    const data = await getAdminPayouts({ status, vendorId, page, limit });
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/payouts/:id/retry
 * Admin only: retry a failed payout transfer
 */
export const retryPayoutHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payout = await retryPayout(id);
    return res.status(200).json({
      success: true,
      message: 'Payout transfer retried successfully',
      payout,
    });
  } catch (err) {
    next(err);
  }
};
