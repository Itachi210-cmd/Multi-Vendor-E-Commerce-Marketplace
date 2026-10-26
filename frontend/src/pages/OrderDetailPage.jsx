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

  const canCancel =
    order.payment.status !== 'refunded' &&
    order.subOrders.every((s) => s.status === 'placed');

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
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to={user?.role === 'admin' ? '/admin/orders' : '/orders'}
          style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}
        >
          ← Back to {user?.role === 'admin' ? 'All Orders' : 'Orders'}
        </Link>
      </div>

      {isNewlyPlaced && (
        <div className="alert-box alert-success" style={{ marginBottom: '2rem' }}>
          <span>🎉</span>
          <div>
            <strong>Order Successfully Placed!</strong> Your order number is{' '}
            <code>{order.orderNumber}</code>. In development, click the <strong>Simulate Payment (Fake Pay)</strong> button below to simulate successful payment and trigger stock reductions.
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.5rem' }}>
          <span>✓</span>
          <div>{actionMessage}</div>
        </div>
      )}

      {/* Order Header */}
      <div className="order-details-header-card">
        <div className="order-header-left">
          <span className="order-number-title">{order.orderNumber}</span>
          <span className="order-date-text">
            Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="order-header-right">
          <div className="payment-status-wrapper">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Payment:
            </span>
            <span className={`badge ${getPaymentBadge(order.payment.status)}`}>
              {order.payment.status.toUpperCase()}
            </span>
          </div>

          <div className="order-grand-total">₹{order.total.toLocaleString()}</div>
        </div>
      </div>

      {/* Payment Details & Action Card */}
      <div className="payment-summary-card" style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: order.payment.status === 'paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(2, 132, 199, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            {order.payment.status === 'paid' ? '✅' : order.payment.status === 'failed' ? '⚠️' : '💳'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <strong style={{ fontSize: '1rem' }}>
                {order.payment.status === 'paid' ? 'Payment Completed' : order.payment.status === 'failed' ? 'Payment Failed' : 'Payment Awaiting Confirmation'}
              </strong>
              <span className={`badge ${getPaymentBadge(order.payment.status)}`}>
                {order.payment.status.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {order.payment.status === 'paid' ? (
                <>
                  Paid ₹{order.total.toLocaleString()} via <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{order.payment.method || 'card'}</span> • ID: <code>{order.payment.providerPaymentId}</code>
                </>
              ) : order.payment.status === 'failed' ? (
                <span style={{ color: 'var(--color-danger)' }}>
                  Reason: {order.payment.failureReason || 'Declined by gateway'}. You can retry safely.
                </span>
              ) : (
                <>Order created in MongoDB. Complete simulated checkout via the Test Gateway.</>
              )}
            </div>
          </div>
        </div>

        {/* Download Invoice Button for Paid orders */}
        {order.payment.status === 'paid' && (
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            style={{ padding: '0.65rem 1.4rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {downloadingInvoice ? 'Generating PDF...' : '📄 Download Invoice'}
          </button>
        )}

        {/* Retry / Pay Now Button for Pending or Failed orders */}
        {(order.payment.status === 'pending' || order.payment.status === 'failed') && (
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => setIsGatewayOpen(true)}
            style={{ padding: '0.65rem 1.4rem', fontWeight: 600 }}
          >
            {order.payment.status === 'failed' ? '🔄 Retry Payment' : '💳 Pay Now (Sandbox)'}
          </button>
        )}
      </div>

      {/* Main Order Content */}
      <div className="order-details-layout">
        {/* Left: Vendor Sub-orders and Timelines */}
        <div className="suborders-pane">
          <h2 className="pane-section-title">Sub-Orders by Vendor ({order.subOrders.length})</h2>

          {order.subOrders.map((subOrder, idx) => {
            const currentStepIdx = STATUS_STEPS.indexOf(subOrder.status);
            const isCancelled = subOrder.status === 'cancelled';

            return (
              <div key={idx} className="suborder-card">
                <div className="suborder-header">
                  <div>
                    <span className="suborder-store-name">
                      🏪 {subOrder.vendorId?.storeName || 'Community Vendor'}
                    </span>
                    <span className="suborder-items-count">
                      ({subOrder.items.length} {subOrder.items.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>

                  <span className={`badge ${getStatusBadge(subOrder.status)}`}>
                    {subOrder.status.toUpperCase()}
                  </span>
                </div>

                {/* Sub-order Stepper Timeline */}
                {!isCancelled ? (
                  <div className="order-timeline-stepper">
                    {STATUS_STEPS.map((step, sIdx) => {
                      const isComplete = currentStepIdx >= sIdx;
                      const isCurrent = currentStepIdx === sIdx;

                      return (
                        <div
                          key={step}
                          className={`timeline-step ${isComplete ? 'complete' : ''} ${
                            isCurrent ? 'current' : ''
                          }`}
                        >
                          <div className="timeline-dot-wrapper">
                            <div className="timeline-dot">{isComplete ? '✓' : sIdx + 1}</div>
                            {sIdx < STATUS_STEPS.length - 1 && (
                              <div
                                className={`timeline-line ${
                                  currentStepIdx > sIdx ? 'complete' : ''
                                }`}
                              ></div>
                            )}
                          </div>
                          <span className="timeline-step-label">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="suborder-cancelled-banner">
                    ❌ This vendor sub-order was cancelled.
                  </div>
                )}

                {/* Sub-order Items List */}
                <div className="suborder-items-table">
                  {subOrder.items.map((it, iIdx) => (
                    <div key={iIdx} className="suborder-item-row">
                      <div className="suborder-item-left">
                        {it.image && (
                          <img
                            src={it.image}
                            alt={it.title}
                            className="suborder-item-thumb"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.svg';
                            }}
                          />
                        )}
                        <div>
                          <Link
                            to={`/products/${it.productId}`}
                            className="suborder-item-name"
                          >
                            {it.title}
                          </Link>
                          <div className="suborder-item-qty">
                            Quantity: {it.qty} × ₹{it.price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="suborder-item-total">
                        ₹{(it.price * it.qty).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="suborder-footer">
                  <span className="suborder-footer-label">Vendor Subtotal:</span>
                  <span className="suborder-footer-val">₹{subOrder.subtotal.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Shipping Address & Actions */}
        <aside className="order-info-sidebar">
          {/* Order Financial Summary */}
          <div className="summary-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="sidebar-card-title">Order Total</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              <span>Items Subtotal:</span>
              <span>₹{((order.total || 0) + (order.discount || 0)).toLocaleString()}</span>
            </div>

            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#16a34a', fontWeight: 600 }}>
                <span>Coupon Discount ({order.couponCode || 'PROMO'}):</span>
                <span>- ₹{order.discount.toLocaleString()}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.75rem', fontSize: '1.15rem', fontWeight: 800 }}>
              <span>Total Paid:</span>
              <span style={{ color: 'var(--color-primary)' }}>₹{order.total.toLocaleString()}</span>
            </div>

            {order.payment.status === 'paid' && (
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginTop: '1rem', fontWeight: 700 }}
              >
                {downloadingInvoice ? 'Downloading...' : '📄 Download PDF Invoice'}
              </button>
            )}
          </div>

          {/* Shipping Address */}
          <div className="summary-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="sidebar-card-title">Delivery Address</h3>
            <div className="shipping-address-display">
              <strong>{order.shippingAddress.name}</strong>
              <div>{order.shippingAddress.line1}</div>
              {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                {order.shippingAddress.pincode}
              </div>
              <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                📞 {order.shippingAddress.phone}
              </div>
            </div>
          </div>

          {/* Cancellation Option */}
          {canCancel && (
            <div className="summary-card">
              <h3 className="sidebar-card-title">Need to cancel?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                You can cancel this order as long as none of the vendor sub-orders have been packed or shipped.
              </p>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Entire Order'}
              </button>
            </div>
          )}
        </aside>
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
