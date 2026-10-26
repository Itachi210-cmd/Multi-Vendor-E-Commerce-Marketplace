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
    <div className="content-container" style={{ padding: '3rem 1.5rem 5rem' }}>
      <div className="admin-page-header">
        <div>
          <h1 className="section-title">Platform Orders</h1>
          <p className="section-subtitle">
            Overview of all marketplace customer transactions, multi-vendor splits, and payments.
          </p>
        </div>

        {/* Filter by Payment */}
        <div className="admin-filter-select-wrapper">
          <label htmlFor="payment-filter" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            Payment Status:
          </label>
          <select
            id="payment-filter"
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="sort-dropdown"
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
        <div className="auth-loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
          <p>Loading platform orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state-card" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2>No Orders Found</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>No orders match the selected filter.</p>
        </div>
      ) : (
        <div className="admin-orders-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Sub-Orders / Vendors</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <strong>{order.orderNumber}</strong>
                  </td>
                  <td>
                    <div>{order.customerId?.name || order.shippingAddress.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {order.customerId?.email}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {order.subOrders.map((sub, sIdx) => (
                        <div key={sIdx} style={{ fontSize: '0.8rem' }}>
                          🏪 {sub.vendorId?.storeName || 'Vendor'}:{' '}
                          <span className="badge badge-sm badge-secondary">{sub.status}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <strong>₹{order.total.toLocaleString()}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div>
                        <span className={`badge ${getPaymentBadge(order.payment.status)}`}>
                          {order.payment.status.toUpperCase()}
                        </span>
                        {order.payment.method && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '0.4rem', textTransform: 'uppercase' }}>
                            ({order.payment.method})
                          </span>
                        )}
                      </div>
                      {order.payoutSummary?.count > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Split: ₹{order.payoutSummary.totalVendorPayout} to vendors • ₹{order.payoutSummary.totalCommission} fee
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <Link to={`/orders/${order._id}`} className="btn btn-secondary btn-sm">
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination-bar" style={{ marginTop: '2.5rem' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Previous
              </button>
              <span className="pagination-info">
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
    </div>
  );
}
