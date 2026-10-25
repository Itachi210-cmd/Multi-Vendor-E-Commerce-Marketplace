import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function VendorEarningsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const fetchEarnings = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/vendor/earnings?page=${targetPage}&limit=10`);
      setData(res.data);
      setPage(targetPage);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings(page);
  }, []);

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

  if (loading && !data) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading your earnings and payout history...</p>
      </div>
    );
  }

  const { summary, payouts = [], total = 0, pages = 1 } = data || {};

  return (
    <div className="vendor-earnings-container" style={{ padding: '1rem 0' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Earnings & Payouts</h1>
        <p className="section-subtitle">
          Track sales revenue, platform commissions, and automated Route split payouts.
        </p>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Gross Sales */}
        <div
          className="kpi-card"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Gross Sales
            </span>
            <span style={{ fontSize: '1.25rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text)' }}>
            ₹{(summary?.grossSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            From {summary?.totalProcessedCount || 0} processed orders
          </p>
        </div>

        {/* Commission Paid */}
        <div
          className="kpi-card"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Platform Commission
            </span>
            <span style={{ fontSize: '1.25rem' }}>🏛️</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-accent)' }}>
            ₹{(summary?.commissionPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Platform fee retained
          </p>
        </div>

        {/* Net Payout */}
        <div
          className="kpi-card"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Net Payouts
            </span>
            <span style={{ fontSize: '1.25rem' }}>💰</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-success)' }}>
            ₹{(summary?.netPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Transferred to linked account
          </p>
        </div>
      </div>

      {/* Payouts History Table */}
      <div
        className="payouts-table-container"
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
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Payout History</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {total} total records
          </span>
        </div>

        {payouts.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No payouts recorded yet.</p>
            <p style={{ fontSize: '0.85rem' }}>
              Payouts are automatically generated when customers place and pay for orders containing your products.
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Order</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Gross</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Commission</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Net Payout</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Transfer ID</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const gross = p.amount + p.commission;
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                        {p.orderId?.orderNumber || 'Order'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: 'var(--color-accent)' }}>
                        -₹{p.commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                        ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    </tr>
                  );
                })}
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
              onClick={() => fetchEarnings(page - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {pages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= pages}
              onClick={() => fetchEarnings(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
