import React from 'react';

export default function VendorOrdersPage() {
  return (
    <div>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Store Orders &amp; Fulfillment</h1>
        <p className="section-subtitle">Process incoming customer sub-orders and advance shipment statuses.</p>
      </div>

      <div className="empty-state-card" style={{ padding: '4rem 2rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦 ➔ 🚚 ➔ 🏡</div>
        <h2>Order Fulfillment Pipeline</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '500px', margin: '0.75rem auto 1.5rem', lineHeight: '1.6' }}>
          Vendor sub-order routing and fulfillment lifecycle (<code>placed ➔ packed ➔ shipped ➔ delivered</code>) will be integrated in Phase 5 alongside the Redis cart and checkout flow.
        </p>
        <span className="badge badge-degraded" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
          Phase 5 Feature
        </span>
      </div>
    </div>
  );
}
