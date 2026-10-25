import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import MockPayment from '../models/mockPayment.model.js';
import Payout from '../models/payout.model.js';
import { getPaymentProvider } from '../services/payment/index.js';
import { markOrderPaid } from '../services/order.service.js';
import { createPayouts } from '../services/payout.service.js';

/**
 * POST /api/payments/create-order
 * Customer only: Initiates payment order on configured provider.
 * Amount is derived exclusively from MongoDB order.total.
 */
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Access control: only customer who placed the order can create payment order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You do not own this order' });
    }

    // Only allow if payment status is pending or failed
    if (order.payment.status !== 'pending' && order.payment.status !== 'failed') {
      return res.status(400).json({
        error: `Cannot initiate payment for order with payment status "${order.payment.status}"`,
      });
    }

    // Re-check inventory for all items in order
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive || product.stock < item.qty) {
        return res.status(409).json({
          error: `Product "${item.title}" is out of stock or no longer available`,
          productId: item.productId,
        });
      }
    }

    const provider = getPaymentProvider();
    const amountPaise = Math.round(order.total * 100);

    const providerOrder = await provider.createOrder({
      orderId: order._id.toString(),
      amountPaise,
      currency: 'INR',
      notes: {
        orderNumber: order.orderNumber,
        customerId: req.user._id.toString(),
      },
    });

    // Save providerOrderId on order
    order.payment.provider = providerOrder.provider;
    order.payment.providerOrderId = providerOrder.providerOrderId;
    order.payment.status = 'pending';
    order.payment.failureReason = '';
    await order.save();

    return res.status(200).json({
      providerOrderId: providerOrder.providerOrderId,
      amount: amountPaise,
      currency: providerOrder.currency || 'INR',
      provider: providerOrder.provider,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/verify
 * Customer only: Verifies HMAC signature, captures payment, atomically decrements stock, and triggers payouts.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        error: 'Missing verification parameters: order_id, payment_id, and signature are required',
      });
    }

    const order = await Order.findOne({ 'payment.providerOrderId': order_id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found for provider order ID' });
    }

    // Access control: only owner
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You do not own this order' });
    }

    const provider = getPaymentProvider(order.payment?.provider || 'mock');
    const verification = await provider.verifyPayment({ order_id, payment_id, signature });

    if (!verification.valid) {
      order.payment.status = 'failed';
      order.payment.failureReason = 'Payment signature verification failed';
      await order.save();

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid signature',
      });
    }

    // Determine payment method from mock payment if recorded
    const mockRecord = await MockPayment.findOne({ id: payment_id });
    const method = mockRecord?.method || 'card';

    // Atomically mark paid & decrement stock (idempotent)
    const { order: paidOrder } = await markOrderPaid(order._id, {
      providerPaymentId: payment_id,
      providerOrderId: order_id,
      method,
      provider: provider.name,
    });

    // Create payouts for each vendor subOrder (idempotent)
    const payouts = await createPayouts(paidOrder._id);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and captured successfully',
      order: paidOrder,
      payouts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/webhook
 * Public endpoint (no JWT). Verifies signature using raw request body.
 * Idempotently processes payment.captured, payment.failed, transfer.processed, transfer.failed.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-razorpay-signature'];
    const provider = getPaymentProvider();

    const verification = await provider.verifyWebhook(req.body, signature);
    if (!verification.valid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = verification.event;

    if (event === 'payment.captured') {
      const paymentData = payload?.payment;
      if (paymentData?.orderId) {
        const order = await Order.findOne({ 'payment.providerOrderId': paymentData.orderId });
        if (order) {
          if (order.payment.status !== 'paid') {
            await markOrderPaid(order._id, {
              providerPaymentId: paymentData.id,
              providerOrderId: paymentData.orderId,
              method: paymentData.method || 'card',
              provider: provider.name,
            });
            await createPayouts(order._id);
          }
        }
      }
    } else if (event === 'payment.failed') {
      const paymentData = payload?.payment;
      if (paymentData?.orderId) {
        const order = await Order.findOne({ 'payment.providerOrderId': paymentData.orderId });
        if (order && order.payment.status !== 'paid') {
          order.payment.status = 'failed';
          order.payment.failureReason = paymentData.failureReason || 'Payment failed';
          await order.save();
        }
      }
    } else if (event === 'transfer.processed') {
      const transferData = payload?.transfer;
      if (transferData?.id) {
        await Payout.findOneAndUpdate(
          { transferId: transferData.id },
          { status: 'processed', failureReason: '' }
        );
      }
    } else if (event === 'transfer.failed') {
      const transferData = payload?.transfer;
      if (transferData?.id) {
        await Payout.findOneAndUpdate(
          { transferId: transferData.id },
          { status: 'failed', failureReason: transferData.failureReason || 'Transfer failed' }
        );
      }
    }

    // Always respond 200 to acknowledge webhook delivery
    return res.status(200).json({ status: 'ok', handled: true });
  } catch (err) {
    next(err);
  }
};
