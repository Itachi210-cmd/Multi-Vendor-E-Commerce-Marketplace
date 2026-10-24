import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import redisClient from '../config/redis.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Cookie options for the refresh token
 */
export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  path: '/',
});

export const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/',
});

/**
 * Generate Access Token (15 minutes)
 */
export const generateAccessToken = (user) => {
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

/**
 * Generate Refresh Token (7 days) and save tokenId in Redis
 */
export const generateRefreshToken = async (user) => {
  const userId = user._id ? user._id.toString() : user.id;
  const tokenId = crypto.randomUUID();

  const payload = {
    id: userId,
    tokenId,
  };

  const token = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRY });

  // Store in Redis: refresh:{userId}:{tokenId} with 7-day TTL
  const redisKey = `refresh:${userId}:${tokenId}`;
  await redisClient.set(redisKey, '1', 'EX', REFRESH_TOKEN_TTL_SECONDS);

  return { token, tokenId };
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtAccessSecret);
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret);
};

/**
 * Delete a specific refresh token from Redis
 */
export const revokeRefreshToken = async (userId, tokenId) => {
  if (!userId || !tokenId) return;
  const redisKey = `refresh:${userId}:${tokenId}`;
  await redisClient.del(redisKey);
};

/**
 * Check if a refresh token exists in Redis
 */
export const isRefreshTokenValidInRedis = async (userId, tokenId) => {
  if (!userId || !tokenId) return false;
  const redisKey = `refresh:${userId}:${tokenId}`;
  const exists = await redisClient.get(redisKey);
  return exists !== null;
};
