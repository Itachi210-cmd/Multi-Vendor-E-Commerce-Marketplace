import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = async (page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/products?page=${page}&limit=12`);
      setProducts(response.data?.products || []);
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch catalog products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  const goToPage = (newPage) => {
    setSearchParams({ page: newPage });
  };

  return (
    <div className="content-container" style={{ padding: '3.5rem 1.5rem' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
        <h1 className="section-title">Explore Catalog</h1>
        <p className="section-subtitle">
          Discover products listed across certified independent vendors on our multi-vendor marketplace.
        </p>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="auth-loading-screen">
          <div className="spinner"></div>
          <p>Loading marketplace catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state-card">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</div>
          <h2>No Products Available</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem' }}>
            Vendors haven't published active products yet. Run <code>npm run seed:vendors</code> in backend to load sample products.
          </p>
          <Link to="/" className="btn btn-secondary btn-sm">
            Return Home
          </Link>
        </div>
      ) : (
        <>
          <div className="products-grid">
            {products.map((product) => {
              const coverImg =
                product.images && product.images.length > 0
                  ? product.images[0]
                  : 'https://via.placeholder.com/400x300?text=No+Image';

              return (
                <Link to={`/products/${product._id}`} key={product._id} className="product-card">
                  <div className="product-card-img-wrapper">
                    <img
                      src={coverImg}
                      alt={product.title}
                      className="product-card-img"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300?text=Image+Unavailable';
                      }}
                    />
                    <span className="product-category-tag">{product.category}</span>
                  </div>

                  <div className="product-card-body">
                    <span className="product-vendor-badge">
                      🏪 {product.vendorId?.storeName || 'Vendor Store'}
                    </span>
                    <h3 className="product-card-title">{product.title}</h3>
                    <p className="product-card-desc">
                      {product.description.length > 90
                        ? `${product.description.substring(0, 90)}...`
                        : product.description}
                    </p>

                    <div className="product-card-footer">
                      <div className="product-price">₹{product.price.toLocaleString()}</div>
                      <span className={`badge ${product.stock > 0 ? 'badge-connected' : 'badge-error'}`}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
              </span>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
