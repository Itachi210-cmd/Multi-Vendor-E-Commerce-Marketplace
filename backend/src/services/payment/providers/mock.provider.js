import crypto from 'crypto';
import { env } from '../../../config/env.js';
import { BasePaymentProvider } from '../payment.interface.js';

/**
 * Timing-safe string comparison to avoid timing attacks
 */
const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * MockPaymentProvider
 * Default provider for development and testing. Mimics Razorpay Route flow.
 */
export class MockPaymentProvider extends BasePaymentProvider {
  constructor() {
    super();
    this.name = 'mock';
  }

  /**
   * Create an order on the mock gateway
   */
  async createOrder({ orderId, amountPaise, currency = 'INR', notes = {} }) {
    if (!amountPaise || amountPaise <= 0) {
      throw new Error('Invalid order amount for payment creation');
    }

    const providerOrderId = `mockord_${crypto.randomBytes(8).toString('hex')}`;

    return {
      providerOrderId,
      amount: amountPaise,
      currency,
      provider: this.name,
      notes,
    };
  }

  /**
   * Timing-safe verification of payment signature
   */
  async verifyPayment({ order_id, payment_id, signature }) {
    if (!order_id || !payment_id || !signature) {
      return { valid: false, error: 'Missing payment signature verification parameters' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.mockGatewaySecret)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    const isValid = timingSafeEqual(signature, expectedSignature);

    if (!isValid) {
      return { valid: false, error: 'Invalid payment signature' };
    }

    return { valid: true };
  }

  /**
   * Transfer vendor payout to vendor's linked account
   */
  async createTransfer({ paymentId, accountId, amountPaise, notes = {} }) {
    if (!accountId) {
      return {
        transferId: '',
        status: 'failed',
        error: 'Vendor does not have a linked payment account',
      };
    }

    // Allow simulating transfer failures for tests/demo
    if (notes?.simulateFailure || accountId === 'acc_mock_fail') {
      return {
        transferId: '',
        status: 'failed',
        error: 'Vendor linked account failed verification or is temporarily suspended',
      };
    }

    const transferId = `trf_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      transferId,
      status: 'processed',
      amountPaise,
      accountId,
    };
  }

  /**
   * Refund payment and reverse vendor transfers
   */
  async refund({ paymentId, amountPaise, reverseTransfers = true, notes = {} }) {
    if (notes?.simulateRefundFailure) {
      throw new Error('Gateway rejected refund request: Insufficient platform escrow balance');
    }

    const refundId = `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      refundId,
      status: 'refunded',
      amountPaise,
      reverseTransfers,
    };
  }

  /**
   * Timing-safe verification of webhook signature and payload
   */
  async verifyWebhook(rawBody, signature) {
    if (!signature) {
      return { valid: false, error: 'Missing webhook signature header' };
    }

    const payloadBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf8');

    const expectedSignature = crypto
      .createHmac('sha256', env.mockWebhookSecret)
      .update(payloadBuffer)
      .digest('hex');

    const isValid = timingSafeEqual(signature, expectedSignature);
    if (!isValid) {
      return { valid: false, error: 'Webhook signature verification failed' };
    }

    try {
      const event = JSON.parse(payloadBuffer.toString('utf8'));
      return { valid: true, event };
    } catch (_err) {
      return { valid: false, error: 'Malformed webhook JSON payload' };
    }
  }
}

export default MockPaymentProvider;
