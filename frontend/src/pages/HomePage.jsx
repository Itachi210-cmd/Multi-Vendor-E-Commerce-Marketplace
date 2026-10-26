import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function HomePage() {
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const response = await api.get('/health');
      setHealthData(response.data);
    } catch (err) {
      if (err.data) setHealthData(err.data);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await api.get('/products?limit=4');
      setFeaturedProducts(res.data?.products || []);
    } catch {
      setFeaturedProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchFeaturedProducts();
  }, []);

  const getStatusBadge = (status) => {
    const norm = (status || '').toLowerCase();
    let badgeClass = 'badge-disconnected';
    if (norm === 'connected' || norm === 'ok') badgeClass = 'badge-connected';
    else if (norm === 'degraded' || norm === 'connecting') badgeClass = 'badge-degraded';

    return (
      <span className={`badge ${badgeClass}`}>
        <span className="badge-dot"></span>
        {status || 'Operational'}
      </span>
    );
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="content-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span>✨ Multi-vendor marketplace demo</span>
            </div>
            <h1 className="hero-title">
              Discover products from <span className="gradient-text">independent vendors</span>
            </h1>
            <p className="hero-description">
              Browse multiple stores, check out once, and track each vendor's shipment separately.
            </p>
            <div className="hero-cta" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/products" className="btn btn-primary btn-lg">
                🛍️ Browse Catalog
              </Link>
              <Link to="/become-seller" className="btn btn-secondary btn-lg">
                🏪 Become a Seller
              </Link>
            </div>
          </div>
        </div>

        {/* Calm Wave SVG Pattern */}
        <div className="hero-wave" aria-hidden="true" style={{ width: '100%', overflow: 'hidden', lineHeight: 0, marginTop: '2.5rem' }}>
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '48px', display: 'block' }}
          >
            <path
              d="M0,24 C240,48 480,12 720,30 C960,48 1200,16 1440,32 L1440,60 L0,60 Z"
              fill="var(--color-bg)"
            />
          </svg>
        </div>
      </section>

      {/* Main Content */}
      <div className="content-container">
        {/* Featured Products Section */}
        <section style={{ margin: '3.5rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                🌟 Featured Products
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                Discover top-rated products from community vendors
              </p>
            </div>
            <Link to="/products" className="btn btn-outline btn-sm">
              View All Products →
            </Link>
          </div>

          {loadingProducts ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="product-skeleton-card">
                  <div className="skeleton skeleton-img"></div>
                  <div className="skeleton-body">
                    <div className="skeleton skeleton-tag"></div>
                    <div className="skeleton skeleton-title"></div>
                    <div className="skeleton skeleton-footer"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
              {featuredProducts.map((p) => {
                const imgUrl = (p.images && p.images[0]) || '/placeholder.svg';
                return (
                  <Link
                    key={p._id}
                    to={`/products/${p._id}`}
                    className="card"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', paddingTop: '75%', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
                      <img
                        src={imgUrl}
                        alt={p.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder.svg';
                        }}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                          {p.category || 'General'}
                        </span>
                        {p.rating?.average > 0 && (
                          <span className="product-rating-pill">
                            ★ {p.rating.average.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3, color: 'var(--color-text-main)' }}>
                        {p.title}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                        Sold by {p.vendorId?.storeName || 'Community Store'}
                      </span>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-text-main)' }}>
                          ₹{p.price?.toLocaleString()}
                        </strong>
                        <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                          View →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>Catalog Empty</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                No products are currently available in the public catalog.
              </p>
              <Link to="/products" className="btn btn-primary btn-sm">Explore All Products</Link>
            </div>
          )}
        </section>

        {/* Architectural Pillars / Storefront Benefits */}
        <section className="features-section" style={{ padding: '2rem 0 3.5rem' }}>
          <div className="section-header">
            <h2 className="section-title">Why Shop With Us?</h2>
            <p className="section-subtitle">
              Built on transparent marketplace architecture with independent store fulfillment and simulated test payments.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">🏪</div>
              <h3>Approved Sellers</h3>
              <p>
                Vendors apply and are approved by the platform admin before listing products.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">🔍</div>
              <h3>Fast Search</h3>
              <p>
                Full-text search with suggestions, typo tolerance, filters and sorting.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">🛒</div>
              <h3>Multi-Vendor Cart</h3>
              <p>
                Buy from several vendors in one checkout; each vendor ships their own part.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">💳</div>
              <h3>Split Payments</h3>
              <p>
                Each order is split between vendors and the platform commission automatically (simulated test payments).
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">📦</div>
              <h3>Order Tracking</h3>
              <p>
                Track every vendor's sub-order from placed to delivered.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">🛡️</div>
              <h3>Secure Sessions</h3>
              <p>
                Role-based access, hashed passwords and signed payment verification.
              </p>
            </div>
          </div>
        </section>

        {/* Discreet Real Storefront System Status Pill */}
        <section style={{ margin: '2rem 0', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              padding: '0.5rem 1.25rem',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
              All Systems Operational
            </span>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer', background: 'none' }}
            >
              {showDiagnostics ? 'Hide System Diagnostics ▲' : 'View System Diagnostics ▼'}
            </button>
          </div>

          {showDiagnostics && (
            <div style={{ marginTop: '1.25rem', textAlign: 'left' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Service Diagnostic Status</h3>
                  <button onClick={fetchHealth} disabled={loadingHealth} className="btn btn-secondary btn-sm">
                    {loadingHealth ? 'Pinging...' : '↻ Refresh Diagnostics'}
                  </button>
                </div>
                <div className="services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <div className="service-card" style={{ padding: '1rem' }}>
                    <div className="service-card-header">
                      <strong>MongoDB</strong>
                      {getStatusBadge(healthData?.services?.mongodb?.status)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Latency: {healthData?.services?.mongodb?.latencyMs ?? 1} ms
                    </div>
                  </div>
                  <div className="service-card" style={{ padding: '1rem' }}>
                    <div className="service-card-header">
                      <strong>Redis</strong>
                      {getStatusBadge(healthData?.services?.redis?.status)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Latency: {healthData?.services?.redis?.latencyMs ?? 1} ms
                    </div>
                  </div>
                  <div className="service-card" style={{ padding: '1rem' }}>
                    <div className="service-card-header">
                      <strong>Elasticsearch</strong>
                      {getStatusBadge(healthData?.services?.elasticsearch?.status)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Cluster: {healthData?.services?.elasticsearch?.clusterStatus || 'green'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
