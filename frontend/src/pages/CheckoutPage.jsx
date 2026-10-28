import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCart from '../hooks/useCart';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import CouponInput from '../components/CouponInput';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, hasIssues, fetchCart, showToast } = useCart();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [cartIssues, setCartIssues] = useState([]);
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
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Group items by vendor store name with Largest Remainder proportional discount in integer paise
  const vendorSplits = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const store = item.storeName || 'Vendor';
      if (!map[store]) {
        map[store] = [];
      }
      map[store].push(item);
    });

    const entries = Object.entries(map).map(([storeName, vendorItems]) => {
      const subtotalPaise = vendorItems.reduce(
        (acc, it) => acc + Math.round(it.price * 100) * it.qty,
        0
      );
      return { storeName, vendorItems, subtotalPaise };
    });

    const totalDiscountPaise = Math.round(discountAmount * 100);
    const grandSubtotalPaise = entries.reduce((acc, e) => acc + e.subtotalPaise, 0);

    let allocatedDiscounts = new Array(entries.length).fill(0);
    if (totalDiscountPaise > 0 && grandSubtotalPaise > 0) {
      const cappedDiscount = Math.min(totalDiscountPaise, grandSubtotalPaise);
      const exactShares = entries.map((e, idx) => {
        const exact = (e.subtotalPaise * cappedDiscount) / grandSubtotalPaise;
        const floor = Math.floor(exact);
        const remainder = exact - floor;
        return { idx, floor, remainder };
      });

      const sumFloors = exactShares.reduce((sum, s) => sum + s.floor, 0);
      const remainingPaise = cappedDiscount - sumFloors;

      const sortedShares = [...exactShares].sort((a, b) => {
        if (b.remainder !== a.remainder) return b.remainder - a.remainder;
        return a.idx - b.idx;
      });

      sortedShares.forEach((share, rank) => {
        allocatedDiscounts[share.idx] = share.floor + (rank < remainingPaise ? 1 : 0);
      });
    }

    return entries.map((e, idx) => {
      const discountPaise = allocatedDiscounts[idx] || 0;
      const discountedSubtotalPaise = e.subtotalPaise - discountPaise;
      return {
        ...e,
        subtotal: Number((e.subtotalPaise / 100).toFixed(2)),
        discount: Number((discountPaise / 100).toFixed(2)),
        discountedSubtotal: Number((discountedSubtotalPaise / 100).toFixed(2)),
      };
    });
  }, [items, discountAmount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (!formData.line1.trim()) newErrors.line1 = 'Address line 1 is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be exactly 6 digits';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Scroll smoothly to the first error input field
      const fieldOrder = ['name', 'phone', 'line1', 'city', 'state', 'pincode'];
      const firstErrorField = fieldOrder.find((f) => newErrors[f]);
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setServerError('');
    setCartIssues([]);

    if (!validate()) return;

    if (hasIssues || items.length === 0) {
      const msg = 'Please fix stock issues in your cart before placing the order.';
      setServerError(msg);
      showToast?.(msg, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/orders/checkout', {
        shippingAddress: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          line1: formData.line1.trim(),
          line2: formData.line2.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        },
        couponCode: appliedCoupon?.code || '',
      });

      const order = res.data?.order;
      if (order?._id) {
        sessionStorage.removeItem('checkout_coupon');
        try {
          await fetchCart();
        } catch {
          // ignore
        }
        navigate(`/orders/${order._id}?pay=1`, {
          replace: true,
          state: { autoPay: true, newlyPlaced: true },
        });
      }
    } catch (err) {
      console.error('[Payment Flow] Checkout order creation failed:', {
        status: err.response?.status || err.status,
        message: err.response?.data?.message || err.data?.message || err.message,
      });

      let errorMsg = 'Failed to place order';
      if (err.response?.status === 409 || err.status === 409) {
        errorMsg = 'Some items in your cart became unavailable:';
        setServerError(errorMsg);
        setCartIssues(err.response?.data?.issues || err.data?.issues || []);
      } else {
        errorMsg =
          err.response?.data?.message || err.data?.message || err.message || 'Failed to place order';
        setServerError(errorMsg);
      }
      showToast?.(errorMsg, 'error');

      // Scroll to the top error banner so user sees it immediately
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="checkout-page-container">
        <div className="stitch-empty-checkout-card">
          <h2>No items to checkout</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1.5rem' }}>
            Your shopping cart is currently empty.
          </p>
          <Link to="/products" className="stitch-explore-btn">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to="/cart" className="breadcrumb-link">Shopping Cart</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Checkout</span>
      </nav>

      <div className="stitch-checkout-header">
        <h1 className="stitch-checkout-title">Checkout &amp; Delivery</h1>
        <p className="stitch-checkout-subtitle">
          Confirm your delivery address and review the multi-vendor split order breakdown.
        </p>
      </div>

      {serverError && (
        <div className="stitch-checkout-error-alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>{serverError}</strong>
            {cartIssues.length > 0 && (
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                {cartIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="stitch-checkout-grid">
        {/* Left Column: Shipping Address & Contact Form */}
        <div className="stitch-checkout-form-col">
          <form onSubmit={handlePlaceOrder} className="stitch-checkout-form-card">
            <div className="stitch-form-section-header">
              <span className="stitch-step-badge">1</span>
              <div>
                <h2 className="stitch-form-section-title">Shipping Address &amp; Contact</h2>
                <span className="stitch-form-section-desc">Where should the independent vendors deliver your packages?</span>
              </div>
            </div>

            <div className="stitch-form-grid">
              <div className="stitch-form-group">
                <label htmlFor="name" className="stitch-form-label">Full Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Priya Sharma"
                  className={`stitch-form-input ${errors.name ? 'input-error' : ''}`}
                />
                {errors.name && <span className="stitch-field-error">{errors.name}</span>}
              </div>

              <div className="stitch-form-group">
                <label htmlFor="phone" className="stitch-form-label">Phone Number * (10 Digits)</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className={`stitch-form-input ${errors.phone ? 'input-error' : ''}`}
                />
                {errors.phone && <span className="stitch-field-error">{errors.phone}</span>}
              </div>

              <div className="stitch-form-group span-full">
                <label htmlFor="line1" className="stitch-form-label">Address Line 1 (Flat, House No., Building) *</label>
                <input
                  id="line1"
                  name="line1"
                  type="text"
                  value={formData.line1}
                  onChange={handleChange}
                  placeholder="104, Blue Lagoon Towers, Marine Drive"
                  className={`stitch-form-input ${errors.line1 ? 'input-error' : ''}`}
                />
                {errors.line1 && <span className="stitch-field-error">{errors.line1}</span>}
              </div>

              <div className="stitch-form-group span-full">
                <label htmlFor="line2" className="stitch-form-label">Address Line 2 (Landmark, Area - Optional)</label>
                <input
                  id="line2"
                  name="line2"
                  type="text"
                  value={formData.line2}
                  onChange={handleChange}
                  placeholder="Near Gateway Point"
                  className="stitch-form-input"
                />
              </div>

              <div className="stitch-form-group">
                <label htmlFor="city" className="stitch-form-label">City *</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Mumbai"
                  className={`stitch-form-input ${errors.city ? 'input-error' : ''}`}
                />
                {errors.city && <span className="stitch-field-error">{errors.city}</span>}
              </div>

              <div className="stitch-form-group">
                <label htmlFor="state" className="stitch-form-label">State *</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className={`stitch-form-input ${errors.state ? 'input-error' : ''}`}
                />
                {errors.state && <span className="stitch-field-error">{errors.state}</span>}
              </div>

              <div className="stitch-form-group span-full">
                <label htmlFor="pincode" className="stitch-form-label">Postal Pincode * (6 Digits)</label>
                <input
                  id="pincode"
                  name="pincode"
                  type="text"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="400020"
                  className={`stitch-form-input ${errors.pincode ? 'input-error' : ''}`}
                />
                {errors.pincode && <span className="stitch-field-error">{errors.pincode}</span>}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || hasIssues}
              className="stitch-place-order-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="m17 5-5-3-5 3" />
                <rect width="20" height="14" x="2" y="6" rx="2" />
              </svg>
              <span>{submitting ? 'Placing Order...' : `Place Order (₹${grandTotal.toFixed(2)})`}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Multi-Vendor Order Breakdown & Summary */}
        <aside className="stitch-checkout-summary-col">
          <div className="stitch-checkout-summary-card">
            <div className="stitch-form-section-header" style={{ marginBottom: '1.25rem' }}>
              <span className="stitch-step-badge">2</span>
              <div>
                <h2 className="stitch-form-section-title">Items &amp; Vendor Split</h2>
                <span className="stitch-form-section-desc">
                  Order across {vendorSplits.length} independent {vendorSplits.length === 1 ? 'vendor' : 'vendors'}
                </span>
              </div>
            </div>

            <div className="stitch-vendor-splits-container">
              {vendorSplits.map((split) => (
                <div key={split.storeName} className="stitch-vendor-split-item-card">
                  <div className="stitch-split-header">
                    <div className="stitch-split-store-name">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                        <path d="M2 7h20" />
                      </svg>
                      <span>{split.storeName}</span>
                    </div>
                    <span className="stitch-split-subtotal">₹{split.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="stitch-split-products-list">
                    {split.vendorItems.map((it) => (
                      <div key={it.productId} className="stitch-split-product-row">
                        <span className="stitch-split-prod-title">
                          {it.title} <span className="stitch-split-prod-qty">×{it.qty}</span>
                        </span>
                        <span className="stitch-split-prod-price">
                          ₹{(it.price * it.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {split.discount > 0 && (
                    <div className="stitch-split-discount-row">
                      <span>Coupon Share ({appliedCoupon?.code || 'PROMO'}):</span>
                      <span>- ₹{split.discount.toFixed(2)}</span>
                    </div>
                  )}

                  {split.discount > 0 && (
                    <div className="stitch-split-vendor-final-row">
                      <span>Discounted Vendor Net:</span>
                      <span>₹{split.discountedSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="stitch-summary-divider"></div>

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
                  Discount ({appliedCoupon.code}):
                </span>
                <span className="stitch-discount-val">
                  - ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="stitch-summary-row" style={{ marginTop: '0.75rem' }}>
              <span className="stitch-summary-label">Estimated Shipping</span>
              <span className="stitch-summary-val free">FREE</span>
            </div>

            <div className="stitch-summary-divider"></div>

            <div className="stitch-total-row">
              <span className="stitch-total-label">Grand Total</span>
              <span className="stitch-total-val">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="stitch-demo-notice-card">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>
                <strong>Demo project:</strong> payments are simulated in a test gateway, no real money is charged.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting || hasIssues}
              className="stitch-place-order-btn"
              style={{ marginTop: '1.25rem' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="m17 5-5-3-5 3" />
                <rect width="20" height="14" x="2" y="6" rx="2" />
              </svg>
              <span>{submitting ? 'Placing Order...' : `Place Order (₹${grandTotal.toFixed(2)})`}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Sticky Mobile Checkout Bar (< 768px) */}
      <div className="stitch-mobile-sticky-checkout-bar">
        <div className="stitch-mobile-total-box">
          <span className="stitch-mobile-label">Grand Total</span>
          <span className="stitch-mobile-val">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={submitting || hasIssues}
          className="stitch-mobile-place-btn"
        >
          {submitting ? 'Placing...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}
