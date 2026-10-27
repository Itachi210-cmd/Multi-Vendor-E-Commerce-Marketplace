import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="content-container">
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-brand-col">
            <Link to="/" className="nav-brand" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
              <div className="brand-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <span className="brand-name">Marketplace</span>
            </Link>
            <p className="footer-text">
              The multi-vendor marketplace ecosystem for independent brands and modern shoppers. Browse multiple stores, checkout in one seamless transaction.
            </p>
          </div>

          {/* Shop Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Shop</h4>
            <ul className="footer-links">
              <li><Link to="/products">All Products</Link></li>
              <li><Link to="/cart">Shopping Cart</Link></li>
              <li><Link to="/orders">My Orders</Link></li>
            </ul>
          </div>

          {/* Sell Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Sell</h4>
            <ul className="footer-links">
              <li><Link to="/become-seller">Become a Seller</Link></li>
              <li><Link to="/vendor/products">Vendor Studio</Link></li>
              <li><Link to="/vendor/earnings">Seller Earnings</Link></li>
            </ul>
          </div>

          {/* Account Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Account</h4>
            <ul className="footer-links">
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/register">Create Account</Link></li>
              <li><Link to="/orders">Track Sub-Orders</Link></li>
            </ul>
          </div>
        </div>

        {/* Tech Stack Chips */}
        <div className="footer-tech-row">
          <span className="footer-tech-label">Architecture:</span>
          <div className="stack-pills">
            <span className="stack-pill">React + Vite</span>
            <span className="stack-pill">Plain CSS</span>
            <span className="stack-pill">Node.js + Express</span>
            <span className="stack-pill">MongoDB Atlas</span>
            <span className="stack-pill">Upstash Redis</span>
            <span className="stack-pill">Elasticsearch</span>
            <span className="stack-pill">Supabase Storage (S3 API)</span>
            <span className="stack-pill">Sandbox Gateway (Route-modeled)</span>
          </div>
        </div>

        {/* Bottom Bar: Mandatory Demo Notice */}
        <div className="footer-bottom">
          <p className="footer-demo-notice">
            Demo project: payments are simulated in a test gateway, no real money is charged.
          </p>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Marketplace Platform. Multi-vendor demo.
          </p>
        </div>
      </div>
    </footer>
  );
}
