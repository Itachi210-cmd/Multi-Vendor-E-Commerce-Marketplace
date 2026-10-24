import { getHealthStatus } from '../services/health.service.js';

/**
 * Controller for GET /api/health
 */
export const getHealth = async (req, res, next) => {
  try {
    const health = await getHealthStatus();
    // Return 200 if ok or degraded, 503 if all core services are down
    const httpStatus = health.status === 'down' ? 503 : 200;
    return res.status(httpStatus).json(health);
  } catch (error) {
    next(error);
  }
};
