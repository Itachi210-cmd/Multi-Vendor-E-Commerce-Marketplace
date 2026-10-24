import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function RequireRole({ roles = [], children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner"></div>
        <p>Verifying role authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div className="content-container" style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div className="auth-card" style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--color-danger)' }}>
            403 - Access Denied
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Your account role is <strong>{user?.role}</strong>, but access to this section requires one of the
            following roles: <strong>{roles.join(', ')}</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/" className="btn btn-primary btn-sm">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
