import React, { useState, useMemo } from 'react';
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

  // Group items by vendor store name
  const vendorGroups = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const store = item.storeName || 'Independent Vendor';
      if (!map[store]) {
        map[store] = [];
      }
      map[store].push(item);
    });
    return Object.entries(map).map(([storeName, storeItems]) => ({
      storeName,
      storeItems,
      vendorSubtotal: storeItems.reduce((acc, it) => acc + (it.itemTotal || it.price * it.qty), 0),
    }));
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <div className="cart-page-container stitch-cart-loading">
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading your shopping cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page-container">
        <div className="stitch-empty-cart-card">
          <div className="stitch-empty-cart-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2 className="stitch-empty-cart-title">Your Cart is Empty</h2>
          <p className="stitch-empty-cart-desc">
            Looks like you haven't added anything to your cart yet. Explore curated products across our multi-vendor marketplace!
          </p>
          <Link to="/products" className="stitch-explore-btn">
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Shopping Cart</span>
      </nav>

      <div className="stitch-cart-header">
        <div>
          <h1 className="stitch-cart-title">Shopping Cart</h1>
          <span className="stitch-cart-meta">
            {vendorGroups.length} {vendorGroups.length === 1 ? 'Vendor' : 'Vendors'} • {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
          </span>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="stitch-clear-cart-btn"
          title="Remove all items from your cart"
        >
          Clear Cart
        </button>
      </div>

      {hasIssues && (
        <div className="stitch-cart-issue-alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong>Attention needed:</strong> One or more items in your cart are currently out of stock or unavailable. Please adjust quantities or remove unavailable items before proceeding to checkout.
          </div>
        </div>
      )}

      <div className="stitch-cart-grid">
        {/* Left Column: Vendor Grouped Cart Items */}
        <div className="stitch-cart-items-column">
          {vendorGroups.map((group) => (
            <div key={group.storeName} className="stitch-vendor-group-card">
              <div className="stitch-vendor-group-header">
                <div className="stitch-vendor-group-name">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                    <path d="M2 7h20" />
                  </svg>
                  <span>{group.storeName}</span>
                </div>
                <span className="stitch-vendor-shipping-note">Standard Multi-Vendor Dispatch</span>
              </div>

              <div className="stitch-vendor-items-list">
                {group.storeItems.map((item) => {
                  const isBlocked = item.outOfStock || item.inactive || item.qtyExceedsStock;

                  return (
                    <div
                      key={item.productId}
                      className={`stitch-cart-item-row ${isBlocked ? 'stitch-cart-item-blocked' : ''}`}
                    >
                      <div className="stitch-item-thumb-box">
                        <img
                          src={item.image || '/placeholder.svg'}
                          alt={item.title}
                          className="stitch-item-thumb"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.svg';
                          }}
                        />
                      </div>

                      <div className="stitch-item-info">
                        <Link to={`/products/${item.productId}`} className="stitch-item-title">
                          {item.title}
                        </Link>
                        <span className="stitch-item-unit-price">
                          ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })} each
                        </span>

                        {/* Status Warnings */}
                        <div className="stitch-item-warnings">
                          {item.inactive && (
                            <span className="stitch-warning-tag inactive">
                              ⚠️ Inactive (cannot be ordered)
                            </span>
                          )}
                          {item.outOfStock && (
                            <span className="stitch-warning-tag out-of-stock">
                              ⚠️ Out of Stock
                            </span>
                          )}
                          {item.qtyExceedsStock && !item.outOfStock && (
                            <span className="stitch-warning-tag low-stock">
                              Only {item.stock} left in stock
                            </span>
                          )}
                          {!isBlocked && (
                            <span className="stitch-stock-tag in-stock">
                              In Stock
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="stitch-item-actions-cluster">
                        {/* Quantity Stepper */}
                        <div className="stitch-cart-qty-stepper">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.qty - 1)}
                            className="stitch-cart-qty-btn"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="stitch-cart-qty-val">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.qty + 1)}
                            disabled={item.qty >= Math.min(10, item.stock)}
                            className="stitch-cart-qty-btn"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="stitch-item-total-price">
                          ₹{item.itemTotal ? item.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (item.price * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="stitch-cart-remove-btn"
                          aria-label={`Remove ${item.title}`}
                          title="Remove item"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="stitch-vendor-subtotal-footer">
                <span>Vendor Items Subtotal:</span>
                <span className="stitch-vendor-subtotal-val">₹{group.vendorSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <aside className="stitch-cart-summary-col">
          <div className="stitch-summary-card">
            <h2 className="stitch-summary-title">Order Summary</h2>

            <div className="stitch-summary-rows">
              <div className="stitch-summary-row">
                <span className="stitch-summary-label">Items Subtotal</span>
                <span className="stitch-summary-val">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="stitch-summary-row">
                <span className="stitch-summary-label">Estimated Shipping</span>
                <span className="stitch-summary-val free">FREE</span>
              </div>

              <div className="stitch-summary-row">
                <span className="stitch-summary-label">Multi-Vendor Dispatch</span>
                <span className="stitch-summary-val">Included</span>
              </div>
            </div>

            {/* Coupon Section */}
            <div className="stitch-coupon-wrap">
              <CouponInput
                appliedCoupon={appliedCoupon}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                subtotal={subtotal}
              />
            </div>

            {discountAmount > 0 && (
              <div className="stitch-summary-row stitch-discount-row">
                <span className="stitch-discount-label">
                  Discount ({appliedCoupon?.code || 'COUPON'}):
                </span>
                <span className="stitch-discount-val">
                  - ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="stitch-summary-divider"></div>

            <div className="stitch-total-row">
              <span className="stitch-total-label">Total Amount</span>
              <span className="stitch-total-val">₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={hasIssues || items.length === 0}
              className="stitch-checkout-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>{hasIssues ? 'Fix Issues to Checkout' : 'Proceed to Checkout'}</span>
            </button>

            <div className="stitch-safe-checkout-note">
              <span>Demo project: payments are simulated in a test gateway, no real money is charged.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
