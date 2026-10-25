/**
 * Base Payment Provider Interface
 * All payment providers (Mock, Razorpay Route, Stripe Connect) must implement this contract.
 */
export class BasePaymentProvider {
  /**
   * Create an order on the gateway
   * @param {Object} params { orderId, amountPaise, currency, notes }
   * @returns {Promise<{ providerOrderId: string, amount: number, currency: string, provider: string }>}
   */
  async createOrder(_params) {
    throw new Error('createOrder() must be implemented by payment provider');
  }

  /**
   * Timing-safe verification of payment signature
   * @param {Object} payload { order_id, payment_id, signature }
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  async verifyPayment(_payload) {
    throw new Error('verifyPayment() must be implemented by payment provider');
  }

  /**
   * Transfer vendor payout to vendor linked account (Route/Connect split)
   * @param {Object} params { paymentId, accountId, amountPaise, notes }
   * @returns {Promise<{ transferId: string, status: 'processed' | 'failed', error?: string }>}
   */
  async createTransfer(_params) {
    throw new Error('createTransfer() must be implemented by payment provider');
  }

  /**
   * Refund payment and reverse transfers
   * @param {Object} params { paymentId, amountPaise, reverseTransfers }
   * @returns {Promise<{ refundId: string, status: 'refunded', error?: string }>}
   */
  async refund(_params) {
    throw new Error('refund() must be implemented by payment provider');
  }

  /**
   * Timing-safe verification of incoming webhook payload and signature
   * @param {Buffer|string} rawBody
   * @param {string} signature
   * @returns {Promise<{ valid: boolean, event?: Object, error?: string }>}
   */
  async verifyWebhook(_rawBody, _signature) {
    throw new Error('verifyWebhook() must be implemented by payment provider');
  }
}
