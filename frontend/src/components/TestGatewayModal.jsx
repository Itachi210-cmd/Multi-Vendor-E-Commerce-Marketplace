import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import useCart from '../hooks/useCart';

const TEST_CARDS = [
  { label: 'Success Card', number: '4111 1111 1111 1111', expiry: '12/28', cvv: '123', desc: 'Simulates successful capture' },
  { label: 'Declined Card', number: '4000 0000 0000 0002', expiry: '12/28', cvv: '123', desc: 'Simulates bank decline' },
  { label: 'Insufficient Funds', number: '4000 0000 0000 9995', expiry: '12/28', cvv: '123', desc: 'Simulates low account balance' },
  { label: 'Expired Card', number: '4000 0000 0000 0069', expiry: '12/28', cvv: '123', desc: 'Simulates expired card error' },
];

const TEST_UPIS = [
  { label: 'Success UPI', vpa: 'success@mock', desc: 'Instant UPI capture' },
  { label: 'Bank Failure', vpa: 'failure@mock', desc: 'Simulates bank decline' },
  { label: 'Invalid VPA', vpa: 'customer@unknownvpa', desc: 'Non-existent VPA error' },
];

export default function TestGatewayModal({ order, isOpen, onClose, onSuccess, onError }) {
  const { fetchCart } = useCart();
  const [activeTab, setActiveTab] = useState('card'); // 'card' | 'upi'
  const [step, setStep] = useState('ready'); // 'init' | 'ready' | 'processing' | 'success' | 'failure'

  const [providerOrderId, setProviderOrderId] = useState(order?.payment?.providerOrderId || '');
  const [amountPaise, setAmountPaise] = useState(Math.round((order?.total || 0) * 100));

  // Card form state
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  // UPI form state
  const [upiVpa, setUpiVpa] = useState('success@mock');

  // Result state
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);

  // Sync amount when order changes
  useEffect(() => {
    if (order?.total) {
      setAmountPaise(Math.round(order.total * 100));
    }
  }, [order?.total]);

  // Lock body scroll and listen for Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && step !== 'processing') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, step, onClose]);

  const initProviderOrder = useCallback(async () => {
    if (!order?._id) return;
    try {
      setStep('init');
      setErrorMessage('');
      const res = await api.post('/payments/create-order', { orderId: order._id });
      setProviderOrderId(res.data.providerOrderId);
      setAmountPaise(res.data.amount);
      setStep('ready');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to initialize payment session.';
      console.error('[Payment Flow] /payments/create-order failed for order ' + order._id + ':', {
        orderId: order._id,
        status: err.response?.status || err.status,
        error: errorMsg,
      });
      setErrorMessage(errorMsg);
      setStep('failure');
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [order?._id, onError]);

  // Initialize or fetch provider order on modal open
  useEffect(() => {
    if (!isOpen || !order?._id) return;
    initProviderOrder();
  }, [isOpen, order?._id, initProviderOrder]);

  if (!isOpen) return null;

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExpiry(raw);
  };

  const selectTestCard = (card) => {
    setCardNumber(card.number);
    setCardExpiry(card.expiry);
    setCardCvv(card.cvv);
  };

  const selectTestUpi = (upi) => {
    setUpiVpa(upi.vpa);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode('');
    setStep('processing');

    try {
      // 1. Process with Sandbox Gateway
      const payload = {
        providerOrderId,
        method: activeTab,
      };

      if (activeTab === 'card') {
        payload.card = {
          number: cardNumber.replace(/\s+/g, ''),
          expiry: cardExpiry,
          cvv: cardCvv,
        };
      } else {
        payload.upi = {
          vpa: upiVpa.trim(),
        };
      }

      const gatewayRes = await api.post('/mock-gateway/pay', payload);
      const { order_id, payment_id, signature, method } = gatewayRes.data;

      // 2. Call Verify on server
      const verifyRes = await api.post('/payments/verify', {
        order_id,
        payment_id,
        signature,
      });

      // Clear customer cart state
      await fetchCart();

      setPaymentResult({
        order_id,
        payment_id,
        method: method || activeTab,
        amount: amountPaise / 100,
        order: verifyRes.data.order,
      });

      setStep('success');

      if (onSuccess) {
        onSuccess(verifyRes.data.order);
      }
    } catch (err) {
      const resp = err.response?.data || err.data;
      const code = resp?.code || 'GATEWAY_ERROR';
      const reason =
        resp?.reason || resp?.error || resp?.message || err.message || 'Payment processing failed.';
      console.error('[Payment Flow] Payment processing or verification failed for order ' + order?._id + ':', {
        orderId: order?._id,
        providerOrderId,
        method: activeTab,
        code,
        reason,
        status: err.response?.status || err.status,
      });
      setErrorCode(code);
      setErrorMessage(reason);
      setStep('failure');
      if (onError) {
        onError(reason);
      }
    }
  };

  const handleRetry = () => {
    if (!providerOrderId) {
      initProviderOrder();
    } else {
      setStep('ready');
      setErrorMessage('');
      setErrorCode('');
    }
  };

  const modalContent = (
    <div
      className="stitch-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'processing') {
          onClose?.();
        }
      }}
    >
      <div
        className="stitch-gateway-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="stitch-modal-header">
          <div className="stitch-modal-header-left">
            <div className="stitch-modal-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <rect width="8" height="5" x="8" y="11" rx="1" />
                <path d="M10 11V9a2 2 0 1 1 4 0v2" />
              </svg>
            </div>
            <div>
              <div className="stitch-modal-title-row">
                <h3 className="stitch-modal-title">Test Gateway</h3>
                <span className="stitch-sandbox-badge">
                  SANDBOX MODE
                </span>
              </div>
              <p className="stitch-modal-subtitle">
                Simulated Payment Provider Layer • No real money charged
              </p>
            </div>
          </div>
          {step !== 'processing' && (
            <button className="stitch-modal-close-btn" onClick={onClose} aria-label="Close modal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="stitch-modal-body">
          {/* Demo Notice Banner */}
          <div className="stitch-modal-demo-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              <strong>Demo project:</strong> payments are simulated in a test gateway, no real money is charged.
            </span>
          </div>

          {/* Amount Summary Row */}
          <div className="stitch-modal-amount-box">
            <div>
              <span className="stitch-amount-order-label">
                Order #{order?.orderNumber || order?._id}
              </span>
              <span className="stitch-amount-session-label">
                Session: {providerOrderId || 'Initializing...'}
              </span>
            </div>
            <div className="stitch-amount-value-col">
              <span className="stitch-amount-sublabel">Total Payable</span>
              <strong className="stitch-amount-large">
                ₹{(amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Step 1: Initializing session */}
          {step === 'init' && (
            <div className="stitch-modal-state-box">
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p>Contacting payment provider layer...</p>
            </div>
          )}

          {/* Step 2: Processing Payment */}
          {step === 'processing' && (
            <div className="stitch-modal-state-box">
              <div className="spinner" style={{ margin: '0 auto 1.25rem', width: '42px', height: '42px' }}></div>
              <h4>Processing Payment...</h4>
              <p>
                Simulating banking network handshakes, card/UPI verification, and HMAC authorization.
              </p>
            </div>
          )}

          {/* Step 3: Success Screen */}
          {step === 'success' && paymentResult && (
            <div className="stitch-modal-state-box">
              <div className="stitch-status-icon-circle success">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="stitch-success-title">Payment Successful!</h3>
              <p className="stitch-success-desc">
                Your order is confirmed. Multi-vendor payout splits have been created.
              </p>

              <div className="stitch-receipt-box">
                <div className="stitch-receipt-row">
                  <span className="stitch-receipt-label">Payment ID</span>
                  <code className="stitch-receipt-code">{paymentResult.payment_id}</code>
                </div>
                <div className="stitch-receipt-row">
                  <span className="stitch-receipt-label">Payment Method</span>
                  <span className="stitch-receipt-method">{paymentResult.method}</span>
                </div>
                <div className="stitch-receipt-row">
                  <span className="stitch-receipt-label">Status</span>
                  <span className="stitch-receipt-status">CAPTURED &amp; PAID</span>
                </div>
              </div>

              <button
                className="stitch-modal-confirm-btn"
                onClick={onClose}
              >
                View Order Details
              </button>
            </div>
          )}

          {/* Step 4: Failure Screen */}
          {step === 'failure' && (
            <div className="stitch-modal-state-box">
              <div className="stitch-status-icon-circle failure">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h3 className="stitch-failure-title">Payment Failed</h3>
              <p className="stitch-failure-desc">
                {errorMessage || 'The payment gateway could not process this transaction.'}
              </p>

              {errorCode && (
                <div className="stitch-error-code-wrap">
                  <span className="stitch-error-code-badge">
                    Error Code: {errorCode}
                  </span>
                </div>
              )}

              <div className="stitch-failure-actions">
                <button
                  type="button"
                  className="stitch-modal-cancel-btn"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="stitch-modal-retry-btn"
                  onClick={handleRetry}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  <span>Retry Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Ready to Pay (Form + Quick Select) */}
          {step === 'ready' && (
            <div>
              {/* Payment Method Tabs */}
              <div className="stitch-modal-tabs">
                <button
                  type="button"
                  className={`stitch-modal-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
                  onClick={() => setActiveTab('card')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>Credit / Debit Card</span>
                </button>

                <button
                  type="button"
                  className={`stitch-modal-tab-btn ${activeTab === 'upi' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upi')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="20" x="5" y="2" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <span>UPI / QR</span>
                </button>
              </div>

              {/* Card Form */}
              {activeTab === 'card' && (
                <form onSubmit={handlePay} className="stitch-modal-form">
                  <div className="stitch-form-group">
                    <label className="stitch-form-label">Card Number</label>
                    <div className="stitch-input-with-icon">
                      <input
                        type="text"
                        className="stitch-form-input"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4111 1111 1111 1111"
                        required
                      />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stitch-input-trailing-icon">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                  </div>

                  <div className="stitch-form-row-2">
                    <div className="stitch-form-group">
                      <label className="stitch-form-label">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        className="stitch-form-input"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        required
                      />
                    </div>

                    <div className="stitch-form-group">
                      <label className="stitch-form-label">CVV</label>
                      <input
                        type="password"
                        className="stitch-form-input"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.slice(0, 4))}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>

                  {/* Test Cards Quick Panel */}
                  <div className="stitch-scenario-panel">
                    <span className="stitch-scenario-heading">
                      ⚡ Quick Test Scenarios (Click to Prefill):
                    </span>
                    <div className="stitch-scenario-grid">
                      {TEST_CARDS.map((tc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectTestCard(tc)}
                          className="stitch-scenario-chip"
                        >
                          <span className="stitch-chip-title">{tc.label}</span>
                          <span className="stitch-chip-desc">{tc.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="stitch-modal-submit-pay-btn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Pay ₹{(amountPaise / 100).toFixed(2)}</span>
                  </button>
                </form>
              )}

              {/* UPI Form */}
              {activeTab === 'upi' && (
                <form onSubmit={handlePay} className="stitch-modal-form">
                  <div className="stitch-form-group">
                    <label className="stitch-form-label">Virtual Payment Address (UPI ID)</label>
                    <input
                      type="text"
                      className="stitch-form-input"
                      value={upiVpa}
                      onChange={(e) => setUpiVpa(e.target.value)}
                      placeholder="success@mock"
                      required
                    />
                  </div>

                  {/* Simulated QR Box */}
                  <div className="stitch-upi-qr-box">
                    <div className="stitch-qr-preview">
                      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="5" height="5" x="3" y="3" rx="1" />
                        <rect width="5" height="5" x="16" y="3" rx="1" />
                        <rect width="5" height="5" x="3" y="16" rx="1" />
                        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                        <path d="M21 21v.01" />
                        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                        <path d="M3 12h.01" />
                        <path d="M12 3h.01" />
                        <path d="M12 16v.01" />
                        <path d="M16 12h1" />
                        <path d="M21 12v.01" />
                        <path d="M12 21v-1" />
                      </svg>
                    </div>
                    <span className="stitch-qr-hint">Scan with any UPI app or enter ID above</span>
                  </div>

                  {/* Test UPI Quick Panel */}
                  <div className="stitch-scenario-panel">
                    <span className="stitch-scenario-heading">
                      ⚡ Quick Test Scenarios (Click to Prefill):
                    </span>
                    <div className="stitch-scenario-list">
                      {TEST_UPIS.map((tu, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectTestUpi(tu)}
                          className="stitch-scenario-upi-chip"
                        >
                          <div className="stitch-upi-chip-left">
                            <span className="stitch-chip-title">{tu.label}</span>
                            <span className="stitch-chip-desc">{tu.desc}</span>
                          </div>
                          <code className="stitch-chip-code">{tu.vpa}</code>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="stitch-modal-submit-pay-btn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>Pay with UPI ₹{(amountPaise / 100).toFixed(2)}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
