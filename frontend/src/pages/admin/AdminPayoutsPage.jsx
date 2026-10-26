import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Payouts' },
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

  const fetchPayouts = async (targetPage = 1, filter = statusFilter) => {
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
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPayouts(1, statusFilter);
    }
  }, [statusFilter, user?._id, user?.role]);

  const handleRetryPayout = async (payoutId) => {
    try {
      setRetryingId(payoutId);
      setActionSuccess('');
      const res = await api.post(`/admin/payouts/${payoutId}/retry`);
      if (res.data?.payout) {
        setPayouts((prev) =>
          prev.map((p) => (p._id === payoutId ? { ...p, ...res.data.payout } : p))
        );
        setActionSuccess(`Payout ${payoutId} retried successfully!`);
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
    <div className="content-container" style={{ padding: '3rem 1.5rem 5rem' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Platform Payouts & Route Transfers</h1>
        <p className="section-subtitle">
          Monitor automated vendor payouts, platform commission splits, and retry failed transfers.
        </p>
      </div>

      {actionSuccess && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.5rem' }}>
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
      <div
        className="filter-bar"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-sm ${statusFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(f.id)}
            style={{ borderRadius: '20px', padding: '0.4rem 1rem' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Payouts Table */}
      <div
        className="table-card"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            Payout Records ({total})
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
            <p>Loading payouts...</p>
          </div>
        ) : payouts.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No payouts matching this filter.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Order Number</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Vendor Store</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Net Payout</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Commission</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Transfer ID</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                      {p.orderId?.orderNumber || '—'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <strong>{p.vendorId?.storeName || 'Vendor'}</strong>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                      ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: 'var(--color-accent)' }}>
                      ₹{p.commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <code style={{ fontSize: '0.78rem' }}>{p.transferId || '—'}</code>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <span className={`badge ${getStatusBadge(p.status)}`}>
                        {p.status.toUpperCase()}
                      </span>
                      {p.failureReason && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '0.2rem' }}>
                          {p.failureReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      {p.status === 'failed' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={retryingId === p._id}
                          onClick={() => handleRetryPayout(p._id)}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          {retryingId === p._id ? 'Retrying...' : '🔄 Retry'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
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
          <div
            style={{
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => fetchPayouts(page - 1, statusFilter)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
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
