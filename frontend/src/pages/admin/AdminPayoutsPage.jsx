import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Transfers' },
  { id: 'processed', label: 'Processed' },
  { id: 'failed', label: 'Failed' },
  { id: 'reversed', label: 'Reversed' },
  { id: 'pending', label: 'Pending' },
];

export default function AdminPayoutsPage() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    setPayouts([]);
    setTotal(0);
  }, [user?._id]);

  const fetchPayouts = useCallback(async (targetPage = 1, filter = statusFilter) => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/payouts?page=${targetPage}&limit=10`;
      if (filter !== 'all') {
        url += `&status=${filter}`;
      }
      const res = await api.get(url);
      setPayouts(res.data?.payouts || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
      setPage(targetPage);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.response?.data?.message || err.message || 'Failed to load payouts');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPayouts(1, statusFilter);
    }
  }, [fetchPayouts, statusFilter, user?.role]);

  const handleRetryPayout = async (payoutId) => {
    try {
      setRetryingId(payoutId);
      setActionSuccess('');
      const res = await api.post(`/admin/payouts/${payoutId}/retry`);
      if (res.data?.payout) {
        setPayouts((prev) =>
          prev.map((p) => (p._id === payoutId ? { ...p, ...res.data.payout } : p))
        );
        setActionSuccess(`Payout transfer ${payoutId} retried successfully!`);
      }
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || err.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return 'badge-connected';
      case 'reversed':
        return 'badge-accent';
      case 'failed':
        return 'badge-danger';
      default:
        return 'badge-warning';
    }
  };

  return (
    <div className="stitch-admin-payouts-container">
      {/* Header */}
      <div className="stitch-admin-header">
        <div>
          <span className="stitch-admin-control-badge">Settlement Transfers</span>
          <h1 className="stitch-admin-title">Platform Payouts &amp; Route Transfers</h1>
          <p className="stitch-admin-subtitle">
            Monitor automated vendor split payouts, platform commission splits, and retry failed transfers.
          </p>
        </div>
        <div className="stitch-approvals-count-pill">
          <span className="badge badge-neutral">Automated Split Transfers</span>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          <span>✓</span>
          <div>{actionSuccess}</div>
        </div>
      )}

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="stitch-status-tabs-container" style={{ marginBottom: '1.75rem' }}>
        <div className="stitch-status-tabs-row">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`stitch-status-tab-btn ${statusFilter === f.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payouts Table */}
      <div className="stitch-payouts-table-card">
        <div className="stitch-payouts-card-header">
          <div>
            <h3 className="stitch-payouts-title">Vendor Settlement Transfers</h3>
            <p className="stitch-payouts-desc">Automated Route disbursement log across vendor stores</p>
          </div>
          <span className="stitch-payouts-count-badge">
            {total} {total === 1 ? 'record' : 'records'}
          </span>
        </div>

        {loading ? (
          <div className="stitch-profile-loading">
            <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
            <p>Loading payouts...</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="stitch-empty-state-card" style={{ border: 'none', padding: '4rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>No payouts matching this filter</h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              There are no transfer records under the selected category.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="stitch-payouts-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Vendor Store</th>
                  <th className="align-right">Net Payout</th>
                  <th className="align-right">Commission</th>
                  <th>Transfer ID</th>
                  <th className="align-center">Status</th>
                  <th className="align-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id}>
                    <td className="stitch-payout-cell-date">
                      {new Date(p.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <span className="stitch-payout-ordnum">
                        {p.orderId?.orderNumber || '—'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-text)', fontSize: '0.92rem' }}>
                        🏪 {p.vendorId?.storeName || 'Vendor'}
                      </strong>
                    </td>
                    <td className="align-right" style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="align-right" style={{ color: 'var(--color-accent-hover)', fontWeight: 600 }}>
                      ₹{p.commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <code className="stitch-transfer-code">{p.transferId || 'tr_simulated'}</code>
                    </td>
                    <td className="align-center">
                      <span className={`badge ${getStatusBadge(p.status)}`}>
                        <span className="badge-dot"></span>
                        {p.status.toUpperCase()}
                      </span>
                      {p.failureReason && (
                        <div className="stitch-payout-fail-msg">
                          {p.failureReason}
                        </div>
                      )}
                    </td>
                    <td className="align-center">
                      {p.status === 'failed' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm stitch-retry-payout-btn"
                          disabled={retryingId === p._id}
                          onClick={() => handleRetryPayout(p._id)}
                        >
                          {retryingId === p._id ? 'Retrying...' : '🔄 Retry'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="stitch-payouts-pagination">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => fetchPayouts(page - 1, statusFilter)}
            >
              Previous
            </button>
            <span className="stitch-pagination-page-label">
              Page {page} of {pages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= pages}
              onClick={() => fetchPayouts(page + 1, statusFilter)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
