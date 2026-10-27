import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';
import TestGatewayModal from '../components/TestGatewayModal';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const { showToast } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);

  useEffect(() => {
    // Reset state on user change
    setOrders([]);
    setTotal(0);
  }, [user?._id]);

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
        if (!err?.isCanceled) {
          setError(err.response?.data?.message || err.message || 'Failed to fetch orders');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'customer') {
      fetchOrders();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, user?._id, user?.role]);

  const goToPage = (p) => {
    setSearchParams({ page: p });
  };

  const getPaymentBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'stitch-status-badge paid';
      case 'refunded':
        return 'stitch-status-badge refunded';
      case 'failed':
        return 'stitch-status-badge failed';
      default:
        return 'stitch-status-badge pending';
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="orders-page-container stitch-cart-loading">
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-page-container">
      {/* Breadcrumb Navigation */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Customer Portal</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Orders &amp; Tracking</span>
      </nav>

      {/* Header */}
      <div className="stitch-orders-page-header">
        <div>
          <h1 className="stitch-orders-main-title">My Orders &amp; Shipments</h1>
          <p className="stitch-orders-main-subtitle">
            Track multi-vendor packages, download PDF invoices, and monitor fulfillment timelines.
          </p>
        </div>
      </div>

      {error && (
        <div className="stitch-checkout-error-alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>{error}</div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="stitch-empty-orders-card">
          <div className="stitch-empty-orders-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <h2 className="stitch-empty-orders-title">No Orders Placed Yet</h2>
          <p className="stitch-empty-orders-desc">
            You haven't placed any orders yet. Discover high-quality products across our independent multi-vendor stores.
          </p>
          <Link to="/products" className="stitch-explore-btn">
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="stitch-orders-list-col">
          {orders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div key={order._id} className="stitch-order-summary-card">
                <div className="stitch-order-card-top">
                  <div className="stitch-order-meta-cluster">
                    <div className="stitch-order-num-block">
                      <span className="stitch-order-num-sub">Order #</span>
                      <span className="stitch-order-num-val">{order.orderNumber}</span>
                    </div>
                    <span className="stitch-order-date-tag">{dateStr}</span>
                    <span className="stitch-order-vendor-count-tag">
                      {order.subOrders?.length || 1} {(order.subOrders?.length || 1) === 1 ? 'Vendor' : 'Vendors'}
                    </span>
                    <span className={getPaymentBadgeClass(order.payment?.status)}>
                      {order.payment?.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="stitch-order-card-action-cluster">
                    <div className="stitch-order-total-block">
                      <span className="stitch-order-total-label">Total Amount</span>
                      <span className="stitch-order-total-price">₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {(order.payment?.status === 'pending' || order.payment?.status === 'failed') && (
                      <button
                        type="button"
                        className="stitch-order-pay-btn"
                        onClick={() => {
                          setActivePaymentOrder(order);
                          setIsGatewayOpen(true);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="14" x="2" y="5" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        <span>{order.payment?.status === 'failed' ? 'Retry Payment' : 'Pay Now'}</span>
                      </button>
                    )}

                    <Link to={`/orders/${order._id}`} className="stitch-order-details-link">
                      <span>View Details</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Sub-Orders summary chips */}
                <div className="stitch-order-suborders-summary">
                  {order.subOrders?.map((sub, sIdx) => (
                    <div key={sIdx} className="stitch-suborder-chip">
                      <div className="stitch-suborder-store">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                          <path d="M2 7h20" />
                        </svg>
                        <span>{sub.vendorId?.storeName || 'Vendor'}</span>
                      </div>
                      <span className={`stitch-suborder-status-pill ${sub.status}`}>
                        {sub.status.toUpperCase()}
                      </span>
                      <span className="stitch-suborder-item-count">
                        ({sub.items.length} {sub.items.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {pages > 1 && (
            <div className="catalog-pagination-wrap" style={{ marginTop: '2.5rem' }}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="pagination-arrow-btn"
                aria-label="Previous Page"
              >
                ←
              </button>
              <span className="pagination-info" style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
                Page <strong>{currentPage}</strong> of <strong>{pages}</strong>
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pages}
                className="pagination-arrow-btn"
                aria-label="Next Page"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Demo payment notice */}
      <div className="stitch-demo-notice-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>Demo project: payments are simulated in a test gateway, no real money is charged.</p>
      </div>

      {activePaymentOrder && (
        <TestGatewayModal
          order={activePaymentOrder}
          isOpen={isGatewayOpen}
          onClose={() => {
            setIsGatewayOpen(false);
            setActivePaymentOrder(null);
          }}
          onError={(errMsg) => {
            console.error('[Payment Flow] Payment failed on MyOrdersPage:', errMsg);
            showToast(errMsg, 'error');
          }}
          onSuccess={(paidOrder) => {
            setOrders((prev) =>
              prev.map((o) => (o._id === paidOrder._id ? paidOrder : o))
            );
            setIsGatewayOpen(false);
            setActivePaymentOrder(null);
            showToast('Payment captured successfully!', 'success');
          }}
        />
      )}
    </div>
  );
}
