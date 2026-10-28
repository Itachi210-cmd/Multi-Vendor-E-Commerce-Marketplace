import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState(null);

  const fetchFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      setErrorProducts(null);
      const res = await api.get('/products?limit=4');
      setFeaturedProducts(res.data?.products || []);
    } catch (err) {
      if (err?.isCanceled) return;
      setErrorProducts(err?.response?.data?.message || err?.message || 'Failed to load featured products');
      setFeaturedProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section: Left Text + Right 2x2 Grid */}
      <section className="stitch-hero-section">
        <div className="hero-decor-blob-1" aria-hidden="true" />
        <div className="hero-decor-blob-2" aria-hidden="true" />

        <div className="content-container">
          <div className="stitch-hero-grid">
            {/* Left Column: Heading, Subtitle, CTA buttons, feature micro-checks */}
            <div className="stitch-hero-left">
              <div className="stitch-hero-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>Multi-vendor marketplace demo</span>
              </div>

              <h1 className="stitch-hero-title">
                Discover products from <span className="stitch-gradient-text">independent vendors</span>
              </h1>

              <p className="stitch-hero-desc">
                Browse multiple stores, check out once, and track each vendor's shipment separately. Experience seamless multi-vendor commerce.
              </p>

              <div className="stitch-hero-actions">
                <Link to="/products" className="btn btn-primary btn-lg">
                  Browse products
                </Link>
                <Link to="/become-seller" className="btn btn-secondary btn-lg">
                  Become a seller
                </Link>
              </div>

              <div className="stitch-hero-trust-row">
                <div className="stitch-trust-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Many stores, one cart</span>
                </div>
                <div className="stitch-trust-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>Track every shipment</span>
                </div>
                <div className="stitch-trust-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Simple checkout</span>
                </div>
              </div>
            </div>

            {/* Right Column: 2x2 Product Cards from API */}
            <div className="stitch-hero-right">
              {loadingProducts ? (
                <div className="stitch-hero-products-grid">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="stitch-hero-skeleton-card">
                      <div className="skeleton stitch-skeleton-img" />
                      <div className="stitch-skeleton-content">
                        <div className="skeleton stitch-skeleton-line short" />
                        <div className="skeleton stitch-skeleton-line" />
                        <div className="skeleton stitch-skeleton-line price" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : errorProducts ? (
                <div className="stitch-product-empty-card">
                  <div className="stitch-empty-icon" style={{ color: 'var(--color-danger)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <h3>Unable to load products</h3>
                  <p>{errorProducts}</p>
                  <button type="button" onClick={fetchFeaturedProducts} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Retry
                  </button>
                </div>
              ) : featuredProducts.length > 0 ? (
                <div className="stitch-hero-products-grid">
                  {featuredProducts.slice(0, 4).map((p) => {
                    const imgUrl = (p.images && p.images[0]) || '/placeholder.svg';
                    return (
                      <Link
                        key={p._id}
                        to={`/products/${p._id}`}
                        className="stitch-product-card"
                      >
                        <div className="stitch-card-img-wrap">
                          <img
                            src={imgUrl}
                            alt={p.title}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.svg';
                            }}
                            className="stitch-card-img"
                          />
                          <span className="stitch-card-category">
                            {p.category || 'General'}
                          </span>
                        </div>
                        <div className="stitch-card-body">
                          <span className="stitch-card-vendor">
                            {p.vendorId?.storeName || 'Community Store'}
                          </span>
                          <h3 className="stitch-card-title" title={p.title}>
                            {p.title}
                          </h3>
                          <div className="stitch-card-footer">
                            <span className="stitch-card-price">
                              ₹{p.price?.toLocaleString()}
                            </span>
                            <span className="stitch-card-action-btn" aria-hidden="true">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="stitch-product-empty-card">
                  <div className="stitch-empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <h3>No products yet</h3>
                  <p>Discover products once community stores list items.</p>
                  <Link to="/products" className="btn btn-primary btn-sm">
                    Explore Catalog
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits and Revenue Split Section */}
      <section className="stitch-benefits-section">
        <div className="content-container">
          <div className="stitch-section-heading">
            <span className="stitch-section-eyebrow">Ecosystem Overview</span>
            <h2 className="stitch-section-title">
              Built for customers, vendors and the platform
            </h2>
            <p className="stitch-section-subtitle">
              Everyone gets a clear share and optimized workflows designed for scale.
            </p>
          </div>

          {/* 3 Ecosystem Pillar Cards */}
          <div className="stitch-pillars-grid">
            {/* Customer Card */}
            <div className="stitch-pillar-card">
              <div>
                <div className="stitch-pillar-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <h3 className="stitch-pillar-title">For Customers</h3>
                <ul className="stitch-pillar-list">
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Buy from many stores in one checkout</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Search with filters, sorting & suggestions</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Track each vendor's shipment separately</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Coupons and downloadable PDF invoices</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Vendor Card */}
            <div className="stitch-pillar-card">
              <div>
                <div className="stitch-pillar-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <h3 className="stitch-pillar-title">For Vendors</h3>
                <ul className="stitch-pillar-list">
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Open your own store after quick approval</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>List products with multiple direct image uploads</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Manage orders from placed to delivered</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Keep default 90% of every sale (10% platform fee; admin can set custom commission per vendor)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Platform Card */}
            <div className="stitch-pillar-card">
              <div>
                <div className="stitch-pillar-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                  </svg>
                </div>
                <h3 className="stitch-pillar-title">For the Platform</h3>
                <ul className="stitch-pillar-list">
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Retains platform commission on each vendor sale (default 10%, configurable per vendor)</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Approves vendors and manages platform coupons</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Real-time revenue, commission, and order analytics</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Automated simulated vendor transfers (modeled on Razorpay Route)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Revenue Split Graphic Box */}
          <div className="stitch-split-box">
            <div className="stitch-split-header">
              <h4 className="stitch-split-title">How a ₹1,000 sale is split</h4>
              <p className="stitch-split-sub">
                Transparent automated disbursement per transaction (default 10% platform commission, configurable per vendor by admin)
              </p>
            </div>

            {/* Stacked Percentage Bar Graphic */}
            <div className="stitch-split-bar-wrap">
              <div className="stitch-split-bar">
                <div className="stitch-bar-vendor" style={{ width: '90%' }}>
                  <span>Vendor receives ₹900 (90%)</span>
                </div>
                <div className="stitch-bar-platform" style={{ width: '10%' }}>
                  <span>₹100 (10%)</span>
                </div>
              </div>
              <div className="stitch-split-legend">
                <span className="stitch-legend-item">
                  <span className="stitch-legend-color vendor-color" />
                  Vendor Payout (Default 90%)
                </span>
                <span className="stitch-legend-item">
                  <span className="stitch-legend-color platform-color" />
                  Platform Commission (Default 10%, adjustable per vendor)
                </span>
              </div>
            </div>

            {/* Multi-Vendor Cart Split Example */}
            <div className="stitch-multivendor-cart-example">
              <span className="stitch-cart-example-title">
                Cart with two vendors (₹600 + ₹400 = ₹1,000 Total Checkout)
              </span>
              <div className="stitch-cart-vendors-grid">
                <div className="stitch-vendor-split-card">
                  <div className="stitch-vendor-split-top">
                    <span className="stitch-vendor-name">Store A: Aura Tech Hub</span>
                    <span className="stitch-vendor-amount">₹600</span>
                  </div>
                  <div className="stitch-mini-bar">
                    <div className="stitch-mini-vendor" style={{ width: '90%' }} />
                    <div className="stitch-mini-platform" style={{ width: '10%' }} />
                  </div>
                  <span className="stitch-vendor-breakdown">Vendor gets ₹540 | Platform gets ₹60</span>
                </div>

                <div className="stitch-vendor-split-card">
                  <div className="stitch-vendor-split-top">
                    <span className="stitch-vendor-name">Store B: Urban Threads</span>
                    <span className="stitch-vendor-amount">₹400</span>
                  </div>
                  <div className="stitch-mini-bar">
                    <div className="stitch-mini-vendor" style={{ width: '90%' }} />
                    <div className="stitch-mini-platform" style={{ width: '10%' }} />
                  </div>
                  <span className="stitch-vendor-breakdown">Vendor gets ₹360 | Platform gets ₹40</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
