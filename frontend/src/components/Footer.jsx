import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="content-container">
        <div className="footer-content">
          <div>
            <div className="nav-brand" style={{ marginBottom: '0.5rem' }}>
              <div className="brand-icon">M</div>
              <span className="brand-name">Multi-Vendor Marketplace</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Scalable multi-tenant e-commerce architecture built with clean separation of concerns.
            </p>
          </div>

          <div className="stack-pills">
            <span className="stack-pill">React</span>
            <span className="stack-pill">Node.js / Express</span>
            <span className="stack-pill">MongoDB</span>
            <span className="stack-pill">Redis</span>
            <span className="stack-pill">Elasticsearch</span>
            <span className="stack-pill">Supabase Storage (S3-compatible)</span>
            <span className="stack-pill">Test payment gateway (sandbox)</span>
          </div>
        </div>

        <div className="footer-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
          <span>&copy; {new Date().getFullYear()} Multi-Vendor Marketplace Demo Platform.</span>
          <span style={{ color: 'var(--color-primary-dark)', fontWeight: 600 }}>
            Demo project: payments are simulated in a test gateway, no real money is charged.
          </span>
        </div>
      </div>
    </footer>
  );
}
