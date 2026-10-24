import Product from '../models/product.model.js';
import Vendor from '../models/vendor.model.js';

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

  // Soft delete
  product.isActive = false;
  await product.save();

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
 * Public: Get paginated active products list
 */
export const getPublicProducts = async ({ page = 1, limit = 12 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (pageNum - 1) * limitNum;

  const query = { isActive: true };

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('vendorId', 'storeName logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(query),
  ]);

  return {
    products,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Vendor: Get logged-in vendor's own products (active and inactive)
 */
export const getVendorOwnProducts = async (userId) => {
  const vendor = await getApprovedVendorByUserId(userId);

  const products = await Product.find({ vendorId: vendor._id }).sort({ createdAt: -1 });
  return products;
};
