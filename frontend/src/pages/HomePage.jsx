import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function HomePage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/health');
      setHealthData(response.data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Unable to connect to backend API server');
      if (err.data) {
        setHealthData(err.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusBadge = (status) => {
    const norm = (status || '').toLowerCase();
    let badgeClass = 'badge-disconnected';
    if (norm === 'connected' || norm === 'ok') badgeClass = 'badge-connected';
    else if (norm === 'degraded' || norm === 'connecting') badgeClass = 'badge-degraded';

    return (
      <span className={`badge ${badgeClass}`}>
        <span className="badge-dot"></span>
        {status || 'Unknown'}
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
              <span>Phase 1</span>
              <span>•</span>
              <span>Foundation &amp; Setup Complete</span>
            </div>
            <h1 className="hero-title">
              Next-Gen <span className="gradient-text">Multi-Vendor</span> E-Commerce Marketplace
            </h1>
            <p className="hero-description">
              An enterprise marketplace architecture with seamless vendor onboarding, high-speed
              Elasticsearch discovery, Redis-backed carts, and automated Razorpay Route payment splits.
            </p>
            <div className="hero-cta">
              <button onClick={fetchHealth} className="btn btn-primary" disabled={loading}>
                {loading ? 'Pinging Services...' : 'Check Services Health'}
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="content-container">
        {/* Backend & Services Health Check Widget */}
        <section className="health-monitor">
          <div className="health-header">
            <div className="health-title-group">
              <h2>
                System Service Diagnostics
                {healthData && getStatusBadge(healthData.status)}
              </h2>
              <p>Live health status of backing databases and search cluster via <code>/api/health</code></p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {lastChecked && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Checked at {lastChecked}
                </span>
              )}
              <button
                onClick={fetchHealth}
                className="btn btn-secondary btn-sm"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>
          </div>

          {error && !healthData && (
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              <strong>Backend connection error:</strong> {error}. Ensure the Express server is running on port 5000.
            </div>
          )}

          <div className="services-grid">
            {/* MongoDB Card */}
            <div className="service-card">
              <div className="service-card-header">
                <span className="service-name">MongoDB</span>
                {getStatusBadge(healthData?.services?.mongodb?.status)}
              </div>
              <div className="service-details">
                <p>Primary document store for vendors, products, users, and orders.</p>
                <div className="service-detail-item">
                  <span>Driver</span>
                  <strong>Mongoose</strong>
                </div>
                {healthData?.services?.mongodb?.latencyMs !== undefined && (
                  <div className="service-detail-item">
                    <span>Ping Latency</span>
                    <strong>{healthData.services.mongodb.latencyMs} ms</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Redis Card */}
            <div className="service-card">
              <div className="service-card-header">
                <span className="service-name">Redis</span>
                {getStatusBadge(healthData?.services?.redis?.status)}
              </div>
              <div className="service-details">
                <p>In-memory store for high-performance carts, sessions, and rate limits.</p>
                <div className="service-detail-item">
                  <span>Driver</span>
                  <strong>ioredis</strong>
                </div>
                {healthData?.services?.redis?.latencyMs !== undefined && (
                  <div className="service-detail-item">
                    <span>Ping Latency</span>
                    <strong>{healthData.services.redis.latencyMs} ms</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Elasticsearch Card */}
            <div className="service-card">
              <div className="service-card-header">
                <span className="service-name">Elasticsearch</span>
                {getStatusBadge(healthData?.services?.elasticsearch?.status)}
              </div>
              <div className="service-details">
                <p>Distributed text search and multi-facet filtering engine.</p>
                <div className="service-detail-item">
                  <span>Driver</span>
                  <strong>@elastic/elasticsearch</strong>
                </div>
                {healthData?.services?.elasticsearch?.clusterStatus && (
                  <div className="service-detail-item">
                    <span>Cluster Status</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {healthData.services.elasticsearch.clusterStatus}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Architectural Pillars / Features */}
        <section className="features-section">
          <div className="section-header">
            <h2 className="section-title">Core Architecture Pillars</h2>
            <p className="section-subtitle">
              Strictly engineered with pure JavaScript, official client libraries, and zero bloated frameworks.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">🏪</div>
              <h3>Multi-Vendor Isolation</h3>
              <p>
                Independent vendor management with sub-order routing. Each vendor processes their own
                order items while customers enjoy a single unified checkout.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">⚡</div>
              <h3>Elasticsearch Search</h3>
              <p>
                Sub-300ms product catalog search with fuzzy matching, faceted filtering (categories,
                price ranges, ratings), and sorting.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">🚀</div>
              <h3>Redis Cart &amp; Sessions</h3>
              <p>
                Sub-50ms cart operations stored as Redis hashes with automatic 7-day TTL expiry,
                eliminating database write overhead for abandoned carts.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">💳</div>
              <h3>Razorpay Route Split</h3>
              <p>
                Automated payment splitting that credits each vendor their respective payout while
                retaining platform commission securely.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">☁️</div>
              <h3>AWS S3 Presigned Uploads</h3>
              <p>
                Direct client-to-S3 asset uploads via pre-signed URLs, preventing file upload payloads
                from consuming API server compute and memory.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">🛡️</div>
              <h3>Security &amp; Resilience</h3>
              <p>
                Equipped with Helmet security headers, CORS origin whitelisting, rate limiting, and
                graceful shutdown handling for high reliability.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
