import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const STATUS_STEPS = ['placed', 'packed', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNewlyPlaced = searchParams.get('new') === 'true';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fakePaying, setFakePaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

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

  const handleFakePay = async () => {
    try {
      setFakePaying(true);
      setActionMessage('');
      const res = await api.post(`/dev/orders/${id}/fake-pay`);
      if (res.data?.order) {
        setOrder(res.data.order);
      }
      setActionMessage('Payment simulated successfully! Stock has been decremented.');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Fake pay failed');
    } finally {
      setFakePaying(false);
    }
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
      setActionMessage('Order successfully cancelled.');
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
        <Link to="/orders" className="btn btn-primary btn-sm">
          View My Orders
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
        <Link to="/orders" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          ← Back to Orders
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

      {/* Dev Fake-Pay Action Card */}
      {order.payment.status === 'pending' && (
        <div className="dev-fake-pay-card">
          <div className="dev-banner-badge">DEV TOOL · PHASE 5</div>
          <div className="dev-fake-pay-content">
            <div>
              <h3>Simulate Payment Completion</h3>
              <p>
                In production, Razorpay Route will collect and split payment. In this phase, test the payment completion flow by clicking Fake Pay.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFakePay}
              disabled={fakePaying}
              className="btn btn-primary btn-md dev-fake-pay-btn"
            >
              {fakePaying ? 'Processing...' : '⚡ Fake Pay Now'}
            </button>
          </div>
        </div>
      )}

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
                      🏪 {subOrder.vendorId?.storeName || 'Certified Vendor'}
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
                              e.target.src = 'https://via.placeholder.com/60?text=No+Img';
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
    </div>
  );
}
