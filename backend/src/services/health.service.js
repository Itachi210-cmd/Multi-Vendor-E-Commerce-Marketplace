import { checkMongoHealth } from '../config/db.js';
import { checkRedisHealth } from '../config/redis.js';
import { checkElasticsearchHealth } from '../config/es.js';

/**
 * Service to aggregate health statuses of MongoDB, Redis, and Elasticsearch
 */
export const getHealthStatus = async () => {
  const [mongo, redis, elasticsearch] = await Promise.all([
    checkMongoHealth(),
    checkRedisHealth(),
    checkElasticsearchHealth(),
  ]);

  const allConnected =
    mongo.status === 'connected' &&
    redis.status === 'connected' &&
    elasticsearch.status === 'connected';

  const anyConnected =
    mongo.status === 'connected' ||
    redis.status === 'connected' ||
    elasticsearch.status === 'connected';

  return {
    status: allConnected ? 'ok' : anyConnected ? 'degraded' : 'down',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      mongodb: mongo,
      redis,
      elasticsearch,
    },
  };
};
