import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCart from '../hooks/useCart';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import CouponInput from '../components/CouponInput';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, totalItems, hasIssues, fetchCart } = useCart();

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
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setServerError('');
    setCartIssues([]);

    if (!validate()) return;

    if (hasIssues || items.length === 0) {
      setServerError('Please fix stock issues in your cart before placing the order.');
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
      if (err.response?.status === 409 || err.status === 409) {
        setServerError('Some items in your cart became unavailable:');
        setCartIssues(err.response?.data?.issues || err.data?.issues || []);
      } else {
        setServerError(
          err.response?.data?.message || err.data?.message || err.message || 'Failed to place order'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <h2>No items to checkout</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1.5rem' }}>
          Your shopping cart is currently empty.
        </p>
        <Link to="/products" className="btn btn-primary btn-sm">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="content-container" style={{ padding: '3rem 1.5rem 5rem' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Checkout</h1>
        <p className="section-subtitle">
          Confirm your delivery address and review multi-vendor order split.
        </p>
      </div>

      {serverError && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.75rem' }}>
          <span>⚠️</span>
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

      <div className="checkout-grid-layout">
        {/* Shipping Address Form */}
        <div className="checkout-form-pane">
          <form onSubmit={handlePlaceOrder} className="checkout-address-card">
            <h2 className="pane-title">1. Delivery Address</h2>

            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Priya Sharma"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">Phone Number * (10 Digits)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className={`form-input ${errors.phone ? 'input-error' : ''}`}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="line1" className="form-label">Address Line 1 *</label>
              <input
                id="line1"
                name="line1"
                type="text"
                value={formData.line1}
                onChange={handleChange}
                placeholder="Flat / House No., Apartment, Street"
                className={`form-input ${errors.line1 ? 'input-error' : ''}`}
              />
              {errors.line1 && <span className="field-error">{errors.line1}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="line2" className="form-label">Address Line 2 (Optional)</label>
              <input
                id="line2"
                name="line2"
                type="text"
                value={formData.line2}
                onChange={handleChange}
                placeholder="Landmark, Area"
                className="form-input"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="city" className="form-label">City *</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Mumbai"
                  className={`form-input ${errors.city ? 'input-error' : ''}`}
                />
                {errors.city && <span className="field-error">{errors.city}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="state" className="form-label">State *</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className={`form-input ${errors.state ? 'input-error' : ''}`}
                />
                {errors.state && <span className="field-error">{errors.state}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pincode" className="form-label">Pincode * (6 Digits)</label>
              <input
                id="pincode"
                name="pincode"
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
                placeholder="e.g. 400001"
                className={`form-input ${errors.pincode ? 'input-error' : ''}`}
              />
              {errors.pincode && <span className="field-error">{errors.pincode}</span>}
            </div>

            <button
              type="submit"
              disabled={submitting || hasIssues}
              className="btn btn-primary btn-lg place-order-submit-btn"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {submitting ? 'Creating Order...' : `Place Order (₹${grandTotal.toFixed(2)}) →`}
            </button>
          </form>
        </div>

        {/* Order Summary by Vendor */}
        <aside className="checkout-summary-pane">
          <div className="summary-card">
            <h2 className="summary-title">2. Items &amp; Vendor Split</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Your order contains items from <strong>{vendorSplits.length}</strong> certified independent {vendorSplits.length === 1 ? 'vendor' : 'vendors'}.
            </p>

            <div className="vendor-splits-container">
              {vendorSplits.map((split) => (
                <div key={split.storeName} className="vendor-split-box">
                  <div className="vendor-split-header">
                    <span className="split-store-name">🏪 {split.storeName}</span>
                    <span className="split-subtotal">₹{split.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="split-items-list">
                    {split.vendorItems.map((it) => (
                      <div key={it.productId} className="split-item-row">
                        <span className="split-item-title">
                          {it.title} <span className="split-item-qty">x{it.qty}</span>
                        </span>
                        <span className="split-item-price">
                          ₹{(it.price * it.qty).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {split.discount > 0 && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        Coupon Share ({appliedCoupon?.code || 'PROMO'}):
                      </span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>
                        - ₹{split.discount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {split.discount > 0 && (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span style={{ color: '#475569' }}>Discounted Vendor Total:</span>
                      <span style={{ color: '#0f172a' }}>₹{split.discountedSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="summary-divider"></div>

            <CouponInput
              appliedCoupon={appliedCoupon}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              subtotal={subtotal}
            />

            {discountAmount > 0 && (
              <div className="summary-line" style={{ color: '#16a34a', marginBottom: '0.75rem' }}>
                <span className="summary-label" style={{ fontWeight: 700, color: '#16a34a' }}>
                  Discount ({appliedCoupon.code}):
                </span>
                <span className="summary-value" style={{ fontWeight: 800 }}>
                  - ₹{discountAmount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="summary-total-line">
              <span>Grand Total:</span>
              <span className="total-amount">₹{grandTotal.toLocaleString()}</span>
            </div>

            <div className="checkout-notice-box">
              <span>🔒</span>
              <p>
                Each vendor fulfills their respective package independently. Payments are processed in sandbox test mode via the Test Gateway.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
