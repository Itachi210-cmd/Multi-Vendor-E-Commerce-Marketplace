import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: '800', color: 'var(--color-primary)' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to Home
      </Link>
    </div>
  );
}
