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
            <span className="stack-pill">React SPA</span>
            <span className="stack-pill">Node.js / Express</span>
            <span className="stack-pill">MongoDB</span>
            <span className="stack-pill">Redis</span>
            <span className="stack-pill">Elasticsearch</span>
            <span className="stack-pill">AWS S3</span>
            <span className="stack-pill">Razorpay Route</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Multi-Vendor Marketplace Platform. Phase 1 Setup.</span>
          <span>Designed with Vanilla CSS &amp; Pure JavaScript</span>
        </div>
      </div>
    </footer>
  );
}
