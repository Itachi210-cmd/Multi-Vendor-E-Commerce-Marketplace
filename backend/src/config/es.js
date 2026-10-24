import { Client } from '@elastic/elasticsearch';
import { env } from './env.js';

/**
 * Elasticsearch official client instance
 */
export const esClient = new Client({
  node: env.esNode,
  maxRetries: 2,
  requestTimeout: 3000,
});

/**
 * Health check helper for Elasticsearch
 */
export const checkElasticsearchHealth = async () => {
  try {
    const health = await esClient.cluster.health();
    return {
      status: 'connected',
      clusterStatus: health.status,
      numberOfNodes: health.number_of_nodes,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};

export default esClient;
