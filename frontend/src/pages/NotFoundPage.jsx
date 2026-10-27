import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="orders-page-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
      <div className="stitch-empty-orders-card" style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{
          fontSize: '3.5rem',
          fontFamily: 'var(--font-family-heading)',
          fontWeight: 800,
          color: 'var(--color-primary)',
          lineHeight: 1,
          marginBottom: '0.75rem'
        }}>
          404
        </div>
        <h1 className="stitch-empty-orders-title" style={{ fontSize: 'var(--font-xl)', marginBottom: '0.5rem' }}>
          Page Not Found
        </h1>
        <p className="stitch-empty-orders-desc" style={{ marginBottom: '1.75rem' }}>
          The page you are looking for does not exist, has been moved, or is temporarily unavailable.
        </p>
        <Link to="/" className="stitch-explore-btn">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
