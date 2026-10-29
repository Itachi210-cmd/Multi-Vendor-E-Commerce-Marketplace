import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';
import useTheme from '../hooks/useTheme';
import api from '../api/axios';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const userDropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Close mobile drawer and user dropdown on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Sync input with URL search param if changed externally
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  // Debounced autocomplete suggestions (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoadingSuggest(false);
      return;
    }

    setIsLoadingSuggest(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await api.get(`/products/suggest?q=${encodeURIComponent(trimmed)}`);
        const results = response.data?.suggestions || [];
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        if (!err?.isCanceled) {
          setSuggestions([]);
          setIsOpen(false);
        }
      } finally {
        setIsLoadingSuggest(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Close suggestions and user dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle keyboard navigation for search suggestions (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e) => {
    if (!isOpen && e.key !== 'Enter') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelectSuggestion = (suggestionTitle) => {
    setSearchTerm(suggestionTitle);
    setIsOpen(false);
    navigate(`/products?q=${encodeURIComponent(suggestionTitle)}`);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsOpen(false);
    const query = searchTerm.trim();
    if (query) {
      navigate(`/products?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/products');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    clearSearch();
    setUserDropdownOpen(false);
    await logout();
    navigate('/login', { replace: true, state: {} });
  };

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
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <span className="brand-name">Marketplace</span>
        </Link>

        {/* Global Navbar Autocomplete Search Bar */}
        <div className="navbar-search-wrapper desktop-only-search" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="navbar-search-form" role="search">
            <span className="search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="navbar-search-input"
              placeholder="Search products"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-label="Search catalog"
              aria-expanded={isOpen}
              aria-autocomplete="list"
            />
            {isLoadingSuggest && <span className="search-spinner-sm" aria-label="Loading suggestions"></span>}
            {searchTerm && !isLoadingSuggest && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={clearSearch}
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <ul className="navbar-suggestions-dropdown" role="listbox">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`suggestion-item ${index === selectedIndex ? 'active' : ''}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <span className="suggestion-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>
                  <span className="suggestion-text">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Desktop Navbar Links */}
        <nav className="navbar-nav desktop-only-nav">
          <ul className="nav-links">
            <li>
              <Link
                to="/products"
                className={`nav-link ${location.pathname.startsWith('/products') ? 'active' : ''}`}
              >
                Products
              </Link>
            </li>

            {/* Guest Links */}
            {!user && (
              <li>
                <Link
                  to="/become-seller"
                  className={`nav-link ${location.pathname === '/become-seller' ? 'active' : ''}`}
                >
                  Become a Seller
                </Link>
              </li>
            )}

            {/* Customer Links */}
            {user?.role === 'customer' && (
              <li>
                <Link
                  to="/orders"
                  className={`nav-link ${location.pathname.startsWith('/orders') ? 'active' : ''}`}
                >
                  My Orders
                </Link>
              </li>
            )}

            {/* Vendor Links */}
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

            {/* Admin Links */}
            {user?.role === 'admin' && (
              <li>
                <Link
                  to="/admin/analytics"
                  className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                >
                  Admin Panel
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="nav-actions">
          {/* Shopping Cart Button - ONLY visible to Customers, hidden for Guests, Vendors and Admins */}
          {user?.role === 'customer' && (
            <Link to="/cart" className="nav-cart-btn" title="View Cart" aria-label="Cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </Link>
          )}

          {/* Theme Toggle Button (Desktop) */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Desktop Auth / User Dropdown Container */}
          <div className="desktop-auth-container">
            {isAuthenticated ? (
              <div className="user-dropdown-wrapper" ref={userDropdownRef}>
                <button
                  type="button"
                  className="user-dropdown-btn"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  aria-label="User account menu"
                >
                  <div className="user-avatar-pill">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className="user-name" title={user?.name}>{user?.name}</span>
                  <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                    <span className="badge-dot"></span>
                    {user?.role}
                  </span>
                  <svg className={`dropdown-chevron ${userDropdownOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {userDropdownOpen && (
                  <div className="user-dropdown-menu" role="menu">
                    <div className="dropdown-user-header">
                      <div className="dropdown-user-name">{user?.name}</div>
                      <div className="dropdown-user-email">{user?.email}</div>
                    </div>

                    <div className="dropdown-divider" />

                    {/* Role-specific items */}
                    {user?.role === 'vendor' && (
                      <div className="dropdown-group" role="group" aria-label="Vendor Studio">
                        <Link to="/vendor/products" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </svg>
                          <span>Products</span>
                        </Link>
                        <Link to="/vendor/orders" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                          </svg>
                          <span>Orders</span>
                        </Link>
                        <Link to="/vendor/earnings" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          <span>Earnings</span>
                        </Link>
                        <Link to="/vendor/profile" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <span>Store profile</span>
                        </Link>
                      </div>
                    )}

                    {user?.role === 'admin' && (
                      <div className="dropdown-group" role="group" aria-label="Admin Panel">
                        <Link to="/admin/analytics" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                          </svg>
                          <span>Analytics</span>
                        </Link>
                        <Link to="/admin/vendors" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <polyline points="17 11 19 13 23 9" />
                          </svg>
                          <span>Vendor approvals</span>
                        </Link>
                        <Link to="/admin/coupons" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <line x1="7" y1="8" x2="17" y2="8" />
                            <line x1="7" y1="12" x2="17" y2="12" />
                            <line x1="7" y1="16" x2="12" y2="16" />
                          </svg>
                          <span>Coupons</span>
                        </Link>
                        <Link to="/admin/orders" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                          </svg>
                          <span>All orders</span>
                        </Link>
                        <Link to="/admin/payouts" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                          </svg>
                          <span>Payouts</span>
                        </Link>
                      </div>
                    )}

                    {user?.role === 'customer' && (
                      <div className="dropdown-group" role="group" aria-label="Customer Account">
                        <Link to="/orders" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                          </svg>
                          <span>My Orders</span>
                        </Link>
                        <Link to="/become-seller" className="dropdown-item" role="menuitem" onClick={() => setUserDropdownOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <span>Become a Seller</span>
                        </Link>
                      </div>
                    )}

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      className="dropdown-item dropdown-item-signout"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-buttons-group">
                <Link to="/login" className="btn btn-secondary btn-sm">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu toggle (<1100px) */}
          <button
            type="button"
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (<1100px) */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer" ref={mobileMenuRef}>
          {/* Mobile Search */}
          <div className="mobile-search-box">
            <form onSubmit={(e) => { handleSearchSubmit(e); setMobileMenuOpen(false); }} className="navbar-search-form" role="search">
              <span className="search-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="navbar-search-input"
                placeholder="Search products"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
              />
              {searchTerm && (
                <button type="button" className="search-clear-btn" onClick={clearSearch}>✕</button>
              )}
            </form>
          </div>

          <ul className="mobile-nav-links">
            <li>
              <Link to="/products" className={`mobile-nav-link ${location.pathname.startsWith('/products') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                Products
              </Link>
            </li>

            {/* Guest Mobile Links */}
            {!user && (
              <li>
                <Link to="/become-seller" className={`mobile-nav-link ${location.pathname === '/become-seller' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  Become a Seller
                </Link>
              </li>
            )}

            {/* Customer Mobile Links */}
            {user?.role === 'customer' && (
              <>
                <li>
                  <Link to="/orders" className={`mobile-nav-link ${location.pathname.startsWith('/orders') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className={`mobile-nav-link ${location.pathname === '/cart' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    Cart {totalItems > 0 && `(${totalItems})`}
                  </Link>
                </li>
                <li>
                  <Link to="/become-seller" className={`mobile-nav-link ${location.pathname === '/become-seller' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    Become a Seller
                  </Link>
                </li>
              </>
            )}

            {/* Vendor Mobile Links */}
            {user?.role === 'vendor' && (
              <>
                <li className="mobile-section-heading">Vendor Studio</li>
                <li>
                  <Link to="/vendor/products" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Products</Link>
                </li>
                <li>
                  <Link to="/vendor/orders" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Orders</Link>
                </li>
                <li>
                  <Link to="/vendor/earnings" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Earnings</Link>
                </li>
                <li>
                  <Link to="/vendor/profile" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Store profile</Link>
                </li>
              </>
            )}

            {/* Admin Mobile Links */}
            {user?.role === 'admin' && (
              <>
                <li className="mobile-section-heading">Admin Panel</li>
                <li>
                  <Link to="/admin/analytics" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Analytics</Link>
                </li>
                <li>
                  <Link to="/admin/vendors" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Vendor approvals</Link>
                </li>
                <li>
                  <Link to="/admin/coupons" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Coupons</Link>
                </li>
                <li>
                  <Link to="/admin/orders" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>All orders</Link>
                </li>
                <li>
                  <Link to="/admin/payouts" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Payouts</Link>
                </li>
              </>
            )}
          </ul>

          <div className="mobile-drawer-auth">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0 0.85rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Theme</span>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={theme === 'dark'}
              >
                {theme === 'dark' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
            </div>
            {isAuthenticated ? (
              <div className="mobile-user-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700 }}>{user?.name}</span>
                  <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                    <span className="badge-dot"></span>
                    {user?.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  className="btn btn-secondary btn-full btn-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Link to="/login" className="btn btn-secondary btn-sm" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMobileMenuOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
