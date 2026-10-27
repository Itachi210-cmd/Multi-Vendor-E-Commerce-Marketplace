import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSplitOrder, setSelectedSplitOrder] = useState(null);

  useEffect(() => {
    setOrders([]);
    setTotal(0);
  }, [user?._id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const payParam = paymentStatus !== 'all' ? `&paymentStatus=${paymentStatus}` : '';
      const res = await api.get(`/admin/orders?page=${page}&limit=10${payParam}`);
      setOrders(res.data?.orders || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch platform orders');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchOrders();
    }
  }, [page, paymentStatus, user?._id, user?.role]);

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid':
        return 'badge-connected';
      case 'refunded':
        return 'badge-accent';
      case 'failed':
        return 'badge-danger';
      default:
        return 'badge-warning';
    }
  };

  return (
    <div className="stitch-admin-orders-container">
      {/* Header */}
      <div className="stitch-admin-header">
        <div>
          <span className="stitch-admin-control-badge">Order Settlement &amp; Fulfillment</span>
          <h1 className="stitch-admin-title">Platform Orders &amp; Split Transfers</h1>
          <p className="stitch-admin-subtitle">
            Overview of all marketplace customer transactions, multi-vendor split payouts (simulated), and payments.
          </p>
        </div>

        {/* Filter by Payment */}
        <div className="stitch-payment-filter-wrapper">
          <label htmlFor="payment-filter" className="stitch-filter-label">
            Payment Status:
          </label>
          <select
            id="payment-filter"
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="form-input stitch-payment-select"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="stitch-profile-loading">
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p>Loading platform orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="stitch-payouts-table-card">
          <div className="stitch-empty-state-card" style={{ border: 'none', padding: '4rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>No Orders Found</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
              No platform orders match the selected filter criteria.
            </p>
          </div>
        </div>
      ) : (
        <div className="stitch-payouts-table-card">
          <div className="stitch-payouts-card-header">
            <div>
              <h3 className="stitch-payouts-title">Customer Order Ledger</h3>
              <p className="stitch-payouts-desc">Verified transactions and sub-order split allocations</p>
            </div>
            <span className="stitch-payouts-count-badge">
              {total} {total === 1 ? 'order' : 'orders'}
            </span>
          </div>

          <div className="table-responsive">
            <table className="stitch-payouts-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Sub-Orders / Vendors</th>
                  <th className="align-right">Total</th>
                  <th className="align-center">Payment</th>
                  <th>Date</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <span className="stitch-payout-ordnum" style={{ fontSize: '0.92rem' }}>
                        {order.orderNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {order.customerId?.name || order.shippingAddress.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {order.customerId?.email || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {order.subOrders.map((sub, sIdx) => (
                          <div key={sIdx} className="stitch-suborder-vendor-chip">
                            <span className="stitch-suborder-chip-store">
                              🏪 {sub.vendorId?.storeName || 'Vendor'}
                            </span>
                            <span className="badge badge-sm badge-neutral">
                              {sub.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="align-right">
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>
                        ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                    <td className="align-center">
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <div>
                          <span className={`badge ${getPaymentBadge(order.payment.status)}`}>
                            <span className="badge-dot"></span>
                            {order.payment.status.toUpperCase()}
                          </span>
                          {order.payment.method && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '0.35rem', textTransform: 'uppercase' }}>
                              ({order.payment.method})
                            </span>
                          )}
                        </div>
                        {order.payoutSummary?.count > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedSplitOrder(order)}
                            className="stitch-split-view-link"
                          >
                            Split: ₹{order.payoutSummary.totalVendorPayout} vendors • ₹{order.payoutSummary.totalCommission} fee
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="align-right">
                      <div className="stitch-coupon-actions-cluster">
                        <button
                          type="button"
                          onClick={() => setSelectedSplitOrder(order)}
                          className="btn btn-secondary btn-sm"
                          title="View Vendor Splits"
                        >
                          Split Details
                        </button>
                        <Link to={`/orders/${order._id}`} className="btn btn-secondary btn-sm">
                          Inspect
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="stitch-payouts-pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Previous
              </button>
              <span className="stitch-pagination-page-label">
                Page <strong>{page}</strong> of <strong>{pages}</strong>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="btn btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vendor Splits Detail Modal */}
      {selectedSplitOrder && (
        <div className="modal-backdrop">
          <div className="stitch-coupon-modal-dialog" style={{ maxWidth: '620px' }}>
            <div className="stitch-coupon-modal-header">
              <div>
                <h2 className="stitch-coupon-modal-title">
                  Vendor Split Breakdown
                </h2>
                <p className="stitch-payouts-desc" style={{ marginTop: '0.2rem' }}>
                  Order #{selectedSplitOrder.orderNumber} • Gross ₹{selectedSplitOrder.total.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSplitOrder(null)}
                className="stitch-modal-close-btn"
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="stitch-commission-rate-card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
                <div className="stitch-commission-rate-left">
                  <div className="stitch-commission-icon-box" style={{ width: '36px', height: '36px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                      <line x1="2" y1="10" x2="22" y2="10"></line>
                    </svg>
                  </div>
                  <div>
                    <h4 className="stitch-commission-card-title" style={{ fontSize: '0.92rem' }}>Payment Status: {selectedSplitOrder.payment.status.toUpperCase()}</h4>
                    <p className="stitch-commission-card-desc" style={{ fontSize: '0.78rem' }}>
                      Method: {selectedSplitOrder.payment.method?.toUpperCase() || 'SANDBOX'} • Split payouts (simulated)
                    </p>
                  </div>
                </div>
                <div className="stitch-commission-rate-right">
                  <span className="badge badge-connected">Simulated Route</span>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem', color: 'var(--color-text)' }}>
                Vendor Sub-Orders ({selectedSplitOrder.subOrders?.length || 0})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedSplitOrder.subOrders?.map((sub, idx) => (
                  <div key={idx} className="stitch-split-item-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>
                          🏪 {sub.vendorId?.storeName || 'Vendor'}
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          Status: <span className="badge badge-sm badge-neutral">{sub.status}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          ₹{sub.subtotal?.toLocaleString() || 0}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Subtotal</div>
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      {sub.items?.map((it, itIdx) => (
                        <div key={itIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
                          <span>{it.quantity}x {it.title}</span>
                          <span>₹{(it.price * it.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stitch-coupon-modal-actions">
              <button
                type="button"
                onClick={() => setSelectedSplitOrder(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
              <Link to={`/orders/${selectedSplitOrder._id}`} className="btn btn-primary btn-sm">
                Full Order View
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
