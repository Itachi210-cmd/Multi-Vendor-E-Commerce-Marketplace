import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/products/${id}`);
        const p = response.data?.product;
        setProduct(p);
        if (p?.images && p.images.length > 0) {
          setSelectedImage(p.images[0]);
        }
      } catch (err) {
        setError(err.message || 'Product not found or currently unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h2>Product Not Found</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1.5rem' }}>
          {error || 'This product does not exist or has been deactivated by the seller.'}
        </p>
        <Link to="/products" className="btn btn-primary btn-sm">
          Browse Catalog
        </Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://via.placeholder.com/600x500?text=No+Product+Image'];

  const currentCover = selectedImage || images[0];

  return (
    <div className="content-container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/products" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          ← Back to Catalog
        </Link>
      </div>

      <div className="product-detail-layout">
        {/* Gallery Section */}
        <div className="product-gallery-section">
          <div className="product-main-image-container">
            <img
              src={currentCover}
              alt={product.title}
              className="product-main-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/600x500?text=Image+Unavailable';
              }}
            />
          </div>

          {images.length > 1 && (
            <div className="product-thumbnails-row">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`product-thumb-btn ${currentCover === img ? 'active' : ''}`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div className="product-info-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-secondary">{product.category}</span>
            <span className={`badge ${product.stock > 0 ? 'badge-connected' : 'badge-error'}`}>
              <span className="badge-dot"></span>
              {product.stock > 0 ? `In Stock (${product.stock} units)` : 'Sold Out'}
            </span>
          </div>

          <h1 className="product-title-large">{product.title}</h1>

          {/* Store Info Card */}
          <div className="vendor-info-badge-card">
            <div className="store-avatar">🏪</div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sold and Shipped by
              </span>
              <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{product.vendorId?.storeName || 'Verified Vendor'}</h4>
            </div>
          </div>

          <div className="product-price-large">
            ₹{product.price.toLocaleString()}
          </div>

          <div style={{ margin: '1.5rem 0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Description</h3>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
              {product.description}
            </p>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div style={{ margin: '1.5rem 0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>TAGS:</span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {product.tags.map((tag, idx) => (
                  <span key={idx} className="stack-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={() => alert('Redis-backed shopping cart and checkout will be enabled in Phase 5!')}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', width: '100%' }}
              disabled={product.stock <= 0}
            >
              🛒 Add to Cart (Phase 5)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
