import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function VendorApprovalsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [commissionInputs, setCommissionInputs] = useState({});

  useEffect(() => {
    setVendors([]);
    setCommissionInputs({});
  }, [user?._id]);

  const fetchVendors = async (status = activeTab) => {
    setLoading(true);
    setError('');
    try {
      const queryParam = status === 'all' ? '' : `?status=${status}`;
      const response = await api.get(`/admin/vendors${queryParam}`);
      const list = response.data?.vendors || [];
      setVendors(list);

      // Pre-populate commission inputs
      const initialCommissions = {};
      list.forEach((v) => {
        initialCommissions[v._id] = v.commissionPct ?? 10;
      });
      setCommissionInputs(initialCommissions);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.message || 'Failed to load vendors');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchVendors(activeTab);
    }
  }, [activeTab, user?._id, user?.role]);

  const handleApprove = async (vendorId) => {
    if (!window.confirm('Approve this vendor application and grant the user vendor store access?')) return;
    try {
      const res = await api.patch(`/admin/vendors/${vendorId}/approve`);
      setActionSuccess(res.data?.message || 'Vendor approved successfully!');
      fetchVendors(activeTab);
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (vendorId) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):', 'Incomplete business documents');
    if (reason === null) return; // User cancelled prompt

    try {
      const res = await api.patch(`/admin/vendors/${vendorId}/reject`, { reason });
      setActionSuccess(res.data?.message || 'Vendor application rejected');
      fetchVendors(activeTab);
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const handleCommissionUpdate = async (vendorId) => {
    const commissionPct = commissionInputs[vendorId];
    if (commissionPct === undefined || commissionPct < 0 || commissionPct > 50) {
      alert('Commission rate must be between 0% and 50%');
      return;
    }

    try {
      await api.patch(`/admin/vendors/${vendorId}/commission`, { commissionPct });
      alert('Commission updated successfully!');
      fetchVendors(activeTab);
    } catch (err) {
      alert(`Commission update error: ${err.message}`);
    }
  };

  return (
    <div className="stitch-admin-approvals-container">
      <div className="stitch-admin-header">
        <div>
          <span className="stitch-admin-control-badge">Marketplace Governance</span>
          <h1 className="stitch-admin-title">Vendor Store Approvals</h1>
          <p className="stitch-admin-subtitle">
            Review incoming seller applications, authorize storefront access, and configure custom commission splits.
          </p>
        </div>
        <div className="stitch-approvals-count-pill">
          <span className="badge badge-warning">
            {vendors.filter((v) => v.status === 'pending').length} Pending Review
          </span>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert-box" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', marginBottom: '1.5rem' }}>
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="stitch-status-tabs-container" style={{ marginBottom: '1.75rem' }}>
        <div className="stitch-status-tabs-row">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setActionSuccess('');
              }}
              className={`stitch-status-tab-btn ${activeTab === tab ? 'active' : ''}`}
            >
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="stitch-profile-loading">
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p>Fetching vendor applications...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="stitch-payouts-table-card">
          <div className="stitch-empty-state-card" style={{ border: 'none', padding: '4rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>No {activeTab} applications found</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>There are no vendor records in this state.</p>
          </div>
        </div>
      ) : (
        <div className="stitch-payouts-table-card">
          <div className="stitch-payouts-card-header">
            <div>
              <h3 className="stitch-payouts-title">Seller Applications</h3>
              <p className="stitch-payouts-desc">Verified merchant onboarding and commission controls</p>
            </div>
            <span className="stitch-payouts-count-badge">
              {vendors.length} {vendors.length === 1 ? 'store' : 'stores'}
            </span>
          </div>

          <div className="table-responsive">
            <table className="stitch-payouts-table">
              <thead>
                <tr>
                  <th>Store / Vendor</th>
                  <th>Applicant</th>
                  <th>Description</th>
                  <th className="align-center">Status</th>
                  <th>Commission (%)</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor._id}>
                    <td>
                      <div className="stitch-vendor-table-store-cell">
                        {vendor.logoUrl ? (
                          <img
                            src={vendor.logoUrl}
                            alt={vendor.storeName}
                            className="stitch-vorder-item-thumb"
                            style={{ width: '40px', height: '40px', borderRadius: '8px' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="stitch-vendor-table-thumb-placeholder">
                            🏪
                          </div>
                        )}
                        <div>
                          <strong className="stitch-vendor-table-store-name">{vendor.storeName}</strong>
                          <div className="stitch-vendor-table-date">
                            Applied: {new Date(vendor.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{vendor.userId?.name || 'N/A'}</div>
                      <small style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{vendor.userId?.email || 'N/A'}</small>
                    </td>
                    <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <div style={{ lineHeight: 1.45 }}>{vendor.description || 'No description provided.'}</div>
                      {vendor.rejectionReason && (
                        <div className="stitch-payout-fail-msg">
                          Reason: {vendor.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="align-center">
                      <span
                        className={`badge ${
                          vendor.status === 'approved'
                            ? 'badge-connected'
                            : vendor.status === 'pending'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        <span className="badge-dot"></span>
                        {vendor.status}
                      </span>
                    </td>
                    <td>
                      <div className="stitch-commission-inline-group">
                        <div className="stitch-commission-input-wrap">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            className="form-input stitch-commission-mini-input"
                            value={commissionInputs[vendor._id] ?? vendor.commissionPct}
                            onChange={(e) =>
                              setCommissionInputs({ ...commissionInputs, [vendor._id]: e.target.value })
                            }
                          />
                          <span className="stitch-commission-input-suffix">%</span>
                        </div>
                        <button
                          onClick={() => handleCommissionUpdate(vendor._id)}
                          className="btn btn-secondary btn-sm"
                          title="Save Commission %"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="align-right">
                      <div className="stitch-vendor-action-btn-group">
                        {vendor.status !== 'approved' && (
                          <button
                            onClick={() => handleApprove(vendor._id)}
                            className="btn btn-primary btn-sm"
                          >
                            Approve
                          </button>
                        )}
                        {vendor.status !== 'rejected' && (
                          <button
                            onClick={() => handleReject(vendor._id)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
