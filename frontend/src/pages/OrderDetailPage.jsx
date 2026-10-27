import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';
import TestGatewayModal from '../components/TestGatewayModal';

const STATUS_STEPS = ['placed', 'packed', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const { user } = useAuth();
  const { showToast } = useCart();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isNewlyPlaced = searchParams.get('new') === 'true' || location.state?.newlyPlaced;
  const isJustPaid = searchParams.get('paid') === 'true';
  const shouldAutoPay = searchParams.get('pay') === '1' || location.state?.autoPay === true;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const handleDownloadInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      const res = await api.get(`/orders/${id}/invoice`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data?.order);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Auto-open Test Gateway modal if directed to pay immediately
  useEffect(() => {
    if (
      order &&
      shouldAutoPay &&
      (order.payment?.status === 'pending' || order.payment?.status === 'failed')
    ) {
      setIsGatewayOpen(true);
    }
  }, [order, shouldAutoPay]);

  const handleCloseGateway = () => {
    setIsGatewayOpen(false);
    if (searchParams.get('pay')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('pay');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handlePaymentSuccess = (paidOrder) => {
    setOrder(paidOrder);
    setIsGatewayOpen(false);
    if (searchParams.get('pay')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('pay');
      setSearchParams(nextParams, { replace: true });
    }
    showToast('Payment captured successfully!', 'success');
    setActionMessage('Payment captured successfully via Test Gateway!');
  };

  const handlePaymentError = (errMsg) => {
    console.error('[Payment Flow] Payment error displayed on OrderDetailPage:', errMsg);
    showToast(errMsg, 'error');
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this entire order?')) return;

    try {
      setCancelling(true);
      setActionMessage('');
      const res = await api.patch(`/orders/${id}/cancel`);
      if (res.data?.order) {
        setOrder(res.data.order);
      }
      setActionMessage('Order successfully cancelled. If payment was made, full refund has been initiated.');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <h2>Order Not Found</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '0.75rem 0 1.5rem' }}>
          {error || 'Unable to locate this order.'}
        </p>
        <Link
          to={user?.role === 'admin' ? '/admin/orders' : '/orders'}
          className="btn btn-primary btn-sm"
        >
          {user?.role === 'admin' ? 'Back to All Orders' : 'View My Orders'}
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status) => {
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

  return (
    <div className="orders-page-container">
      {/* Breadcrumb Navigation */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Customer Portal</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to={user?.role === 'admin' ? '/admin/orders' : '/orders'} className="breadcrumb-link">
          {user?.role === 'admin' ? 'Orders Management' : 'Orders & Tracking'}
        </Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{order.orderNumber}</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to={user?.role === 'admin' ? '/admin/orders' : '/orders'}
          className="stitch-back-orders-link"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to {user?.role === 'admin' ? 'All Orders' : 'My Orders'}</span>
        </Link>
      </div>

      {isNewlyPlaced && (
        <div className="stitch-order-placed-success-banner" role="alert">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>
            <strong>Order Successfully Placed!</strong> Your order number is{' '}
            <code>{order.orderNumber}</code>. Multi-vendor packages have been assigned to independent sellers.
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="stitch-order-placed-success-banner" role="alert" style={{ marginBottom: '1.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>{actionMessage}</div>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="stitch-order-details-header-card">
        <div className="stitch-header-card-left">
          <div className="stitch-header-title-row">
            <h1 className="stitch-order-main-number">Order #{order.orderNumber}</h1>
            <span className={getPaymentBadgeClass(order.payment?.status)}>
              {order.payment?.status?.toUpperCase()}
            </span>
          </div>
          <p className="stitch-order-date-full">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="stitch-header-card-right">
          {order.payment?.status === 'paid' && (
            <button
              type="button"
              className="stitch-download-invoice-btn"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{downloadingInvoice ? 'Generating PDF...' : 'Download Invoice'}</span>
            </button>
          )}

          {(order.payment?.status === 'pending' || order.payment?.status === 'failed') && (
            <button
              type="button"
              className="stitch-order-pay-btn large"
              onClick={() => setIsGatewayOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>{order.payment?.status === 'failed' ? 'Retry Payment' : 'Pay Now (Sandbox)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Shipping Address & Payment Summary 2-Col Grid */}
      <div className="stitch-order-overview-grid">
        {/* Shipping Address */}
        <div className="stitch-overview-box">
          <div className="stitch-overview-box-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="16" height="13" x="1" y="6" rx="2" />
              <path d="M16 8h4l3 3v8h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <h3>Shipping Address</h3>
          </div>
          <div className="stitch-address-content">
            <span className="stitch-address-recipient">{order.shippingAddress.name}</span>
            <span className="stitch-address-line">{order.shippingAddress.line1}</span>
            {order.shippingAddress.line2 && (
              <span className="stitch-address-line">{order.shippingAddress.line2}</span>
            )}
            <span className="stitch-address-line">
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </span>
            <span className="stitch-address-phone">
              Phone: {order.shippingAddress.phone}
            </span>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="stitch-overview-box">
          <div className="stitch-overview-box-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <h3>Payment Summary</h3>
          </div>
          <div className="stitch-payment-summary-rows">
            <div className="stitch-summary-row">
              <span>Subtotal ({order.subOrders?.reduce((acc, s) => acc + s.items.length, 0)} items)</span>
              <span>₹{((order.total || 0) + (order.discount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {order.discount > 0 && (
              <div className="stitch-summary-row stitch-discount-row">
                <span>Coupon Discount ({order.couponCode || 'PROMO'})</span>
                <span>- ₹{order.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="stitch-summary-row">
              <span>Shipping &amp; Handling</span>
              <span className="free">FREE</span>
            </div>

            <div className="stitch-summary-divider"></div>

            <div className="stitch-total-row" style={{ marginTop: '0.25rem' }}>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>Total Paid</span>
              <span className="stitch-total-val" style={{ fontSize: '1.35rem' }}>
                ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="stitch-payment-method-row">
              <span className="stitch-pm-label">Method</span>
              <span className="stitch-pm-val">
                {order.payment?.method ? `Test Gateway - ${order.payment.method.toUpperCase()} (Simulated)` : 'Test Gateway Sandbox'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Shipments & Multi-Vendor Tracking Timelines */}
      <div className="stitch-suborders-section">
        <h2 className="stitch-suborders-section-title">
          Vendor Shipments ({order.subOrders?.length || 0})
        </h2>

        <div className="stitch-suborders-cards-list">
          {order.subOrders?.map((subOrder, idx) => {
            const currentStepIdx = STATUS_STEPS.indexOf(subOrder.status);
            const isCancelled = subOrder.status === 'cancelled';
            const isDelivered = subOrder.status === 'delivered';

            return (
              <div key={idx} className="stitch-suborder-tracking-card">
                <div className="stitch-suborder-card-header">
                  <div className="stitch-suborder-vendor-identity">
                    <div className="stitch-vendor-initials-badge">
                      {(subOrder.vendorId?.storeName || 'V')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 3)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="stitch-suborder-vendor-title">
                        {subOrder.vendorId?.storeName || 'Independent Vendor'}
                      </h3>
                      <span className="stitch-suborder-number-tag">
                        Sub-order #{order.orderNumber}-{String.fromCharCode(65 + idx)}
                      </span>
                    </div>
                  </div>

                  <span className={getStatusBadge(subOrder.status)}>
                    {subOrder.status.toUpperCase()}
                  </span>
                </div>

                {/* Items in this sub-order */}
                <div className="stitch-suborder-items-grid">
                  {subOrder.items.map((it, iIdx) => (
                    <div key={iIdx} className="stitch-suborder-product-row">
                      <div className="stitch-suborder-product-media">
                        <img
                          src={it.image || '/placeholder.svg'}
                          alt={it.title}
                          className="stitch-suborder-item-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="stitch-suborder-product-details">
                        <Link to={`/products/${it.productId}`} className="stitch-suborder-item-title">
                          {it.title}
                        </Link>
                        <span className="stitch-suborder-item-meta">
                          Qty: {it.qty} × ₹{it.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="stitch-suborder-item-price-col">
                        ₹{(it.price * it.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4-Step Progress Timeline */}
                <div className="stitch-shipment-timeline-wrap">
                  <h4 className="stitch-timeline-heading">Shipment Progress</h4>

                  {!isCancelled ? (
                    <div className="stitch-4step-timeline">
                      <div className="stitch-timeline-track">
                        <div
                          className="stitch-timeline-fill-bar"
                          style={{
                            width: `${Math.min(100, Math.max(0, (currentStepIdx / (STATUS_STEPS.length - 1)) * 100))}%`,
                          }}
                        ></div>
                      </div>

                      {STATUS_STEPS.map((stepName, sIdx) => {
                        const isDone = currentStepIdx > sIdx;
                        const isCurrent = currentStepIdx === sIdx;
                        const stepClass = isDone ? 'done' : isCurrent ? 'current' : 'upcoming';

                        return (
                          <div key={stepName} className={`stitch-timeline-node ${stepClass}`}>
                            <div className="stitch-node-icon-circle">
                              {isDone ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : stepName === 'placed' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                </svg>
                              ) : stepName === 'packed' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                </svg>
                              ) : stepName === 'shipped' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="16" height="13" x="1" y="6" rx="2" />
                                  <path d="M16 8h4l3 3v8h-7V8z" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </svg>
                              )}
                            </div>
                            <span className="stitch-node-label">{stepName}</span>
                            <span className="stitch-node-subtext">
                              {isDone || isCurrent ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="stitch-suborder-cancelled-banner">
                      <span>❌ This vendor shipment was cancelled.</span>
                    </div>
                  )}
                </div>

                {/* Sub-order Footer Actions */}
                <div className="stitch-suborder-footer-actions">
                  <div>
                    {isDelivered && (
                      <div className="stitch-review-vendor-items-row">
                        {subOrder.items.map((it) => (
                          <Link
                            key={it.productId}
                            to={`/products/${it.productId}#reviews`}
                            className="stitch-write-review-link"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <span>Write a review for {it.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {!isDelivered && !isCancelled && (
                      <span className="stitch-review-unavailable-hint">
                        Reviews can be posted once this package is marked delivered.
                      </span>
                    )}
                  </div>

                  <div className="stitch-suborder-net-total">
                    <span className="stitch-subtotal-text">Vendor Subtotal:</span>
                    <span className="stitch-subtotal-val">₹{subOrder.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancellation section if applicable */}
      {canCancel && (
        <div className="stitch-cancel-order-card">
          <div className="stitch-cancel-order-info">
            <h3 className="stitch-cancel-card-title">Need to cancel this order?</h3>
            <p className="stitch-cancel-card-desc">
              You can cancel this order as long as none of the vendor sub-orders have been packed or shipped. If paid, an instant simulation refund is recorded.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="stitch-cancel-order-btn"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Entire Order'}
          </button>
        </div>
      )}

      {/* Demo payment notice */}
      <div className="stitch-demo-notice-banner" style={{ marginTop: '2rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>Demo project: payments are simulated in a test gateway, no real money is charged.</p>
      </div>

      {order && (
        <TestGatewayModal
          order={order}
          isOpen={isGatewayOpen}
          onClose={handleCloseGateway}
          onError={handlePaymentError}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
