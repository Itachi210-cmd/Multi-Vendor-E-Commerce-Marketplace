import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';

export default function VendorLayout() {
  return (
    <div className="stitch-ecosystem-layout">
      {/* Sidebar (Desktop) / Sticky Top Tab Bar (Mobile/Tablet < 900px) */}
      <aside className="stitch-ecosystem-sidebar">
        <div className="stitch-sidebar-header">
          <div className="stitch-sidebar-brand-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div className="stitch-sidebar-title-block">
            <h3 className="stitch-sidebar-hub-title">Vendor Hub</h3>
            <span className="stitch-sidebar-hub-sub">Store Management</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="stitch-sidebar-nav">
          <NavLink
            to="/vendor/products"
            className={({ isActive }) =>
              `stitch-sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="stitch-sidebar-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </span>
            <span className="stitch-sidebar-item-label">Products</span>
          </NavLink>

          <NavLink
            to="/vendor/orders"
            className={({ isActive }) =>
              `stitch-sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="stitch-sidebar-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </span>
            <span className="stitch-sidebar-item-label">Orders</span>
          </NavLink>

          <NavLink
            to="/vendor/earnings"
            className={({ isActive }) =>
              `stitch-sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="stitch-sidebar-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </span>
            <span className="stitch-sidebar-item-label">Earnings &amp; Payouts</span>
          </NavLink>

          <NavLink
            to="/vendor/profile"
            className={({ isActive }) =>
              `stitch-sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="stitch-sidebar-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <span className="stitch-sidebar-item-label">Store Profile</span>
          </NavLink>
        </nav>

        {/* Back Link Footer */}
        <div className="stitch-sidebar-footer">
          <Link to="/" className="stitch-sidebar-back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="stitch-ecosystem-content">
        <Outlet />
      </main>
    </div>
  );
}
