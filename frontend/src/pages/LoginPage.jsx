import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getRoleHome, isRouteAllowedForRole } from '../utils/roleUtils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await login(email, password);
      const userRole = data?.user?.role;

      // Extract candidate redirect from location.state or sessionStorage
      const candidatePath =
        location.state?.from?.pathname ||
        sessionStorage.getItem('post_login_redirect') ||
        null;

      // Clear the stored redirect immediately after reading
      sessionStorage.removeItem('post_login_redirect');

      // Determine destination: candidate is used ONLY if permitted for the logged-in role
      let destination;
      if (candidatePath && isRouteAllowedForRole(candidatePath, userRole)) {
        destination = candidatePath;
      } else {
        destination = getRoleHome(userRole);
      }

      // Navigate and wipe history state to prevent redirect leakage
      navigate(destination, { replace: true, state: {} });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="stitch-auth-card">
          <div className="stitch-auth-header">
            <div className="stitch-brand-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h1 className="stitch-auth-title">Welcome Back</h1>
            <p className="stitch-auth-subtitle">Sign in to your Multi-Vendor Marketplace account</p>
          </div>

          {error && (
            <div className="stitch-checkout-error-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="stitch-auth-form" noValidate>
            <div className="stitch-form-group">
              <label htmlFor="login-email" className="stitch-form-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="stitch-form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>

            <div className="stitch-form-group">
              <label htmlFor="login-password" className="stitch-form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="stitch-form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="stitch-auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="stitch-auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="stitch-auth-link">
                Register as Customer
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
