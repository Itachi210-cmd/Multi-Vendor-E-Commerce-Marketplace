import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import esClient from '../src/config/es.js';
import redisClient from '../src/config/redis.js';
import Product from '../src/models/product.model.js';
import Vendor from '../src/models/vendor.model.js';
import User from '../src/models/user.model.js';
import {
  ensureIndex,
  indexProduct,
  updateProductInES,
  removeProduct,
  suggest,
} from '../src/services/search.service.js';
import { getPublicProducts } from '../src/services/product.service.js';
import { generateAccessToken } from '../src/utils/token.utils.js';

const TEST_INDEX = 'products_test';

describe('Phase 4: Elasticsearch Search & Sync Service Tests', () => {
  const originalIndex = env.esIndex;

  const mockVendorUser = {
    _id: '6717a6a4a1b2c3d4e5f67899',
    name: 'Search Vendor',
    email: 'searchvendor@example.com',
    role: 'vendor',
  };

  const mockVendorDoc = {
    _id: '6717b000a1b2c3d4e5f67999',
    userId: mockVendorUser._id,
    storeName: 'Audio Haven',
    description: 'Premier audio & gear store',
    status: 'approved',
    commissionPct: 10,
    save: jest.fn().mockResolvedValue(true),
  };

  const sampleProducts = [
    {
      _id: '6717c000a1b2c3d4e5f60001',
      title: 'Noise Cancelling Headphones',
      description: 'Wireless over-ear bluetooth headphones with deep bass',
      category: 'Electronics',
      tags: ['audio', 'bluetooth', 'wireless'],
      price: 2999,
      ratingAvg: 4.8,
      ratingCount: 120,
      stock: 15,
      vendorId: mockVendorDoc._id,
      storeName: 'Audio Haven',
      image: 'https://example.com/headphones.jpg',
      images: ['https://example.com/headphones.jpg'],
      isActive: true,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      _id: '6717c000a1b2c3d4e5f60002',
      title: 'Ergonomic Office Chair',
      description: 'High lumbar support swivel desk chair for work',
      category: 'Home & Furniture',
      tags: ['office', 'furniture', 'chair'],
      price: 7999,
      ratingAvg: 4.2,
      ratingCount: 45,
      stock: 8,
      vendorId: mockVendorDoc._id,
      storeName: 'Comfort Craft',
      image: 'https://example.com/chair.jpg',
      images: ['https://example.com/chair.jpg'],
      isActive: true,
      createdAt: new Date('2026-01-02T10:00:00Z'),
    },
    {
      _id: '6717c000a1b2c3d4e5f60003',
      title: 'Mechanical Gaming Keyboard',
      description: 'RGB backlit clicky switches keyboard for esports',
      category: 'Electronics',
      tags: ['gaming', 'keyboard', 'rgb'],
      price: 4499,
      ratingAvg: 4.6,
      ratingCount: 88,
      stock: 20,
      vendorId: mockVendorDoc._id,
      storeName: 'Audio Haven',
      image: 'https://example.com/keyboard.jpg',
      images: ['https://example.com/keyboard.jpg'],
      isActive: true,
      createdAt: new Date('2026-01-03T10:00:00Z'),
    },
    {
      _id: '6717c000a1b2c3d4e5f60004',
      title: 'Cotton Running T-Shirt',
      description: 'Breathable athletic dry-fit shirt for workouts',
      category: 'Fashion',
      tags: ['apparel', 'sports', 'fitness'],
      price: 799,
      ratingAvg: 3.9,
      ratingCount: 15,
      stock: 50,
      vendorId: mockVendorDoc._id,
      storeName: 'Apparel Co',
      image: 'https://example.com/tshirt.jpg',
      images: ['https://example.com/tshirt.jpg'],
      isActive: true,
      createdAt: new Date('2026-01-04T10:00:00Z'),
    },
    {
      _id: '6717c000a1b2c3d4e5f60005',
      title: 'Pro Running Shoes',
      description: 'Lightweight marathon running shoes with foam cushion',
      category: 'Footwear',
      tags: ['shoes', 'sports', 'running'],
      price: 3499,
      ratingAvg: 4.5,
      ratingCount: 60,
      stock: 0, // Out of stock to test inStock filter
      vendorId: mockVendorDoc._id,
      storeName: 'Apparel Co',
      image: 'https://example.com/shoes.jpg',
      images: ['https://example.com/shoes.jpg'],
      isActive: true,
      createdAt: new Date('2026-01-05T10:00:00Z'),
    },
    {
      _id: '6717c000a1b2c3d4e5f60006',
      title: 'Vintage Leather Jacket',
      description: 'Archived inactive outerwear item',
      category: 'Fashion',
      tags: ['jacket', 'leather'],
      price: 8999,
      ratingAvg: 4.0,
      ratingCount: 5,
      stock: 2,
      vendorId: mockVendorDoc._id,
      storeName: 'Apparel Co',
      image: 'https://example.com/jacket.jpg',
      images: ['https://example.com/jacket.jpg'],
      isActive: false, // Inactive product
      createdAt: new Date('2026-01-06T10:00:00Z'),
    },
  ];

  beforeAll(async () => {
    // Switch to isolated test index
    env.esIndex = TEST_INDEX;

    // Ensure test index exists and is clean
    await ensureIndex(TEST_INDEX, { recreate: true });

    // Index sample products into test index
    for (const p of sampleProducts) {
      await indexProduct(p, TEST_INDEX);
    }

    // Refresh test index to make docs immediately searchable
    await esClient.indices.refresh({ index: TEST_INDEX });
  });

  afterAll(async () => {
    // Clean up test index and restore config
    try {
      await esClient.indices.delete({ index: TEST_INDEX });
    } catch {
      // ignore
    }
    env.esIndex = originalIndex;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('Elasticsearch Querying & Search Features', () => {
    it('should search products by keyword (q=headphones)', async () => {
      const res = await request(app).get('/api/products?q=headphones');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.source).toBe('elasticsearch');
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0].title).toBe('Noise Cancelling Headphones');
    });

    it('should perform fuzzy typo match (q=headphonse matching headphones)', async () => {
      const res = await request(app).get('/api/products?q=headphonse');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0].title).toBe('Noise Cancelling Headphones');
    });

    it('should filter by category and price range', async () => {
      const res = await request(app).get('/api/products?category=Electronics&minPrice=3000&maxPrice=5000');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].title).toBe('Mechanical Gaming Keyboard');
      expect(res.body.products[0].price).toBe(4499);
    });

    it('should filter out of stock items when inStock=true', async () => {
      // Pro Running Shoes has stock: 0
      const res = await request(app).get('/api/products?category=Footwear&inStock=true');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(0);
    });

    it('should filter by minimum rating (minRating=4.5)', async () => {
      const res = await request(app).get('/api/products?minRating=4.5');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      res.body.products.forEach((p) => {
        expect(p.ratingAvg).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should sort products by price ascending (price_asc)', async () => {
      const res = await request(app).get('/api/products?sort=price_asc');

      expect(res.status).toBe(200);
      const prices = res.body.products.map((p) => p.price);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });

    it('should sort products by price descending (price_desc)', async () => {
      const res = await request(app).get('/api/products?sort=price_desc');

      expect(res.status).toBe(200);
      const prices = res.body.products.map((p) => p.price);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
      }
    });

    it('should sort products by rating descending (rating)', async () => {
      const res = await request(app).get('/api/products?sort=rating');

      expect(res.status).toBe(200);
      const ratings = res.body.products.map((p) => p.ratingAvg);
      for (let i = 0; i < ratings.length - 1; i++) {
        expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
      }
    });

    it('should support pagination (page=1, limit=2)', async () => {
      const res = await request(app).get('/api/products?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.total).toBe(5); // 5 active products
      expect(res.body.pages).toBe(3);
    });

    it('should return aggregated facets with categories and min/max price', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.facets).toBeDefined();
      expect(Array.isArray(res.body.facets.categories)).toBe(true);
      expect(res.body.facets.minPrice).toBe(799);
      expect(res.body.facets.maxPrice).toBe(7999);

      const categoryNames = res.body.facets.categories.map((c) => c.category);
      expect(categoryNames).toContain('Electronics');
      expect(categoryNames).toContain('Home & Furniture');
    });

    it('should return prefix autocomplete suggestions from GET /api/products/suggest', async () => {
      const res = await request(app).get('/api/products/suggest?q=Noise');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      expect(res.body.suggestions).toContain('Noise Cancelling Headphones');
    });
  });

  describe('Search Sync on Product Create, Update, and Delete', () => {
    const newProduct = {
      _id: '6717c000a1b2c3d4e5f69999',
      title: 'Sync Test Smartwatch',
      description: 'Water resistant fitness tracking smartwatch',
      price: 5999,
      stock: 12,
      category: 'Electronics',
      tags: ['watch', 'fitness'],
      images: ['https://example.com/watch.jpg'],
      vendorId: mockVendorDoc._id,
      storeName: 'Audio Haven',
      isActive: true,
      createdAt: new Date(),
    };

    it('should index a newly created product into Elasticsearch', async () => {
      await indexProduct(newProduct, TEST_INDEX);
      await esClient.indices.refresh({ index: TEST_INDEX });

      const check = await esClient.get({
        index: TEST_INDEX,
        id: newProduct._id.toString(),
      });

      expect(check._source.title).toBe('Sync Test Smartwatch');
      expect(check._source.price).toBe(5999);
    });

    it('should update an existing product in Elasticsearch', async () => {
      const updatedProduct = {
        ...newProduct,
        title: 'Updated Smartwatch Ultra',
        price: 6499,
      };

      await updateProductInES(updatedProduct, TEST_INDEX);
      await esClient.indices.refresh({ index: TEST_INDEX });

      const check = await esClient.get({
        index: TEST_INDEX,
        id: newProduct._id.toString(),
      });

      expect(check._source.title).toBe('Updated Smartwatch Ultra');
      expect(check._source.price).toBe(6499);
    });

    it('should remove a deleted or deactivated product from Elasticsearch', async () => {
      await removeProduct(newProduct._id, TEST_INDEX);
      await esClient.indices.refresh({ index: TEST_INDEX });

      let found = true;
      try {
        await esClient.get({
          index: TEST_INDEX,
          id: newProduct._id.toString(),
        });
      } catch (err) {
        if (err.meta?.statusCode === 404 || err.statusCode === 404) {
          found = false;
        }
      }

      expect(found).toBe(false);
    });
  });

  describe('Fault Tolerance & Fallback', () => {
    it('should gracefully fallback to MongoDB when Elasticsearch search fails', async () => {
      const fallbackQuery = 'unique_es_down_term';

      // Mock Product.find & aggregate for fallback verification
      jest.spyOn(Product, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: '6717c000a1b2c3d4e5f60001',
            title: 'Noise Cancelling Headphones',
            price: 2999,
            isActive: true,
          },
        ]),
      });
      jest.spyOn(Product, 'countDocuments').mockResolvedValue(1);
      jest.spyOn(Product, 'aggregate')
        .mockResolvedValueOnce([{ _id: 'Electronics', count: 1 }])
        .mockResolvedValueOnce([{ _id: null, minPrice: 2999, maxPrice: 2999 }]);

      // Mock esClient.search to simulate Elasticsearch outage
      jest.spyOn(esClient, 'search').mockRejectedValueOnce(new Error('Connection refused by Elasticsearch cluster'));

      const result = await getPublicProducts({ q: fallbackQuery });

      expect(result.source).toBe('mongodb');
      expect(result.products).toBeDefined();
      expect(result.products.length).toBe(1);
      expect(result.products[0].title).toBe('Noise Cancelling Headphones');
    });

    it('should cache search results in Redis and return cached result on repeat queries', async () => {
      const queryParams = { q: 'cachetest', category: 'Electronics' };

      // Ensure cache is clear
      const cacheKey = `search:${JSON.stringify({ category: 'Electronics', inStock: false, limit: 12, maxPrice: null, minPrice: null, minRating: null, page: 1, q: 'cachetest', sort: 'relevance', vendorId: null })}`;
      await redisClient.del(cacheKey);

      // First query: populates Redis
      const firstRes = await request(app).get('/api/products?q=cachetest&category=Electronics');
      expect(firstRes.status).toBe(200);

      // Second query: should hit cache
      const secondRes = await request(app).get('/api/products?q=cachetest&category=Electronics');
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.cached).toBe(true);
    });
  });
});
