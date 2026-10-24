import esClient from '../config/es.js';
import { env } from '../config/env.js';
import Vendor from '../models/vendor.model.js';

export const INDEX_SETTINGS_AND_MAPPINGS = {
  settings: {
    analysis: {
      filter: {
        autocomplete_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20,
        },
      },
      analyzer: {
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'autocomplete_filter'],
        },
        autocomplete_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase'],
        },
      },
    },
  },
  mappings: {
    properties: {
      title: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
          autocomplete: {
            type: 'text',
            analyzer: 'autocomplete_analyzer',
            search_analyzer: 'autocomplete_search',
          },
        },
      },
      description: { type: 'text' },
      category: { type: 'keyword' },
      tags: { type: 'keyword' },
      price: { type: 'float' },
      ratingAvg: { type: 'float' },
      ratingCount: { type: 'integer' },
      stock: { type: 'integer' },
      vendorId: { type: 'keyword' },
      storeName: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      image: { type: 'keyword', index: false },
      isActive: { type: 'boolean' },
      createdAt: { type: 'date' },
    },
  },
};

/**
 * Format a Mongoose Product document or POJO for indexing into Elasticsearch
 */
export const formatProductForES = async (product) => {
  let storeName = product.storeName || '';
  let vendorIdStr = '';

  if (product.vendorId) {
    if (typeof product.vendorId === 'object' && product.vendorId !== null) {
      if (product.vendorId.storeName) {
        storeName = product.vendorId.storeName;
      }
      vendorIdStr = product.vendorId._id
        ? product.vendorId._id.toString()
        : product.vendorId.toString();
    } else {
      vendorIdStr = product.vendorId.toString();
    }
  }

  // If storeName is still missing, attempt to fetch from Vendor collection
  if (!storeName && vendorIdStr) {
    try {
      const vendorDoc = await Vendor.findById(vendorIdStr).select('storeName').lean();
      if (vendorDoc?.storeName) {
        storeName = vendorDoc.storeName;
      }
    } catch (err) {
      // Ignore lookup error and proceed with empty storeName
    }
  }

  const primaryImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : product.image || '';

  return {
    id: product._id ? product._id.toString() : product.id ? product.id.toString() : '',
    title: product.title || '',
    description: product.description || '',
    category: product.category || '',
    tags: Array.isArray(product.tags) ? product.tags : [],
    price: Number(product.price) || 0,
    ratingAvg: Number(product.ratingAvg) || 0,
    ratingCount: Number(product.ratingCount) || 0,
    stock: Number(product.stock) || 0,
    vendorId: vendorIdStr,
    storeName,
    image: primaryImage,
    isActive: product.isActive !== false,
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
  };
};

/**
 * Ensure the Elasticsearch product index exists with explicit settings & mappings
 * @param {string} targetIndex
 * @param {Object} options { recreate: boolean }
 */
export const ensureIndex = async (targetIndex = env.esIndex, options = { recreate: false }) => {
  try {
    const exists = await esClient.indices.exists({ index: targetIndex });

    if (exists && options.recreate) {
      await esClient.indices.delete({ index: targetIndex });
      console.log(`[Elasticsearch] Index '${targetIndex}' deleted for recreation.`);
    }

    if (!exists || options.recreate) {
      await esClient.indices.create({
        index: targetIndex,
        ...INDEX_SETTINGS_AND_MAPPINGS,
      });
      console.log(`[Elasticsearch] Index '${targetIndex}' successfully created with mappings.`);
    }

    return true;
  } catch (error) {
    console.error(`[Elasticsearch] ensureIndex error for '${targetIndex}': ${error.message}`);
    throw error;
  }
};

/**
 * Index a single active product into Elasticsearch
 */
export const indexProduct = async (product, targetIndex = env.esIndex) => {
  // If product is inactive, remove from index instead
  if (product.isActive === false) {
    const id = product._id ? product._id.toString() : product.id;
    return removeProduct(id, targetIndex);
  }

  const doc = await formatProductForES(product);
  const response = await esClient.index({
    index: targetIndex,
    id: doc.id,
    document: doc,
  });

  return response;
};

/**
 * Update an existing product in Elasticsearch
 */
export const updateProductInES = async (product, targetIndex = env.esIndex) => {
  if (product.isActive === false) {
    const id = product._id ? product._id.toString() : product.id;
    return removeProduct(id, targetIndex);
  }

  return indexProduct(product, targetIndex);
};

/**
 * Remove product from Elasticsearch index
 */
