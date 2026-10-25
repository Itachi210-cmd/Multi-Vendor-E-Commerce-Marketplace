import crypto from 'crypto';
import Payout from '../models/payout.model.js';
import Order from '../models/order.model.js';
import Vendor from '../models/vendor.model.js';
import { getPaymentProvider } from './payment/index.js';

/**
 * Payout & Split Service
 * Handles multi-vendor payout generation, Route transfers, and earnings aggregation.
 */

/**
 * Create or update payouts for all sub-orders of a paid order.
 * Strictly idempotent due to unique index on (orderId, vendorId).
 */
export const createPayouts = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  const provider = getPaymentProvider(order.payment?.provider || 'mock');
  const results = [];

  for (const subOrder of order.subOrders) {
    const vendorId = subOrder.vendorId?._id || subOrder.vendorId;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      console.error(`[PayoutService] Vendor ${vendorId} not found for subOrder`);
      continue;
    }

    // Lazily generate linked payment account ID if missing
    if (!vendor.paymentAccountId) {
      vendor.paymentAccountId = `acc_mock_${crypto.randomBytes(6).toString('hex')}`;
      if (!vendor.razorpayLinkedAccountId) {
        vendor.razorpayLinkedAccountId = vendor.paymentAccountId;
      }
      await vendor.save();
    }

    // Vendor payout in integer paise
    const payoutPaise = Math.round(subOrder.vendorPayout * 100);

    // Call provider transfer
    let transferResult;
    try {
      transferResult = await provider.createTransfer({
        paymentId: order.payment?.providerPaymentId || '',
        accountId: vendor.paymentAccountId,
        amountPaise: payoutPaise,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          vendorId: vendor._id.toString(),
        },
      });
    } catch (transferErr) {
      transferResult = {
        transferId: '',
        status: 'failed',
        error: transferErr.message || 'Transfer failed on gateway',
      };
    }

    const isProcessed = transferResult.status === 'processed';

    const payoutDoc = await Payout.findOneAndUpdate(
      { orderId: order._id, vendorId: vendor._id },
      {
        amount: subOrder.vendorPayout,
        commission: subOrder.commission,
        transferId: transferResult.transferId || '',
        status: isProcessed ? 'processed' : 'failed',
        failureReason: isProcessed ? '' : transferResult.error || 'Transfer failed',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    results.push(payoutDoc);
  }

  return results;
};

/**
 * Admin: Retry a failed payout transfer
 */
export const retryPayout = async (payoutId) => {
  const payout = await Payout.findById(payoutId);
  if (!payout) {
    const err = new Error('Payout not found');
    err.statusCode = 404;
    throw err;
  }

  if (payout.status !== 'failed') {
    const err = new Error(`Cannot retry payout with status "${payout.status}"`);
    err.statusCode = 400;
    throw err;
  }

  const [order, vendor] = await Promise.all([
    Order.findById(payout.orderId),
    Vendor.findById(payout.vendorId),
  ]);

  if (!order || !vendor) {
    const err = new Error('Related order or vendor no longer exists');
    err.statusCode = 404;
    throw err;
  }

  if (!vendor.paymentAccountId) {
    vendor.paymentAccountId = `acc_mock_${crypto.randomBytes(6).toString('hex')}`;
    await vendor.save();
  }

  const provider = getPaymentProvider(order.payment?.provider || 'mock');
  const payoutPaise = Math.round(payout.amount * 100);

  const transferResult = await provider.createTransfer({
    paymentId: order.payment?.providerPaymentId || '',
    accountId: vendor.paymentAccountId,
    amountPaise: payoutPaise,
    notes: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      payoutId: payout._id.toString(),
    },
  });

  if (transferResult.status === 'processed') {
    payout.status = 'processed';
    payout.transferId = transferResult.transferId || payout.transferId;
    payout.failureReason = '';
  } else {
    payout.status = 'failed';
    payout.failureReason = transferResult.error || 'Retry transfer failed';
  }

  await payout.save();
  return payout;
};

/**
 * Reverse all payouts for a cancelled/refunded order
 */
export const reversePayouts = async (orderId) => {
  const payouts = await Payout.find({ orderId });
  for (const payout of payouts) {
    payout.status = 'reversed';
    await payout.save();
  }
  return payouts;
};

/**
 * Vendor: Retrieve earnings summary and paginated payouts list
 */
export const getVendorEarnings = async (vendorUserId, { page = 1, limit = 10 } = {}) => {
  const vendor = await Vendor.findOne({ userId: vendorUserId });
  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Aggregate totals across all processed payouts for this vendor
  const processedPayouts = await Payout.find({ vendorId: vendor._id, status: 'processed' });
  let grossSalesPaise = 0;
  let commissionPaise = 0;
  let netPayoutPaise = 0;

  for (const p of processedPayouts) {
    const amountPaise = Math.round(p.amount * 100);
    const commPaise = Math.round(p.commission * 100);
    grossSalesPaise += amountPaise + commPaise;
    commissionPaise += commPaise;
    netPayoutPaise += amountPaise;
  }

  const [payouts, total] = await Promise.all([
    Payout.find({ vendorId: vendor._id })
      .populate('orderId', 'orderNumber payment.status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Payout.countDocuments({ vendorId: vendor._id }),
  ]);

  return {
    summary: {
      grossSales: Number((grossSalesPaise / 100).toFixed(2)),
      commissionPaid: Number((commissionPaise / 100).toFixed(2)),
      netPayout: Number((netPayoutPaise / 100).toFixed(2)),
      totalProcessedCount: processedPayouts.length,
    },
    payouts,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
  };
};

/**
 * Admin: Retrieve all platform payouts with filtering and pagination
 */
export const getAdminPayouts = async ({ status, vendorId, page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status && ['pending', 'processed', 'failed', 'reversed'].includes(status)) {
    filter.status = status;
  }
  if (vendorId) {
    filter.vendorId = vendorId;
  }

  const [payouts, total] = await Promise.all([
    Payout.find(filter)
      .populate('vendorId', 'storeName logoUrl')
      .populate('orderId', 'orderNumber total payment.status payment.method createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Payout.countDocuments(filter),
  ]);

  return {
    payouts,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
  };
};
