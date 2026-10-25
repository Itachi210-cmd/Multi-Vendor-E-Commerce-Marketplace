import Order, { generateOrderNumber } from '../models/order.model.js';
import Product from '../models/product.model.js';
import Vendor from '../models/vendor.model.js';
import Payout from '../models/payout.model.js';
import { getCart, clearCart } from './cart.service.js';
import { getPaymentProvider } from './payment/index.js';
import { reversePayouts } from './payout.service.js';
import {
  validateCoupon,
  distributeDiscountLargestRemainder,
  recordCouponUsage,
  restoreCouponUsage,
} from './coupon.service.js';

/**
 * Validate customer shipping address format
 */
export const validateShippingAddress = (address) => {
  if (!address || typeof address !== 'object') {
    const err = new Error('Shipping address is required');
    err.statusCode = 400;
    throw err;
  }

  const { name, phone, line1, city, state, pincode } = address;

  if (!name || !name.trim()) {
    const err = new Error('Recipient name is required');
    err.statusCode = 400;
    throw err;
  }

  if (!phone || !phone.trim() || phone.trim().length < 8) {
    const err = new Error('Valid contact phone number is required');
    err.statusCode = 400;
    throw err;
  }

  if (!line1 || !line1.trim()) {
    const err = new Error('Address line 1 is required');
    err.statusCode = 400;
    throw err;
  }

  if (!city || !city.trim()) {
    const err = new Error('City is required');
    err.statusCode = 400;
    throw err;
  }

  if (!state || !state.trim()) {
    const err = new Error('State is required');
    err.statusCode = 400;
    throw err;
  }

  const cleanPincode = (pincode || '').toString().trim();
  if (!/^\d{6}$/.test(cleanPincode)) {
    const err = new Error('Pincode must be exactly 6 digits');
    err.statusCode = 400;
    throw err;
  }

  return {
    name: name.trim(),
    phone: phone.trim(),
    line1: line1.trim(),
    line2: (address.line2 || '').trim(),
    city: city.trim(),
    state: state.trim(),
    pincode: cleanPincode,
  };
};

/**
 * Create Checkout Order from customer's Redis Cart
 * Validates active status, stock, and calculates multi-vendor commissions.
 * Accepts optional couponCode, validates against subtotal, and distributes discount proportionally.
 * Does NOT reduce stock or clear cart yet (happens on payment success).
 */
