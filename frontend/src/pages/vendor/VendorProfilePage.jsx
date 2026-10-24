import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api/axios';

export default function VendorProfilePage() {
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [commissionPct, setCommissionPct] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
      <div className="auth-loading-screen">
        <div className="spinner"></div>
        <p>Loading store profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Store Profile &amp; Branding</h1>
        <p className="section-subtitle">Manage public storefront name, bio, and brand logo.</p>
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

      <div className="auth-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group" style={{ alignItems: 'center', marginBottom: '1rem' }}>
            <div className="store-logo-preview-box">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="store-logo-preview"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=Logo'; }}
                />
              ) : (
                <div className="store-logo-placeholder">No Logo</div>
              )}
            </div>

            <label className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem', cursor: 'pointer' }}>
              {isUploading ? 'Uploading Logo...' : 'Upload Brand Logo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Store Name *</label>
            <input
              type="text"
              className="form-input"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Store Description</label>
            <textarea
              className="form-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Direct Logo URL (or use upload above)</label>
            <input
              type="url"
              className="form-input"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ backgroundColor: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '0.5rem 0 1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Platform Commission Rate:</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {commissionPct}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Set by marketplace administration. Retained upon checkout order splits.
            </span>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
