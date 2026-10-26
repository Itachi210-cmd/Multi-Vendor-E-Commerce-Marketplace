import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Vendor from '../src/models/vendor.model.js';
import Product from '../src/models/product.model.js';
import { generateAccessToken } from '../src/utils/token.utils.js';
import { s3Service } from '../src/config/s3.js';

describe('Phase 3: Vendor & Product APIs and S3 Uploads', () => {
  const mockCustomer = {
    _id: '6717a6a4a1b2c3d4e5f67801',
    name: 'Customer Bob',
    email: 'bob@example.com',
    role: 'customer',
  };

  const mockAdmin = {
    _id: '6717a6a4a1b2c3d4e5f67802',
    name: 'Admin Alice',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockVendor1User = {
    _id: '6717a6a4a1b2c3d4e5f67803',
    name: 'Vendor One',
    email: 'vendor1@example.com',
    role: 'vendor',
  };

  const mockVendor2User = {
    _id: '6717a6a4a1b2c3d4e5f67804',
    name: 'Vendor Two',
    email: 'vendor2@example.com',
    role: 'vendor',
  };

  const mockVendorDoc1 = {
    _id: '6717b000a1b2c3d4e5f67901',
    userId: mockVendor1User._id,
    storeName: 'Vendor One Store',
    description: 'First test store',
    logoUrl: 'http://example.com/logo1.png',
    status: 'approved',
    commissionPct: 10,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockVendorDoc2 = {
    _id: '6717b000a1b2c3d4e5f67902',
    userId: mockVendor2User._id,
    storeName: 'Vendor Two Store',
    description: 'Second test store',
    logoUrl: 'http://example.com/logo2.png',
    status: 'approved',
    commissionPct: 10,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockPendingVendorDoc = {
    _id: '6717b000a1b2c3d4e5f67903',
    userId: mockCustomer._id,
    storeName: 'Pending Store',
    status: 'pending',
    commissionPct: 10,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockProduct = {
    _id: '6717c000a1b2c3d4e5f67999',
    vendorId: mockVendorDoc1._id,
    title: 'Gaming Headset',
    description: 'Surround sound audio',
    price: 1999,
    stock: 25,
    category: 'Electronics',
    tags: ['audio', 'gaming'],
    images: ['http://localhost:9000/marketplace-images/products/img1.jpg'],
    isActive: true,
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Vendor Application & Management', () => {
    it('customer should apply to become a vendor (201 Created)', async () => {
      const customerToken = generateAccessToken(mockCustomer);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(null);
      jest.spyOn(Vendor, 'create').mockResolvedValue(mockPendingVendorDoc);

      const res = await request(app)
        .post('/api/vendors/apply')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          storeName: 'Pending Store',
          description: 'A great store',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.vendor.status).toBe('pending');
    });

    it('customer should be rejected on duplicate application (409 Conflict)', async () => {
      const customerToken = generateAccessToken(mockCustomer);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockPendingVendorDoc);

      const res = await request(app)
        .post('/api/vendors/apply')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          storeName: 'Another Store',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already been submitted/i);
    });

    it('admin should approve vendor and upgrade user role (200 OK)', async () => {
      const adminToken = generateAccessToken(mockAdmin);
      jest.spyOn(User, 'findById').mockResolvedValue(mockAdmin);
      const userUpdateSpy = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});
      jest.spyOn(Vendor, 'findById').mockResolvedValue({
        ...mockPendingVendorDoc,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .patch(`/api/admin/vendors/${mockPendingVendorDoc._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(userUpdateSpy).toHaveBeenCalledWith(mockPendingVendorDoc.userId, { role: 'vendor' });
    });

    it('admin should reject vendor with optional reason (200 OK)', async () => {
      const adminToken = generateAccessToken(mockAdmin);
      jest.spyOn(User, 'findById').mockResolvedValue(mockAdmin);
      jest.spyOn(Vendor, 'findById').mockResolvedValue({
        ...mockPendingVendorDoc,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .patch(`/api/admin/vendors/${mockPendingVendorDoc._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Incomplete business credentials' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('admin should set commission percentage (0-50%)', async () => {
      const adminToken = generateAccessToken(mockAdmin);
      jest.spyOn(User, 'findById').mockResolvedValue(mockAdmin);
      jest.spyOn(Vendor, 'findById').mockResolvedValue({
        ...mockVendorDoc1,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .patch(`/api/admin/vendors/${mockVendorDoc1._id}/commission`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ commissionPct: 15 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('admin commission update should reject percentages > 50 (400 Bad Request)', async () => {
      const adminToken = generateAccessToken(mockAdmin);
      jest.spyOn(User, 'findById').mockResolvedValue(mockAdmin);

      const res = await request(app)
        .patch(`/api/admin/vendors/${mockVendorDoc1._id}/commission`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ commissionPct: 75 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Product CRUD & Ownership Protection', () => {
    it('customer or unapproved vendor blocked from creating products (403 Forbidden)', async () => {
      const customerToken = generateAccessToken(mockCustomer);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Unauthorized Product',
          description: 'Desc',
          price: 100,
          stock: 10,
          category: 'Books',
        });

      expect(res.status).toBe(403);
    });

    it('approved vendor should create product successfully (201 Created)', async () => {
      const vendorToken = generateAccessToken(mockVendor1User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor1User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc1);
      jest.spyOn(Product, 'create').mockResolvedValue(mockProduct);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Gaming Headset',
          description: 'Surround sound audio',
          price: 1999,
          stock: 25,
          category: 'Electronics',
          tags: ['audio', 'gaming'],
          images: ['http://localhost:9000/marketplace-images/products/img1.jpg'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.product.title).toBe('Gaming Headset');
    });

    it('should validate price between 1 and 1,000,000 INR, stock 0-100,000, title 3-120 chars, and desc max 2000 chars (400 Bad Request)', async () => {
      const vendorToken = generateAccessToken(mockVendor1User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor1User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc1);

      // Price < 1
      const resPriceLow = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Bad Price',
          description: 'Valid Description',
          price: 0,
          stock: 10,
          category: 'Electronics',
        });
      expect(resPriceLow.status).toBe(400);
      expect(resPriceLow.body.message).toContain('Price must be between 1 and 1,000,000 INR');

      // Price > 1,000,000
      const resPriceHigh = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Too Expensive',
          description: 'Valid Description',
          price: 1500000,
          stock: 10,
          category: 'Electronics',
        });
      expect(resPriceHigh.status).toBe(400);
      expect(resPriceHigh.body.message).toContain('Price must be between 1 and 1,000,000 INR');

      // Non-integer stock
      const resStockFloat = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Bad Stock',
          description: 'Valid Description',
          price: 100,
          stock: 12.5,
          category: 'Electronics',
        });
      expect(resStockFloat.status).toBe(400);
      expect(resStockFloat.body.message).toContain('Stock must be an integer between 0 and 100,000');

      // Stock > 100,000
      const resStockHigh = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Too Much Stock',
          description: 'Valid Description',
          price: 100,
          stock: 150000,
          category: 'Electronics',
        });
      expect(resStockHigh.status).toBe(400);
      expect(resStockHigh.body.message).toContain('Stock must be an integer between 0 and 100,000');

      // Title < 3 chars
      const resTitleShort = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'AB',
          description: 'Valid Description',
          price: 100,
          stock: 10,
          category: 'Electronics',
        });
      expect(resTitleShort.status).toBe(400);
      expect(resTitleShort.body.message).toContain('Title must be between 3 and 120 characters');

      // Title > 120 chars
      const resTitleLong = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'A'.repeat(125),
          description: 'Valid Description',
          price: 100,
          stock: 10,
          category: 'Electronics',
        });
      expect(resTitleLong.status).toBe(400);
      expect(resTitleLong.body.message).toContain('Title must be between 3 and 120 characters');

      // Description > 2000 chars
      const resDescLong = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Valid Title',
          description: 'D'.repeat(2005),
          price: 100,
          stock: 10,
          category: 'Electronics',
        });
      expect(resDescLong.status).toBe(400);
      expect(resDescLong.body.message).toContain('Description cannot exceed 2000 characters');
    });

    it('owning vendor should update product (200 OK)', async () => {
      const vendorToken = generateAccessToken(mockVendor1User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor1User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc1);
      jest.spyOn(Product, 'findById').mockResolvedValue({
        ...mockProduct,
        vendorId: mockVendorDoc1._id,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .put(`/api/products/${mockProduct._id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          price: 1799,
          stock: 30,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('second vendor rejected with 403 when trying to update first vendor product', async () => {
      const vendor2Token = generateAccessToken(mockVendor2User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor2User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc2); // Vendor 2
      jest.spyOn(Product, 'findById').mockResolvedValue({
        ...mockProduct,
        vendorId: mockVendorDoc1._id, // Belongs to Vendor 1
      });

      const res = await request(app)
        .put(`/api/products/${mockProduct._id}`)
        .set('Authorization', `Bearer ${vendor2Token}`)
        .send({
          price: 999,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('owning vendor should soft-delete product (200 OK)', async () => {
      const vendorToken = generateAccessToken(mockVendor1User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor1User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc1);
      jest.spyOn(Product, 'findById').mockResolvedValue({
        ...mockProduct,
        vendorId: mockVendorDoc1._id,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .delete(`/api/products/${mockProduct._id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('second vendor rejected with 403 when trying to delete first vendor product', async () => {
      const vendor2Token = generateAccessToken(mockVendor2User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor2User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc2);
      jest.spyOn(Product, 'findById').mockResolvedValue({
        ...mockProduct,
        vendorId: mockVendorDoc1._id,
      });

      const res = await request(app)
        .delete(`/api/products/${mockProduct._id}`)
        .set('Authorization', `Bearer ${vendor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('public should retrieve active product (200 OK)', async () => {
      const populateMock = jest.fn().mockResolvedValue({
        ...mockProduct,
        isActive: true,
      });
      jest.spyOn(Product, 'findOne').mockReturnValue({ populate: populateMock });

      const res = await request(app).get(`/api/products/${mockProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product._id).toBe(mockProduct._id);
    });

    it('public request for inactive product should return 404', async () => {
      const populateMock = jest.fn().mockResolvedValue(null);
      jest.spyOn(Product, 'findOne').mockReturnValue({ populate: populateMock });

      const res = await request(app).get(`/api/products/inactive_id`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('S3 / MinIO Presigned Uploads', () => {
    it('approved vendor should generate presigned upload URL (200 OK)', async () => {
      const vendorToken = generateAccessToken(mockVendor1User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor1User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc1);

      // Mock S3 presigner
      jest.spyOn(s3Service, 'createPresignedUploadUrl').mockResolvedValue({
        uploadUrl: 'http://localhost:9000/marketplace-images/products/test.png?X-Amz-Signature=123',
        fileUrl: 'http://localhost:9000/marketplace-images/products/test.png',
        key: 'products/v1/test.png',
      });

      const res = await request(app)
        .post('/api/uploads/presign')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          fileName: 'test.png',
          contentType: 'image/png',
          folder: 'products',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('fileUrl');
      expect(res.body).toHaveProperty('key');
    });

    it('presign should reject unsupported content type (400 Bad Request)', async () => {
      const vendorToken = generateAccessToken(mockVendor1User);
      jest.spyOn(User, 'findById').mockResolvedValue(mockVendor1User);
      jest.spyOn(Vendor, 'findOne').mockResolvedValue(mockVendorDoc1);

      const res = await request(app)
        .post('/api/uploads/presign')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          fileName: 'document.pdf',
          contentType: 'application/pdf',
          folder: 'products',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid contentType/i);
    });

    it('presign should reject customer with 403 Forbidden', async () => {
      const customerToken = generateAccessToken(mockCustomer);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);

      const res = await request(app)
        .post('/api/uploads/presign')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fileName: 'photo.jpg',
          contentType: 'image/jpeg',
          folder: 'products',
        });

      expect(res.status).toBe(403);
    });
  });
});