export const checkoutOrder = async (userId, rawAddress, couponCode = '') => {
  const shippingAddress = validateShippingAddress(rawAddress);

  // 1. Fetch current cart
  const cart = await getCart(userId);
  if (!cart.items || cart.items.length === 0) {
    const err = new Error('Your cart is empty');
    err.statusCode = 400;
    throw err;
  }

  // 2. Validate every item from fresh MongoDB data in getCart()
  const issues = [];
  for (const item of cart.items) {
    if (item.inactive) {
      issues.push(`Product "${item.title}" has been deactivated.`);
    } else if (item.outOfStock) {
      issues.push(`Product "${item.title}" is currently out of stock.`);
    } else if (item.qtyExceedsStock) {
      issues.push(
        `Product "${item.title}" has only ${item.stock} units available (you requested ${item.qty}).`
      );
    }
  }

  if (issues.length > 0) {
    const err = new Error('Some items in your cart are unavailable or out of stock');
    err.statusCode = 409; // 409 Conflict per specification
    err.issues = issues;
    throw err;
  }

  // 3. Group items by vendor to construct subOrders
  const vendorItemMap = new Map();
  for (const item of cart.items) {
    const vId = item.vendorId?.toString();
    if (!vId) continue;
    if (!vendorItemMap.has(vId)) {
      vendorItemMap.set(vId, []);
    }
    vendorItemMap.get(vId).push({
      productId: item.productId,
      vendorId: item.vendorId,
      title: item.title,
      price: Number(item.price),
      qty: item.qty,
      image: item.image || '',
    });
  }

  // Fetch all vendors to retrieve commission percentages
  const vendorIds = Array.from(vendorItemMap.keys());
  const vendors = await Vendor.find({ _id: { $in: vendorIds } });
  const vendorMap = new Map();
  vendors.forEach((v) => vendorMap.set(v._id.toString(), v));

  const allOrderItems = [];
  const subOrderPrep = [];
  let grandSubtotalPaise = 0;

  for (const [vId, vItems] of vendorItemMap.entries()) {
    const vendorDoc = vendorMap.get(vId);
    const commissionPct = vendorDoc?.commissionPct ?? 10;

    let subtotalPaise = 0;
    vItems.forEach((it) => {
      allOrderItems.push(it);
      const itemPricePaise = Math.round(it.price * 100);
      subtotalPaise += itemPricePaise * it.qty;
    });

    grandSubtotalPaise += subtotalPaise;
    subOrderPrep.push({
      vendorId: vId,
      items: vItems,
      subtotalPaise,
      commissionPct,
    });
  }

  // Validate coupon if provided
  let appliedCouponCode = '';
  let totalDiscountPaise = 0;

  if (couponCode && couponCode.trim()) {
    const validation = await validateCoupon(couponCode, userId, grandSubtotalPaise);
    if (!validation.valid) {
      const err = new Error(validation.message || 'Invalid coupon');
      err.statusCode = 400;
      throw err;
    }
    appliedCouponCode = validation.code;
    totalDiscountPaise = validation.discountPaise;
  }

  // Distribute the discount PROPORTIONALLY across subOrders (largest remainder method)
  const distributedDiscounts = distributeDiscountLargestRemainder(
    subOrderPrep,
    totalDiscountPaise
  );

  const subOrders = [];
  subOrderPrep.forEach((prep, idx) => {
    const subDiscountPaise = distributedDiscounts[idx] || 0;
    const discountedSubtotalPaise = prep.subtotalPaise - subDiscountPaise;
    const commissionPaise = Math.round((discountedSubtotalPaise * prep.commissionPct) / 100);
    const vendorPayoutPaise = discountedSubtotalPaise - commissionPaise;

    subOrders.push({
      vendorId: prep.vendorId,
      items: prep.items,
      subtotal: Number((discountedSubtotalPaise / 100).toFixed(2)),
      discount: Number((subDiscountPaise / 100).toFixed(2)),
      commission: Number((commissionPaise / 100).toFixed(2)),
      vendorPayout: Number((vendorPayoutPaise / 100).toFixed(2)),
      status: 'placed',
      timeline: [{ status: 'placed', at: new Date() }],
    });
  });

  const finalTotalPaise = grandSubtotalPaise - totalDiscountPaise;
  const total = Number((finalTotalPaise / 100).toFixed(2));
  const discount = Number((totalDiscountPaise / 100).toFixed(2));
  const orderNumber = generateOrderNumber();

  // 4. Create Order in MongoDB
  const order = await Order.create({
    customerId: userId,
    orderNumber,
    shippingAddress,
    items: allOrderItems,
    subOrders,
    couponCode: appliedCouponCode,
    discount,
    total,
    payment: {
      provider: 'mock',
      providerOrderId: '',
      providerPaymentId: '',
      method: '',
      failureReason: '',
      status: 'pending',
    },
  });

  return order;
};

/**
 * Payment Completion Service (Idempotent)
 * Marks payment.status = paid, atomically reduces stock per item, and clears cart.
 * If any item cannot be fulfilled (race condition), rolls back stock changes and fails order.
 */
export const markOrderPaid = async (orderId, paymentDetails = {}) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // Idempotency: If already paid, return early without touching stock or cart
  if (order.payment.status === 'paid') {
    return { order, alreadyPaid: true };
  }

  if (order.payment.status === 'failed') {
    const err = new Error('Order has already failed and cannot be processed');
    err.statusCode = 400;
    throw err;
  }

  const allCancelled = order.subOrders.every((s) => s.status === 'cancelled');
  if (allCancelled) {
    const err = new Error('Order has been cancelled and cannot be paid');
    err.statusCode = 400;
    throw err;
  }

  // Atomically decrement stock per item
  const decrementedItems = [];
  let failureReason = '';

  for (const item of order.items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty } },
      { new: true }
    );

    if (!updated) {
      failureReason = `Product "${item.title}" could not be fulfilled due to insufficient stock.`;
      break;
    }

    decrementedItems.push(item);
  }

  // Rollback if any stock decrement failed
  if (failureReason) {
    for (const rollItem of decrementedItems) {
      await Product.findByIdAndUpdate(rollItem.productId, {
        $inc: { stock: rollItem.qty },
      });
    }

    order.payment.status = 'failed';
    order.payment.failureReason = failureReason;
    await order.save();

    const err = new Error(
      `${failureReason} Order marked as failed and any partial stock updates were rolled back.`
    );
    err.statusCode = 409;
    throw err;
  }

  // Payment success
  order.payment.status = 'paid';
  if (paymentDetails.providerPaymentId || paymentDetails.razorpayPaymentId) {
    order.payment.providerPaymentId = paymentDetails.providerPaymentId || paymentDetails.razorpayPaymentId;
  }
  if (paymentDetails.providerOrderId || paymentDetails.razorpayOrderId) {
    order.payment.providerOrderId = paymentDetails.providerOrderId || paymentDetails.razorpayOrderId;
  }
  if (paymentDetails.method) {
    order.payment.method = paymentDetails.method;
  }
  if (paymentDetails.provider) {
    order.payment.provider = paymentDetails.provider;
  }
  order.payment.failureReason = '';
  await order.save();

  // Atomically record coupon usage (idempotent, guarded by limits)
  if (order.couponCode) {
    try {
      await recordCouponUsage(order.couponCode, order.customerId);
    } catch (couponErr) {
      console.warn(`[OrderService] Coupon usage recording warning:`, couponErr.message);
    }
  }

  // Clear customer's Redis cart
  await clearCart(order.customerId);

  return { order, success: true };
};

