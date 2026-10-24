import Product from '../models/product.model.js';
import Vendor from '../models/vendor.model.js';
import {
  indexProduct,
  updateProductInES,
  removeProduct,
  searchProducts,
} from './search.service.js';
import {
  getNormalizedSearchKey,
  getCachedSearch,
  setCachedSearch,
  invalidateSearchCache,
} from '../utils/cache.utils.js';

/**
 * Helper to ensure the user is an approved vendor and returns the vendor doc
 */
export const getApprovedVendorByUserId = async (userId) => {
  const vendor = await Vendor.findOne({ userId });
  if (!vendor || vendor.status !== 'approved') {
    const error = new Error('Only approved vendors can perform this operation');
    error.statusCode = 403;
    throw error;
  }
  return vendor;
};

/**
 * Create a new product (Approved vendor only)
 */
export const createProduct = async (userId, productData) => {
  const vendor = await getApprovedVendorByUserId(userId);

  const { title, description, price, stock, category, tags = [], images = [] } = productData;

  const product = await Product.create({
    vendorId: vendor._id,
    title: title.trim(),
    description: description.trim(),
    price: Number(price),
    stock: parseInt(stock, 10),
    category: category.trim(),
    tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
    images: Array.isArray(images) ? images : [],
    isActive: true,
  });

  // Non-blocking ES sync hook
  try {
    const rawProduct = typeof product.toObject === 'function' ? product.toObject() : product;
    indexProduct({ ...rawProduct, storeName: vendor?.storeName || '' }).catch((err) => {
      console.error(`[ES Sync] Product index failed for '${product._id}':`, err.message);
    });
  } catch (err) {
    console.error('[ES Sync] Product index invocation failed:', err.message);
  }

  // Invalidate search cache on product write
  try {
    invalidateSearchCache().catch(() => {});
  } catch {
    // ignore
  }

  return product;
};

/**
 * Update an existing product (Owning vendor only)
 */
export const updateProduct = async (userId, productId, updateData) => {
  const vendor = await getApprovedVendorByUserId(userId);

  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification: 403 Forbidden if not the product owner
  if (product.vendorId.toString() !== vendor._id.toString()) {
    const error = new Error('Forbidden: You do not own this product');
    error.statusCode = 403;
    throw error;
  }

  const allowedFields = ['title', 'description', 'price', 'stock', 'category', 'tags', 'images', 'isActive'];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (field === 'price') product.price = Number(updateData.price);
      else if (field === 'stock') product.stock = parseInt(updateData.stock, 10);
      else product[field] = updateData[field];
    }
  });

  await product.save();

  // Non-blocking ES sync hook
  try {
    const rawProduct = typeof product.toObject === 'function' ? product.toObject() : product;
    if (product.isActive) {
      updateProductInES({ ...rawProduct, storeName: vendor?.storeName || '' }).catch((err) => {
        console.error(`[ES Sync] Product update failed for '${product._id}':`, err.message);
      });
    } else {
      removeProduct(product._id).catch((err) => {
        console.error(`[ES Sync] Product removal failed for '${product._id}':`, err.message);
      });
    }
  } catch (err) {
    console.error('[ES Sync] Product update invocation failed:', err.message);
  }

  try {
    invalidateSearchCache().catch(() => {});
  } catch {
    // ignore
  }

  return product;
};

/**
 * Soft delete product by setting isActive = false (Owning vendor only)
 */
export const deleteProduct = async (userId, productId) => {
  const vendor = await getApprovedVendorByUserId(userId);

  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification: 403 Forbidden if not the product owner
  if (product.vendorId.toString() !== vendor._id.toString()) {
    const error = new Error('Forbidden: You do not own this product');
    error.statusCode = 403;
    throw error;
  }

  // Soft delete in MongoDB
  product.isActive = false;
  await product.save();

  // Remove from ES index immediately
  try {
    removeProduct(product._id).catch((err) => {
      console.error(`[ES Sync] Product removal failed for '${product._id}':`, err.message);
    });
  } catch (err) {
    console.error('[ES Sync] Product removal invocation failed:', err.message);
  }

  try {
    invalidateSearchCache().catch(() => {});
  } catch {
    // ignore
  }

  return { success: true, message: 'Product successfully deactivated (soft-deleted)' };
};

