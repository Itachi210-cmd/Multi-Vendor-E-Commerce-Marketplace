import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function VendorEarningsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setData(null);
  }, [user?._id]);

  const fetchEarnings = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/vendor/earnings?page=${targetPage}&limit=10`);
      setData(res.data);
      setPage(targetPage);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.response?.data?.message || err.message || 'Failed to load earnings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'vendor') {
      fetchEarnings(page);
    }
  }, [page, user?._id, user?.role]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return 'badge-connected';
      case 'reversed':
        return 'badge-accent';
      case 'failed':
        return 'badge-danger';
      case 'simulated':
        return 'badge-primary';
      default:
        return 'badge-warning';
    }
  };

  if (loading && !data) {
    return (
      <div className="stitch-vendor-earnings-loading">
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading your earnings and payout history...</p>
      </div>
    );
  }

  const { summary, payouts = [], total = 0, pages = 1 } = data || {};

  return (
    <div className="stitch-vendor-earnings-page">
      <div className="stitch-earnings-header">
        <div>
          <h1 className="stitch-earnings-title">Earnings & Payouts</h1>
          <p className="stitch-earnings-subtitle">
            Track sales revenue, platform commissions, and automated split payouts.
          </p>
        </div>
        <div className="stitch-earnings-badge-meta">
          <span className="badge badge-neutral">Automated Split Transfers</span>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="stitch-earnings-kpi-grid">
        {/* Gross Sales */}
        <div className="stitch-earnings-kpi-card">
          <div className="stitch-kpi-top">
            <span className="stitch-kpi-label">Gross Sales</span>
            <div className="stitch-kpi-icon-wrap stitch-kpi-icon-sales">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
          <div className="stitch-kpi-amount">
            ₹{(summary?.grossSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stitch-kpi-footer">
            <span className="stitch-kpi-trend">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              Processed
            </span>
            <span className="stitch-kpi-subtext">from {summary?.totalProcessedCount || 0} orders</span>
          </div>
        </div>

        {/* Platform Commission */}
        <div className="stitch-earnings-kpi-card">
          <div className="stitch-kpi-top">
            <span className="stitch-kpi-label">Platform Commission (10%)</span>
            <div className="stitch-kpi-icon-wrap stitch-kpi-icon-commission">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
            </div>
          </div>
          <div className="stitch-kpi-amount stitch-kpi-commission-val">
            -₹{(summary?.commissionPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stitch-kpi-footer">
            <span className="stitch-kpi-subtext">Automated platform fee deduction</span>
          </div>
        </div>

        {/* Net Payout */}
        <div className="stitch-earnings-kpi-card">
          <div className="stitch-kpi-top">
            <span className="stitch-kpi-label">Net Payout</span>
            <div className="stitch-kpi-icon-wrap stitch-kpi-icon-payout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div className="stitch-kpi-amount stitch-kpi-net-val">
            ₹{(summary?.netPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stitch-kpi-footer">
            <span className="stitch-kpi-badge-settled">Direct Vendor Settlement</span>
          </div>
        </div>
      </div>

      {/* Payouts History Table */}
      <div className="stitch-payouts-table-card">
        <div className="stitch-payouts-card-header">
          <div>
            <h3 className="stitch-payouts-title">Payouts & Route Transfers</h3>
            <p className="stitch-payouts-desc">Detailed log of automated settlements per vendor sub-order</p>
          </div>
          <span className="stitch-payouts-count-badge">
            {total} {total === 1 ? 'record' : 'records'}
          </span>
        </div>

        {payouts.length === 0 ? (
          <div className="stitch-empty-state-card" style={{ border: 'none', borderRadius: 0, padding: '4rem 1.5rem' }}>
            <div className="stitch-empty-icon" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>No payouts recorded yet</h4>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '440px', margin: '0 auto', fontSize: '0.9rem' }}>
              Payouts are automatically generated when customers place and pay for orders containing your products.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="stitch-payouts-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th className="align-right">Gross</th>
                  <th className="align-right">Commission</th>
                  <th className="align-right">Net Payout</th>
                  <th>Transfer ID</th>
                  <th className="align-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const gross = p.amount + p.commission;
                  return (
                    <tr key={p._id}>
                      <td className="stitch-payout-cell-date">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="stitch-payout-cell-order">
                        <span className="stitch-payout-ordnum">
                          {p.orderId?.orderNumber || 'Order'}
                        </span>
                      </td>
                      <td className="stitch-payout-cell-num align-right">
                        ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="stitch-payout-cell-commission align-right">
                        -₹{p.commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="stitch-payout-cell-net align-right">
                        ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="stitch-payout-cell-transfer">
                        <code className="stitch-transfer-code">{p.transferId || 'tr_simulated'}</code>
                      </td>
                      <td className="align-center">
                        <span className={`badge ${getStatusBadge(p.status)}`}>
                          <span className="badge-dot"></span>
                          {p.status}
                        </span>
                        {p.failureReason && (
                          <div className="stitch-payout-fail-msg">
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
          <div className="stitch-payouts-pagination">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => fetchEarnings(page - 1)}
            >
              Previous
            </button>
            <span className="stitch-pagination-page-label">
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
