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
    <div className="content-container" style={{ padding: '3.5rem 1.5rem' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Vendor Store Approvals</h1>
        <p className="section-subtitle">Review incoming seller applications, authorize storefronts, and manage commission splits.</p>
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
      <div className="filter-tabs-bar">
        {['pending', 'approved', 'rejected', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setActionSuccess('');
            }}
            className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="auth-loading-screen">
          <div className="spinner"></div>
          <p>Fetching vendor applications...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="empty-state-card" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
          <h3>No {activeTab} applications found</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>There are no vendor records in this state.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Applicant</th>
                <th>Description</th>
                <th>Status</th>
                <th>Commission (%)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {vendor.logoUrl ? (
                        <img
                          src={vendor.logoUrl}
                          alt={vendor.storeName}
                          className="table-img-thumb"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="table-img-placeholder" style={{ width: '40px', height: '40px' }}>🏪</div>
                      )}
                      <strong>{vendor.storeName}</strong>
                    </div>
                  </td>
                  <td>
                    <div>{vendor.userId?.name || 'N/A'}</div>
                    <small style={{ color: 'var(--color-text-muted)' }}>{vendor.userId?.email || 'N/A'}</small>
                  </td>
                  <td style={{ maxWidth: '280px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {vendor.description || 'No description provided.'}
                    {vendor.rejectionReason && (
                      <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Rejection Reason: {vendor.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        vendor.status === 'approved'
                          ? 'badge-connected'
                          : vendor.status === 'pending'
                          ? 'badge-degraded'
                          : 'badge-error'
                      }`}
                    >
                      <span className="badge-dot"></span>
                      {vendor.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        className="form-input"
                        style={{ width: '70px', padding: '0.35rem 0.5rem', textAlign: 'center' }}
                        value={commissionInputs[vendor._id] ?? vendor.commissionPct}
                        onChange={(e) =>
                          setCommissionInputs({ ...commissionInputs, [vendor._id]: e.target.value })
                        }
                      />
                      <button
                        onClick={() => handleCommissionUpdate(vendor._id)}
                        className="btn btn-secondary btn-sm"
                        title="Update Commission %"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
      )}
    </div>
  );
}
