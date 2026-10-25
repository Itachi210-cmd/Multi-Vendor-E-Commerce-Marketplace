import redisClient from '../config/redis.js';
import Order from '../models/order.model.js';
import Payout from '../models/payout.model.js';
import Product from '../models/product.model.js';
import Vendor from '../models/vendor.model.js';
import User from '../models/user.model.js';

export const ANALYTICS_CACHE_TTL = 300; // 5 minutes in seconds

/**
 * Get date range bounds based on '7d' | '30d' | '90d'
 */
const getRangeBounds = (rangeStr) => {
  let days = 7;
  if (rangeStr === '30d') days = 30;
  else if (rangeStr === '90d') days = 90;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  return { days, startDate, endDate: now };
};

/**
 * Generate an array of YYYY-MM-DD date strings for the past `days` count ending today
 */
const generateDateKeys = (startDate, days) => {
  const keys = [];
  const current = new Date(startDate);
  for (let i = 0; i < days; i++) {
    keys.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return keys;
};

/**
 * Fetch Admin Analytics with MongoDB Aggregations and 5-minute Redis Caching
 */
export const getAdminAnalytics = async (rangeQuery = '7d', skipCache = false) => {
  const cleanRange = ['7d', '30d', '90d'].includes(rangeQuery) ? rangeQuery : '7d';
  const cacheKey = `analytics:${cleanRange}`;

  // 1. Try Redis cache first
  if (!skipCache) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return { ...JSON.parse(cached), cached: true };
      }
    } catch (err) {
      // Redis error: fall through to DB query
    }
  }

  const { days, startDate, endDate } = getRangeBounds(cleanRange);
  const dateKeys = generateDateKeys(startDate, days);

  // 2. Parallel aggregation queries
  const [
    revenueAgg,
    refundedAgg,
    payoutAgg,
    dailyAgg,
    statusAgg,
    topVendorsAgg,
    topProductsAgg,
    lowStockProducts,
    activeVendorsCount,
  ] = await Promise.all([
    // Revenue from paid orders in range
    Order.aggregate([
      {
        $match: {
          'payment.status': 'paid',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          customerIds: { $addToSet: '$customerId' },
        },
      },
    ]),

    // Refunded orders in range (to subtract from gross revenue)
    Order.aggregate([
      {
        $match: {
          'payment.status': 'refunded',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: '$total' },
          refundedCount: { $sum: 1 },
        },
      },
    ]),

    // Platform commission earned from payouts excluding reversed ones in range
    Payout.aggregate([
      {
        $match: {
          status: { $ne: 'reversed' },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commission' },
        },
      },
    ]),

    // Daily revenue and orders for paid orders (and refunded amounts)
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            paymentStatus: '$payment.status',
          },
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Sub-order status breakdown across orders in range
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$subOrders' },
      {
        $group: {
          _id: '$subOrders.status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Top 5 vendors by revenue (from paid orders)
    Order.aggregate([
      {
        $match: {
          'payment.status': 'paid',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$subOrders' },
      {
        $group: {
          _id: '$subOrders.vendorId',
          revenue: { $sum: '$subOrders.subtotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo',
        },
      },
      { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vendorId: '$_id',
          storeName: { $ifNull: ['$vendorInfo.storeName', 'Unknown Vendor'] },
          revenue: { $round: ['$revenue', 2] },
          orderCount: 1,
        },
      },
    ]),

    // Top 5 products by units sold (from paid orders)
    Order.aggregate([
      {
        $match: {
          'payment.status': 'paid',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          unitsSold: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
      {
        $project: {
          productId: '$_id',
          title: 1,
          unitsSold: 1,
          revenue: { $round: ['$revenue', 2] },
        },
      },
    ]),

    // Low stock products (stock <= 5 and isActive: true)
    Product.find({ stock: { $lte: 5 }, isActive: true })
      .populate('vendorId', 'storeName')
      .select('title stock price category vendorId')
      .sort({ stock: 1 })
      .limit(10)
      .lean(),

    // Active approved vendors count
    Vendor.countDocuments({ status: 'approved' }),
  ]);

  // 3. Compute Totals
  const grossRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
  const refundedRevenue = refundedAgg.length > 0 ? refundedAgg[0].totalRefunded : 0;
  const netRevenue = Math.max(0, Number((grossRevenue - refundedRevenue).toFixed(2)));

  const ordersCount = revenueAgg.length > 0 ? revenueAgg[0].orderCount : 0;
  const activeCustomersCount =
    revenueAgg.length > 0 && revenueAgg[0].customerIds
      ? revenueAgg[0].customerIds.length
      : 0;

  const commission =
    payoutAgg.length > 0 ? Number(payoutAgg[0].totalCommission.toFixed(2)) : 0;

  const aov = ordersCount > 0 ? Number((netRevenue / ordersCount).toFixed(2)) : 0;

  // 4. Fill daily timeseries (filling missing days with zero)
  const dailyMap = new Map();
  dateKeys.forEach((d) => {
    dailyMap.set(d, { date: d, revenue: 0, orders: 0 });
  });

  dailyAgg.forEach((entry) => {
    const dStr = entry._id?.dateStr;
    const status = entry._id?.paymentStatus;
    if (dStr && dailyMap.has(dStr)) {
      const current = dailyMap.get(dStr);
      if (status === 'paid') {
        current.revenue = Number((current.revenue + entry.revenue).toFixed(2));
        current.orders += entry.count;
      } else if (status === 'refunded') {
        // Subtract refunded amount from day's revenue
        current.revenue = Number((current.revenue - entry.revenue).toFixed(2));
      }
    }
  });

  // Ensure no negative daily revenue
  const dailySeries = dateKeys.map((k) => {
    const item = dailyMap.get(k);
    return {
      date: item.date,
      revenue: Math.max(0, item.revenue),
      orders: Math.max(0, item.orders),
    };
  });

  // 5. Format SubOrder status breakdown
  const statusMap = {
    placed: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  statusAgg.forEach((s) => {
    if (statusMap[s._id] !== undefined) {
      statusMap[s._id] = s.count;
    }
  });

  const analyticsData = {
    range: cleanRange,
    totals: {
      revenue: netRevenue,
      commission,
      orders: ordersCount,
      averageOrderValue: aov,
      activeCustomers: activeCustomersCount,
      activeVendors: activeVendorsCount,
    },
    dailySeries,
    statusBreakdown: statusMap,
    topVendors: topVendorsAgg.map((v) => ({
      vendorId: v.vendorId,
      storeName: v.storeName,
      revenue: v.revenue,
      orderCount: v.orderCount,
    })),
    topProducts: topProductsAgg.map((p) => ({
      productId: p.productId,
      title: p.title,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
    })),
    lowStock: lowStockProducts.map((p) => ({
      _id: p._id,
      title: p.title,
      stock: p.stock,
      price: p.price,
      category: p.category,
      storeName: p.vendorId?.storeName || 'Unknown Store',
    })),
  };

  // 6. Cache in Redis for 5 minutes
  try {
    await redisClient.set(cacheKey, JSON.stringify(analyticsData), 'EX', ANALYTICS_CACHE_TTL);
  } catch (err) {
    // Non-blocking cache write failure
  }

  return { ...analyticsData, cached: false };
};

export const analyticsService = {
  getAdminAnalytics,
};

export default analyticsService;
