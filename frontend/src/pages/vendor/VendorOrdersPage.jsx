import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const STATUS_FILTERS = [
  { label: 'All Orders', value: 'all' },
  { label: 'Placed', value: 'placed' },
  { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function VendorOrdersPage() {
  const [subOrders, setSubOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchVendorOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const statusParam = activeFilter !== 'all' ? `&status=${activeFilter}` : '';
      const res = await api.get(`/vendor/orders?page=${page}&limit=10${statusParam}`);
      setSubOrders(res.data?.subOrders || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch vendor orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorOrders();
  }, [activeFilter, page]);

  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const nextStatusMap = {
      placed: 'packed',
      packed: 'shipped',
      shipped: 'delivered',
    };

    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    try {
      setUpdatingId(orderId);
      await api.patch(`/vendor/orders/${orderId}/status`, { status: nextStatus });
      await fetchVendorOrders();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return 'badge-connected';
      case 'shipped':
        return 'badge-accent';
      case 'packed':
        return 'badge-degraded';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getActionButtonText = (status) => {
    switch (status) {
      case 'placed':
        return 'Mark as Packed 📦';
      case 'packed':
        return 'Mark as Shipped 🚚';
      case 'shipped':
        return 'Mark as Delivered 🏡';
      case 'delivered':
        return 'Delivered ✓';
      default:
        return status;
    }
  };

  return (
    <div>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Store Orders &amp; Fulfillment</h1>
        <p className="section-subtitle">
          Process paid customer packages, monitor dispatch timelines, and advance shipment status.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="vendor-order-filter-tabs">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`filter-tab-btn ${activeFilter === f.value ? 'active' : ''}`}
            onClick={() => {
              setActiveFilter(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {loading && subOrders.length === 0 ? (
        <div className="auth-loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
          <p>Loading vendor orders...</p>
        </div>
      ) : subOrders.length === 0 ? (
        <div className="empty-state-card" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h2>No Orders Found</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1.5rem' }}>
            {activeFilter === 'all'
              ? 'Your store does not have any paid customer orders yet.'
              : `No orders currently matching status "${activeFilter}".`}
          </p>
        </div>
      ) : (
        <div className="vendor-orders-stack">
          {subOrders.map((item) => {
            const { orderId, orderNumber, createdAt, customer, shippingAddress, subOrder } = item;
            const isUpdating = updatingId === orderId;
            const canAdvance = ['placed', 'packed', 'shipped'].includes(subOrder.status);

            return (
              <div key={orderId} className="vendor-order-row-card">
                <div className="vendor-order-row-header">
                  <div className="vendor-order-row-meta">
                    <span className="order-number-bold">{orderNumber}</span>
                    <span className="order-date-small">
                      {new Date(createdAt).toLocaleDateString()}
                    </span>
                    <span className={`badge ${getStatusBadge(subOrder.status)}`}>
                      {subOrder.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="vendor-payout-box">
                    <span className="payout-label">Your Payout:</span>
                    <span className="payout-amount">₹{subOrder.vendorPayout?.toLocaleString()}</span>
                    <span className="commission-hint">(Comm: ₹{subOrder.commission})</span>
                  </div>
                </div>

                <div className="vendor-order-body-grid">
                  {/* Items List */}
                  <div className="vendor-order-items-col">
                    <h4 className="vendor-col-heading">Items ({subOrder.items.length})</h4>
                    <div className="vendor-items-compact-list">
                      {subOrder.items.map((it, idx) => (
                        <div key={idx} className="vendor-item-compact-row">
                          {it.image && (
                            <img
                              src={it.image}
                              alt={it.title}
                              className="vendor-item-compact-thumb"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/50?text=No+Img';
                              }}
                            />
                          )}
                          <div className="vendor-item-info">
                            <span className="vendor-item-title">{it.title}</span>
                            <span className="vendor-item-math">
                              Qty: {it.qty} × ₹{it.price.toLocaleString()} = ₹{(it.price * it.qty).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer & Shipping */}
                  <div className="vendor-order-shipping-col">
                    <h4 className="vendor-col-heading">Ship To</h4>
                    <div className="vendor-shipping-details">
                      <strong>{customer?.name || shippingAddress.name}</strong>
                      <div>{shippingAddress.line1}</div>
                      {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
                      <div>
                        {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}
                      </div>
                      <div className="vendor-phone-contact">📞 {shippingAddress.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="vendor-order-actions-bar">
                  <div className="timeline-mini-preview">
                    Status:{' '}
                    <strong>{subOrder.status.toUpperCase()}</strong>
                  </div>

                  {canAdvance ? (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAdvanceStatus(orderId, subOrder.status)}
                      className="btn btn-primary btn-sm advance-status-btn"
                    >
                      {isUpdating ? 'Updating...' : getActionButtonText(subOrder.status)}
                    </button>
                  ) : (
                    <span className="status-terminal-note">
                      {subOrder.status === 'delivered' ? '✓ Fulfillment Completed' : 'Order Cancelled'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

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