/**
 * Customer: Retrieve own orders with pagination
 */
export const getCustomerOrders = async (customerId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find({ customerId })
      .populate('subOrders.vendorId', 'storeName logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments({ customerId }),
  ]);

  return {
    orders,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
  };
};

/**
 * Customer / Admin / Vendor: Get single order by ID with access control
 */
export const getOrderById = async (orderId, user) => {
  const order = await Order.findById(orderId).populate(
    'subOrders.vendorId',
    'storeName logoUrl description'
  );

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // Access control
  if (user.role === 'customer') {
    if (order.customerId.toString() !== user._id.toString()) {
      const err = new Error('Forbidden: You do not have access to this order');
      err.statusCode = 403;
      throw err;
    }
    return order;
  }

  if (user.role === 'admin') {
    return order;
  }

  if (user.role === 'vendor') {
    const vendor = await Vendor.findOne({ userId: user._id });
    if (!vendor) {
      const err = new Error('Vendor profile not found');
      err.statusCode = 403;
      throw err;
    }

    const hasSubOrder = order.subOrders.some(
      (s) => s.vendorId?._id?.toString() === vendor._id.toString() || s.vendorId?.toString() === vendor._id.toString()
    );

    if (!hasSubOrder) {
      const err = new Error('Forbidden: You do not have items in this order');
      err.statusCode = 403;
      throw err;
    }

    return order;
  }

  return order;
};

/**
 * Customer: Cancel order
 * Allowed ONLY while every subOrder is still "placed".
 * Restores stock if the order was already paid.
 */
export const cancelCustomerOrder = async (orderId, customerId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.customerId.toString() !== customerId.toString()) {
    const err = new Error('Forbidden: You cannot cancel another customer order');
    err.statusCode = 403;
    throw err;
  }

  // Check if every subOrder is still placed
  const unplacedSubOrder = order.subOrders.find((s) => s.status !== 'placed');
  if (unplacedSubOrder) {
    const err = new Error(
      `Cannot cancel order because fulfillment has already begun (one or more sub-orders are '${unplacedSubOrder.status}').`
    );
    err.statusCode = 400;
    throw err;
  }

  // Cancel each subOrder
  const now = new Date();
  order.subOrders.forEach((s) => {
    s.status = 'cancelled';
    s.timeline.push({ status: 'cancelled', at: now });
  });

  // If paid, call provider refund, reverse payouts, and restore stock
  if (order.payment.status === 'paid') {
    const provider = getPaymentProvider(order.payment?.provider || 'mock');
    const refundAmountPaise = Math.round(order.total * 100);

    try {
      await provider.refund({
        paymentId: order.payment.providerPaymentId,
        amountPaise: refundAmountPaise,
        reverseTransfers: true,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        },
      });
    } catch (refundErr) {
      const err = new Error(`Refund failed: ${refundErr.message}`);
      err.statusCode = 502;
      throw err;
    }

    // Reverse any payouts generated for this order
    await reversePayouts(order._id);

    // Restore stock atomically per item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.qty },
      });
    }

    // Restore coupon usage if order used a coupon
    if (order.couponCode) {
      try {
        await restoreCouponUsage(order.couponCode, order.customerId);
      } catch (couponErr) {
        console.warn(`[OrderService] Coupon restore warning:`, couponErr.message);
      }
    }

    order.payment.status = 'refunded';
  }

  await order.save();
  return order;
};

/**
 * Vendor: Retrieve only subOrders belonging to this vendor
 * Only returns subOrders from orders where payment.status === 'paid'.
 */
