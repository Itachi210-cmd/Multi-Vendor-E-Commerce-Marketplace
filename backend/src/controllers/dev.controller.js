import { env } from '../config/env.js';
import { markOrderPaid } from '../services/order.service.js';

/**
 * Dev-only endpoint to simulate instant payment capture without Razorpay.
 * Strictly disabled (returns 404) unless NODE_ENV === 'development' and ENABLE_FAKE_PAY === 'true'.
 */
export const fakePayOrderHandler = async (req, res, next) => {
  if (env.nodeEnv !== 'development' || !env.enableFakePay) {
    return res.status(404).json({
      success: false,
      message: 'Not found',
    });
  }

  try {
    const { id } = req.params;
    const fakePaymentId = `pay_fake_${Date.now()}`;
    const fakeOrderId = `order_fake_${Date.now()}`;

    const result = await markOrderPaid(id, {
      razorpayPaymentId: fakePaymentId,
      razorpayOrderId: fakeOrderId,
    });

    res.json({
      success: true,
      message: 'Dev fake-pay simulated successfully. Stock decremented and cart cleared.',
      order: result.order,
      alreadyPaid: result.alreadyPaid || false,
    });
  } catch (error) {
    next(error);
  }
};
