import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function BecomeSellerPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendors/me');
      setVendorProfile(response.data?.vendor);
    } catch (err) {
      console.error('Error fetching vendor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!storeName.trim()) {
      setError('Store name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/vendors/apply', {
        storeName: storeName.trim(),
        description: description.trim(),
        logoUrl: logoUrl.trim(),
      });
      setSuccessMsg(response.data?.message || 'Application submitted successfully!');
      setVendorProfile(response.data?.vendor);
    } catch (err) {
      setError(err.message || 'Failed to submit vendor application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="content-container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="auth-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2>Become a Verified Seller</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0 1.5rem' }}>
            Please sign in to your customer account before applying to open a vendor storefront.
          </p>
          <Link to="/login" state={{ from: { pathname: '/become-seller' } }} className="btn btn-primary">
            Sign In to Apply
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner"></div>
        <p>Loading application details...</p>
      </div>
    );
  }

  return (
    <div className="content-container" style={{ padding: '3.5rem 1.5rem', maxWidth: '800px' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Seller Onboarding</h1>
        <p className="section-subtitle">
          Launch your own multi-vendor storefront, list products, and reach thousands of marketplace shoppers.
        </p>
      </div>

      {vendorProfile ? (
        <div className="auth-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Application Status</h2>
            <span
              className={`badge ${
                vendorProfile.status === 'approved'
                  ? 'badge-connected'
                  : vendorProfile.status === 'pending'
                  ? 'badge-degraded'
                  : 'badge-error'
              }`}
            >
              <span className="badge-dot"></span>
              {vendorProfile.status.toUpperCase()}
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{vendorProfile.storeName}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              {vendorProfile.description || 'No description provided.'}
            </p>
          </div>

          {vendorProfile.status === 'pending' && (
            <div className="alert-box" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <span>⏳</span>
              <div>
                <strong>Application Under Review</strong>
                <p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Our administrative team is reviewing your store details. Once approved, you will gain immediate access to the Vendor Dashboard.
                </p>
              </div>
            </div>
          )}

          {vendorProfile.status === 'approved' && (
            <div>
              <div className="alert-box alert-connected" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', marginBottom: '1.5rem' }}>
                <span>🎉</span>
                <div>
                  <strong>Congratulations! Your store is approved.</strong>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    You can now manage your catalog, upload product images, and track orders.
                  </p>
                </div>
              </div>
              <Link to="/vendor/products" className="btn btn-primary">
                Open Vendor Dashboard ➔
              </Link>
            </div>
          )}

          {vendorProfile.status === 'rejected' && (
            <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
              <span>❌</span>
              <div>
                <strong>Application Rejected</strong>
                <p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Reason: {vendorProfile.rejectionReason || 'No specific reason provided.'}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="auth-card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Vendor Store Application
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Provide your store brand details. Applications are reviewed by platform administration.
          </p>

          {error && (
            <div className="alert-box alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="store-name" className="form-label">
                Store Name *
              </label>
              <input
                id="store-name"
                type="text"
                className="form-input"
                placeholder="e.g. Apex Electronics, Bloom Fashion"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="store-desc" className="form-label">
                Store Description
              </label>
              <textarea
                id="store-desc"
                className="form-input"
                rows={4}
                placeholder="Tell customers about the products you specialize in, quality guarantees, and store mission..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="store-logo" className="form-label">
                Store Logo URL (Optional)
              </label>
              <input
                id="store-logo"
                type="url"
                className="form-input"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting Application...' : 'Submit Vendor Application'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
