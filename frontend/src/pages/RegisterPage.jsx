import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h1 className="stitch-auth-title">Create an Account</h1>
            <p className="stitch-auth-subtitle">Join the multi-vendor marketplace as a customer</p>
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
              <label htmlFor="register-name" className="stitch-form-label">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                className="stitch-form-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="name"
              />
            </div>

            <div className="stitch-form-group">
              <label htmlFor="register-email" className="stitch-form-label">
                Email Address
              </label>
              <input
                id="register-email"
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
              <label htmlFor="register-password" className="stitch-form-label">
                Password (min. 8 characters)
              </label>
              <input
                id="register-password"
                type="password"
                className="stitch-form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>

            <div className="stitch-form-group">
              <label htmlFor="register-confirm-password" className="stitch-form-label">
                Confirm Password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                className="stitch-form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>

            <div className="stitch-role-notice-card">
              <div className="stitch-role-badge-row">
                <span className="stitch-status-badge paid">Role: Customer</span>
              </div>
              <p>Registration grants Customer shopping access. Vendor stores require a separate seller application.</p>
            </div>

            <button type="submit" className="stitch-auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Register as Customer'}
            </button>
          </form>

          <div className="stitch-auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="stitch-auth-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
