import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'badge-danger';
      case 'vendor':
        return 'badge-degraded';
      default:
        return 'badge-connected';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="nav-brand">
          <div className="brand-icon">M</div>
          <span className="brand-name">Marketplace</span>
          <span className="brand-tag">Phase 3</span>
        </Link>

        <nav>
          <ul className="nav-links">
            <li>
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                className={`nav-link ${location.pathname.startsWith('/products') ? 'active' : ''}`}
              >
                Products
              </Link>
            </li>

            {/* Role specific quick links */}
            {user?.role === 'customer' && (
              <li>
                <Link
                  to="/become-seller"
                  className={`nav-link ${location.pathname === '/become-seller' ? 'active' : ''}`}
                >
                  Become a Seller
                </Link>
              </li>
            )}

            {user?.role === 'vendor' && (
              <li>
                <Link
                  to="/vendor/products"
                  className={`nav-link ${location.pathname.startsWith('/vendor') ? 'active' : ''}`}
                >
                  Vendor Studio
                </Link>
              </li>
            )}

            {user?.role === 'admin' && (
              <li>
                <Link
                  to="/admin/vendors"
                  className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                >
                  Vendor Approvals
                </Link>
              </li>
            )}

            <li>
              <Link
                to="/rbac-demo"
                className={`nav-link ${location.pathname === '/rbac-demo' ? 'active' : ''}`}
              >
                RBAC Sandbox
              </Link>
            </li>
          </ul>
        </nav>

        <div className="nav-actions">
          {isAuthenticated ? (
            <div className="user-profile-menu">
              <span className="user-name">{user?.name}</span>
              <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                <span className="badge-dot"></span>
                {user?.role}
              </span>
              <button onClick={logout} className="btn btn-secondary btn-sm" title="Log out of session">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
