import redisClient from '../config/redis.js';
import Product from '../models/product.model.js';
import Vendor from '../models/vendor.model.js';

export const CART_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const getCartKey = (userId) => `cart:${userId}`;

/**
 * Read cart from Redis and hydrate with fresh product details from MongoDB.
 * Never trusts prices, titles, or stock sent by the client.
 */
export const getCart = async (userId) => {
  const cartKey = getCartKey(userId);
  const rawHash = await redisClient.hgetall(cartKey);

  if (!rawHash || Object.keys(rawHash).length === 0) {
    return {
      items: [],
      subtotal: 0,
      totalItems: 0,
      hasIssues: false,
    };
  }

  const productIds = Object.keys(rawHash);
  const products = await Product.find({ _id: { $in: productIds } }).populate(
    'vendorId',
    'storeName logoUrl status'
  );

  const productMap = new Map();
  products.forEach((p) => {
    productMap.set(p._id.toString(), p);
  });

  const items = [];
  let subtotalPaise = 0;
  let totalItemsCount = 0;
  let hasIssues = false;

  for (const [productId, qtyStr] of Object.entries(rawHash)) {
    const qty = parseInt(qtyStr, 10) || 1;
    const product = productMap.get(productId);

    if (!product) {
      // Product was hard deleted from DB
      hasIssues = true;
      items.push({
        productId,
        qty,
        title: 'Unavailable Product',
        price: 0,
        image: '',
        stock: 0,
        storeName: 'Unknown Store',
        vendorId: null,
        isActive: false,
        outOfStock: true,
        inactive: true,
        qtyExceedsStock: true,
        itemTotal: 0,
      });
      continue;
    }

    const outOfStock = product.stock <= 0;
    const inactive = !product.isActive;
    const qtyExceedsStock = qty > product.stock;

    if (outOfStock || inactive || qtyExceedsStock) {
      hasIssues = true;
    }

    const price = Number(product.price);
    const itemTotalPaise = Math.round(price * 100) * qty;

    if (!inactive && !outOfStock) {
      subtotalPaise += itemTotalPaise;
      totalItemsCount += qty;
    }

    const primaryImage =
      product.images && product.images.length > 0
        ? product.images[0]
        : product.image || '';

    const vendorDoc = product.vendorId;
    const storeName = vendorDoc?.storeName || 'Certified Vendor';
    const vendorId = vendorDoc?._id || product.vendorId;

    items.push({
      productId: product._id.toString(),
      qty,
      title: product.title,
      price,
      image: primaryImage,
      stock: product.stock,
      storeName,
      vendorId: vendorId ? vendorId.toString() : null,
      isActive: product.isActive,
      outOfStock,
      inactive,
      qtyExceedsStock,
      itemTotal: Number((itemTotalPaise / 100).toFixed(2)),
    });
  }

  const subtotal = Number((subtotalPaise / 100).toFixed(2));

  return {
    items,
    subtotal,
    totalItems: totalItemsCount,
    hasIssues,
  };
};

/**
 * Add or increment quantity of an item in the customer's cart
 */
export const addToCart = async (userId, productId, qty = 1) => {
  const addQty = parseInt(qty, 10);
  if (isNaN(addQty) || addQty < 1) {
    const err = new Error('Quantity must be at least 1');
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  if (!product.isActive) {
    const err = new Error('Product is currently inactive and cannot be purchased');
    err.statusCode = 400;
    throw err;
  }

  // A vendor cannot purchase their own product
  const userVendor = await Vendor.findOne({ userId });
  if (userVendor && product.vendorId.toString() === userVendor._id.toString()) {
    const err = new Error('Vendors cannot purchase their own products');
    err.statusCode = 400;
    throw err;
  }

  const cartKey = getCartKey(userId);
  const currentQtyStr = await redisClient.hget(cartKey, productId.toString());
  const currentQty = currentQtyStr ? parseInt(currentQtyStr, 10) : 0;
  const newQty = currentQty + addQty;

  if (newQty > 10) {
    const err = new Error('Maximum 10 units allowed per item in cart');
    err.statusCode = 400;
    throw err;
  }

  if (newQty > product.stock) {
    const err = new Error(
      `Only ${product.stock} unit${product.stock === 1 ? '' : 's'} available in stock`
    );
    err.statusCode = 400;
    throw err;
  }

  await redisClient.hset(cartKey, productId.toString(), newQty.toString());
  await redisClient.expire(cartKey, CART_TTL_SECONDS);

  return getCart(userId);
};

/**
 * Set exact quantity for an item (0 removes the item)
 */
export const updateCartItem = async (userId, productId, qty) => {
  const targetQty = parseInt(qty, 10);
  if (isNaN(targetQty)) {
    const err = new Error('Quantity must be an integer');
    err.statusCode = 400;
    throw err;
  }

  const cartKey = getCartKey(userId);

  if (targetQty <= 0) {
    await redisClient.hdel(cartKey, productId.toString());
    await redisClient.expire(cartKey, CART_TTL_SECONDS);
    return getCart(userId);
  }

  if (targetQty > 10) {
    const err = new Error('Maximum 10 units allowed per item in cart');
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  if (!product.isActive) {
    const err = new Error('Product is currently inactive and cannot be purchased');
    err.statusCode = 400;
    throw err;
  }

  // A vendor cannot purchase their own product
  const userVendor = await Vendor.findOne({ userId });
  if (userVendor && product.vendorId.toString() === userVendor._id.toString()) {
    const err = new Error('Vendors cannot purchase their own products');
    err.statusCode = 400;
    throw err;
  }

  if (targetQty > product.stock) {
    const err = new Error(
      `Only ${product.stock} unit${product.stock === 1 ? '' : 's'} available in stock`
    );
    err.statusCode = 400;
    throw err;
  }

  await redisClient.hset(cartKey, productId.toString(), targetQty.toString());
  await redisClient.expire(cartKey, CART_TTL_SECONDS);

  return getCart(userId);
};

/**
 * Remove single item from cart
 */
export const removeFromCart = async (userId, productId) => {
  const cartKey = getCartKey(userId);
  await redisClient.hdel(cartKey, productId.toString());
  await redisClient.expire(cartKey, CART_TTL_SECONDS);
  return getCart(userId);
};

/**
 * Clear the entire cart for a user
 */
export const clearCart = async (userId) => {
  const cartKey = getCartKey(userId);
  await redisClient.del(cartKey);
  return {
    items: [],
    subtotal: 0,
    totalItems: 0,
    hasIssues: false,
  };
};

export const cartService = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};

export default cartService;
