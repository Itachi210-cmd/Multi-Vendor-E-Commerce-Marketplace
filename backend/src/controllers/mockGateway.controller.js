import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { env } from '../config/env.js';
import Order from '../models/order.model.js';
import MockPayment from '../models/mockPayment.model.js';

/**
 * Validate card number using Luhn algorithm
 */
export const validateLuhn = (numStr) => {
  if (!numStr || typeof numStr !== 'string') return false;
  const digits = numStr.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (alternate) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alternate = !alternate;
  }
  return sum % 10 === 0;
};

/**
 * Validate future expiry date (MM/YY or MM/YYYY)
 */
export const validateExpiry = (expiryStr) => {
  if (!expiryStr || typeof expiryStr !== 'string') return false;
  const parts = expiryStr.trim().split('/');
  if (parts.length !== 2) return false;

  const month = parseInt(parts[0], 10);
  let year = parseInt(parts[1], 10);
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return false;

  if (parts[1].trim().length === 2) {
    year += 2000;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
};

/**
 * Detect card brand from number
 */
export const detectCardBrand = (numStr) => {
  const digits = (numStr || '').replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  if (/^60|^6521|^6522/.test(digits)) return 'RuPay';
  return 'Generic';
};

/**
 * Asynchronously dispatch webhook event to internal webhook endpoint
 */
export const dispatchWebhookAsync = ({ event, paymentPayload, delayMs = 1200 }) => {
  if (!env.mockWebhookEnabled) return;

  const timer = setTimeout(() => {
    try {
      const payloadObj = {
        event,
        payload: {
          payment: paymentPayload,
        },
      };

      const payloadString = JSON.stringify(payloadObj);
      const signature = crypto
        .createHmac('sha256', env.mockWebhookSecret)
        .update(payloadString)
        .digest('hex');

      const baseUrl = (env.backendPublicUrl || 'http://localhost:5000').replace(/\/+$/, '');
      const targetUrl = `${baseUrl}/api/payments/webhook`;

      if (typeof fetch === 'function') {
        fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': signature,
          },
          body: payloadString,
        }).catch((_err) => {
          // Silently swallow in background (e.g. if server is restarting or under unit test)
        });
      } else {
        const parsed = new URL(targetUrl);
        const transport = parsed.protocol === 'https:' ? https : http;
        const req = transport.request(
          {
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payloadString),
              'x-webhook-signature': signature,
            },
          },
          (res) => {
            res.resume(); // consume response stream
          }
        );

        req.on('error', (_err) => {
          // Silently swallow in background (e.g. if server is restarting or under unit test)
        });

        req.write(payloadString);
        req.end();
      }
    } catch (_err) {
      // Ignored
    }
  }, delayMs);

  if (timer.unref) {
    timer.unref();
  }
};

/**
 * POST /api/mock-gateway/pay
 * Customer only, for their own order.
 * Simulates gateway processing with test scenarios.
 */
export const processMockPayment = async (req, res, next) => {
  try {
    const { providerOrderId, method, card, upi } = req.body;

    if (!providerOrderId) {
      return res.status(400).json({ error: 'providerOrderId is required' });
    }

    if (!method || !['card', 'upi'].includes(method)) {
      return res.status(400).json({ error: 'method must be either "card" or "upi"' });
    }

    // Find the associated order
    const order = await Order.findOne({ 'payment.providerOrderId': providerOrderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found for providerOrderId' });
    }

    // Customer access control: Only the customer who owns this order can pay
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You can only pay for your own order' });
    }

    // Simulate short network/processing delay (250ms)
    await new Promise((resolve) => setTimeout(resolve, 250));

    const amountPaise = Math.round(order.total * 100);
    const paymentId = `pay_mock_${crypto.randomBytes(8).toString('hex')}`;

    let isSuccess = false;
    let failureCode = '';
    let failureReason = '';
    let cardLast4 = '';
    let cardBrand = '';
    let upiVpa = '';

    // ==========================================
    // CARD PAYMENT PROCESSING
    // ==========================================
    if (method === 'card') {
      if (!card || typeof card !== 'object') {
        return res.status(400).json({ error: 'Card details (number, expiry, cvv) are required' });
      }

      const { number, expiry, cvv } = card;
      const cleanNumber = (number || '').replace(/\s+/g, '');

      // 1. Validate CVV
      if (!cvv || !/^\d{3,4}$/.test(cvv.trim())) {
        return res.status(400).json({ error: 'Invalid CVV: Must be 3 or 4 digits' });
      }

      // 2. Validate Expiry
      if (!validateExpiry(expiry)) {
        return res.status(400).json({ error: 'Invalid or expired card expiry date (MM/YY)' });
      }

      // 3. Validate Luhn format
      if (!validateLuhn(cleanNumber)) {
        return res.status(400).json({ error: 'Invalid card number format (Luhn check failed)' });
      }

      cardLast4 = cleanNumber.slice(-4);
      cardBrand = detectCardBrand(cleanNumber);

      // Check specific test card outcomes
      if (cleanNumber === '4111111111111111') {
        isSuccess = true;
      } else if (cleanNumber === '4000000000000002') {
        failureCode = 'PAYMENT_DECLINED';
        failureReason = 'Card was declined by issuing bank';
      } else if (cleanNumber === '4000000000009995') {
        failureCode = 'INSUFFICIENT_FUNDS';
        failureReason = 'Insufficient funds in card account';
      } else if (cleanNumber === '4000000000000069') {
        failureCode = 'EXPIRED_CARD';
        failureReason = 'Card has expired';
      } else {
        // Any other valid card succeeds
        isSuccess = true;
      }
    }

    // ==========================================
    // UPI PAYMENT PROCESSING
    // ==========================================
    if (method === 'upi') {
      if (!upi || typeof upi !== 'object' || !upi.vpa) {
        return res.status(400).json({ error: 'UPI details with valid VPA are required' });
      }

      const vpa = upi.vpa.trim().toLowerCase();
      upiVpa = vpa;

      if (vpa === 'success@mock') {
        isSuccess = true;
      } else if (vpa === 'failure@mock') {
        failureCode = 'UPI_TRANSACTION_FAILED';
        failureReason = 'UPI transaction failed: Bank declined transaction';
      } else {
        failureCode = 'INVALID_VPA';
        failureReason = 'Virtual Payment Address (VPA) does not exist';
      }
    }

    // Create record in mock_payments collection
    const mockPayment = await MockPayment.create({
      id: paymentId,
      providerOrderId,
      orderId: order._id,
      amountPaise,
      currency: 'INR',
      method,
      status: isSuccess ? 'captured' : 'failed',
      cardLast4,
      cardBrand,
      upiVpa,
      failureReason,
    });

    // Schedule signed webhook emission
    dispatchWebhookAsync({
      event: isSuccess ? 'payment.captured' : 'payment.failed',
      paymentPayload: {
        id: paymentId,
        orderId: providerOrderId,
        amount: amountPaise,
        currency: 'INR',
        status: isSuccess ? 'captured' : 'failed',
        method,
        failureReason,
      },
    });

    if (!isSuccess) {
      return res.status(402).json({
        success: false,
        code: failureCode,
        reason: failureReason,
        paymentId,
      });
    }

    // Generate HMAC SHA256 signature with MOCK_GATEWAY_SECRET
    const signature = crypto
      .createHmac('sha256', env.mockGatewaySecret)
      .update(`${providerOrderId}|${paymentId}`)
      .digest('hex');

    return res.status(200).json({
      success: true,
      order_id: providerOrderId,
      payment_id: paymentId,
      signature,
      method,
    });
  } catch (err) {
    next(err);
  }
};
