import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
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
        setError(err.response?.data?.message || err.message || 'Product not found or currently unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const maxSelectable = product ? Math.min(10, product.stock) : 1;

  // Check if current user is vendor who owns this product
  const isOwner = user?.role === 'vendor' && product?.vendorId?.userId === user._id;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isOwner) return;

    setIsAdding(true);
    await addToCart(product._id, quantity);
    setIsAdding(false);
  };

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
            <span className={`badge ${product.stock > 0 ? 'badge-connected' : 'badge-danger'}`}>
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

          {/* Purchase Action Box */}
          <div className="product-purchase-box">
            {product.stock > 0 && !isOwner && (
              <div className="quantity-selector-row">
                <label htmlFor="qty-select" className="qty-label">Quantity:</label>
                <div className="qty-controls">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="qty-btn"
                  >
                    -
                  </button>
                  <span className="qty-val">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxSelectable, q + 1))}
                    disabled={quantity >= maxSelectable}
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
                <span className="stock-hint">(Max {maxSelectable})</span>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={product.stock <= 0 || isOwner || isAdding}
            >
              {isAdding ? (
                'Adding to Cart...'
              ) : isOwner ? (
                'You own this store product'
              ) : product.stock <= 0 ? (
                'Out of Stock'
              ) : (
                '🛒 Add to Cart'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
