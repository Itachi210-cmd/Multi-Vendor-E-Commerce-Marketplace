import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function AdminCouponsPage() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterActive, setFilterActive] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent',
    value: '',
    minOrder: '',
    maxDiscount: '',
    expiresAt: '',
    usageLimit: '',
    perUserLimit: 1,
    isActive: true,
  });

  useEffect(() => {
    setCoupons([]);
    setTotal(0);
  }, [user?._id]);

  const fetchCoupons = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const activeParam = filterActive !== 'all' ? `&active=${filterActive}` : '';
      const res = await api.get(`/admin/coupons?page=${targetPage}&limit=15${activeParam}`);
      setCoupons(res.data?.coupons || []);
      setTotal(res.data?.total || 0);
      setPage(res.data?.page || 1);
      setPages(res.data?.pages || 1);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.response?.data?.message || 'Failed to fetch coupons');
      }
    } finally {
      setLoading(false);
    }
  }, [filterActive]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCoupons(1);
    }
  }, [fetchCoupons, user?._id, user?.role]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      code: '',
      type: 'percent',
      value: '',
      minOrder: '',
      maxDiscount: '',
      expiresAt: '',
      usageLimit: '',
      perUserLimit: 1,
      isActive: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setIsEditing(true);
    setEditingId(c._id);
    setFormData({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder || '',
      maxDiscount: c.maxDiscount || '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '',
      usageLimit: c.usageLimit || '',
      perUserLimit: c.perUserLimit || 1,
      isActive: c.isActive,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (c) => {
    const updatedStatus = !c.isActive;
    try {
      await api.patch(`/admin/coupons/${c._id}`, { isActive: updatedStatus });
      setCoupons((prev) =>
        prev.map((item) => (item._id === c._id ? { ...item, isActive: updatedStatus } : item))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update coupon status');
    }
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.code.trim()) {
      setModalError('Coupon code is required');
      return;
    }
    if (!formData.value || Number(formData.value) <= 0) {
      setModalError('Value must be a positive number');
      return;
    }

    setModalLoading(true);
    try {
      if (isEditing) {
        await api.patch(`/admin/coupons/${editingId}`, {
          value: Number(formData.value),
          minOrder: formData.minOrder ? Number(formData.minOrder) : 0,
          maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
          expiresAt: formData.expiresAt || null,
          usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
          perUserLimit: formData.perUserLimit ? Number(formData.perUserLimit) : 1,
          isActive: formData.isActive,
        });
      } else {
        await api.post('/admin/coupons', {
          code: formData.code.trim().toUpperCase(),
          type: formData.type,
          value: Number(formData.value),
          minOrder: formData.minOrder ? Number(formData.minOrder) : 0,
          maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
          expiresAt: formData.expiresAt || null,
          usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
          perUserLimit: formData.perUserLimit ? Number(formData.perUserLimit) : 1,
          isActive: formData.isActive,
        });
      }

      setIsModalOpen(false);
      await fetchCoupons(page);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save coupon');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="stitch-admin-coupons-container">
      {/* Header */}
      <div className="stitch-admin-header">
        <div>
          <span className="stitch-admin-control-badge">Promotions Engine</span>
          <h1 className="stitch-admin-title">Coupons &amp; Promotional Discounts</h1>
          <p className="stitch-admin-subtitle">
            Configure platform coupons, percentage caps, minimum cart limits, and usage quotas.
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary stitch-create-coupon-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New Coupon
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="stitch-status-tabs-container" style={{ marginBottom: '1.75rem' }}>
        <div className="stitch-status-tabs-row">
          {[
            { key: 'all', label: 'All Coupons' },
            { key: 'true', label: 'Active Only' },
            { key: 'false', label: 'Inactive / Deactivated' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterActive(tab.key)}
              className={`stitch-status-tab-btn ${filterActive === tab.key ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error / Loading / Content */}
      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="stitch-profile-loading">
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p>Loading coupons list...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="stitch-payouts-table-card">
          <div className="stitch-empty-state-card" style={{ border: 'none', padding: '4rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎟️</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>No Coupons Found</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem', fontSize: '0.9rem' }}>
              No promotional codes match your current filter. Create a coupon to offer discounts to customers.
            </p>
            <button onClick={handleOpenCreateModal} className="btn btn-primary btn-sm">
              Create First Coupon
            </button>
          </div>
        </div>
      ) : (
        <div className="stitch-payouts-table-card">
          <div className="stitch-payouts-card-header">
            <div>
              <h3 className="stitch-payouts-title">Active Marketplace Coupons</h3>
              <p className="stitch-payouts-desc">Promotional voucher campaign management</p>
            </div>
            <span className="stitch-payouts-count-badge">
              {total} {total === 1 ? 'coupon' : 'coupons'}
            </span>
          </div>

          <div className="table-responsive">
            <table className="stitch-payouts-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type &amp; Value</th>
                  <th>Min Order</th>
                  <th>Expiry</th>
                  <th>Usage / Limit</th>
                  <th className="align-center">Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const isExhausted = c.usageLimit !== null && c.usedCount >= c.usageLimit;

                  return (
                    <tr key={c._id}>
                      <td>
                        <span className="stitch-coupon-code-pill">
                          {c.code}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-text)', fontSize: '0.92rem' }}>
                          {c.type === 'percent' ? `${c.value}% OFF` : `₹${c.value} FLAT`}
                        </strong>
                        {c.type === 'percent' && c.maxDiscount && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                            Max: ₹{c.maxDiscount}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-text)' }}>
                        {c.minOrder > 0 ? `₹${c.minOrder}` : 'No minimum'}
                      </td>
                      <td>
                        {c.expiresAt ? (
                          <span style={{ color: isExpired ? 'var(--color-danger)' : 'var(--color-text)', fontWeight: isExpired ? 700 : 500, fontSize: '0.85rem' }}>
                            {new Date(c.expiresAt).toLocaleDateString()} {isExpired && '(Expired)'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Never</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{c.usedCount}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                          {' '}/ {c.usageLimit !== null ? c.usageLimit : '∞'}
                        </span>
                        {isExhausted && (
                          <div className="stitch-payout-fail-msg">
                            Limit reached
                          </div>
                        )}
                      </td>
                      <td className="align-center">
                        <span className={`badge ${c.isActive ? 'badge-connected' : 'badge-danger'}`}>
                          <span className="badge-dot"></span>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="align-right">
                        <div className="stitch-coupon-actions-cluster">
                          <button
                            onClick={() => handleToggleActive(c)}
                            className="btn btn-secondary btn-sm"
                            title={c.isActive ? 'Deactivate Coupon' : 'Activate Coupon'}
                          >
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Coupon Details"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="stitch-payouts-pagination" style={{ marginTop: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => fetchCoupons(page - 1)}
            disabled={page <= 1}
            className="btn btn-secondary btn-sm"
          >
            ← Previous
          </button>
          <span className="stitch-pagination-page-label">
            Page {page} of {pages} ({total} coupons)
          </span>
          <button
            onClick={() => fetchCoupons(page + 1)}
            disabled={page >= pages}
            className="btn btn-secondary btn-sm"
          >
            Next →
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="stitch-coupon-modal-dialog">
            <div className="stitch-coupon-modal-header">
              <h2 className="stitch-coupon-modal-title">
                {isEditing ? `Edit Coupon: ${formData.code}` : 'Create New Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="stitch-modal-close-btn"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
                <span>⚠️</span>
                <div>{modalError}</div>
              </div>
            )}

            <form onSubmit={handleSubmitModal}>
              {!isEditing && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">
                    Coupon Code (Uppercase):
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. FESTIVE20"
                    className="form-input stitch-coupon-code-input"
                  />
                </div>
              )}

              <div className="stitch-form-2col" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Discount Type:
                  </label>
                  <select
                    disabled={isEditing}
                    value={formData.type}
                    onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                    className="form-input"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Value ({formData.type === 'percent' ? '%' : '₹'}):
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.value}
                    onChange={(e) => setFormData((p) => ({ ...p, value: e.target.value }))}
                    placeholder={formData.type === 'percent' ? '10' : '100'}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="stitch-form-2col" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Min Order Subtotal (₹):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrder}
                    onChange={(e) => setFormData((p) => ({ ...p, minOrder: e.target.value }))}
                    placeholder="0"
                    className="form-input"
                  />
                </div>

                {formData.type === 'percent' && (
                  <div className="form-group">
                    <label className="form-label">
                      Max Discount Cap (₹):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData((p) => ({ ...p, maxDiscount: e.target.value }))}
                      placeholder="e.g. 200"
                      className="form-input"
                    />
                  </div>
                )}
              </div>

              <div className="stitch-form-2col" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Expiry Date (Optional):
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData((p) => ({ ...p, expiresAt: e.target.value }))}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Global Usage Limit:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData((p) => ({ ...p, usageLimit: e.target.value }))}
                    placeholder="Unlimited"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="stitch-form-2col" style={{ marginBottom: '1.25rem', alignItems: 'center' }}>
                <div className="form-group">
                  <label className="form-label">
                    Per-User Limit:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perUserLimit}
                    onChange={(e) => setFormData((p) => ({ ...p, perUserLimit: e.target.value }))}
                    className="form-input"
                  />
                </div>

                <div style={{ paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                    />
                    Active for Checkout
                  </label>
                </div>
              </div>

              <div className="stitch-coupon-modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary btn-sm"
                >
                  {modalLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
