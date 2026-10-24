import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import redisClient from '../src/config/redis.js';
import User from '../src/models/user.model.js';
import Vendor from '../src/models/vendor.model.js';
import Product from '../src/models/product.model.js';
import Order from '../src/models/order.model.js';
import { generateAccessToken } from '../src/utils/token.utils.js';
import { markOrderPaid } from '../src/services/order.service.js';

describe('Phase 5: Cart, Orders, Multi-Vendor Splits & Lifecycle', () => {
  const originalNodeEnv = env.nodeEnv;
  const originalFakePay = env.enableFakePay;

  // Mock Users
  const mockCustomer = {
    _id: '6717a6a4a1b2c3d4e5f68001',
    name: 'Charlie Customer',
    email: 'charlie@example.com',
    role: 'customer',
  };

  const mockVendor1User = {
    _id: '6717a6a4a1b2c3d4e5f68002',
    name: 'Victor Vendor One',
    email: 'vendor1@example.com',
    role: 'vendor',
  };

  const mockVendor2User = {
    _id: '6717a6a4a1b2c3d4e5f68003',
    name: 'Vera Vendor Two',
    email: 'vendor2@example.com',
    role: 'vendor',
  };

  const mockAdmin = {
    _id: '6717a6a4a1b2c3d4e5f68004',
    name: 'Alice Admin',
    email: 'admin@example.com',
    role: 'admin',
  };

  // Mock Vendors
  const mockVendorDoc1 = {
    _id: '6717b000a1b2c3d4e5f68101',
    userId: mockVendor1User._id,
    storeName: 'Aura Tech Hub',
    description: 'Electronics & Audio store',
    status: 'approved',
    commissionPct: 10, // 10% commission
    save: jest.fn().mockResolvedValue(true),
  };

  const mockVendorDoc2 = {
    _id: '6717b000a1b2c3d4e5f68102',
    userId: mockVendor2User._id,
    storeName: 'Urban Living Co',
    description: 'Home & Apparel store',
    status: 'approved',
    commissionPct: 15, // 15% commission
    save: jest.fn().mockResolvedValue(true),
  };

  // Mock Products
  const mockProductA = {
    _id: '6717c000a1b2c3d4e5f68201',
    vendorId: mockVendorDoc1._id,
    title: 'Wireless Earbuds',
    description: 'Active noise cancellation earbuds',
    price: 1000,
    stock: 10,
    category: 'Electronics',
    images: ['https://example.com/earbuds.jpg'],
    isActive: true,
  };

  const mockProductB = {
    _id: '6717c000a1b2c3d4e5f68202',
    vendorId: mockVendorDoc2._id,
    title: 'Ceramic Table Lamp',
    description: 'Handmade modern lamp',
    price: 2000,
    stock: 5,
    category: 'Home',
    images: ['https://example.com/lamp.jpg'],
    isActive: true,
  };

  const mockProductOutOfStock = {
    _id: '6717c000a1b2c3d4e5f68203',
    vendorId: mockVendorDoc1._id,
    title: 'Sold Out Keyboard',
    description: 'Mechanical keyboard out of stock',
    price: 3500,
    stock: 0,
    category: 'Electronics',
    images: ['https://example.com/kb.jpg'],
    isActive: true,
  };

  const mockProductInactive = {
    _id: '6717c000a1b2c3d4e5f68204',
    vendorId: mockVendorDoc2._id,
    title: 'Deactivated Shoes',
    description: 'Running shoes archived',
    price: 1500,
    stock: 8,
    category: 'Footwear',
    images: ['https://example.com/shoes.jpg'],
    isActive: false,
  };

  let customerToken;
  let vendor1Token;
  let vendor2Token;
  let adminToken;

  const validShippingAddress = {
    name: 'Charlie Customer',
    phone: '9876543210',
    line1: '123 Baker Street, Apt 4B',
    line2: 'Near Central Park',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  };

  beforeAll(async () => {
    customerToken = generateAccessToken(mockCustomer);
    vendor1Token = generateAccessToken(mockVendor1User);
    vendor2Token = generateAccessToken(mockVendor2User);
    adminToken = generateAccessToken(mockAdmin);
  });

  afterAll(async () => {
    env.nodeEnv = originalNodeEnv;
    env.enableFakePay = originalFakePay;
    await redisClient.del(`cart:${mockCustomer._id}`);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();

    // Default User.findById mocks
    jest.spyOn(User, 'findById').mockImplementation(async (id) => {
      const idStr = id?.toString();
      if (idStr === mockCustomer._id) return mockCustomer;
      if (idStr === mockVendor1User._id) return mockVendor1User;
      if (idStr === mockVendor2User._id) return mockVendor2User;
      if (idStr === mockAdmin._id) return mockAdmin;
      return null;
    });

    // Default Vendor.findOne mocks
    jest.spyOn(Vendor, 'findOne').mockImplementation(async (query) => {
      const userIdStr = query?.userId?.toString();
      if (userIdStr === mockVendor1User._id) return mockVendorDoc1;
      if (userIdStr === mockVendor2User._id) return mockVendorDoc2;
      return null;
    });

    // Clear test customer's cart
    await redisClient.del(`cart:${mockCustomer._id}`);
  });

  describe('1. Cart in Redis (Customer Only & Isolation)', () => {
    it('customer should add item to cart (stock verified, max 10 allowed)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(mockProductA);
      jest.spyOn(Product, 'find').mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ ...mockProductA, vendorId: mockVendorDoc1 }]),
      });

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: mockProductA._id, qty: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cart.items.length).toBe(1);
      expect(res.body.cart.items[0].qty).toBe(2);
      expect(res.body.cart.items[0].title).toBe('Wireless Earbuds');
      expect(res.body.cart.items[0].price).toBe(1000);
      expect(res.body.cart.subtotal).toBe(2000);

      // Verify Redis TTL is set (~7 days)
      const ttl = await redisClient.ttl(`cart:${mockCustomer._id}`);
      expect(ttl).toBeGreaterThan(600000);
    });

    it('client cannot tamper with product price or title (read fresh from MongoDB)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(mockProductA);
      jest.spyOn(Product, 'find').mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ ...mockProductA, vendorId: mockVendorDoc1 }]),
      });

      // Client sends fake price of 10 and fake title
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: mockProductA._id, qty: 1, price: 10, title: 'Hacked Title' });

      expect(res.status).toBe(200);
      expect(res.body.cart.items[0].price).toBe(1000);
      expect(res.body.cart.items[0].title).toBe('Wireless Earbuds');
      expect(res.body.cart.subtotal).toBe(1000);
    });

    it('should reject quantity exceeding available stock (400 Bad Request)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(mockProductB); // stock is 5

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: mockProductB._id, qty: 6 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/stock/i);
    });

    it('should reject quantity greater than 10 (400 Bad Request)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(mockProductA); // stock is 10

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: mockProductA._id, qty: 11 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/maximum 10/i);
    });

    it('vendor cannot add their own product to cart (400 Bad Request)', async () => {
      // Vendor 1 attempts to buy Product A (which belongs to Vendor 1)
      jest.spyOn(Product, 'findById').mockResolvedValue(mockProductA);

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ productId: mockProductA._id, qty: 1 });

      // Vendor role is blocked by customer check or vendor self-purchase rule
      expect([400, 403]).toContain(res.status);
    });

    it('customer can update quantity, remove item, or clear cart', async () => {
      // Setup cart with Product A (qty 2)
      await redisClient.hset(`cart:${mockCustomer._id}`, mockProductA._id, '2');

      jest.spyOn(Product, 'findById').mockResolvedValue(mockProductA);
      jest.spyOn(Product, 'find').mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ ...mockProductA, vendorId: mockVendorDoc1 }]),
      });

      // Update quantity to 4
      const updateRes = await request(app)
        .patch(`/api/cart/items/${mockProductA._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ qty: 4 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.cart.items[0].qty).toBe(4);
      expect(updateRes.body.cart.subtotal).toBe(4000);

      // Remove single item
      const removeRes = await request(app)
        .delete(`/api/cart/items/${mockProductA._id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.cart.items.length).toBe(0);

      // Clear cart
      const clearRes = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(clearRes.status).toBe(200);
      expect(clearRes.body.cart.items.length).toBe(0);
    });
  });

  describe('2. Checkout & Multi-Vendor Commission Splits', () => {
    it('should split cart items by vendor into subOrders with exact 10% and 15% commissions in paise', async () => {
      // Customer has:
      // Product A (Vendor 1, 10% comm): 2 units @ 1000 = 2000
      // Product B (Vendor 2, 15% comm): 1 unit @ 2000 = 2000
      await redisClient.hset(`cart:${mockCustomer._id}`, mockProductA._id, '2');
      await redisClient.hset(`cart:${mockCustomer._id}`, mockProductB._id, '1');

      jest.spyOn(Product, 'find').mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { ...mockProductA, vendorId: mockVendorDoc1 },
          { ...mockProductB, vendorId: mockVendorDoc2 },
        ]),
      });

      // Vendor lookups
      jest.spyOn(Vendor, 'find').mockResolvedValue([mockVendorDoc1, mockVendorDoc2]);

      // Order creation mock
      const mockCreatedOrder = {
        _id: '6717d000a1b2c3d4e5f68301',
        customerId: mockCustomer._id,
        orderNumber: 'ORD-20261024-TEST',
        shippingAddress: validShippingAddress,
        items: [
          { productId: mockProductA._id, vendorId: mockVendorDoc1._id, title: mockProductA.title, price: 1000, qty: 2 },
          { productId: mockProductB._id, vendorId: mockVendorDoc2._id, title: mockProductB.title, price: 2000, qty: 1 },
        ],
        subOrders: [
          {
            vendorId: mockVendorDoc1._id,
            items: [{ productId: mockProductA._id, qty: 2, price: 1000 }],
            subtotal: 2000,
            commission: 200, // 10% of 2000
            vendorPayout: 1800, // 2000 - 200
            status: 'placed',
            timeline: [{ status: 'placed', at: new Date() }],
          },
          {
            vendorId: mockVendorDoc2._id,
            items: [{ productId: mockProductB._id, qty: 1, price: 2000 }],
            subtotal: 2000,
            commission: 300, // 15% of 2000
            vendorPayout: 1700, // 2000 - 300
            status: 'placed',
            timeline: [{ status: 'placed', at: new Date() }],
          },
        ],
        couponCode: '',
        discount: 0,
        total: 4000,
        payment: { status: 'pending' },
      };

      jest.spyOn(Order, 'create').mockResolvedValue(mockCreatedOrder);

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ shippingAddress: validShippingAddress });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order.total).toBe(4000);
      expect(res.body.order.payment.status).toBe('pending');
      expect(res.body.order.subOrders.length).toBe(2);

      // Verify Vendor 1 math (10% commission on 2000)
      const sub1 = res.body.order.subOrders.find((s) => s.vendorId === mockVendorDoc1._id);
      expect(sub1.subtotal).toBe(2000);
      expect(sub1.commission).toBe(200);
      expect(sub1.vendorPayout).toBe(1800);

      // Verify Vendor 2 math (15% commission on 2000)
      const sub2 = res.body.order.subOrders.find((s) => s.vendorId === mockVendorDoc2._id);
      expect(sub2.subtotal).toBe(2000);
      expect(sub2.commission).toBe(300);
      expect(sub2.vendorPayout).toBe(1700);

      // Stock NOT reduced yet and Cart NOT cleared yet on pending checkout
      const cartRemains = await redisClient.hgetall(`cart:${mockCustomer._id}`);
      expect(Object.keys(cartRemains).length).toBe(2);
    });

    it('checkout rejects invalid cart with out-of-stock or inactive items (409 Conflict)', async () => {
      // Cart contains out-of-stock product
      await redisClient.hset(`cart:${mockCustomer._id}`, mockProductOutOfStock._id, '1');

      jest.spyOn(Product, 'find').mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { ...mockProductOutOfStock, vendorId: mockVendorDoc1 },
        ]),
      });

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ shippingAddress: validShippingAddress });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.issues).toBeDefined();
      expect(res.body.issues.length).toBeGreaterThan(0);
    });
  });

  describe('3. Payment Completion, Idempotency & Overselling Protection', () => {
    it('markOrderPaid decrements stock atomically, clears cart, and is idempotent', async () => {
      await redisClient.hset(`cart:${mockCustomer._id}`, mockProductA._id, '2');

      const mockPendingOrder = {
        _id: '6717d000a1b2c3d4e5f68302',
        customerId: mockCustomer._id,
        items: [{ productId: mockProductA._id, qty: 2, title: 'Wireless Earbuds' }],
        subOrders: [{ status: 'placed' }],
        payment: { status: 'pending' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockPendingOrder);
      jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue({
        ...mockProductA,
        stock: 8, // decremented by 2
      });

      // 1st Call: Marks paid
      const result1 = await markOrderPaid(mockPendingOrder._id);
      expect(result1.success).toBe(true);
      expect(mockPendingOrder.payment.status).toBe('paid');
      expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1);

      // Cart cleared
      const cartAfter = await redisClient.hgetall(`cart:${mockCustomer._id}`);
      expect(Object.keys(cartAfter).length).toBe(0);

      // 2nd Call: Idempotent (does NOT decrement stock again)
      const result2 = await markOrderPaid(mockPendingOrder._id);
      expect(result2.alreadyPaid).toBe(true);
      expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1); // Still 1!
    });

    it('overselling protection: fails order and rolls back partial stock if race condition exhausts stock', async () => {
      const mockOrderToFail = {
        _id: '6717d000a1b2c3d4e5f68303',
        customerId: mockCustomer._id,
        items: [
          { productId: mockProductA._id, qty: 1, title: 'Wireless Earbuds' },
          { productId: mockProductB._id, qty: 1, title: 'Ceramic Table Lamp' },
        ],
        subOrders: [{ status: 'placed' }],
        payment: { status: 'pending' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrderToFail);

      // First item succeeds, second item fails due to stock exhaustion
      jest
        .spyOn(Product, 'findOneAndUpdate')
        .mockResolvedValueOnce({ ...mockProductA, stock: 9 })
        .mockResolvedValueOnce(null); // Lamp is out of stock!

      jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(true); // Rollback spy

      await expect(markOrderPaid(mockOrderToFail._id)).rejects.toThrow(/insufficient stock/i);

      // Verifies rollback was called to restore the first item's stock
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductA._id,
        { $inc: { stock: 1 } }
      );
      expect(mockOrderToFail.payment.status).toBe('failed');
    });
  });

  describe('4. Order Lifecycle, Cancellation & Vendor Isolation', () => {
    it('customer can cancel order when all subOrders are placed (restores stock if paid)', async () => {
      const mockPaidOrder = {
        _id: '6717d000a1b2c3d4e5f68304',
        customerId: mockCustomer._id,
        items: [{ productId: mockProductA._id, qty: 2 }],
        subOrders: [
          { status: 'placed', timeline: [{ status: 'placed', at: new Date() }] },
        ],
        payment: { status: 'paid' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockPaidOrder);
      jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(true);

      const res = await request(app)
        .patch(`/api/orders/${mockPaidOrder._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(mockPaidOrder.subOrders[0].status).toBe('cancelled');
      expect(mockPaidOrder.payment.status).toBe('refunded');
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(mockProductA._id, {
        $inc: { stock: 2 },
      });
    });

    it('customer cannot cancel order if any subOrder has advanced to packed or beyond (400 Bad Request)', async () => {
      const mockPackedOrder = {
        _id: '6717d000a1b2c3d4e5f68305',
        customerId: mockCustomer._id,
        subOrders: [
          { status: 'packed', timeline: [] },
        ],
        payment: { status: 'paid' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockPackedOrder);

      const res = await request(app)
        .patch(`/api/orders/${mockPackedOrder._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot cancel/i);
    });

    it('vendor can only view their own subOrders from paid orders', async () => {
      const mockPaidMultiVendorOrder = {
        _id: '6717d000a1b2c3d4e5f68306',
        orderNumber: 'ORD-MULTI-1',
        createdAt: new Date(),
        shippingAddress: validShippingAddress,
        customerId: { name: 'Charlie', email: 'charlie@example.com' },
        payment: { status: 'paid' },
        subOrders: [
          {
            vendorId: mockVendorDoc1._id,
            subtotal: 2000,
            status: 'placed',
          },
          {
            vendorId: mockVendorDoc2._id,
            subtotal: 3000,
            status: 'placed',
          },
        ],
      };

      jest.spyOn(Order, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockPaidMultiVendorOrder]),
      });
      jest.spyOn(Order, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/vendor/orders')
        .set('Authorization', `Bearer ${vendor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.subOrders.length).toBe(1);
      // Vendor 1 sees ONLY Vendor 1's suborder
      expect(res.body.subOrders[0].subOrder.vendorId.toString()).toBe(mockVendorDoc1._id.toString());
      expect(res.body.subOrders[0].subOrder.subtotal).toBe(2000);
    });

    it('vendor can strictly advance their own subOrder: placed -> packed -> shipped -> delivered', async () => {
      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f68307',
        orderNumber: 'ORD-FLOW-1',
        payment: { status: 'paid' },
        subOrders: [
          {
            vendorId: mockVendorDoc1._id,
            status: 'placed',
            timeline: [{ status: 'placed', at: new Date() }],
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      // Valid: placed -> packed
      const res1 = await request(app)
        .patch(`/api/vendor/orders/${mockOrder._id}/status`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ status: 'packed' });

      expect(res1.status).toBe(200);
      expect(mockOrder.subOrders[0].status).toBe('packed');

      // Invalid: packed -> delivered (skipping shipped)
      const resInvalid = await request(app)
        .patch(`/api/vendor/orders/${mockOrder._id}/status`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ status: 'delivered' });

      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.message).toMatch(/invalid status transition/i);

      // Valid: packed -> shipped
      const res2 = await request(app)
        .patch(`/api/vendor/orders/${mockOrder._id}/status`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ status: 'shipped' });

      expect(res2.status).toBe(200);
      expect(mockOrder.subOrders[0].status).toBe('shipped');

      // Valid: shipped -> delivered
      const res3 = await request(app)
        .patch(`/api/vendor/orders/${mockOrder._id}/status`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ status: 'delivered' });

      expect(res3.status).toBe(200);
      expect(mockOrder.subOrders[0].status).toBe('delivered');
    });

    it('vendor isolation: vendor cannot modify another vendor subOrder (403 Forbidden)', async () => {
      const mockOrderOnlyVendor1 = {
        _id: '6717d000a1b2c3d4e5f68308',
        payment: { status: 'paid' },
        subOrders: [
          {
            vendorId: mockVendorDoc1._id, // Belongs to Vendor 1 ONLY
            status: 'placed',
            timeline: [],
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrderOnlyVendor1);

      // Vendor 2 attempts to advance Vendor 1's subOrder
      const res = await request(app)
        .patch(`/api/vendor/orders/${mockOrderOnlyVendor1._id}/status`)
        .set('Authorization', `Bearer ${vendor2Token}`)
        .send({ status: 'packed' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden/i);
    });
  });

  describe('5. Dev Fake-Pay Endpoint Guard', () => {
    it('fake-pay endpoint succeeds in development when ENABLE_FAKE_PAY is true', async () => {
      env.nodeEnv = 'development';
      env.enableFakePay = true;

      const mockOrder = {
        _id: '6717d000a1b2c3d4e5f68309',
        customerId: mockCustomer._id,
        items: [{ productId: mockProductA._id, qty: 1 }],
        subOrders: [{ status: 'placed' }],
        payment: { status: 'pending' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);
      jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(mockProductA);

      const res = await request(app)
        .post(`/api/dev/orders/${mockOrder._id}/fake-pay`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.payment.status).toBe('paid');
    });

    it('fake-pay endpoint returns 404 when ENABLE_FAKE_PAY is false or not in development', async () => {
      env.enableFakePay = false;

      const res = await request(app)
        .post('/api/dev/orders/6717d000a1b2c3d4e5f68309/fake-pay')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);

      // Reset
      env.enableFakePay = true;
    });
  });
});