export const removeProduct = async (id, targetIndex = env.esIndex) => {
  if (!id) return null;
  try {
    const response = await esClient.delete({
      index: targetIndex,
      id: id.toString(),
    });
    return response;
  } catch (error) {
    // Ignore 404 document missing error
    if (error.meta?.statusCode === 404 || error.statusCode === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Update ratingAvg and ratingCount directly in Elasticsearch
 */
export const updateRating = async (productId, ratingAvg, ratingCount, targetIndex = env.esIndex) => {
  if (!productId) return null;
  try {
    const response = await esClient.update({
      index: targetIndex,
      id: productId.toString(),
      doc: {
        ratingAvg: Number(ratingAvg),
        ratingCount: Number(ratingCount),
      },
    });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404 || error.statusCode === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Search products with multi-match, fuzziness, facets, and sorting
 * @param {Object} params
 * @param {string} targetIndex
 */
export const searchProducts = async (params = {}, targetIndex = env.esIndex) => {
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
  const from = (pageNum - 1) * limitNum;

  const must = [];
  const filter = [{ term: { isActive: true } }];

  // 1. Text search with relevance boosting and fuzziness
  if (q && q.trim()) {
    must.push({
      multi_match: {
        query: q.trim(),
        fields: ['title^3', 'description', 'tags^2', 'storeName'],
        fuzziness: 'AUTO',
        operator: 'or',
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  // 2. Category filter (single or multiple)
  if (category) {
    const categories = Array.isArray(category)
      ? category
      : category.split(',').map((c) => c.trim()).filter(Boolean);

    if (categories.length === 1) {
      filter.push({ term: { category: categories[0] } });
    } else if (categories.length > 1) {
      filter.push({ terms: { category: categories } });
    }
  }

  // 3. Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceRange = {};
    if (minPrice !== undefined && minPrice !== '') priceRange.gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') priceRange.lte = Number(maxPrice);

    if (Object.keys(priceRange).length > 0) {
      filter.push({ range: { price: priceRange } });
    }
  }

  // 4. Rating filter
  if (minRating !== undefined && minRating !== '' && Number(minRating) > 0) {
    filter.push({ range: { ratingAvg: { gte: Number(minRating) } } });
  }

  // 5. In-stock filter
  if (inStock === true || inStock === 'true') {
    filter.push({ range: { stock: { gt: 0 } } });
  }

  // 6. Vendor ID filter
  if (vendorId) {
    filter.push({ term: { vendorId: vendorId.toString() } });
  }

  // 7. Sort evaluation
  let sortQuery = [];
  switch (sort) {
    case 'price_asc':
      sortQuery = [{ price: { order: 'asc' } }];
      break;
    case 'price_desc':
      sortQuery = [{ price: { order: 'desc' } }];
      break;
    case 'rating':
      sortQuery = [{ ratingAvg: { order: 'desc' } }, { ratingCount: { order: 'desc' } }];
      break;
    case 'newest':
      sortQuery = [{ createdAt: { order: 'desc' } }];
      break;
    case 'relevance':
      sortQuery = [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }];
      break;
    default:
      // If keyword provided, default to relevance; otherwise newest
      if (q && q.trim()) {
        sortQuery = [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }];
      } else {
        sortQuery = [{ createdAt: { order: 'desc' } }];
      }
      break;
  }

  // 8. Aggregations for categories and price bounds
  const aggs = {
    categories: {
      terms: {
        field: 'category',
        size: 50,
      },
    },
    min_price: {
      min: {
        field: 'price',
      },
    },
    max_price: {
      max: {
        field: 'price',
      },
    },
  };

  const response = await esClient.search({
    index: targetIndex,
    from,
    size: limitNum,
    query: {
      bool: {
        must,
        filter,
      },
    },
    sort: sortQuery,
    aggs,
  });

  const hits = response.hits || {};
  const total = typeof hits.total === 'number' ? hits.total : hits.total?.value || 0;

  const products = (hits.hits || []).map((hit) => {
    const src = hit._source || {};
    return {
      _id: hit._id,
      title: src.title,
      description: src.description,
      category: src.category,
      tags: src.tags || [],
      price: src.price,
      ratingAvg: src.ratingAvg,
      ratingCount: src.ratingCount,
      stock: src.stock,
      vendorId: {
        _id: src.vendorId,
        storeName: src.storeName,
      },
      images: src.image ? [src.image] : [],
      isActive: src.isActive,
      createdAt: src.createdAt,
      _score: hit._score,
    };
  });

  const rawAggs = response.aggregations || {};
  const categoryBuckets = rawAggs.categories?.buckets || [];
  const facets = {
    categories: categoryBuckets.map((b) => ({
      category: b.key,
      count: b.doc_count,
    })),
    minPrice: rawAggs.min_price?.value !== null && rawAggs.min_price?.value !== undefined ? rawAggs.min_price.value : 0,
    maxPrice: rawAggs.max_price?.value !== null && rawAggs.max_price?.value !== undefined ? rawAggs.max_price.value : 0,
  };

  return {
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
    facets,
    source: 'elasticsearch',
  };
};

/**
 * Autocomplete prefix suggestions on title.autocomplete
 * Returns up to 5 unique title suggestions
 */
export const suggest = async (prefix, targetIndex = env.esIndex) => {
  if (!prefix || !prefix.trim()) {
    return [];
  }

  try {
    const response = await esClient.search({
      index: targetIndex,
      size: 10,
      query: {
        bool: {
          must: [
            {
              match: {
                'title.autocomplete': {
                  query: prefix.trim(),
                },
              },
            },
          ],
          filter: [
            {
              term: { isActive: true },
            },
          ],
        },
      },
      _source: ['title'],
    });

    const hits = response.hits?.hits || [];
    const titles = hits.map((h) => h._source?.title).filter(Boolean);

    // Return unique top 5 suggestions
    return [...new Set(titles)].slice(0, 5);
  } catch (error) {
    console.error(`[Elasticsearch] Suggest error for '${prefix}':`, error.message);
    throw error;
  }
};

export const searchService = {
  ensureIndex,
  formatProductForES,
  indexProduct,
  updateProductInES,
  removeProduct,
  updateRating,
  searchProducts,
  suggest,
};

