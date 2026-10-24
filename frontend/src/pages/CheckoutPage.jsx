import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCart from '../hooks/useCart';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';

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

  // Group items by vendor store name for the multi-vendor summary
  const itemsByVendor = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const store = item.storeName || 'Vendor';
      if (!map[store]) {
        map[store] = [];
      }
      map[store].push(item);
    });
    return map;
  }, [items]);

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
      });

      const order = res.data?.order;
      if (order?._id) {
        // Refresh cart in state
        await fetchCart();
        navigate(`/orders/${order._id}?new=true`);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setServerError('Some items in your cart became unavailable:');
        setCartIssues(err.response?.data?.issues || []);
      } else {
        setServerError(err.response?.data?.message || err.message || 'Failed to place order');
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
              {submitting ? 'Creating Order...' : `Place Order (₹${subtotal.toLocaleString()}) →`}
            </button>
          </form>
        </div>

        {/* Order Summary by Vendor */}
        <aside className="checkout-summary-pane">
          <div className="summary-card">
            <h2 className="summary-title">2. Items &amp; Vendor Split</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Your order contains items from <strong>{Object.keys(itemsByVendor).length}</strong> certified independent {Object.keys(itemsByVendor).length === 1 ? 'vendor' : 'vendors'}.
            </p>

            <div className="vendor-splits-container">
              {Object.entries(itemsByVendor).map(([storeName, vendorItems]) => {
                const storeSubtotal = vendorItems.reduce(
                  (acc, it) => acc + it.price * it.qty,
                  0
                );

                return (
                  <div key={storeName} className="vendor-split-box">
                    <div className="vendor-split-header">
                      <span className="split-store-name">🏪 {storeName}</span>
                      <span className="split-subtotal">₹{storeSubtotal.toLocaleString()}</span>
                    </div>

                    <div className="split-items-list">
                      {vendorItems.map((it) => (
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
                  </div>
                );
              })}
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total-line">
              <span>Grand Total:</span>
              <span className="total-amount">₹{subtotal.toLocaleString()}</span>
            </div>

            <div className="checkout-notice-box">
              <span>ℹ️</span>
              <p>
                Each vendor will fulfill their respective package independently. In Phase 5, payment status will be marked via the development fake-pay tool.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
