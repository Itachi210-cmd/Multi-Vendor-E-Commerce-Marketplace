import { getAdminAnalytics } from '../services/analytics.service.js';

export const getAdminAnalyticsHandler = async (req, res, next) => {
  try {
    const { range } = req.query;
    const data = await getAdminAnalytics(range);
    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};
