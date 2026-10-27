import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';

export default function ProductsPage() {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract state from URL query parameters
  const query = searchParams.get('q') || '';
  const selectedCategories = useMemo(() => {
    const raw = searchParams.get('category');
    return raw ? raw.split(',').map((c) => c.trim()).filter(Boolean) : [];
  }, [searchParams]);
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const minRatingParam = searchParams.get('minRating') || '';
  const inStockParam = searchParams.get('inStock') === 'true';
  const sortParam = searchParams.get('sort') || (query ? 'relevance' : 'newest');
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local state for price inputs before applying
  const [localMinPrice, setLocalMinPrice] = useState(minPriceParam);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPriceParam);

  // Data fetching state
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [facets, setFacets] = useState({ categories: [], minPrice: 0, maxPrice: 0 });
  const [source, setSource] = useState('elasticsearch');
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mobile filters drawer open/close
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync local price inputs when URL params change
  useEffect(() => {
    setLocalMinPrice(minPriceParam);
    setLocalMaxPrice(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  // Fetch products from API whenever URL search params change
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError('');

      try {
        const queryParams = new URLSearchParams(searchParams);
        if (!queryParams.has('limit')) {
          queryParams.set('limit', '12');
        }

        const response = await api.get(`/products?${queryParams.toString()}`);
        const data = response.data;

        setProducts(data.products || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setFacets(data.facets || { categories: [], minPrice: 0, maxPrice: 0 });
        setSource(data.source || 'elasticsearch');
        setIsCached(data.cached || false);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
    // Scroll to top on page or filter change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams]);

  // Helper to update URL params and reset page to 1
  const updateParams = (newEntries) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newEntries).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) {
        updated.delete(key);
      } else {
        updated.set(key, value.toString());
      }
    });

    // Reset to page 1 unless page itself is being explicitly updated
    if (!('page' in newEntries)) {
      updated.set('page', '1');
    }

    setSearchParams(updated);
  };

  // Category toggle handler
  const handleCategoryToggle = (categoryName) => {
    let next;
    if (selectedCategories.includes(categoryName)) {
      next = selectedCategories.filter((c) => c !== categoryName);
    } else {
      next = [...selectedCategories, categoryName];
    }
    updateParams({ category: next.length > 0 ? next.join(',') : null });
  };

  // Price range submit handler
  const handlePriceApply = (e) => {
    if (e) e.preventDefault();
    updateParams({
      minPrice: localMinPrice || null,
      maxPrice: localMaxPrice || null,
    });
  };

  // Rating filter handler
  const handleRatingChange = (ratingVal) => {
    updateParams({ minRating: ratingVal === minRatingParam ? null : ratingVal });
  };

  // In-stock toggle handler
  const handleInStockToggle = () => {
    updateParams({ inStock: inStockParam ? null : 'true' });
  };

  // Sort dropdown handler
  const handleSortChange = (e) => {
    updateParams({ sort: e.target.value });
  };

  // Pagination navigation
  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      updateParams({ page: newPage });
    }
  };

  // Clear all filters handler
  const clearAllFilters = () => {
    const updated = new URLSearchParams();
    if (query) {
      updated.set('q', query);
    }
    setLocalMinPrice('');
    setLocalMaxPrice('');
    setSearchParams(updated);
  };

  // Calculate active filter count for badges
  const activeFiltersCount = [
    selectedCategories.length > 0,
    minPriceParam,
    maxPriceParam,
    minRatingParam,
    inStockParam,
  ].filter(Boolean).length;

  return (
    <div className="content-container products-page-container">
      {/* Top Control Bar / Breadcrumb & Results Meta matching Stitch */}
      <div className="products-page-header">
        <div className="products-header-left">
          <div className="catalog-breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {selectedCategories.length === 1 ? selectedCategories[0] : 'All Products'}
            </span>
          </div>

          <h1 className="catalog-main-title">
            {loading ? (
              'Searching products...'
            ) : query ? (
              <>
                {total} {total === 1 ? 'result' : 'results'} for <span className="title-highlight">"{query}"</span>
              </>
            ) : selectedCategories.length > 0 ? (
              <>
                {total} {total === 1 ? 'product' : 'products'} in <span className="title-highlight">{selectedCategories.join(', ')}</span>
              </>
            ) : (
              <>
                Marketplace Catalog <span className="title-count">({total})</span>
              </>
            )}
          </h1>
        </div>

        {/* Engine Source Badge & Mobile Trigger */}
        <div className="search-meta-indicators">
          <div
            className={`source-badge ${
              source === 'elasticsearch' ? 'source-es' : 'source-mongo'
            }`}
            title={
              source === 'elasticsearch'
                ? 'High-performance faceted full-text search powered by Elasticsearch'
                : 'Fault-tolerant fallback powered by MongoDB'
            }
          >
            <span className="source-dot"></span>
            <span>{source === 'elasticsearch' ? '⚡ Elasticsearch Engine' : '🍃 MongoDB Fallback'}</span>
          </div>

          {isCached && (
            <span className="cache-pill" title="Loaded from Redis 60s search cache">
              ⚡ Redis Cached
            </span>
          )}

          {/* Mobile filter toggle trigger (<1100px) */}
          <button
            type="button"
            className="mobile-filter-trigger btn btn-secondary btn-sm"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            aria-label="Toggle filters sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>
      </div>

      {/* Main Catalog Layout: Sidebar + Results Grid */}
      <div className="products-layout">
        {/* Filter Sidebar */}
        <aside className={`filters-sidebar ${mobileFiltersOpen ? 'mobile-open' : ''}`}>
          <div className="filters-header">
            <h2 className="filters-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              Filters
            </h2>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="clear-filters-link"
              >
                Reset All
              </button>
            )}
            <button
              type="button"
              className="mobile-filter-close"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="active-filters-chips">
              {query && (
                <span className="filter-chip">
                  q: {query}
                  <button onClick={() => updateParams({ q: null })}>✕</button>
                </span>
              )}
              {selectedCategories.map((c) => (
                <span key={c} className="filter-chip">
                  {c}
                  <button onClick={() => handleCategoryToggle(c)}>✕</button>
                </span>
              ))}
              {(minPriceParam || maxPriceParam) && (
                <span className="filter-chip">
                  ₹{minPriceParam || '0'} - ₹{maxPriceParam || '∞'}
                  <button onClick={() => updateParams({ minPrice: null, maxPrice: null })}>✕</button>
                </span>
              )}
              {minRatingParam && (
                <span className="filter-chip">
                  ★ {minRatingParam}+
                  <button onClick={() => updateParams({ minRating: null })}>✕</button>
                </span>
              )}
              {inStockParam && (
                <span className="filter-chip">
                  In Stock Only
                  <button onClick={() => updateParams({ inStock: null })}>✕</button>
                </span>
              )}
            </div>
          )}

          {/* Categories with Aggregated Facet Counts */}
          <div className="filter-section">
            <h3 className="filter-section-title">Categories</h3>
            {facets.categories && facets.categories.length > 0 ? (
              <div className="filter-options-list">
                {facets.categories.map((item) => {
                  const isChecked = selectedCategories.includes(item.category);
                  return (
                    <label key={item.category} className="filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCategoryToggle(item.category)}
                        className="filter-checkbox"
                      />
                      <span className="filter-option-name">{item.category}</span>
                      <span className="filter-option-count">({item.count})</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="filter-empty-text">No category facets available</p>
            )}
          </div>

          {/* Price Range Filter */}
          <div className="filter-section">
            <h3 className="filter-section-title">Price Range (₹)</h3>
            <form onSubmit={handlePriceApply} className="price-inputs-form">
              <div className="price-inputs-row">
                <div className="price-input-wrap">
                  <span className="price-currency-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder={`Min (${facets.minPrice || 0})`}
                    value={localMinPrice}
                    onChange={(e) => setLocalMinPrice(e.target.value)}
                    className="price-input"
                    aria-label="Minimum price"
                  />
                </div>
                <span className="price-range-separator">-</span>
                <div className="price-input-wrap">
                  <span className="price-currency-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder={`Max (${facets.maxPrice || 10000})`}
                    value={localMaxPrice}
                    onChange={(e) => setLocalMaxPrice(e.target.value)}
                    className="price-input"
                    aria-label="Maximum price"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-secondary btn-sm price-apply-btn">
                Apply Price
              </button>
            </form>
          </div>

          {/* Minimum Rating Filter */}
          <div className="filter-section">
            <h3 className="filter-section-title">Customer Rating</h3>
            <div className="rating-filter-options">
              {[4, 3, 2].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  className={`rating-pill-btn ${minRatingParam === stars.toString() ? 'active' : ''}`}
                  onClick={() => handleRatingChange(stars.toString())}
                >
                  <span className="rating-pill-stars">
                    {Array.from({ length: stars }).map((_, i) => (
                      <span key={i} className="star-icon">★</span>
                    ))}
                  </span>
                  <span className="rating-pill-text">& Up</span>
                </button>
              ))}
              {minRatingParam && (
                <button
                  type="button"
                  className="rating-pill-btn clear"
                  onClick={() => handleRatingChange('')}
                >
                  Any Rating
                </button>
              )}
            </div>
          </div>

          {/* In-Stock Toggle */}
          <div className="filter-section border-none">
            <label className="filter-checkbox-label toggle-switch-label">
              <input
                type="checkbox"
                checked={inStockParam}
                onChange={handleInStockToggle}
                className="filter-checkbox"
              />
              <span className="toggle-switch-text">In-Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Catalog Results Grid & Controls */}
        <main className="catalog-results-pane">
          {/* Top Sort & Filter Bar */}
          <div className="catalog-toolbar">
            <div className="results-count-text">
              Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
            </div>

            <div className="sort-control-wrapper">
              <label htmlFor="sort-select" className="sort-label">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortParam}
                onChange={handleSortChange}
                className="sort-dropdown"
              >
                <option value="relevance">Featured & Relevance</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Customer Top Rated</option>
              </select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="alert-box alert-error" style={{ marginBottom: '2rem' }}>
              <span>⚠️</span>
              <div style={{ flex: 1 }}>
                <strong>Error:</strong> {error}
              </div>
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams(searchParams))}
                className="btn btn-secondary btn-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading ? (
            <div className="products-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="product-skeleton-card" aria-hidden="true">
                  <div className="skeleton skeleton-img"></div>
                  <div className="skeleton-body">
                    <div className="skeleton skeleton-tag"></div>
                    <div className="skeleton skeleton-title"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-footer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            /* Empty State */
            <div className="catalog-empty-card">
              <div className="empty-icon">🔍</div>
              <h2 className="empty-title">No products found</h2>
              <p className="empty-desc">
                We couldn't find any products matching your current filters
                {query ? ` for "${query}"` : ''}. Try broadening your search or resetting filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn btn-primary btn-md"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            /* Products Grid */
            <>
              <div className="products-grid">
                {products.map((product) => {
                  const coverImg =
                    product.images && product.images.length > 0
                      ? product.images[0]
                      : product.image || '/placeholder.svg';

                  return (
                    <Link
                      to={`/products/${product._id}`}
                      key={product._id}
                      className="product-card"
                    >
                      <div className="product-card-img-wrapper">
                        <img
                          src={coverImg}
                          alt={product.title}
                          className="product-card-img"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.svg';
                          }}
                        />
                        <span className="product-category-tag">{product.category}</span>
                      </div>

                      <div className="product-card-body">
                        <div className="product-card-meta-top">
                          <span className="product-vendor-badge">
                            {product.storeName || product.vendorId?.storeName || 'Community Vendor'}
                          </span>
                          {product.ratingAvg > 0 ? (
                            <span className="product-rating-pill">
                              ★ {product.ratingAvg.toFixed(1)}
                              {product.ratingCount > 0 && (
                                <span className="rating-count">({product.ratingCount})</span>
                              )}
                            </span>
                          ) : (
                            <span className="product-rating-pill new-rating">
                              ★ New
                            </span>
                          )}
                        </div>

                        <h3 className="product-card-title">{product.title}</h3>
                        <p className="product-card-desc">
                          {product.description?.length > 85
                            ? `${product.description.substring(0, 85)}...`
                            : product.description}
                        </p>

                        <div className="product-card-footer">
                          <div className="product-price">₹{product.price.toLocaleString()}</div>
                          <div className="card-actions-row">
                            <span
                              className={`stock-indicator-badge ${
                                product.stock > 0 ? 'in-stock' : 'out-of-stock'
                              }`}
                            >
                              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                            </span>
                            {product.stock > 0 && (!user || user.role === 'customer') && (
                              <button
                                type="button"
                                className="card-quick-cart-btn"
                                title="Add 1 to Cart"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isAuthenticated) {
                                    window.location.href = '/login';
                                  } else {
                                    addToCart(product._id, 1);
                                  }
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="9" cy="21" r="1" />
                                  <circle cx="20" cy="21" r="1" />
                                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                </svg>
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {pages > 1 && (
                <div className="pagination-bar">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="pagination-arrow-btn"
                    aria-label="Previous Page"
                  >
                    ←
                  </button>

                  <div className="pagination-page-numbers">
                    {Array.from({ length: pages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pages || Math.abs(p - currentPage) <= 2)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="pagination-ellipsis">...</span>}
                            <button
                              onClick={() => goToPage(p)}
                              className={`pagination-num-btn ${
                                p === currentPage ? 'active' : ''
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= pages}
                    className="pagination-arrow-btn"
                    aria-label="Next Page"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
