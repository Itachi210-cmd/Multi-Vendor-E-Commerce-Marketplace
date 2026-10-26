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

  const handleFillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="brand-icon" style={{ margin: '0 auto 1rem' }}>M</div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your Multi-Vendor Marketplace account</p>
          </div>

          {error && (
            <div className="alert-box alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo helper buttons */}
          <div className="demo-credentials-box">
            <span className="demo-title">Quick Demo Logins:</span>
            <div className="demo-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('customer@example.com', 'Password@123')}
              >
                Customer
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('vendor@audio.com', 'Password@123')}
              >
                Vendor
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('admin@marketplace.com', 'Admin@123456')}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Register as Customer
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
