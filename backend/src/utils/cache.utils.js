import redisClient from '../config/redis.js';

/**
 * Generate a deterministic normalized Redis cache key from search query parameters
 */
export const getNormalizedSearchKey = (params = {}) => {
  const allowedKeys = ['q', 'category', 'minPrice', 'maxPrice', 'minRating', 'inStock', 'vendorId', 'sort', 'page', 'limit'];
  const normalizedObj = {};

  allowedKeys.sort().forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      normalizedObj[key] = String(params[key]).trim().toLowerCase();
    }
  });

  return `search:${JSON.stringify(normalizedObj)}`;
};

/**
 * Retrieve cached search result from Redis
 */
export const getCachedSearch = async (key) => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.warn(`[Redis Cache] Read error for key ${key}:`, err.message);
    return null;
  }
};

/**
 * Store search result in Redis with a 60-second TTL
 */
export const setCachedSearch = async (key, data, ttlSeconds = 60) => {
  try {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`[Redis Cache] Write error for key ${key}:`, err.message);
  }
};

/**
 * Invalidate all search cache entries (called on product writes)
 */
export const invalidateSearchCache = async () => {
  try {
    const keys = await redisClient.keys('search:*');
    if (keys && keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    console.warn('[Redis Cache] Invalidation error:', err.message);
  }
};
