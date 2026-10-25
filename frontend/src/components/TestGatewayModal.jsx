import React, { useState, useEffect } from 'react';
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

export default function TestGatewayModal({ order, isOpen, onClose, onSuccess }) {
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

  // Initialize or fetch provider order
  useEffect(() => {
    if (!isOpen || !order?._id) return;

    let isMounted = true;
    const initProviderOrder = async () => {
      try {
        setStep('init');
        setErrorMessage('');
        const res = await api.post('/payments/create-order', { orderId: order._id });
        if (isMounted) {
          setProviderOrderId(res.data.providerOrderId);
          setAmountPaise(res.data.amount);
          setStep('ready');
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.error || err.message || 'Failed to initialize payment session.'
          );
          setStep('failure');
        }
      }
    };

    initProviderOrder();

    return () => {
      isMounted = false;
    };
  }, [isOpen, order?._id]);

  if (!isOpen) return null;

  const handleCardNumberChange = (e) => {
    // Format card number with spaces every 4 digits
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
      const resp = err.response?.data;
      setErrorCode(resp?.code || 'GATEWAY_ERROR');
      setErrorMessage(
        resp?.reason || resp?.error || err.message || 'Payment processing failed.'
      );
      setStep('failure');
    }
  };

  const handleRetry = () => {
    setStep('ready');
    setErrorMessage('');
    setErrorCode('');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-container test-gateway-modal" style={{ maxWidth: '580px', width: '92%' }}>
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Test Gateway</h3>
                <span className="badge badge-degraded" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                  SANDBOX MODE
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Simulated Payment Provider Layer • No real money charged
              </p>
            </div>
          </div>
          {step !== 'processing' && (
            <button className="btn-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Amount Badge Banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--color-surface-hover)',
              padding: '0.85rem 1.15rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>
                Order #{order?.orderNumber || order?._id}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Session: {providerOrderId || 'Initializing...'}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                Amount to Pay
              </span>
              <strong style={{ fontSize: '1.35rem', color: 'var(--color-primary)' }}>
                ₹{(amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Step 1: Initializing session */}
          {step === 'init' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Contacting payment provider layer...
              </p>
            </div>
          )}

          {/* Step 2: Processing Payment */}
          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1.25rem', width: '42px', height: '42px' }}></div>
              <h4 style={{ margin: '0 0 0.5rem' }}>Processing Payment...</h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', maxWidth: '340px', margin: '0 auto' }}>
                Simulating banking network handshakes, card/UPI verification, and HMAC authorization.
              </p>
            </div>
          )}

          {/* Step 3: Success Screen */}
          {step === 'success' && paymentResult && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 1.25rem',
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: '0 0 0.4rem', color: 'var(--color-success)' }}>
                Payment Successful!
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Your order is confirmed. Multi-vendor payout splits have been created.
              </p>

              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Payment ID:</span>
                  <code style={{ fontWeight: 600 }}>{paymentResult.payment_id}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Payment Method:</span>
                  <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentResult.method}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Status:</span>
                  <span className="badge badge-connected" style={{ fontSize: '0.72rem' }}>
                    CAPTURED & PAID
                  </span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
                onClick={onClose}
              >
                View Order Details
              </button>
            </div>
          )}

          {/* Step 4: Failure Screen */}
          {step === 'failure' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 1.25rem',
                }}
              >
                ✕
              </div>
              <h3 style={{ margin: '0 0 0.4rem', color: 'var(--color-danger)' }}>
                Payment Failed
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                {errorMessage || 'The payment gateway could not process this transaction.'}
              </p>

              {errorCode && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="badge badge-degraded" style={{ fontSize: '0.75rem' }}>
                    Error Code: {errorCode}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.85rem' }}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '0.85rem' }}
                  onClick={handleRetry}
                >
                  🔄 Retry Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Ready to Pay (Form + Quick Select) */}
          {step === 'ready' && (
            <div>
              {/* Payment Method Tabs */}
              <div className="gateway-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className={`gateway-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
                  onClick={() => setActiveTab('card')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: activeTab === 'card' ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: activeTab === 'card' ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-surface)',
                    color: activeTab === 'card' ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>💳</span> Credit / Debit Card
                </button>

                <button
                  type="button"
                  className={`gateway-tab-btn ${activeTab === 'upi' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upi')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: activeTab === 'upi' ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: activeTab === 'upi' ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-surface)',
                    color: activeTab === 'upi' ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>📱</span> UPI / QR
                </button>
              </div>

              {/* Card Form */}
              {activeTab === 'card' && (
                <form onSubmit={handlePay}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Card Number
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4111 1111 1111 1111"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                        CVV
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.slice(0, 4))}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>

                  {/* Test Cards Quick Panel */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                      ⚡ Click a test scenario to prefill:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                      {TEST_CARDS.map((tc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectTestCard(tc)}
                          style={{
                            padding: '0.5rem 0.65rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            background: 'var(--color-surface)',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)' }}>
                            {tc.label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            {tc.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                  >
                    🔒 Pay ₹{(amountPaise / 100).toFixed(2)}
                  </button>
                </form>
              )}

              {/* UPI Form */}
              {activeTab === 'upi' && (
                <form onSubmit={handlePay}>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Virtual Payment Address (UPI ID)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={upiVpa}
                      onChange={(e) => setUpiVpa(e.target.value)}
                      placeholder="success@mock"
                      required
                    />
                  </div>

                  {/* Test UPI Quick Panel */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                      ⚡ Click a test scenario to prefill:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {TEST_UPIS.map((tu, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectTestUpi(tu)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            background: 'var(--color-surface)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{tu.label}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>
                              {tu.desc}
                            </span>
                          </div>
                          <code style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>{tu.vpa}</code>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                  >
                    📱 Pay with UPI ₹{(amountPaise / 100).toFixed(2)}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
