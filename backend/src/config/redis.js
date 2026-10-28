import Redis from 'ioredis';
import { env } from './env.js';

/**
 * ioredis client instance
 */
export const redisClient = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    // Retry reconnect after a small delay, max 3s
    return Math.min(times * 150, 3000);
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect when receiving READONLY error
    }
    return false;
  },
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redisClient.on('error', (err) => {
  // Avoid crashing app on background reconnect failures
  if (err.code !== 'ECONNREFUSED') {
    console.error(`[Redis] Error: ${err.message}`);
  }
});

let redisRetryTimeout = null;

/**
 * Connect to Redis during app startup with retry and exponential backoff
 */
export const connectRedis = async (retryAttempt = 0) => {
  try {
    if (redisClient.status === 'wait' || redisClient.status === 'close') {
      await redisClient.connect();
    }
  } catch (error) {
    const delay = Math.min(1000 * Math.pow(2, retryAttempt), 15000);
    console.warn(`[Redis] Connection failed: ${error.message}. Retrying in ${delay / 1000}s (attempt ${retryAttempt + 1})...`);

    if (redisRetryTimeout) clearTimeout(redisRetryTimeout);

    redisRetryTimeout = setTimeout(() => {
      connectRedis(retryAttempt + 1).catch(() => {});
    }, delay);
  }
};

/**
 * Health check helper for Redis
 */
export const checkRedisHealth = async () => {
  try {
    if (redisClient.status !== 'ready') {
      if (redisClient.status === 'wait' || redisClient.status === 'close') {
        await redisClient.connect();
      }
    }
    const start = Date.now();
    const pong = await redisClient.ping();
    const latencyMs = Date.now() - start;

    return {
      status: pong === 'PONG' ? 'connected' : 'error',
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};

export default redisClient;
