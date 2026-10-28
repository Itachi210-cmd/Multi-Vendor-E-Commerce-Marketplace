import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Placed', value: 'placed' },
  { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function VendorOrdersPage() {
  const { user } = useAuth();
  const [subOrders, setSubOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    setSubOrders([]);
    setTotal(0);
  }, [user?._id]);

  const fetchVendorOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const statusParam = activeFilter !== 'all' ? `&status=${activeFilter}` : '';
      const res = await api.get(`/vendor/orders?page=${page}&limit=10${statusParam}`);
      setSubOrders(res.data?.subOrders || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch vendor orders');
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page]);

  useEffect(() => {
    if (user?.role === 'vendor') {
      fetchVendorOrders();
    }
  }, [fetchVendorOrders, user?.role]);

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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'delivered':
        return 'stitch-status-badge delivered';
      case 'shipped':
        return 'stitch-status-badge shipped';
      case 'packed':
        return 'stitch-status-badge packed';
      case 'cancelled':
        return 'stitch-status-badge cancelled';
      default:
        return 'stitch-status-badge placed';
    }
  };

  const getActionButtonText = (status) => {
    switch (status) {
      case 'placed':
        return 'Mark as Packed';
      case 'packed':
        return 'Mark as Shipped';
      case 'shipped':
        return 'Mark as Delivered';
      case 'delivered':
        return 'Delivered ✓';
      default:
        return status;
    }
  };

  return (
    <div className="vendor-orders-view">
      {/* Page Header */}
      <div className="stitch-orders-page-header">
        <div>
          <h1 className="stitch-orders-main-title">Order Management &amp; Fulfillment</h1>
          <p className="stitch-orders-main-subtitle">
            Manage fulfillment stages, advance dispatch status, and process store customer packages.
          </p>
        </div>
      </div>

      {/* Filter Tabs with counts */}
      <div className="stitch-status-tabs-row">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`stitch-status-tab-btn ${activeFilter === f.value ? 'active' : ''}`}
            onClick={() => {
              setActiveFilter(f.value);
              setPage(1);
            }}
          >
            <span>{f.label}</span>
            {activeFilter === f.value && total > 0 && (
              <span className="stitch-tab-count-pill">{total}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="stitch-checkout-error-alert" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {loading && subOrders.length === 0 ? (
        <div className="stitch-cart-loading" style={{ padding: '4rem 1.5rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.25rem' }}></div>
          <p>Loading vendor orders...</p>
        </div>
      ) : subOrders.length === 0 ? (
        <div className="stitch-empty-orders-card" style={{ margin: '2rem auto', maxWidth: '520px' }}>
          <div className="stitch-empty-orders-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <h2 className="stitch-empty-orders-title" style={{ fontSize: 'var(--font-lg)' }}>
            No Orders Found
          </h2>
          <p className="stitch-empty-orders-desc" style={{ marginBottom: 0 }}>
            {activeFilter === 'all'
              ? 'Your store does not have any paid customer orders yet.'
              : `No customer orders currently matching status "${activeFilter}".`}
          </p>
        </div>
      ) : (
        <div className="stitch-vendor-orders-stack">
          {subOrders.map((item) => {
            const { orderId, orderNumber, createdAt, customer, shippingAddress, subOrder } = item;
            const isUpdating = updatingId === orderId;
            const canAdvance = ['placed', 'packed', 'shipped'].includes(subOrder.status);

            return (
              <div key={orderId} className="stitch-vendor-order-card">
                <div className="stitch-vorder-card-header">
                  <div className="stitch-vorder-meta-group">
                    <span className="stitch-vorder-number">{orderNumber}</span>
                    <span className="stitch-order-date-tag">
                      {new Date(createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={getStatusBadgeClass(subOrder.status)}>
                      {subOrder.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="stitch-vorder-payout-badge">
                    <span className="stitch-vpayout-label">Vendor Payout</span>
                    <strong className="stitch-vpayout-val">
                      ₹{subOrder.vendorPayout?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="stitch-vpayout-comm">
                      (Fee: ₹{subOrder.commission})
                    </span>
                  </div>
                </div>

                <div className="stitch-vorder-card-body-grid">
                  {/* Items List */}
                  <div className="stitch-vorder-items-column">
                    <span className="stitch-vorder-section-label">
                      Items Ordered ({subOrder.items.length})
                    </span>
                    <div className="stitch-vorder-items-list">
                      {subOrder.items.map((it, idx) => (
                        <div key={idx} className="stitch-vorder-item-row">
                          <img
                            src={it.image || '/placeholder.svg'}
                            alt={it.title}
                            className="stitch-vorder-item-thumb"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.svg';
                            }}
                          />
                          <div className="stitch-vorder-item-details">
                            <span className="stitch-vorder-item-title">{it.title}</span>
                            <span className="stitch-vorder-item-math">
                              Qty: {it.qty} × ₹{it.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })} = ₹{(it.price * it.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer & Shipping */}
                  <div className="stitch-vorder-shipping-column">
                    <span className="stitch-vorder-section-label">Delivery Address</span>
                    <div className="stitch-vorder-address-box">
                      <strong className="stitch-vorder-recipient-name">
                        {customer?.name || shippingAddress.name}
                      </strong>
                      <span className="stitch-vorder-address-line">{shippingAddress.line1}</span>
                      {shippingAddress.line2 && (
                        <span className="stitch-vorder-address-line">{shippingAddress.line2}</span>
                      )}
                      <span className="stitch-vorder-address-line">
                        {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}
                      </span>
                      <span className="stitch-vorder-phone">
                        📞 {shippingAddress.phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="stitch-vorder-card-footer">
                  <div className="stitch-vorder-status-indicator">
                    <span className="stitch-vorder-status-label">Current Stage:</span>
                    <strong className="stitch-vorder-status-current">{subOrder.status.toUpperCase()}</strong>
                  </div>

                  {canAdvance ? (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAdvanceStatus(orderId, subOrder.status)}
                      className="stitch-advance-step-btn"
                    >
                      {subOrder.status === 'placed' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                        </svg>
                      )}
                      {subOrder.status === 'packed' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="16" height="13" x="1" y="6" rx="2" />
                          <path d="M16 8h4l3 3v8h-7V8z" />
                        </svg>
                      )}
                      {subOrder.status === 'shipped' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      <span>{isUpdating ? 'Updating...' : getActionButtonText(subOrder.status)}</span>
                    </button>
                  ) : (
                    <span className="stitch-vorder-completed-note">
                      {subOrder.status === 'delivered' ? '✓ Fulfillment Completed' : 'Order Cancelled'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pages > 1 && (
            <div className="catalog-pagination-wrap" style={{ marginTop: '2.5rem' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="pagination-arrow-btn"
                aria-label="Previous Page"
              >
                ←
              </button>
              <span className="pagination-info" style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
                Page <strong>{page}</strong> of <strong>{pages}</strong>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="pagination-arrow-btn"
                aria-label="Next Page"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
