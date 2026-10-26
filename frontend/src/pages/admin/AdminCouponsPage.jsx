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
    <div className="content-container" style={{ padding: '3rem 1.5rem 5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title">Coupons &amp; Promotional Discounts</h1>
          <p className="section-subtitle">
            Configure platform coupons, percentage caps, minimum cart limits, and usage quotas.
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary btn-md">
          + Create New Coupon
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'all', label: 'All Coupons' },
          { key: 'true', label: 'Active Only' },
          { key: 'false', label: 'Inactive / Deactivated' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterActive(tab.key)}
            className={`btn btn-sm ${filterActive === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error / Loading / Content */}
      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading coupons list...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="empty-state-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎟️</div>
          <h3>No Coupons Found</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem' }}>
            No promotional codes match your current filter. Create a coupon to offer discounts to customers.
          </p>
          <button onClick={handleOpenCreateModal} className="btn btn-primary btn-sm">
            Create First Coupon
          </button>
        </div>
      ) : (
        <div className="table-responsive" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#475569' }}>CODE</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#475569' }}>TYPE &amp; VALUE</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#475569' }}>MIN ORDER</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#475569' }}>EXPIRY</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#475569' }}>USAGE / LIMIT</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#475569' }}>STATUS</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const isExhausted = c.usageLimit !== null && c.usedCount >= c.usageLimit;

                return (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.95rem', color: '#1e293b' }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <strong>{c.type === 'percent' ? `${c.value}% OFF` : `₹${c.value} FLAT`}</strong>
                      {c.type === 'percent' && c.maxDiscount && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Max: ₹{c.maxDiscount}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                      {c.minOrder > 0 ? `₹${c.minOrder}` : 'No minimum'}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {c.expiresAt ? (
                        <span style={{ color: isExpired ? '#dc2626' : '#334155', fontWeight: isExpired ? 700 : 400 }}>
                          {new Date(c.expiresAt).toLocaleDateString()} {isExpired && '(Expired)'}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Never</span>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{ fontWeight: 600 }}>{c.usedCount}</span>
                      <span style={{ color: '#94a3b8' }}>
                        {' '}/ {c.usageLimit !== null ? c.usageLimit : '∞'}
                      </span>
                      {isExhausted && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>
                          Limit reached
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span className={`badge ${c.isActive ? 'badge-connected' : 'badge-danger'}`}>
                        <span className="badge-dot"></span>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleToggleActive(c)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
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
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={() => fetchCoupons(page - 1)}
            disabled={page <= 1}
            className="btn btn-secondary btn-sm"
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {isEditing ? `Edit Coupon: ${formData.code}` : 'Create New Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitModal}>
              {!isEditing && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Coupon Code (Uppercase):
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. FESTIVE20"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Discount Type:
                  </label>
                  <select
                    disabled={isEditing}
                    value={formData.type}
                    onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Value ({formData.type === 'percent' ? '%' : '₹'}):
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.value}
                    onChange={(e) => setFormData((p) => ({ ...p, value: e.target.value }))}
                    placeholder={formData.type === 'percent' ? '10' : '100'}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Min Order Subtotal (₹):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrder}
                    onChange={(e) => setFormData((p) => ({ ...p, minOrder: e.target.value }))}
                    placeholder="0"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                {formData.type === 'percent' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Max Discount Cap (₹):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData((p) => ({ ...p, maxDiscount: e.target.value }))}
                      placeholder="e.g. 200"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Expiry Date (Optional):
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData((p) => ({ ...p, expiresAt: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Global Usage Limit:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData((p) => ({ ...p, usageLimit: e.target.value }))}
                    placeholder="Unlimited"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Per-User Limit:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perUserLimit}
                    onChange={(e) => setFormData((p) => ({ ...p, perUserLimit: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ paddingTop: '1.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                    />
                    Active for Checkout
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
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
