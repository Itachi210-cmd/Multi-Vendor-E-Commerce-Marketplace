import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';
import ProductReviewsSection from '../components/ProductReviewsSection';

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
    : ['/placeholder.svg'];

  const currentCover = selectedImage || images[0];

  return (
    <div className="content-container product-detail-container">
      {/* Breadcrumb Navigation */}
      <div className="product-detail-breadcrumb">
        <Link to="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to="/products" className="breadcrumb-link">Products</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-link">{product.category || 'General'}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{product.title}</span>
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
                e.target.onerror = null;
                e.target.src = '/placeholder.svg';
              }}
            />
            {product.category && (
              <span className="product-detail-category-tag">{product.category}</span>
            )}
          </div>

          {images.length > 1 && (
            <div className="product-thumbnails-row">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`product-thumb-btn ${currentCover === img ? 'active' : ''}`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder.svg';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div className="product-info-section">
          <div className="product-info-top-row">
            <span className="product-detail-store-category">
              {product.vendorId?.storeName || 'Verified Store'}
            </span>
            <span className={`product-stock-pill ${product.stock > 0 ? 'in-stock' : 'sold-out'}`}>
              <span className="pulse-indicator"></span>
              {product.stock > 0 ? `In stock, ${product.stock} left` : 'Sold out'}
            </span>
          </div>

          <h1 className="product-title-large">{product.title}</h1>

          {/* Rating overview row */}
          <div className="product-rating-overview-row">
            <div className="stars-cluster">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`star-icon ${
                    i < Math.round(product.ratingAvg || 0) ? 'filled' : 'empty'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="rating-avg-text">
              {product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : 'New'}
            </span>
            <span className="rating-count-link">
              ({product.ratingCount || 0} reviews)
            </span>
          </div>

          {/* Price display row */}
          <div className="product-price-large-row">
            <span className="product-price-current">
              ₹{product.price.toLocaleString()}
            </span>
          </div>

          {/* Description */}
          <div className="product-desc-box">
            <h3 className="product-desc-title">Description</h3>
            <p className="product-desc-text">
              {product.description}
            </p>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="product-tags-row">
              <span className="tags-label">Tags:</span>
              <div className="tags-list">
                {product.tags.map((tag, idx) => (
                  <span key={idx} className="stack-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Store Info Card */}
          <div className="vendor-info-badge-card">
            <div className="store-avatar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="store-meta">
              <h4 className="store-name">{product.vendorId?.storeName || 'Community Store'}</h4>
              <p className="store-note">Independent storefront fulfillment • Separate order tracking</p>
            </div>
          </div>

          {/* Purchase Action Box */}
          <div className="product-purchase-box">
            {user?.role === 'vendor' ? (
              <div className="role-restriction-box">
                <span className="role-box-icon">🏪</span>
                <p className="role-box-title">Vendor Account Active</p>
                <span className="role-box-sub">
                  Purchasing and shopping cart are available to customer accounts only.
                </span>
              </div>
            ) : user?.role === 'admin' ? (
              <div className="role-restriction-box">
                <span className="role-box-icon">🛡️</span>
                <p className="role-box-title">Administrator Mode</p>
                <span className="role-box-sub">
                  Purchasing and shopping cart are available to customer accounts only.
                </span>
              </div>
            ) : (
              <div className="customer-actions-cluster">
                {product.stock > 0 && !isOwner && (
                  <div className="quantity-selector-row">
                    <span className="qty-label">Quantity:</span>
                    <div className="qty-controls">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="qty-btn"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="qty-val">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxSelectable, q + 1))}
                        disabled={quantity >= maxSelectable}
                        className="qty-btn"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className="stock-hint">(Max {maxSelectable})</span>
                  </div>
                )}

                <button
                  onClick={handleAddToCart}
                  className="btn btn-primary btn-lg product-add-cart-btn"
                  disabled={product.stock <= 0 || isOwner || isAdding}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  {isAdding ? (
                    'Adding to Cart...'
                  ) : isOwner ? (
                    'You own this store product'
                  ) : product.stock <= 0 ? (
                    'Sold Out'
                  ) : (
                    `Add to Cart - ₹${(product.price * quantity).toLocaleString()}`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Reviews & Ratings Section */}
      <ProductReviewsSection productId={product._id} />
    </div>
  );
}
