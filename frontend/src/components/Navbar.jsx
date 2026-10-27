import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';
import api from '../api/axios';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsOpen(false);
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
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
              placeholder="Search products, brands, or vendors..."
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

        <nav className="navbar-nav desktop-only-nav">
          <ul className="nav-links">
            <li>
              <Link
                to="/"
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                className={`nav-link ${location.pathname.startsWith('/products') ? 'active' : ''}`}
              >
                Explore
              </Link>
            </li>

            {/* Customer-only Links */}
            {user?.role === 'customer' && (
              <>
                <li>
                  <Link
                    to="/orders"
                    className={`nav-link ${location.pathname.startsWith('/orders') ? 'active' : ''}`}
                  >
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link
                    to="/become-seller"
                    className={`nav-link ${location.pathname === '/become-seller' ? 'active' : ''}`}
                  >
                    Become a Seller
                  </Link>
                </li>
              </>
            )}

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

            {/* Vendor-only Links */}
            {user?.role === 'vendor' && (
              <>
                <li>
                  <Link
                    to="/vendor/products"
                    className={`nav-link ${location.pathname.startsWith('/vendor/products') ? 'active' : ''}`}
                  >
                    Products
                  </Link>
                </li>
                <li>
                  <Link
                    to="/vendor/orders"
                    className={`nav-link ${location.pathname.startsWith('/vendor/orders') ? 'active' : ''}`}
                  >
                    Orders
                  </Link>
                </li>
                <li>
                  <Link
                    to="/vendor/earnings"
                    className={`nav-link ${location.pathname.startsWith('/vendor/earnings') ? 'active' : ''}`}
                  >
                    Earnings
                  </Link>
                </li>
              </>
            )}

            {/* Admin-only Links */}
            {user?.role === 'admin' && (
              <>
                <li>
                  <Link
                    to="/admin/analytics"
                    className={`nav-link ${location.pathname.startsWith('/admin/analytics') ? 'active' : ''}`}
                  >
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/vendors"
                    className={`nav-link ${location.pathname.startsWith('/admin/vendors') ? 'active' : ''}`}
                  >
                    Approvals
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/orders"
                    className={`nav-link ${location.pathname.startsWith('/admin/orders') ? 'active' : ''}`}
                  >
                    Orders
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/coupons"
                    className={`nav-link ${location.pathname.startsWith('/admin/coupons') ? 'active' : ''}`}
                  >
                    Coupons
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/payouts"
                    className={`nav-link ${location.pathname.startsWith('/admin/payouts') ? 'active' : ''}`}
                  >
                    Payouts
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="nav-actions">
          {/* Shopping Cart Button - ONLY visible to Customers and Guests, strictly hidden for Vendors and Admins */}
          {(!user || user.role === 'customer') && (
            <Link to="/cart" className="nav-cart-btn" title="View Cart" aria-label="Cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </Link>
          )}

          <div className="desktop-auth-container">
            {isAuthenticated ? (
              <div className="user-profile-menu">
                <div className="user-avatar-pill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span className="user-name">{user?.name}</span>
                <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                  <span className="badge-dot"></span>
                  {user?.role}
                </span>
                <button
                  onClick={handleSignOut}
                  className="btn btn-secondary btn-sm"
                  title="Log out of session"
                >
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
                placeholder="Search products, brands, or vendors..."
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
              <Link to="/" className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/products" className={`mobile-nav-link ${location.pathname.startsWith('/products') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                Explore Products
              </Link>
            </li>

            {user?.role === 'customer' && (
              <>
                <li>
                  <Link to="/cart" className={`mobile-nav-link ${location.pathname === '/cart' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    Cart {totalItems > 0 && `(${totalItems})`}
                  </Link>
                </li>
                <li>
                  <Link to="/orders" className={`mobile-nav-link ${location.pathname.startsWith('/orders') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/become-seller" className={`mobile-nav-link ${location.pathname === '/become-seller' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    Become a Seller
                  </Link>
                </li>
              </>
            )}

            {!user && (
              <li>
                <Link to="/become-seller" className={`mobile-nav-link ${location.pathname === '/become-seller' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  Become a Seller
                </Link>
              </li>
            )}

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
                  <Link to="/vendor/profile" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                </li>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <li className="mobile-section-heading">Admin Management</li>
                <li>
                  <Link to="/admin/analytics" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Analytics</Link>
                </li>
                <li>
                  <Link to="/admin/vendors" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Vendor Approvals</Link>
                </li>
                <li>
                  <Link to="/admin/orders" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>All Orders</Link>
                </li>
                <li>
                  <Link to="/admin/coupons" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Coupons</Link>
                </li>
                <li>
                  <Link to="/admin/payouts" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Payouts</Link>
                </li>
              </>
            )}
          </ul>

          <div className="mobile-drawer-auth">
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
                  Sign In
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
