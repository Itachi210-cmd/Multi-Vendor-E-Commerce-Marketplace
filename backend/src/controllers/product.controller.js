import {
  createProduct,
  updateProduct,
  deleteProduct,
  getActiveProductById,
  getPublicProducts,
  getVendorOwnProducts,
} from '../services/product.service.js';
import { suggest } from '../services/search.service.js';
import Product from '../models/product.model.js';

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

    const trimmedTitle = String(title).trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Title must be between 3 and 120 characters',
        field: 'title',
      });
    }

    const trimmedDesc = String(description).trim();
    if (trimmedDesc.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 2000 characters',
        field: 'description',
      });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 1 || numPrice > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Price must be between 1 and 1,000,000 INR',
        field: 'price',
      });
    }

    const numStock = Number(stock);
    if (!Number.isInteger(numStock) || numStock < 0 || numStock > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be an integer between 0 and 100,000',
        field: 'stock',
      });
    }

    const product = await createProduct(req.user._id, {
      title: trimmedTitle,
      description: trimmedDesc,
      price: numPrice,
      stock: numStock,
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
    const { title, description, price, stock } = req.body;

    if (title !== undefined) {
      const trimmedTitle = String(title).trim();
      if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
        return res.status(400).json({
          success: false,
          message: 'Title must be between 3 and 120 characters',
          field: 'title',
        });
      }
    }

    if (description !== undefined) {
      const trimmedDesc = String(description).trim();
      if (trimmedDesc.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Description cannot exceed 2000 characters',
          field: 'description',
        });
      }
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 1 || numPrice > 1000000) {
        return res.status(400).json({
          success: false,
          message: 'Price must be between 1 and 1,000,000 INR',
          field: 'price',
        });
      }
    }

    if (stock !== undefined) {
      const numStock = Number(stock);
      if (!Number.isInteger(numStock) || numStock < 0 || numStock > 100000) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be an integer between 0 and 100,000',
          field: 'stock',
        });
      }
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
 * Public: List active products paginated with search, filters, and facets
 * GET /api/products
 */
export const listPublic = async (req, res, next) => {
  try {
    const result = await getPublicProducts(req.query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Autocomplete search suggestions
 * GET /api/products/suggest?q=
 */
export const getSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    try {
      const suggestions = await suggest(q);
      return res.status(200).json({
        success: true,
        suggestions,
      });
    } catch (esError) {
      // Fallback: title prefix regex in MongoDB
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escaped}`, 'i');
      const products = await Product.find({ title: regex, isActive: true })
        .select('title')
        .limit(5)
        .lean();

      return res.status(200).json({
        success: true,
        suggestions: products.map((p) => p.title),
        source: 'mongodb',
      });
    }
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