/**
 * Public: Get single active product by ID with vendor details
 */
export const getActiveProductById = async (productId) => {
  const product = await Product.findOne({ _id: productId, isActive: true }).populate(
    'vendorId',
    'storeName logoUrl description'
  );

  if (!product) {
    const error = new Error('Product not found or is currently inactive');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

/**
 * MongoDB Fallback query when Elasticsearch is down or unreachable
 */
export const queryMongoProductsFallback = async (params = {}) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    vendorId,
    sort,
    page = 1,
    limit = 12,
  } = params;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (pageNum - 1) * limitNum;

  const query = { isActive: true };

  // Text search on title, description, or tags
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
      { tags: { $in: [regex] } },
    ];
  }

  // Category filter
  if (category) {
    const categories = Array.isArray(category)
      ? category
      : category.split(',').map((c) => c.trim()).filter(Boolean);
    if (categories.length === 1) {
      query.category = categories[0];
    } else if (categories.length > 1) {
      query.category = { $in: categories };
    }
  }

  // Price filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined && minPrice !== '') query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') query.price.$lte = Number(maxPrice);
    if (Object.keys(query.price).length === 0) delete query.price;
  }

  // Rating filter
  if (minRating !== undefined && minRating !== '' && Number(minRating) > 0) {
    query.ratingAvg = { $gte: Number(minRating) };
  }

  // Stock filter
  if (inStock === true || inStock === 'true') {
    query.stock = { $gt: 0 };
  }

  // Vendor filter
  if (vendorId) {
    query.vendorId = vendorId;
  }

  // Sort criteria
  let sortQuery = { createdAt: -1 };
  if (sort === 'price_asc') sortQuery = { price: 1 };
  else if (sort === 'price_desc') sortQuery = { price: -1 };
  else if (sort === 'rating') sortQuery = { ratingAvg: -1, ratingCount: -1 };
  else if (sort === 'newest') sortQuery = { createdAt: -1 };

  const [products, total, categoryAggs, priceAggs] = await Promise.all([
    Product.find(query)
      .populate('vendorId', 'storeName logoUrl')
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } },
    ]),
  ]);

  const facets = {
    categories: categoryAggs.map((b) => ({
      category: b._id,
      count: b.count,
    })),
    minPrice: priceAggs[0]?.minPrice ?? 0,
    maxPrice: priceAggs[0]?.maxPrice ?? 0,
  };

  return {
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
    facets,
    source: 'mongodb',
  };
};

/**
 * Public: Get paginated active products with Elasticsearch search & MongoDB fallback
 */
export const getPublicProducts = async (params = {}) => {
  // Check Redis cache first
  const cacheKey = getNormalizedSearchKey(params);
  const cachedData = await getCachedSearch(cacheKey);
  if (cachedData) {
    return { ...cachedData, cached: true };
  }

  // Primary: Try Elasticsearch
  try {
    const esResult = await searchProducts(params);
    // Cache popular searches for 60 seconds
    await setCachedSearch(cacheKey, esResult, 60);
    return esResult;
  } catch (error) {
    console.warn(`[Search Service] Elasticsearch unreachable or error (${error.message}). Falling back to MongoDB.`);
    const mongoResult = await queryMongoProductsFallback(params);
    return mongoResult;
  }
};

/**
 * Vendor: Get logged-in vendor's own products (active and inactive)
 */
export const getVendorOwnProducts = async (userId) => {
  const vendor = await getApprovedVendorByUserId(userId);
  const products = await Product.find({ vendorId: vendor._id }).sort({ createdAt: -1 });
  return products;
};
