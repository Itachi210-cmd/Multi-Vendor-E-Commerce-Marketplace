import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function VendorLayout() {
  const { user } = useAuth();

  return (
    <div className="vendor-dashboard-layout">
      {/* Sidebar */}
      <aside className="vendor-sidebar">
        <div className="sidebar-header">
          <div className="brand-icon" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>V</div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Vendor Studio</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Store Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/vendor/products"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📦</span>
            <span>My Products</span>
          </NavLink>

          <NavLink
            to="/vendor/profile"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">🏪</span>
            <span>Store Profile</span>
          </NavLink>

          <NavLink
            to="/vendor/orders"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📑</span>
            <span>Orders</span>
          </NavLink>

          <NavLink
            to="/vendor/earnings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">💰</span>
            <span>Earnings & Payouts</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <Link to="/" className="sidebar-link" style={{ border: 'none' }}>
            <span>🏠</span>
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="vendor-main-content">
        <Outlet />
      </div>
    </div>
  );
}