export const getVendorOrders = async (
  vendorUserId,
  { status, page = 1, limit = 10 } = {}
) => {
  const vendor = await Vendor.findOne({ userId: vendorUserId });
  if (!vendor || vendor.status !== 'approved') {
    const err = new Error('Only approved vendors can access vendor orders');
    err.statusCode = 403;
    throw err;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Query orders containing this vendor's subOrder and payment.status = 'paid'
  const filter = {
    'payment.status': 'paid',
    'subOrders.vendorId': vendor._id,
  };

  if (status && status !== 'all') {
    filter['subOrders'] = {
      $elemMatch: {
        vendorId: vendor._id,
        status,
      },
    };
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  // Project each order to show the customer's shipping info and ONLY this vendor's subOrder
  const vendorSubOrders = orders.map((order) => {
    const matchingSubOrder = order.subOrders.find(
      (s) => s.vendorId.toString() === vendor._id.toString()
    );

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customer: {
        name: order.customerId?.name || order.shippingAddress.name,
        email: order.customerId?.email || '',
      },
      shippingAddress: order.shippingAddress,
      subOrder: matchingSubOrder,
    };
  });

  return {
    subOrders: vendorSubOrders,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
  };
};

/**
 * Vendor: Advance subOrder status
 * Progression rule: placed -> packed -> shipped -> delivered (no skipping or going back).
 * Vendor can also cancel only while "placed".
 */
export const updateVendorSubOrderStatus = async (
  vendorUserId,
  orderId,
  newStatus
) => {
  const vendor = await Vendor.findOne({ userId: vendorUserId });
  if (!vendor || vendor.status !== 'approved') {
    const err = new Error('Only approved vendors can update order fulfillment');
    err.statusCode = 403;
    throw err;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.payment.status !== 'paid') {
    const err = new Error('Cannot update fulfillment status on an unpaid order');
    err.statusCode = 400;
    throw err;
  }

  const subOrder = order.subOrders.find(
    (s) => s.vendorId.toString() === vendor._id.toString()
  );

  if (!subOrder) {
    const err = new Error('Forbidden: You do not own a sub-order in this order');
    err.statusCode = 403;
    throw err;
  }

  const currentStatus = subOrder.status;

  // Strict transition map
  const allowedTransitions = {
    placed: ['packed', 'cancelled'],
    packed: ['shipped'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  const allowedNext = allowedTransitions[currentStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    const err = new Error(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${
        allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal state)'
      }`
    );
    err.statusCode = 400;
    throw err;
  }

  // If vendor cancels the subOrder while 'placed', restore stock for those items
  if (newStatus === 'cancelled') {
    for (const item of subOrder.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.qty },
      });
    }
  }

  subOrder.status = newStatus;
  subOrder.timeline.push({ status: newStatus, at: new Date() });

  await order.save();

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    subOrder,
  };
};

/**
 * Admin: View all orders with filter and pagination
 */
export const getAdminOrders = async ({
  status,
  paymentStatus,
  page = 1,
  limit = 10,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (paymentStatus && paymentStatus !== 'all') {
    filter['payment.status'] = paymentStatus;
  }
  if (status && status !== 'all') {
    filter['subOrders.status'] = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customerId', 'name email')
      .populate('subOrders.vendorId', 'storeName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  const orderIds = orders.map((o) => o._id);
  const payouts = await Payout.find({ orderId: { $in: orderIds } }).lean();
  const payoutMap = new Map();
  payouts.forEach((p) => {
    const key = p.orderId.toString();
    if (!payoutMap.has(key)) payoutMap.set(key, []);
    payoutMap.get(key).push(p);
  });

  const ordersWithPayouts = orders.map((o) => {
    const oObj = o.toObject();
    const orderPayouts = payoutMap.get(o._id.toString()) || [];
    oObj.payouts = orderPayouts;
    oObj.payoutSummary = {
      totalVendorPayout: Number(orderPayouts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)),
      totalCommission: Number(orderPayouts.reduce((sum, p) => sum + p.commission, 0).toFixed(2)),
      count: orderPayouts.length,
      allProcessed: orderPayouts.length > 0 && orderPayouts.every((p) => p.status === 'processed'),
    };
    return oObj;
  });

  return {
    orders: ordersWithPayouts,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
  };
};

export const orderService = {
  checkoutOrder,
  markOrderPaid,
  getCustomerOrders,
  getOrderById,
  cancelCustomerOrder,
  getVendorOrders,
  updateVendorSubOrderStatus,
  getAdminOrders,
};

export default orderService;
