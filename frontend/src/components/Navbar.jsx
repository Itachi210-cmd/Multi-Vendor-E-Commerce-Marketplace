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

  // Search input and suggestions state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);

  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

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
        setSuggestions([]);
        setIsOpen(false);
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
          <span className="brand-tag">Phase 5</span>
        </Link>

        {/* Global Navbar Autocomplete Search Bar */}
        <div className="navbar-search-wrapper" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="navbar-search-form" role="search">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="navbar-search-input"
              placeholder="Search products, brands, categories..."
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
            <button type="submit" className="search-submit-btn">
              Search
            </button>
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
                  <span className="suggestion-icon">⚡</span>
                  <span className="suggestion-text">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav className="navbar-nav">
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

            {/* Customer specific links */}
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

            {/* Vendor specific links */}
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

            {/* Admin specific links */}
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
                    to="/admin/coupons"
                    className={`nav-link ${location.pathname.startsWith('/admin/coupons') ? 'active' : ''}`}
                  >
                    Coupons
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/vendors"
                    className={`nav-link ${location.pathname.startsWith('/admin/vendors') ? 'active' : ''}`}
                  >
                    Vendor Approvals
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/orders"
                    className={`nav-link ${location.pathname.startsWith('/admin/orders') ? 'active' : ''}`}
                  >
                    All Orders
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
          {/* Shopping Cart Button */}
          {(!user || user.role === 'customer') && (
            <Link to="/cart" className="nav-cart-btn" title="View Cart">
              <span className="cart-icon">🛒</span>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </Link>
          )}

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
