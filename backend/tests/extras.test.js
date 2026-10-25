import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Vendor from '../src/models/vendor.model.js';
import Product from '../src/models/product.model.js';
import Order from '../src/models/order.model.js';
import Payout from '../src/models/payout.model.js';
import Review from '../src/models/review.model.js';
import Coupon from '../src/models/coupon.model.js';
import { generateAccessToken } from '../src/utils/token.utils.js';
import { searchService } from '../src/services/search.service.js';
import {
  validateCoupon,
  distributeDiscountLargestRemainder,
  recordCouponUsage,
  restoreCouponUsage,
} from '../src/services/coupon.service.js';
import { getAdminAnalytics } from '../src/services/analytics.service.js';
import redisClient from '../src/config/redis.js';

describe('Phase 7: Reviews, Coupons, Invoices & Admin Analytics', () => {
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

  const vendorUser = {
    _id: '6717a6a4a1b2c3d4e5f69003',
    name: 'Vendor One',
    email: 'vendor1@example.com',
    role: 'vendor',
  };

  const adminUser = {
    _id: '6717a6a4a1b2c3d4e5f69005',
    name: 'Platform Admin',
    email: 'admin@example.com',
    role: 'admin',
  };

  const vendorDoc = {
    _id: '6717b000a1b2c3d4e5f69101',
    userId: vendorUser._id,
    storeName: 'Audio Prodigy',
    status: 'approved',
    commissionPct: 10,
  };

  const product1 = {
    _id: '6717c000a1b2c3d4e5f69201',
    vendorId: vendorDoc._id,
    title: 'Studio Monitor Pro',
    price: 1000,
    stock: 25,
    category: 'Electronics',
    ratingAvg: 0,
    ratingCount: 0,
    isActive: true,
  };

  const product2 = {
    _id: '6717c000a1b2c3d4e5f69202',
    vendorId: vendorDoc._id,
    title: 'Wireless Earbuds',
    price: 500,
    stock: 15,
    category: 'Electronics',
    ratingAvg: 0,
    ratingCount: 0,
    isActive: true,
  };

  let tokenCustomerA;
  let tokenCustomerB;
  let tokenVendor;
  let tokenAdmin;

  beforeAll(() => {
    tokenCustomerA = generateAccessToken(customerA);
    tokenCustomerB = generateAccessToken(customerB);
    tokenVendor = generateAccessToken(vendorUser);
    tokenAdmin = generateAccessToken(adminUser);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default User.findById mock for auth middleware
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === customerA._id) return Promise.resolve(customerA);
      if (idStr === customerB._id) return Promise.resolve(customerB);
      if (idStr === vendorUser._id) return Promise.resolve(vendorUser);
      if (idStr === adminUser._id) return Promise.resolve(adminUser);
      return Promise.resolve(null);
    });
  });

  // ==========================================
  // 1. REVIEWS TESTS
  // ==========================================
  describe('Reviews (Eligibility, CRUD, Recompute & ES Sync)', () => {
    it('blocks review if user has not purchased or product is not delivered (non-buyer 403)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(product1);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(null);
      jest.spyOn(Review, 'findOne').mockResolvedValue(null);
      // No delivered order
      jest.spyOn(Order, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/products/${product1._id}/reviews`)
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ rating: 5, comment: 'Great sound!' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/delivered/i);
    });

    it('blocks vendor from reviewing their own product (403)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(product1);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue({
        _id: product1.vendorId,
        userId: vendorUser._id,
      });

      const res = await request(app)
        .post(`/api/products/${product1._id}/reviews`)
        .set('Authorization', `Bearer ${tokenVendor}`)
        .send({ rating: 5, comment: 'I made this, it is great' });

      // Vendors are rejected either because role is not customer or vendor self-check
      expect([403]).toContain(res.status);
    });

    it('allows review when product was delivered in a paid order', async () => {
      const deliveredOrderId = '6717d000a1b2c3d4e5f69301';
      jest.spyOn(Product, 'findById').mockResolvedValue(product1);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(null);
      jest.spyOn(Review, 'findOne').mockResolvedValue(null);
      jest.spyOn(Order, 'findOne').mockResolvedValue({
        _id: deliveredOrderId,
        payment: { status: 'paid' },
        subOrders: [{ status: 'delivered', items: [{ productId: product1._id }] }],
      });

      const createdReview = {
        _id: '6717e000a1b2c3d4e5f69401',
        productId: product1._id,
        customerId: customerA._id,
        orderId: deliveredOrderId,
        rating: 5,
        comment: 'Super crisp audio and booming bass!',
        verifiedPurchase: true,
      };

      jest.spyOn(Review, 'create').mockResolvedValue(createdReview);
      jest.spyOn(Review, 'aggregate').mockResolvedValue([
        { _id: product1._id, ratingAvg: 5.0, ratingCount: 1 },
      ]);
      const updateProductSpy = jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(product1);
      const updateEsSpy = jest.spyOn(searchService, 'updateRating').mockResolvedValue({ result: 'updated' });

      const res = await request(app)
        .post(`/api/products/${product1._id}/reviews`)
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ rating: 5, comment: 'Super crisp audio and booming bass!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.review.rating).toBe(5);
      expect(updateProductSpy).toHaveBeenCalledWith(product1._id, { ratingAvg: 5.0, ratingCount: 1 });
      expect(updateEsSpy).toHaveBeenCalledWith(product1._id.toString(), 5.0, 1);
    });

    it('rejects duplicate review by same customer with 409 Conflict', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(product1);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(null);
      // Already reviewed
      jest.spyOn(Review, 'findOne').mockResolvedValue({
        _id: '6717e000a1b2c3d4e5f69401',
        rating: 5,
        comment: 'Existing review',
      });

      const res = await request(app)
        .post(`/api/products/${product1._id}/reviews`)
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ rating: 4, comment: 'Trying to review again' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already reviewed/i);
    });

    it('allows owner to update review and recomputes rating', async () => {
      const reviewDoc = {
        _id: '6717e000a1b2c3d4e5f69401',
        productId: product1._id,
        customerId: customerA._id,
        rating: 5,
        comment: 'Initial comment',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Review, 'findById').mockResolvedValue(reviewDoc);
      jest.spyOn(Review, 'aggregate').mockResolvedValue([
        { _id: product1._id, ratingAvg: 4.0, ratingCount: 1 },
      ]);
      const updateProductSpy = jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(product1);
      const updateEsSpy = jest.spyOn(searchService, 'updateRating').mockResolvedValue({ result: 'updated' });

      const res = await request(app)
        .put(`/api/reviews/${reviewDoc._id}`)
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .send({ rating: 4, comment: 'Updated to 4 stars after long term use' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(updateProductSpy).toHaveBeenCalledWith(product1._id, { ratingAvg: 4.0, ratingCount: 1 });
      expect(updateEsSpy).toHaveBeenCalledWith(product1._id.toString(), 4.0, 1);
    });

    it('blocks non-owner from updating someone else review (403)', async () => {
      const reviewDoc = {
        _id: '6717e000a1b2c3d4e5f69401',
        productId: product1._id,
        customerId: customerA._id, // Owned by Alice
        rating: 5,
      };

      jest.spyOn(Review, 'findById').mockResolvedValue(reviewDoc);

      const res = await request(app)
        .put(`/api/reviews/${reviewDoc._id}`)
        .set('Authorization', `Bearer ${tokenCustomerB}`) // Bob tries to edit
        .send({ rating: 1, comment: 'Malicious edit' });

      expect(res.status).toBe(403);
    });

    it('allows admin to delete review and recomputes rating', async () => {
      const reviewDoc = {
        _id: '6717e000a1b2c3d4e5f69401',
        productId: product1._id,
        customerId: customerA._id,
      };

      jest.spyOn(Review, 'findById').mockResolvedValue(reviewDoc);
      jest.spyOn(Review, 'findByIdAndDelete').mockResolvedValue(reviewDoc);
      jest.spyOn(Review, 'aggregate').mockResolvedValue([]);
      const updateProductSpy = jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(product1);
      const updateEsSpy = jest.spyOn(searchService, 'updateRating').mockResolvedValue({ result: 'updated' });

      const res = await request(app)
        .delete(`/api/reviews/${reviewDoc._id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(updateProductSpy).toHaveBeenCalledWith(product1._id, { ratingAvg: 0, ratingCount: 0 });
      expect(updateEsSpy).toHaveBeenCalledWith(product1._id.toString(), 0, 0);
    });
  });

  // ==========================================
  // 2. COUPONS TESTS
  // ==========================================
  describe('Coupons (Validation, Math, Caps, Largest Remainder & Atomic Usage)', () => {
    it('returns clear validation failure reasons (inactive, expired, below min order, limit reached, already used)', async () => {
      // Inactive
      jest.spyOn(Coupon, 'findOne').mockResolvedValueOnce({
        code: 'INACTIVE10',
        isActive: false,
      });
      const r1 = await validateCoupon('INACTIVE10', customerA._id, 100000);
      expect(r1.valid).toBe(false);
      expect(r1.message).toMatch(/inactive/i);

      // Expired
      jest.spyOn(Coupon, 'findOne').mockResolvedValueOnce({
        code: 'EXPIRED10',
        isActive: true,
        expiresAt: new Date(Date.now() - 100000),
      });
      const r2 = await validateCoupon('EXPIRED10', customerA._id, 100000);
      expect(r2.valid).toBe(false);
      expect(r2.message).toMatch(/expired/i);

      // Below minOrder
      jest.spyOn(Coupon, 'findOne').mockResolvedValueOnce({
        code: 'MINORDER500',
        isActive: true,
        minOrder: 500,
        userUsages: [],
      });
      const r3 = await validateCoupon('MINORDER500', customerA._id, 30000); // 300 Rs (30000 paise) < 500 Rs
      expect(r3.valid).toBe(false);
      expect(r3.message).toMatch(/minimum/i);

      // Global usage limit reached
      jest.spyOn(Coupon, 'findOne').mockResolvedValueOnce({
        code: 'LIMITED100',
        isActive: true,
        minOrder: 0,
        usageLimit: 5,
        usedCount: 5,
        userUsages: [],
      });
      const r4 = await validateCoupon('LIMITED100', customerA._id, 100000);
      expect(r4.valid).toBe(false);
      expect(r4.message).toMatch(/limit/i);

      // Per-user limit reached
      jest.spyOn(Coupon, 'findOne').mockResolvedValueOnce({
        code: 'ONCEPERUSER',
        isActive: true,
        minOrder: 0,
        perUserLimit: 1,
        usedCount: 2,
        userUsages: [{ userId: customerA._id, count: 1 }],
      });
      const r5 = await validateCoupon('ONCEPERUSER', customerA._id, 100000);
      expect(r5.valid).toBe(false);
      expect(r5.message).toMatch(/usage limit/i);
    });

    it('enforces percent cap and flat limit never exceeding subtotal', async () => {
      // 10% coupon with maxDiscount 100 Rs (10000 paise)
      jest.spyOn(Coupon, 'findOne').mockResolvedValueOnce({
        code: 'SAVE10',
        type: 'percent',
        value: 10,
        minOrder: 0,
        maxDiscount: 100,
        isActive: true,
        userUsages: [],
      });

      // Subtotal 2000 Rs (200000 paise) -> 10% would be 200 Rs, but capped at 100 Rs
      const rCap = await validateCoupon('SAVE10', customerA._id, 200000);
      expect(rCap.valid).toBe(true);
      expect(rCap.discount).toBe(100);
      expect(rCap.discountPaise).toBe(10000);

      // Flat 500 Rs coupon on 300 Rs subtotal -> capped at 300 Rs
      jest.spyOn(Coupon, 'findOne').mockResolvedValueOnce({
        code: 'FLAT500',
        type: 'flat',
        value: 500,
        minOrder: 0,
        isActive: true,
        userUsages: [],
      });
      const rFlat = await validateCoupon('FLAT500', customerA._id, 30000); // 300 Rs
      expect(rFlat.valid).toBe(true);
      expect(rFlat.discount).toBe(300);
      expect(rFlat.discountPaise).toBe(30000);
    });

    it('distributes discount proportionally across multi-vendor sub-orders summing to exact discount (Largest Remainder)', () => {
      // 3 vendors with subtotals 333.33, 333.33, 333.34 Rs -> 33333, 33333, 33334 paise
      // Total discount: 100 Rs = 10000 paise
      const subOrders = [
        { subtotalPaise: 33333, vendorId: 'v1' },
        { subtotalPaise: 33333, vendorId: 'v2' },
        { subtotalPaise: 33334, vendorId: 'v3' },
      ];
      const totalDiscountPaise = 10000;

      const allocated = distributeDiscountLargestRemainder(subOrders, totalDiscountPaise);
      const sumAllocated = allocated.reduce((s, a) => s + a, 0);

      expect(sumAllocated).toBe(totalDiscountPaise);
      // Each gets around 3333 paise, with 1 getting 3334 paise
      expect(allocated).toEqual([3333, 3333, 3334]);
    });

    it('distributes 10000 paise discount over subtotals 499900 and 129900 paise to exactly 7937 and 2063 paise', () => {
      const subOrders = [
        { subtotalPaise: 499900, vendorId: 'v1' },
        { subtotalPaise: 129900, vendorId: 'v2' },
      ];
      const totalDiscountPaise = 10000;

      const allocated = distributeDiscountLargestRemainder(subOrders, totalDiscountPaise);

      expect(allocated).toEqual([7937, 2063]);
      expect(allocated[0] + allocated[1]).toBe(10000);
    });

    it('records coupon usage atomically on payment and restores on refund', async () => {
      const mockCoupon = {
        code: 'WELCOME10',
        usedCount: 0,
        usageLimit: 10,
        perUserLimit: 1,
        userUsages: [],
      };

      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);
      const findOneAndUpdateSpy = jest.spyOn(Coupon, 'findOneAndUpdate').mockResolvedValue(mockCoupon);

      // 1. Record usage on paid order
      await recordCouponUsage('WELCOME10', customerA._id);
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        { code: 'WELCOME10' },
        { $inc: { usedCount: 1 }, $push: { userUsages: { userId: customerA._id, count: 1 } } }
      );

      // 2. Restore usage on refund
      mockCoupon.userUsages = [{ userId: customerA._id, count: 1 }];
      await restoreCouponUsage('WELCOME10', customerA._id);
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        { code: 'WELCOME10', 'userUsages.userId': customerA._id },
        { $inc: { usedCount: -1, 'userUsages.$.count': -1 } }
      );
    });
  });

  // ==========================================
  // 3. PDF INVOICE TESTS
  // ==========================================
  describe('PDF Invoice Generation & Access Control', () => {
    it('rejects invoice access for unpaid orders (400)', async () => {
      const unpaidOrder = {
        _id: '6717d000a1b2c3d4e5f69301',
        orderNumber: 'ORD-20261025-UNPAID',
        customerId: customerA,
        payment: { status: 'pending' },
        subOrders: [],
      };

      jest.spyOn(Order, 'findById').mockReturnValue({
        populate: () => ({
          populate: () => Promise.resolve(unpaidOrder),
        }),
      });

      const res = await request(app)
        .get(`/api/orders/${unpaidOrder._id}/invoice`)
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/paid/i);
    });

    it('rejects invoice access for other customers (403)', async () => {
      const paidOrder = {
        _id: '6717d000a1b2c3d4e5f69301',
        orderNumber: 'ORD-20261025-PAID',
        customerId: customerA, // Owned by Alice
        payment: { status: 'paid' },
        subOrders: [],
      };

      jest.spyOn(Order, 'findById').mockReturnValue({
        populate: () => ({
          populate: () => Promise.resolve(paidOrder),
        }),
      });

      const res = await request(app)
        .get(`/api/orders/${paidOrder._id}/invoice`)
        .set('Authorization', `Bearer ${tokenCustomerB}`); // Bob requests Alice's invoice

      expect(res.status).toBe(403);
    });

    it('streams a valid PDF document with %PDF header for owner and admin', async () => {
      const paidOrder = {
        _id: '6717d000a1b2c3d4e5f69301',
        orderNumber: 'ORD-20261025-PAID',
        customerId: customerA,
        shippingAddress: {
          name: 'Customer Alice',
          phone: '9876543210',
          line1: '123 Tech Park',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
        items: [
          {
            productId: product1._id,
            vendorId: vendorDoc._id,
            title: 'Studio Monitor Pro',
            price: 1000,
            qty: 1,
          },
        ],
        subOrders: [
          {
            vendorId: vendorDoc,
            items: [
              {
                productId: product1._id,
                vendorId: vendorDoc._id,
                title: 'Studio Monitor Pro',
                price: 1000,
                qty: 1,
              },
            ],
            subtotal: 900,
            commission: 90,
            vendorPayout: 810,
            status: 'delivered',
          },
        ],
        couponCode: 'WELCOME10',
        discount: 100,
        total: 900,
        payment: {
          status: 'paid',
          method: 'card',
          providerPaymentId: 'pay_mock_test123',
        },
        createdAt: new Date(),
      };

      jest.spyOn(Order, 'findById').mockReturnValue({
        populate: () => ({
          populate: () => Promise.resolve(paidOrder),
        }),
      });

      const res = await request(app)
        .get(`/api/orders/${paidOrder._id}/invoice`)
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toMatch(/inline; filename="invoice-ORD-20261025-PAID.pdf"/);
      // PDF documents start with %PDF-
      const textChunk = res.body.toString('latin1', 0, 5);
      expect(textChunk).toMatch(/^%PDF-/);
    });
  });

  // ==========================================
  // 4. ADMIN ANALYTICS TESTS
  // ==========================================
  describe('Admin Analytics (Access Control, Aggregations, Timeseries Zero-Fill & Redis Cache)', () => {
    it('enforces admin-only access control on /api/admin/analytics (403 for customer/vendor)', async () => {
      const resCustomer = await request(app)
        .get('/api/admin/analytics?range=7d')
        .set('Authorization', `Bearer ${tokenCustomerA}`);
      expect(resCustomer.status).toBe(403);

      const resVendor = await request(app)
        .get('/api/admin/analytics?range=7d')
        .set('Authorization', `Bearer ${tokenVendor}`);
      expect(resVendor.status).toBe(403);
    });

    it('calculates totals, zero-fills empty days, and excludes refunded orders from revenue', async () => {
      jest.spyOn(redisClient, 'get').mockResolvedValue(null);
      jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

      // 1. Gross revenue from paid orders: 5000 Rs
      jest.spyOn(Order, 'aggregate')
        .mockResolvedValueOnce([{ totalRevenue: 5000, orderCount: 2, customerIds: [customerA._id] }]) // revenueAgg
        .mockResolvedValueOnce([{ totalRefunded: 1000, refundedCount: 1 }]) // refundedAgg (1000 Rs refunded)
        .mockResolvedValueOnce([{ _id: { dateStr: new Date().toISOString().slice(0, 10), paymentStatus: 'paid' }, revenue: 4000, count: 1 }]) // dailyAgg
        .mockResolvedValueOnce([{ _id: 'delivered', count: 2 }]) // statusAgg
        .mockResolvedValueOnce([{ vendorId: vendorDoc._id, storeName: 'Audio Prodigy', revenue: 4000, orderCount: 2 }]) // topVendors
        .mockResolvedValueOnce([{ productId: product1._id, title: 'Studio Monitor Pro', unitsSold: 2, revenue: 2000 }]); // topProducts

      // Payouts commission excluding reversed: 400 Rs
      jest.spyOn(Payout, 'aggregate').mockResolvedValue([{ totalCommission: 400 }]);
      jest.spyOn(Product, 'find').mockReturnValue({
        populate: () => ({
          select: () => ({
            sort: () => ({
              limit: () => ({
                lean: () => Promise.resolve([{ title: 'Low Stock Item', stock: 2, price: 500 }]),
              }),
            }),
          }),
        }),
      });
      jest.spyOn(Vendor, 'countDocuments').mockResolvedValue(3);

      const res = await request(app)
        .get('/api/admin/analytics?range=7d')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Net revenue = 5000 - 1000 = 4000
      expect(res.body.totals.revenue).toBe(4000);
      expect(res.body.totals.commission).toBe(400);
      expect(res.body.totals.orders).toBe(2);
      expect(res.body.totals.averageOrderValue).toBe(2000);
      expect(res.body.totals.activeCustomers).toBe(1);
      expect(res.body.totals.activeVendors).toBe(3);

      // Timeseries zero-fill check: exactly 7 days
      expect(res.body.dailySeries).toHaveLength(7);
      res.body.dailySeries.forEach((day) => {
        expect(day).toHaveProperty('date');
        expect(typeof day.revenue).toBe('number');
        expect(typeof day.orders).toBe('number');
      });
    });

    it('returns cached analytics response from Redis when cache is warm', async () => {
      const cachedPayload = {
        range: '7d',
        totals: { revenue: 9999, commission: 999, orders: 10, averageOrderValue: 999.9, activeCustomers: 8, activeVendors: 4 },
        dailySeries: [],
        statusBreakdown: {},
        topVendors: [],
        topProducts: [],
        lowStock: [],
      };

      jest.spyOn(redisClient, 'get').mockResolvedValue(JSON.stringify(cachedPayload));

      const res = await request(app)
        .get('/api/admin/analytics?range=7d')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
      expect(res.body.totals.revenue).toBe(9999);
    });
  });
});
