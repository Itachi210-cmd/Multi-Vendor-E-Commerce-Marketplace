import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCart from '../hooks/useCart';
import CouponInput from '../components/CouponInput';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, items, subtotal, totalItems, hasIssues, loading, updateQuantity, removeItem, clearCart } =
    useCart();

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = sessionStorage.getItem('checkout_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleApplyCoupon = (couponData) => {
    setAppliedCoupon(couponData);
    sessionStorage.setItem('checkout_coupon', JSON.stringify(couponData));
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem('checkout_coupon');
  };

  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  if (loading && items.length === 0) {
    return (
      <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading your shopping cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="content-container" style={{ padding: '5rem 1.5rem' }}>
        <div className="empty-state-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
          <h2>Your Cart is Empty</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1.75rem', lineHeight: '1.6' }}>
            Looks like you haven't added anything to your cart yet. Explore certified vendor items across our multi-vendor marketplace!
          </p>
          <Link to="/products" className="btn btn-primary btn-md">
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container" style={{ padding: '3rem 1.5rem 5rem' }}>
      <div className="cart-page-header">
        <div>
          <h1 className="section-title">Shopping Cart</h1>
          <p className="section-subtitle">
            You have <strong>{totalItems}</strong> {totalItems === 1 ? 'item' : 'items'} in your cart.
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="btn btn-secondary btn-sm"
          title="Remove all items from your cart"
        >
          Clear Cart
        </button>
      </div>

      {hasIssues && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.75rem' }}>
          <span>⚠️</span>
          <div>
            <strong>Attention needed:</strong> One or more items in your cart are currently out of stock or unavailable. Please adjust quantities or remove unavailable items before proceeding to checkout.
          </div>
        </div>
      )}

      <div className="cart-layout">
        {/* Items List */}
        <div className="cart-items-pane">
          {items.map((item) => {
            const isBlocked = item.outOfStock || item.inactive || item.qtyExceedsStock;

            return (
              <div
                key={item.productId}
                className={`cart-item-card ${isBlocked ? 'cart-item-blocked' : ''}`}
              >
                <div className="cart-item-img-col">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="cart-item-img"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="cart-item-placeholder">🛍️</div>
                  )}
                </div>

                <div className="cart-item-details-col">
                  <div className="cart-item-header">
                    <span className="cart-item-store">🏪 {item.storeName}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="cart-item-delete-btn"
                      aria-label="Remove item"
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>

                  <Link to={`/products/${item.productId}`} className="cart-item-title">
                    {item.title}
                  </Link>

                  <div className="cart-item-price-unit">₹{item.price.toLocaleString()} each</div>

                  {/* Warning Messages */}
                  {item.inactive && (
                    <div className="item-warning-banner">
                      ⚠️ This product is currently inactive and cannot be ordered.
                    </div>
                  )}
                  {item.outOfStock && (
                    <div className="item-warning-banner">
                      ⚠️ Out of stock! Please remove this item to checkout.
                    </div>
                  )}
                  {item.qtyExceedsStock && !item.outOfStock && (
                    <div className="item-warning-banner">
                      ⚠️ Only {item.stock} unit{item.stock === 1 ? '' : 's'} available in stock.
                    </div>
                  )}

                  {/* Quantity & Item Subtotal */}
                  <div className="cart-item-controls-row">
                    <div className="qty-controls">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.qty - 1)}
                        className="qty-btn"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="qty-val">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.qty + 1)}
                        disabled={item.qty >= Math.min(10, item.stock)}
                        className="qty-btn"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-item-total-price">
                      ₹{item.itemTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Sidebar */}
        <aside className="cart-summary-sidebar">
          <div className="summary-card">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-line">
              <span className="summary-label">Items Subtotal:</span>
              <span className="summary-value">₹{subtotal.toLocaleString()}</span>
            </div>

            <div className="summary-line">
              <span className="summary-label">Estimated Shipping:</span>
              <span className="summary-value" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                FREE
              </span>
            </div>

            <div className="summary-line">
              <span className="summary-label">Multi-Vendor Dispatch:</span>
              <span className="summary-value">Included</span>
            </div>

            <CouponInput
              appliedCoupon={appliedCoupon}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              subtotal={subtotal}
            />

            {discountAmount > 0 && (
              <div className="summary-line" style={{ color: '#16a34a' }}>
                <span className="summary-label" style={{ fontWeight: 700, color: '#16a34a' }}>
                  Coupon Discount ({appliedCoupon.code}):
                </span>
                <span className="summary-value" style={{ fontWeight: 800 }}>
                  - ₹{discountAmount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="summary-divider"></div>

            <div className="summary-total-line">
              <span>Grand Total:</span>
              <span className="total-amount">₹{finalTotal.toLocaleString()}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={hasIssues || items.length === 0}
              className="btn btn-primary btn-lg checkout-proceed-btn"
              style={{ width: '100%', marginTop: '1.5rem' }}
            >
              {hasIssues ? 'Fix Issues to Checkout' : 'Proceed to Checkout →'}
            </button>

            <div className="security-guarantee-note">
              🔒 Safe &amp; Secure Checkout · Redis Instant Sync
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
