import {
  createProduct,
  updateProduct,
  deleteProduct,
  getActiveProductById,
  getPublicProducts,
  getVendorOwnProducts,
} from '../services/product.service.js';

/**
 * Create a new product (Approved vendor only)
 * POST /api/products
 */
export const create = async (req, res, next) => {
  try {
    const { title, description, price, stock, category, tags, images } = req.body;

    if (!title || !description || price === undefined || stock === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, price, stock, and category are required',
      });
    }

    if (Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than or equal to 0',
      });
    }

    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be an integer greater than or equal to 0',
      });
    }

    const product = await createProduct(req.user._id, {
      title,
      description,
      price,
      stock,
      category,
      tags,
      images,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing product (Owning vendor only)
 * PUT /api/products/:id
 */
export const update = async (req, res, next) => {
  try {
    const { price, stock } = req.body;

    if (price !== undefined && Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than or equal to 0',
      });
    }

    if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be an integer greater than or equal to 0',
      });
    }

    const product = await updateProduct(req.user._id, req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete product (Owning vendor only)
 * DELETE /api/products/:id
 */
export const remove = async (req, res, next) => {
  try {
    const result = await deleteProduct(req.user._id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Get single active product
 * GET /api/products/:id
 */
export const getById = async (req, res, next) => {
  try {
    const product = await getActiveProductById(req.params.id);
    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: List active products paginated
 * GET /api/products
 */
export const listPublic = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await getPublicProducts({ page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vendor: Get logged-in vendor's own products
 * GET /api/vendor/products
 */
export const listVendorOwn = async (req, res, next) => {
  try {
    const products = await getVendorOwnProducts(req.user._id);
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
};
