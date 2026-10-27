import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function VendorProfilePage() {
  const { user } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [commissionPct, setCommissionPct] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setStoreName('');
    setDescription('');
    setLogoUrl('');
    setMessage('');
    setError('');
  }, [user?._id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendors/me');
      const vendor = response.data?.vendor;
      if (vendor) {
        setStoreName(vendor.storeName || '');
        setDescription(vendor.description || '');
        setLogoUrl(vendor.logoUrl || '');
        setCommissionPct(vendor.commissionPct || 10);
      }
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'vendor') {
      fetchProfile();
    }
  }, [user?._id, user?.role]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a valid JPEG, PNG, or WebP image.');
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      // 1. Get presigned URL
      const presignRes = await api.post('/uploads/presign', {
        fileName: file.name,
        contentType: file.type,
        folder: 'vendors',
      });

      const { uploadUrl, fileUrl } = presignRes.data;

      // 2. Direct upload to S3/MinIO
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });

      setLogoUrl(fileUrl);
    } catch (uploadErr) {
      setError(`Failed to upload logo: ${uploadErr.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!storeName.trim()) {
      setError('Store name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put('/vendors/me', {
        storeName: storeName.trim(),
        description: description.trim(),
        logoUrl: logoUrl.trim(),
      });
      setMessage('Store profile successfully updated!');
    } catch (err) {
      setError(err.message || 'Failed to update store profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="stitch-profile-loading">
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading store profile...</p>
      </div>
    );
  }

  return (
    <div className="stitch-vendor-profile-page">
      {/* Header Context Banner */}
      <div className="stitch-profile-header-banner">
        <div>
          <span className="stitch-profile-pretitle">Vendor Management &amp; Settings</span>
          <h1 className="stitch-profile-main-title">Store Profile &amp; Branding</h1>
        </div>
        <div className="stitch-profile-standard-pill">
          <svg className="stitch-profile-verified-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
          <div className="stitch-profile-standard-text">
            <span className="stitch-profile-standard-title">Marketplace Standard</span>
            <span className="stitch-profile-standard-rate">
              Platform Commission: <strong>{commissionPct}%</strong>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="alert-box" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', marginBottom: '1.5rem' }}>
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="stitch-profile-card">
        <div className="stitch-profile-card-header">
          <div className="stitch-profile-card-title-group">
            <div className="stitch-profile-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div>
              <h2 className="stitch-profile-card-heading">Store Profile Management</h2>
              <p className="stitch-profile-card-subheading">
                Update your public storefront identity and brand description visible to marketplace buyers.
              </p>
            </div>
          </div>
          <span className="badge badge-primary">Active Hub</span>
        </div>

        <form onSubmit={handleSubmit} className="stitch-profile-form">
          {/* Logo Upload Area */}
          <div className="stitch-logo-upload-panel">
            <div className="stitch-logo-preview-wrapper">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName || 'Store Logo'}
                  className="stitch-logo-preview-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="stitch-logo-placeholder-box">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>No Logo</span>
                </div>
              )}
            </div>

            <div className="stitch-logo-meta-controls">
              <h3 className="stitch-logo-title">Store Logo &amp; Branding</h3>
              <p className="stitch-logo-recommendation">Recommended 400×400px PNG, JPG, or WebP. Direct uploads to storage.</p>
              <div className="stitch-logo-btn-cluster">
                <label className="btn btn-primary btn-sm stitch-logo-upload-btn">
                  {isUploading ? 'Uploading...' : 'Upload New'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setLogoUrl('')}
                    disabled={isUploading}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="stitch-profile-fields-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="store-name-input">
                Store Name *
              </label>
              <input
                id="store-name-input"
                type="text"
                className="form-input stitch-profile-input"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="e.g. Aura Tech Hub"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="store-desc-input">
                Store Description
              </label>
              <textarea
                id="store-desc-input"
                className="form-input stitch-profile-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Describe your store offerings, products quality, fulfillment, and customer commitment..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="store-logo-url-input">
                Direct Logo URL (or use image upload above)
              </label>
              <input
                id="store-logo-url-input"
                type="url"
                className="form-input stitch-profile-input"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={isSubmitting}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          {/* Platform Commission Rate Card */}
          <div className="stitch-commission-rate-card">
            <div className="stitch-commission-rate-left">
              <div className="stitch-commission-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="5" x2="5" y2="19"></line>
                  <circle cx="6.5" cy="6.5" r="2.5"></circle>
                  <circle cx="17.5" cy="17.5" r="2.5"></circle>
                </svg>
              </div>
              <div>
                <h4 className="stitch-commission-card-title">Platform Commission Rate</h4>
                <p className="stitch-commission-card-desc">
                  Standard tiered deduction applied automatically per completed checkout order. Set by marketplace administration.
                </p>
              </div>
            </div>
            <div className="stitch-commission-rate-right">
              <span className="stitch-commission-rate-num">{commissionPct}%</span>
              <div className="stitch-commission-rate-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
                Marketplace Configured
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="stitch-profile-action-row">
            <button
              type="submit"
              className="btn btn-primary stitch-save-profile-btn"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
