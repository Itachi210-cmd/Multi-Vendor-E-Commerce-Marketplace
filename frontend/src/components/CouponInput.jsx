import React, { useState } from 'react';
import api from '../api/axios';

export default function CouponInput({ appliedCoupon, onApplyCoupon, onRemoveCoupon }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleApply = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter a coupon code');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/coupons/validate', { code: cleanCode });
      if (res.data?.valid) {
        setSuccessMsg(res.data.message || 'Coupon applied successfully!');
        onApplyCoupon({
          code: res.data.code || cleanCode,
          discount: res.data.discount,
        });
        setCode('');
      } else {
        setErrorMsg(res.data?.message || 'Invalid coupon code');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to validate coupon code');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onRemoveCoupon();
    setErrorMsg('');
    setSuccessMsg('');
    setCode('');
  };

  return (
    <div className="coupon-box-wrapper" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
        Have a Promo or Coupon Code?
      </label>

      {appliedCoupon ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🎟️</span>
            <div>
              <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.9rem' }}>
                {appliedCoupon.code}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                Saved ₹{appliedCoupon.discount.toLocaleString()} on this order
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: '#dc2626' }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="e.g. WELCOME10, FLAT100"
            style={{
              flex: 1,
              padding: '0.6rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700, minWidth: '80px' }}
          >
            {loading ? 'Checking...' : 'Apply'}
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && !appliedCoupon && (
        <div style={{ color: '#16a34a', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}
    </div>
  );
}
