import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import User from '../src/models/user.model.js';
import Vendor from '../src/models/vendor.model.js';
import Product from '../src/models/product.model.js';
import Order from '../src/models/order.model.js';
import Payout from '../src/models/payout.model.js';
import MockPayment from '../src/models/mockPayment.model.js';
import { generateAccessToken } from '../src/utils/token.utils.js';
import { getPaymentProvider } from '../src/services/payment/index.js';
import { createPayouts } from '../src/services/payout.service.js';

describe('Phase 6: Payment Provider Layer, Sandbox Gateway, Webhooks & Payout Splits', () => {
  const originalFakePay = env.enableFakePay;

  // Mock Users
  const customerA = {
    _id: '6717a6a4a1b2c3d4e5f69001',
    name: 'Customer Alice',
    email: 'alice@example.com',
    role: 'customer',
  };

  const customerB = {
    _id: '6717a6a4a1b2c3d4e5f69002',
    name: 'Customer Bob',
    email: 'bob@example.com',
    role: 'customer',
  };

  const vendor1User = {
    _id: '6717a6a4a1b2c3d4e5f69003',
    name: 'Vendor One',
    email: 'vendor1@example.com',
    role: 'vendor',
  };

  const vendor2User = {
    _id: '6717a6a4a1b2c3d4e5f69004',
    name: 'Vendor Two',
    email: 'vendor2@example.com',
    role: 'vendor',
  };

  const adminUser = {
    _id: '6717a6a4a1b2c3d4e5f69005',
    name: 'Platform Admin',
    email: 'admin@example.com',
    role: 'admin',
  };

  // Mock Vendors
  const vendor1Doc = {
    _id: '6717b000a1b2c3d4e5f69101',
    userId: vendor1User._id,
    storeName: 'Audio Prodigy',
    commissionPct: 10, // 10%
    paymentAccountId: 'acc_mock_v1',
    save: jest.fn().mockResolvedValue(true),
  };

  const vendor2Doc = {
    _id: '6717b000a1b2c3d4e5f69102',
    userId: vendor2User._id,
    storeName: 'Velvet Threads',
    commissionPct: 15, // 15%
    paymentAccountId: 'acc_mock_v2',
    save: jest.fn().mockResolvedValue(true),
  };

  // Mock Products
  const productA = {
    _id: '6717c000a1b2c3d4e5f69201',
    vendorId: vendor1Doc._id,
    title: 'Studio Headphones',
    price: 2000,
    stock: 10,
    isActive: true,
  };

  const productB = {
    _id: '6717c000a1b2c3d4e5f69202',
    vendorId: vendor2Doc._id,
    title: 'Cotton Hoodie',
    price: 3000,
    stock: 5,
    isActive: true,
  };

  let tokenCustomerA;
  let tokenCustomerB;
  let tokenVendor1;
  let tokenVendor2;
  let tokenAdmin;

  beforeAll(() => {
    tokenCustomerA = generateAccessToken(customerA);
    tokenCustomerB = generateAccessToken(customerB);
    tokenVendor1 = generateAccessToken(vendor1User);
    tokenVendor2 = generateAccessToken(vendor2User);
    tokenAdmin = generateAccessToken(adminUser);
  });

  afterAll(() => {
    env.enableFakePay = originalFakePay;
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    // Default User.findById mocks
    jest.spyOn(User, 'findById').mockImplementation(async (id) => {
      const idStr = id?.toString();
      if (idStr === customerA._id) return customerA;
      if (idStr === customerB._id) return customerB;
      if (idStr === vendor1User._id) return vendor1User;
      if (idStr === vendor2User._id) return vendor2User;
      if (idStr === adminUser._id) return adminUser;
      return null;
    });

    // Default Vendor.findOne & findById mocks
    jest.spyOn(Vendor, 'findOne').mockImplementation(async (query) => {
      const uId = query?.userId?.toString();
      if (uId === vendor1User._id) return vendor1Doc;
      if (uId === vendor2User._id) return vendor2Doc;
      return null;
    });

    jest.spyOn(Vendor, 'findById').mockImplementation(async (id) => {
      const vId = id?.toString();
      if (vId === vendor1Doc._id) return vendor1Doc;
      if (vId === vendor2Doc._id) return vendor2Doc;
      return null;
    });

    // Default Product.findById mocks
    jest.spyOn(Product, 'findById').mockImplementation(async (id) => {
      const pId = id?.toString();
      if (pId === productA._id) return { ...productA };
      if (pId === productB._id) return { ...productB };
      return null;
    });

    // Default MockPayment mocks
    jest.spyOn(MockPayment, 'findOne').mockImplementation(async (query) => {
      return { id: query?.id || 'pay_mock_default', method: 'card' };
    });
    jest.spyOn(MockPayment, 'create').mockImplementation(async (doc) => doc);
  });

  // =========================================================================
  // 1. Payment Order Creation & Tampering Protection
  // =========================================================================
  describe('1. Payment Order Creation & Tampering Protection', () => {
    it('creates provider order with amount from MongoDB, ignoring client tampering', async () => {
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69301',
        orderNumber: 'ORD-20261025-ABCD',
        customerId: customerA._id,
        total: 5000.0, // 5000 INR = 500000 paise
        items: [
          { productId: productA._id, qty: 1, title: 'Studio Headphones' },
          { productId: productB._id, qty: 1, title: 'Cotton Hoodie' },
        ],
        payment: { status: 'pending', provider: 'mock', providerOrderId: '' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      // Client sends a tampered amount of 100 paise
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ orderId: mockOrder._id, amount: 100, currency: 'USD' });

      expect(res.status).toBe(200);
      expect(res.body.providerOrderId).toMatch(/^mockord_/);
      // DB total was 5000 -> 500000 paise
      expect(res.body.amount).toBe(500000);
      expect(res.body.currency).toBe('INR');
      expect(res.body.provider).toBe('mock');
      expect(mockOrder.payment.providerOrderId).toBe(res.body.providerOrderId);
    });

    it('prevents non-owner from creating payment order (403 Forbidden)', async () => {
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69302',
        customerId: customerA._id, // Owned by Alice
        total: 2000,
        items: [{ productId: productA._id, qty: 1, title: 'Studio Headphones' }],
        payment: { status: 'pending' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      // Bob tries to initiate payment
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .send({ orderId: mockOrder._id });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. Sandbox Gateway Scenarios & Validation (Card & UPI)
  // =========================================================================
  describe('2. Sandbox Gateway Scenarios & Validation', () => {
    const mockOrder = {
      _id: '6717d000a1b2c3d4e5f69303',
      orderNumber: 'ORD-20261025-EFGH',
      customerId: customerA._id,
      total: 2000,
      payment: {
        providerOrderId: 'mockord_test_gateway_01',
        status: 'pending',
      },
    };

    beforeEach(() => {
      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(MockPayment, 'create').mockImplementation(async (doc) => doc);
    });

    it('rejects card with invalid Luhn checksum (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'card',
          card: {
            number: '4111111111111112', // Bad checksum
            expiry: '12/28',
            cvv: '123',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Luhn check failed/i);
    });

    it('rejects card with expired date (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'card',
          card: {
            number: '4111 1111 1111 1111',
            expiry: '01/20', // Expired
            cvv: '123',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expired/i);
    });

    it('handles card scenario: 4111 1111 1111 1111 -> Success with valid HMAC signature', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'card',
          card: {
            number: '4111 1111 1111 1111',
            expiry: '12/28',
            cvv: '123',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order_id).toBe(mockOrder.payment.providerOrderId);
      expect(res.body.payment_id).toMatch(/^pay_mock_/);
      expect(res.body.signature).toBeDefined();

      // Verify the HMAC signature locally
      const expectedSig = crypto
        .createHmac('sha256', env.mockGatewaySecret)
        .update(`${res.body.order_id}|${res.body.payment_id}`)
        .digest('hex');
      expect(res.body.signature).toBe(expectedSig);
    });

    it('handles card scenario: 4000 0000 0000 0002 -> Declined', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'card',
          card: {
            number: '4000 0000 0000 0002',
            expiry: '12/28',
            cvv: '123',
          },
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('PAYMENT_DECLINED');
    });

    it('handles card scenario: 4000 0000 0000 9995 -> Insufficient Funds', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'card',
          card: {
            number: '4000 0000 0000 9995',
            expiry: '12/28',
            cvv: '123',
          },
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('handles card scenario: 4000 0000 0000 0069 -> Expired Card', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'card',
          card: {
            number: '4000 0000 0000 0069',
            expiry: '12/28',
            cvv: '123',
          },
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('EXPIRED_CARD');
    });

    it('handles UPI scenario: success@mock -> Success', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'upi',
          upi: { vpa: 'success@mock' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.payment_id).toMatch(/^pay_mock_/);
    });

    it('handles UPI scenario: failure@mock -> Failure', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'upi',
          upi: { vpa: 'failure@mock' },
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('UPI_TRANSACTION_FAILED');
    });

    it('handles UPI scenario: any other VPA -> Invalid VPA', async () => {
      const res = await request(app)
        .post('/api/mock-gateway/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          providerOrderId: mockOrder.payment.providerOrderId,
          method: 'upi',
          upi: { vpa: 'unknownuser@okhdfcbank' },
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('INVALID_VPA');
    });
  });

  // =========================================================================
  // 3. Payment Verification, Idempotency & Payout Splits
  // =========================================================================
  describe('3. Payment Verification, Idempotency & Multi-Vendor Payout Splits', () => {
    it('verifies signature, marks order paid, decrements stock, and creates payouts with 10% & 15% splits', async () => {
      const providerOrderId = 'mockord_verify_split_01';
      const paymentId = 'pay_mock_verify_split_01';

      // Order with 2 subOrders: 10% commission vendor and 15% commission vendor
      // SubOrder 1: 2000 total -> commission 200 (10%), payout 1800
      // SubOrder 2: 3000 total -> commission 450 (15%), payout 2550
      // Order Total: 5000
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69304',
        orderNumber: 'ORD-20261025-SPLIT',
        customerId: customerA._id,
        total: 5000,
        items: [
          { productId: productA._id, qty: 1, title: 'Studio Headphones' },
          { productId: productB._id, qty: 1, title: 'Cotton Hoodie' },
        ],
        subOrders: [
          {
            _id: 'sub_01',
            vendorId: vendor1Doc._id,
            subtotal: 2000,
            commission: 200,
            vendorPayout: 1800,
            status: 'placed',
          },
          {
            _id: 'sub_02',
            vendorId: vendor2Doc._id,
            subtotal: 3000,
            commission: 450,
            vendorPayout: 2550,
            status: 'placed',
          },
        ],
        payment: {
          provider: 'mock',
          providerOrderId,
          status: 'pending',
          providerPaymentId: '',
          method: '',
          failureReason: '',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);
      jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(true);
      jest.spyOn(MockPayment, 'findOne').mockResolvedValue({ id: paymentId, method: 'card' });

      // Track upserted payouts
      const createdPayouts = [];
      jest.spyOn(Payout, 'findOneAndUpdate').mockImplementation(async (query, update) => {
        const doc = {
          _id: `payout_${createdPayouts.length + 1}`,
          ...query,
          ...update,
        };
        createdPayouts.push(doc);
        return doc;
      });

      // Generate valid signature
      const validSig = crypto
        .createHmac('sha256', env.mockGatewaySecret)
        .update(`${providerOrderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          order_id: providerOrderId,
          payment_id: paymentId,
          signature: validSig,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.payment.status).toBe('paid');
      expect(mockOrder.payment.providerPaymentId).toBe(paymentId);
      expect(mockOrder.payment.method).toBe('card');

      // Verify stock was decremented for both products
      expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: productA._id, stock: { $gte: 1 } },
        { $inc: { stock: -1 } },
        { new: true }
      );
      expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: productB._id, stock: { $gte: 1 } },
        { $inc: { stock: -1 } },
        { new: true }
      );

      // Verify exact payout split rows:
      // Vendor 1 (10%): 200 commission + 1800 payout = 2000
      // Vendor 2 (15%): 450 commission + 2550 payout = 3000
      expect(createdPayouts).toHaveLength(2);

      const p1 = createdPayouts.find((p) => p.vendorId.toString() === vendor1Doc._id);
      expect(p1.amount).toBe(1800);
      expect(p1.commission).toBe(200);
      expect(p1.amount + p1.commission).toBe(2000);
      expect(p1.status).toBe('processed');

      const p2 = createdPayouts.find((p) => p.vendorId.toString() === vendor2Doc._id);
      expect(p2.amount).toBe(2550);
      expect(p2.commission).toBe(450);
      expect(p2.amount + p2.commission).toBe(3000);
      expect(p2.status).toBe('processed');

      // Verify idempotency: calling verify a second time does not double decrement stock
      Product.findOneAndUpdate.mockClear();
      const resRetry = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          order_id: providerOrderId,
          payment_id: paymentId,
          signature: validSig,
        });

      expect(resRetry.status).toBe(200);
      expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects invalid signature and marks payment.status = failed (retryable)', async () => {
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69305',
        customerId: customerA._id,
        total: 2000,
        payment: {
          providerOrderId: 'mockord_bad_sig_01',
          status: 'pending',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          order_id: mockOrder.payment.providerOrderId,
          payment_id: 'pay_mock_123',
          signature: 'completely_invalid_signature_hex',
        });

      expect(res.status).toBe(400);
      expect(mockOrder.payment.status).toBe('failed');
      expect(mockOrder.payment.failureReason).toMatch(/signature verification failed/i);
    });

    it('failed payment followed by a successful retry creates a fresh provider order and succeeds', async () => {
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69306',
        customerId: customerA._id,
        total: 2000,
        items: [{ productId: productA._id, qty: 1, title: 'Studio Headphones' }],
        subOrders: [
          {
            vendorId: vendor1Doc._id,
            subtotal: 2000,
            commission: 200,
            vendorPayout: 1800,
            status: 'placed',
          },
        ],
        payment: {
          status: 'failed',
          providerOrderId: 'mockord_first_attempt_failed',
          failureReason: 'Payment declined',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);
      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(true);
      jest.spyOn(Payout, 'findOneAndUpdate').mockResolvedValue({ status: 'processed' });

      // 1. Retry creates fresh provider order
      const createRes = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ orderId: mockOrder._id });

      expect(createRes.status).toBe(200);
      expect(createRes.body.providerOrderId).not.toBe('mockord_first_attempt_failed');

      const freshOrderId = createRes.body.providerOrderId;
      const retryPaymentId = 'pay_mock_retry_success';
      const retrySig = crypto
        .createHmac('sha256', env.mockGatewaySecret)
        .update(`${freshOrderId}|${retryPaymentId}`)
        .digest('hex');

      // 2. Successful verification
      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({
          order_id: freshOrderId,
          payment_id: retryPaymentId,
          signature: retrySig,
        });

      expect(verifyRes.status).toBe(200);
      expect(mockOrder.payment.status).toBe('paid');
    });
  });

  // =========================================================================
  // 4. Webhook Handling, Timing & Idempotency
  // =========================================================================
  describe('4. Webhook Handling, Timing & Idempotency', () => {
    it('rejects webhooks with invalid signature (400 Bad Request)', async () => {
      const payload = JSON.stringify({ event: 'payment.captured' });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-webhook-signature', 'invalid_hex_sig')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid webhook signature/i);
    });

    it('processes signed payment.captured webhook arriving before verify', async () => {
      const providerOrderId = 'mockord_webhook_first_01';
      const paymentId = 'pay_mock_webhook_first_01';

      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69307',
        customerId: customerA._id,
        total: 2000,
        items: [{ productId: productA._id, qty: 1, title: 'Studio Headphones' }],
        subOrders: [
          {
            vendorId: vendor1Doc._id,
            subtotal: 2000,
            commission: 200,
            vendorPayout: 1800,
            status: 'placed',
          },
        ],
        payment: {
          providerOrderId,
          status: 'pending',
          providerPaymentId: '',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);
      jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(true);
      jest.spyOn(Payout, 'findOneAndUpdate').mockResolvedValue({ status: 'processed' });

      const webhookBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            id: paymentId,
            orderId: providerOrderId,
            amount: 200000,
            status: 'captured',
            method: 'card',
          },
        },
      });

      const validSig = crypto
        .createHmac('sha256', env.mockWebhookSecret)
        .update(webhookBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-webhook-signature', validSig)
        .set('Content-Type', 'application/json')
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(mockOrder.payment.status).toBe('paid');
      expect(mockOrder.payment.providerPaymentId).toBe(paymentId);
      expect(Product.findOneAndUpdate).toHaveBeenCalled();
    });

    it('handles duplicate webhook delivery harmlessly (idempotent)', async () => {
      const providerOrderId = 'mockord_webhook_dup_01';
      const paymentId = 'pay_mock_webhook_dup_01';

      // Order is already paid
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69308',
        customerId: customerA._id,
        total: 2000,
        items: [{ productId: productA._id, qty: 1, title: 'Studio Headphones' }],
        payment: {
          providerOrderId,
          status: 'paid', // Already captured!
          providerPaymentId: paymentId,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(true);

      const webhookBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            id: paymentId,
            orderId: providerOrderId,
            amount: 200000,
            status: 'captured',
          },
        },
      });

      const validSig = crypto
        .createHmac('sha256', env.mockWebhookSecret)
        .update(webhookBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-webhook-signature', validSig)
        .set('Content-Type', 'application/json')
        .send(webhookBody);

      expect(res.status).toBe(200);
      // Stock should NOT be touched for duplicate delivery
      expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Transfer Failures & Admin Retry
  // =========================================================================
  describe('5. Transfer Failures & Admin Retry', () => {
    it('failed transfer keeps order paid and marks payout failed, admin can retry', async () => {
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f69309',
        orderNumber: 'ORD-20261025-RETRY',
        payment: { provider: 'mock', providerPaymentId: 'pay_mock_trf_01' },
        subOrders: [
          {
            vendorId: vendor1Doc._id,
            subtotal: 2000,
            commission: 200,
            vendorPayout: 1800,
          },
        ],
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      // Simulate provider transfer failure
      const provider = getPaymentProvider('mock');
      jest.spyOn(provider, 'createTransfer').mockResolvedValueOnce({
        transferId: '',
        status: 'failed',
        error: 'Vendor account suspended',
      });

      let savedPayout = null;
      jest.spyOn(Payout, 'findOneAndUpdate').mockImplementation(async (_query, update) => {
        savedPayout = {
          _id: '6717e000a1b2c3d4e5f69401',
          orderId: mockOrder._id,
          vendorId: vendor1Doc._id,
          ...update,
          save: jest.fn().mockResolvedValue(true),
        };
        return savedPayout;
      });

      const payouts = await createPayouts(mockOrder._id);
      expect(payouts[0].status).toBe('failed');
      expect(payouts[0].failureReason).toBe('Vendor account suspended');

      // Admin retries the failed payout
      jest.spyOn(Payout, 'findById').mockResolvedValue(savedPayout);
      // On retry, provider succeeds
      provider.createTransfer.mockResolvedValueOnce({
        transferId: 'trf_mock_retry_success',
        status: 'processed',
      });

      const retryRes = await request(app)
        .post(`/api/admin/payouts/${savedPayout._id}/retry`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.success).toBe(true);
      expect(savedPayout.status).toBe('processed');
      expect(savedPayout.transferId).toBe('trf_mock_retry_success');
    });
  });

  // =========================================================================
  // 6. Refunds & Cancellation
  // =========================================================================
  describe('6. Refunds & Cancellation', () => {
    it('cancelling a paid order refunds payment, reverses payouts, and restores stock', async () => {
      const mockPaidOrder = {
        _id: '6717d000a1b2c3d4e5f69310',
        customerId: customerA._id,
        total: 2000,
        items: [{ productId: productA._id, qty: 2 }],
        subOrders: [
          { status: 'placed', timeline: [{ status: 'placed', at: new Date() }] },
        ],
        payment: {
          provider: 'mock',
          providerPaymentId: 'pay_mock_refund_01',
          status: 'paid',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockPayout = {
        _id: '6717e000a1b2c3d4e5f69402',
        orderId: mockPaidOrder._id,
        status: 'processed',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockPaidOrder);
      jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(true);
      jest.spyOn(Payout, 'find').mockResolvedValue([mockPayout]);

      const res = await request(app)
        .patch(`/api/orders/${mockPaidOrder._id}/cancel`)
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(200);
      expect(mockPaidOrder.payment.status).toBe('refunded');
      expect(mockPaidOrder.subOrders[0].status).toBe('cancelled');
      // Payout reversed
      expect(mockPayout.status).toBe('reversed');
      // Stock restored
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(productA._id, {
        $inc: { stock: 2 },
      });
    });
  });

  // =========================================================================
  // 7. Vendor Earnings Isolation
  // =========================================================================
  describe('7. Vendor Earnings & Admin Payouts Isolation', () => {
    it('vendor can only view their own earnings and processed payouts', async () => {
      const mockProcessedPayouts = [
        {
          _id: 'p1',
          vendorId: vendor1Doc._id,
          amount: 1800,
          commission: 200,
          status: 'processed',
        },
      ];

      jest.spyOn(Payout, 'find').mockImplementation((filter) => {
        if (filter?.status === 'processed') {
          return Promise.resolve(mockProcessedPayouts);
        }
        return {
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockProcessedPayouts),
              }),
            }),
          }),
        };
      });

      jest.spyOn(Payout, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/vendor/earnings')
        .set('Authorization', `Bearer ${tokenVendor1}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.grossSales).toBe(2000);
      expect(res.body.summary.commissionPaid).toBe(200);
      expect(res.body.summary.netPayout).toBe(1800);
      expect(res.body.payouts).toHaveLength(1);
    });

    it('dev fake-pay is disabled by default in production or when flag is off', async () => {
      env.enableFakePay = false;

      const res = await request(app)
        .post('/api/dev/orders/6717d000a1b2c3d4e5f69311/fake-pay');

      expect(res.status).toBe(404);
    });
  });
});
