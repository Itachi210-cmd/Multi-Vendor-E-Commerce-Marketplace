import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import redisClient from '../src/config/redis.js';
import { generateAccessToken, generateRefreshToken } from '../src/utils/token.utils.js';

describe('Auth & RBAC API Endpoints', () => {
  const mockPasswordHash = '$2b$12$e8Y5t1hK8oB2vM3eM1e6w.X9k8sFzV4gA5jL7pQ2wR1tY3uI5oP7q'; // Mock hash
  const mockCustomer = {
    _id: '6717a6a4a1b2c3d4e5f67890',
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: mockPasswordHash,
    role: 'customer',
    comparePassword: jest.fn(),
    toJSON: function () {
      return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
      };
    },
  };

  const mockAdmin = {
    _id: '6717a6a4a1b2c3d4e5f67891',
    name: 'Admin User',
    email: 'admin@example.com',
    passwordHash: mockPasswordHash,
    role: 'admin',
    comparePassword: jest.fn(),
    toJSON: function () {
      return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
      };
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default Redis mocks
    jest.spyOn(redisClient, 'set').mockResolvedValue('OK');
    jest.spyOn(redisClient, 'get').mockResolvedValue('1');
    jest.spyOn(redisClient, 'del').mockResolvedValue(1);
  });

  afterAll(async () => {
    // Avoid leaving open handles
  });

  describe('POST /api/auth/register', () => {
    it('should register a new customer successfully', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'create').mockResolvedValue({
        ...mockCustomer,
        toJSON: mockCustomer.toJSON,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('email', 'john@example.com');
      expect(res.body.user).toHaveProperty('role', 'customer');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject registration if email is duplicate (409 Conflict)', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(mockCustomer);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'john@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should fail validation when password is under 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Password',
          email: 'short@example.com',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in successfully with valid credentials', async () => {
      const userWithCompare = {
        ...mockCustomer,
        comparePassword: jest.fn().mockResolvedValue(true),
        toJSON: mockCustomer.toJSON,
      };

      const selectMock = jest.fn().mockResolvedValue(userWithCompare);
      jest.spyOn(User, 'findOne').mockReturnValue({ select: selectMock });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('john@example.com');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 with generic message on wrong password', async () => {
      const userWithCompare = {
        ...mockCustomer,
        comparePassword: jest.fn().mockResolvedValue(false),
        toJSON: mockCustomer.toJSON,
      };

      const selectMock = jest.fn().mockResolvedValue(userWithCompare);
      jest.spyOn(User, 'findOne').mockReturnValue({ select: selectMock });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 401 with generic message when email does not exist', async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      jest.spyOn(User, 'findOne').mockReturnValue({ select: selectMock });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when valid Bearer token is provided', async () => {
      const token = generateAccessToken(mockCustomer);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(mockCustomer.email);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required/i);
    });
  });

  describe('POST /api/auth/refresh and rotation', () => {
    it('should rotate refresh token and issue a new access token', async () => {
      const { token: initialRefreshToken, tokenId } = await generateRefreshToken(mockCustomer);
      jest.spyOn(redisClient, 'get').mockResolvedValue('1');
      const delSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('accessToken');
      // Verifies old token was revoked in Redis
      expect(delSpy).toHaveBeenCalledWith(`refresh:${mockCustomer._id}:${tokenId}`);
      // Verifies new cookie was set
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject refresh if token is not valid in Redis', async () => {
      const { token: orphanRefreshToken } = await generateRefreshToken(mockCustomer);
      jest.spyOn(redisClient, 'get').mockResolvedValue(null); // Not found in Redis

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${orphanRefreshToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired or has been revoked/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke refresh token in Redis and clear cookie', async () => {
      const { token: testRefreshToken, tokenId } = await generateRefreshToken(mockCustomer);
      const delSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refreshToken=${testRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(delSpy).toHaveBeenCalledWith(`refresh:${mockCustomer._id}:${tokenId}`);
    });
  });

  describe('Role-Based Access Control (RBAC) Test Routes', () => {
    it('should allow customer to access /api/test/customer', async () => {
      const customerToken = generateAccessToken(mockCustomer);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);

      const res = await request(app)
        .get('/api/test/customer')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('customer');
    });

    it('should reject customer accessing /api/test/admin with 403 Forbidden', async () => {
      const customerToken = generateAccessToken(mockCustomer);
      jest.spyOn(User, 'findById').mockResolvedValue(mockCustomer);

      const res = await request(app)
        .get('/api/test/admin')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('should allow admin to access /api/test/admin', async () => {
      const adminToken = generateAccessToken(mockAdmin);
      jest.spyOn(User, 'findById').mockResolvedValue(mockAdmin);

      const res = await request(app)
        .get('/api/test/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('admin');
    });
  });
});
