import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function MyOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/orders?page=${currentPage}&limit=10`);
        setOrders(res.data?.orders || []);
        setTotal(res.data?.total || 0);
        setPages(res.data?.pages || 1);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const goToPage = (p) => {
    setSearchParams({ page: p });
  };

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

  if (loading && orders.length === 0) {
    return (
      <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="content-container" style={{ padding: '3rem 1.5rem 5rem' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
        <h1 className="section-title">My Orders</h1>
        <p className="section-subtitle">
          Track packages, view receipts, and monitor multi-vendor shipment timelines.
        </p>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="empty-state-card" style={{ padding: '4rem 2rem', maxWidth: '550px', margin: '0 auto' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</div>
          <h2>No Orders Placed Yet</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1.5rem' }}>
            You haven't ordered any items yet. Discover certified products across independent stores in our catalog.
          </p>
          <Link to="/products" className="btn btn-primary btn-sm">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString();

            return (
              <div key={order._id} className="order-summary-card">
                <div className="order-summary-header">
                  <div className="order-meta-group">
                    <span className="order-num-label">{order.orderNumber}</span>
                    <span className="order-date-chip">{dateStr}</span>
                    <span className={`badge ${getPaymentBadge(order.payment.status)}`}>
                      {order.payment.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="order-summary-right">
                    <span className="order-price-val">₹{order.total.toLocaleString()}</span>
                    <Link to={`/orders/${order._id}`} className="btn btn-secondary btn-sm">
                      View Details →
                    </Link>
                  </div>
                </div>

                {/* Sub-Orders & Vendor Summary */}
                <div className="order-suborders-preview">
                  {order.subOrders.map((sub, sIdx) => (
                    <div key={sIdx} className="suborder-preview-chip">
                      <span className="store-tag">
                        🏪 {sub.vendorId?.storeName || 'Vendor'}
                      </span>
                      <span className={`badge badge-sm badge-secondary`}>
                        {sub.status.toUpperCase()}
                      </span>
                      <span className="sub-preview-count">
                        ({sub.items.length} {sub.items.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination-bar">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page <strong>{currentPage}</strong> of <strong>{pages}</strong>
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pages}
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
