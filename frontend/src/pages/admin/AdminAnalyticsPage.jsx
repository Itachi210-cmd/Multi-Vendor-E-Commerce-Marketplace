import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    setData(null);
  }, [user?._id]);

  const fetchAnalytics = useCallback(async (selectedRange) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/analytics?range=${selectedRange}`);
      setData(res.data);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.response?.data?.message || 'Failed to fetch analytics');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAnalytics(range);
    }
  }, [range, fetchAnalytics, user?._id, user?.role]);

  const totals = data?.totals || {
    revenue: 0,
    commission: 0,
    orders: 0,
    averageOrderValue: 0,
    activeCustomers: 0,
    activeVendors: 0,
  };

  const dailySeries = data?.dailySeries || [];
  const statusBreakdown = data?.statusBreakdown || {};
  const topVendors = data?.topVendors || [];
  const topProducts = data?.topProducts || [];
  const lowStock = data?.lowStock || [];

  // SVG Chart Geometry Helpers
  const chartWidth = 600;
  const chartHeight = 220;
  const padding = { top: 25, right: 30, bottom: 40, left: 60 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Maximum values for scaling
  const maxRevenue = Math.max(...dailySeries.map((d) => d.revenue), 100);
  const maxOrders = Math.max(...dailySeries.map((d) => d.orders), 5);

  const getYRevenue = (val) =>
    padding.top + graphHeight - (val / maxRevenue) * graphHeight;

  const getYOrders = (val) =>
    padding.top + graphHeight - (val / maxOrders) * graphHeight;

  const getX = (idx, totalPoints) => {
    if (totalPoints <= 1) return padding.left + graphWidth / 2;
    return padding.left + (idx / (totalPoints - 1)) * graphWidth;
  };

  // Generate SVG path for revenue line
  const revenuePoints = dailySeries.map((d, i) => ({
    x: getX(i, dailySeries.length),
    y: getYRevenue(d.revenue),
    val: d.revenue,
    date: d.date,
  }));

  const revenuePathD =
    revenuePoints.length > 0
      ? revenuePoints.reduce(
          (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
          ''
        )
      : '';

  const revenueAreaD =
    revenuePoints.length > 0
      ? `${revenuePathD} L ${revenuePoints[revenuePoints.length - 1].x} ${
          padding.top + graphHeight
        } L ${revenuePoints[0].x} ${padding.top + graphHeight} Z`
      : '';

  // Calculate total suborders count for status breakdown percentages
  const totalSubOrders = Object.values(statusBreakdown).reduce(
    (sum, c) => sum + c,
    0
  );

  return (
    <div className="stitch-admin-analytics-container">
      {/* Header & Controls */}
      <div className="stitch-admin-header">
        <div>
          <span className="stitch-admin-control-badge">Marketplace Control Tower</span>
          <div className="stitch-admin-title-row">
            <h1 className="stitch-admin-title">Admin Analytics &amp; KPIs</h1>
            {data?.cached && (
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                ⚡ Redis Cached (5m)
              </span>
            )}
          </div>
          <p className="stitch-admin-subtitle">
            Aggregated revenue (minus refunds), platform commissions (excluding reversed payouts), timeseries, and product metrics.
          </p>
        </div>

        {/* Range Buttons */}
        <div className="stitch-range-selector-pill">
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`stitch-range-btn ${range === r.key ? 'active' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {loading && !data ? (
        <div className="stitch-analytics-loading">
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Calculating platform analytics from database...</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards Grid (Stitch 5-6 Cards) */}
          <div className="stitch-admin-kpi-grid">
            {/* Card 1: Net Revenue */}
            <div className="stitch-admin-kpi-card">
              <div className="stitch-kpi-top">
                <span className="stitch-kpi-label">Net Revenue</span>
                <div className="stitch-kpi-icon-wrap stitch-kpi-icon-sales">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
              </div>
              <div className="stitch-kpi-amount">
                ₹{totals.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="stitch-kpi-footer">
                <span className="stitch-kpi-badge-settled">Paid - Refunded</span>
              </div>
            </div>

            {/* Card 2: Commission Earned */}
            <div className="stitch-admin-kpi-card">
              <div className="stitch-kpi-top">
                <span className="stitch-kpi-label">Platform Commission</span>
                <div className="stitch-kpi-icon-wrap stitch-kpi-icon-commission">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="5" x2="5" y2="19"></line>
                    <circle cx="6.5" cy="6.5" r="2.5"></circle>
                    <circle cx="17.5" cy="17.5" r="2.5"></circle>
                  </svg>
                </div>
              </div>
              <div className="stitch-kpi-amount" style={{ color: 'var(--color-primary)' }}>
                ₹{totals.commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="stitch-kpi-footer">
                <span className="stitch-kpi-subtext">Retained platform split</span>
              </div>
            </div>

            {/* Card 3: Orders Count */}
            <div className="stitch-admin-kpi-card">
              <div className="stitch-kpi-top">
                <span className="stitch-kpi-label">Total Orders</span>
                <div className="stitch-kpi-icon-wrap stitch-kpi-icon-payout">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                </div>
              </div>
              <div className="stitch-kpi-amount">
                {totals.orders}
              </div>
              <div className="stitch-kpi-footer">
                <span className="stitch-kpi-subtext">Placed in {range}</span>
              </div>
            </div>

            {/* Card 4: Average Order Value */}
            <div className="stitch-admin-kpi-card">
              <div className="stitch-kpi-top">
                <span className="stitch-kpi-label">Average Order Value</span>
                <div className="stitch-kpi-icon-wrap" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
              </div>
              <div className="stitch-kpi-amount">
                ₹{totals.averageOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="stitch-kpi-footer">
                <span className="stitch-kpi-subtext">Net revenue / order count</span>
              </div>
            </div>

            {/* Card 5: Active Users & Vendors */}
            <div className="stitch-admin-kpi-card">
              <div className="stitch-kpi-top">
                <span className="stitch-kpi-label">Active Platform Users</span>
                <div className="stitch-kpi-icon-wrap" style={{ background: '#FAF5FF', color: '#9333EA' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
              </div>
              <div className="stitch-kpi-amount">
                {totals.activeCustomers} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>/ {totals.activeVendors} v</span>
              </div>
              <div className="stitch-kpi-footer">
                <span className="stitch-kpi-subtext">Shoppers / Approved Vendors</span>
              </div>
            </div>
          </div>

          {/* SVG Charts Grid (Hand-made Plain SVG/CSS) */}
          <div className="stitch-admin-charts-grid">
            {/* Chart 1: Revenue Per Day (Plain SVG Area Chart - Blue) */}
            <div className="stitch-chart-card">
              <div className="stitch-chart-card-header">
                <div>
                  <h3 className="stitch-chart-title">Revenue &amp; Growth Trajectory</h3>
                  <p className="stitch-chart-subtitle">Daily net marketplace turnover over selected timeframe</p>
                </div>
                <span className="stitch-chart-badge-primary">Net Revenue (₹)</span>
              </div>

              <div className="stitch-chart-svg-wrap">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const y = padding.top + graphHeight * (1 - pct);
                    const val = Math.round(maxRevenue * pct);
                    return (
                      <g key={pct}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          stroke="#E2E8F0"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="9"
                          fill="#64748b"
                        >
                          ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Gradient Area Fill */}
                  {revenueAreaD && (
                    <path d={revenueAreaD} fill="url(#revenueGrad)" />
                  )}

                  {/* Polyline Line (Blue #0284C7) */}
                  {revenuePathD && (
                    <path
                      d={revenuePathD}
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Points & Hover Circles */}
                  {revenuePoints.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="#ffffff"
                        stroke="#0284C7"
                        strokeWidth="2"
                        onMouseEnter={() =>
                          setHoveredPoint({ ...p, type: 'revenue' })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                        style={{ cursor: 'pointer' }}
                      />
                      {(dailySeries.length <= 10 ||
                        idx % Math.ceil(dailySeries.length / 7) === 0 ||
                        idx === dailySeries.length - 1) && (
                        <text
                          x={p.x}
                          y={chartHeight - 12}
                          textAnchor="middle"
                          fontSize="8.5"
                          fill="#64748b"
                        >
                          {p.date.slice(5)}
                        </text>
                      )}
                    </g>
                  ))}

                  {/* Tooltip */}
                  {hoveredPoint && hoveredPoint.type === 'revenue' && (
                    <g>
                      <rect
                        x={Math.max(10, Math.min(hoveredPoint.x - 45, chartWidth - 100))}
                        y={Math.max(hoveredPoint.y - 35, 5)}
                        width="90"
                        height="26"
                        rx="4"
                        fill="#0f172a"
                        opacity="0.95"
                      />
                      <text
                        x={Math.max(55, Math.min(hoveredPoint.x, chartWidth - 55))}
                        y={Math.max(hoveredPoint.y - 18, 22)}
                        textAnchor="middle"
                        fontSize="9.5"
                        fill="#ffffff"
                        fontWeight="700"
                      >
                        ₹{hoveredPoint.val.toLocaleString()}
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Chart 2: Orders Per Day (Plain SVG Bar Chart - Aqua) */}
            <div className="stitch-chart-card">
              <div className="stitch-chart-card-header">
                <div>
                  <h3 className="stitch-chart-title">Order Volume Distribution</h3>
                  <p className="stitch-chart-subtitle">Daily completed checkout frequency</p>
                </div>
                <span className="stitch-chart-badge-aqua">Orders Placed</span>
              </div>

              <div className="stitch-chart-svg-wrap">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                >
                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const y = padding.top + graphHeight * (1 - pct);
                    const val = Math.round(maxOrders * pct);
                    return (
                      <g key={pct}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          stroke="#E2E8F0"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="9"
                          fill="#94a3b8"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* SVG Bars (Aqua #06B6D4) */}
                  {dailySeries.map((d, i) => {
                    const barWidth = Math.max(
                      6,
                      Math.min(24, (graphWidth / dailySeries.length) * 0.6)
                    );
                    const x =
                      padding.left +
                      (i / Math.max(1, dailySeries.length)) * graphWidth +
                      (graphWidth / dailySeries.length - barWidth) / 2;
                    const barHeight =
                      maxOrders > 0
                        ? (d.orders / maxOrders) * graphHeight
                        : 0;
                    const y = padding.top + graphHeight - barHeight;

                    return (
                      <g key={i}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="3"
                          fill="#06B6D4"
                          opacity="0.88"
                          onMouseEnter={() =>
                            setHoveredPoint({ x: x + barWidth / 2, y, val: d.orders, date: d.date, type: 'orders' })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                          style={{ cursor: 'pointer' }}
                        />

                        {(dailySeries.length <= 10 ||
                          i % Math.ceil(dailySeries.length / 7) === 0 ||
                          i === dailySeries.length - 1) && (
                          <text
                            x={x + barWidth / 2}
                            y={chartHeight - 12}
                            textAnchor="middle"
                            fontSize="8.5"
                            fill="#64748b"
                          >
                            {d.date.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Tooltip for Orders */}
                  {hoveredPoint && hoveredPoint.type === 'orders' && (
                    <g>
                      <rect
                        x={Math.max(10, Math.min(hoveredPoint.x - 35, chartWidth - 80))}
                        y={Math.max(hoveredPoint.y - 32, 5)}
                        width="70"
                        height="24"
                        rx="4"
                        fill="#0f172a"
                        opacity="0.95"
                      />
                      <text
                        x={Math.max(45, Math.min(hoveredPoint.x, chartWidth - 45))}
                        y={Math.max(hoveredPoint.y - 16, 20)}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#ffffff"
                        fontWeight="700"
                      >
                        {hoveredPoint.val} orders
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>

          {/* SubOrder Status Breakdown Bar */}
          <div className="stitch-admin-status-card">
            <h3 className="stitch-chart-title">Sub-Order Fulfillment Status Breakdown</h3>
            <p className="stitch-chart-subtitle" style={{ marginBottom: '1.25rem' }}>
              Tracks progress across vendor fulfillment lifecycles ({totalSubOrders} total sub-orders)
            </p>

            {/* Stacked Multi-Color Progress Bar */}
            <div className="stitch-status-stacked-bar">
              {[
                { key: 'placed', label: 'Placed', color: '#64748b' },
                { key: 'packed', label: 'Packed', color: '#0284c7' },
                { key: 'shipped', label: 'Shipped', color: '#06b6d4' },
                { key: 'delivered', label: 'Delivered', color: '#10b981' },
                { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
              ].map((st) => {
                const count = statusBreakdown[st.key] || 0;
                const pct = totalSubOrders > 0 ? (count / totalSubOrders) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={st.key}
                    style={{
                      width: `${pct}%`,
                      background: st.color,
                      transition: 'width 0.3s ease',
                    }}
                    title={`${st.label}: ${count} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Status Legend & Counts */}
            <div className="stitch-status-legend-row">
              {[
                { key: 'placed', label: 'Placed', color: '#64748b' },
                { key: 'packed', label: 'Packed', color: '#0284c7' },
                { key: 'shipped', label: 'Shipped', color: '#06b6d4' },
                { key: 'delivered', label: 'Delivered', color: '#10b981' },
                { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
              ].map((st) => (
                <div key={st.key} className="stitch-legend-item">
                  <div className="stitch-legend-dot" style={{ background: st.color }} />
                  <span className="stitch-legend-label">{st.label}:</span>
                  <span className="stitch-legend-val">{statusBreakdown[st.key] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Vendors & Top Products Tables Grid */}
          <div className="stitch-top-metrics-grid">
            {/* Top 5 Vendors */}
            <div className="stitch-payouts-table-card">
              <div className="stitch-payouts-card-header">
                <div>
                  <h3 className="stitch-payouts-title">Top Vendors by Revenue</h3>
                  <p className="stitch-payouts-desc">Highest marketplace sales volume</p>
                </div>
              </div>
              {topVendors.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                  No vendor sales recorded in this range.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="stitch-payouts-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Store Name</th>
                        <th className="align-right">Revenue</th>
                        <th className="align-right">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topVendors.map((v, i) => (
                        <tr key={v.vendorId}>
                          <td style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                            🏪 {v.storeName}
                          </td>
                          <td className="align-right" style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                            ₹{v.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="align-right" style={{ color: 'var(--color-text-muted)' }}>
                            {v.orderCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top 5 Products */}
            <div className="stitch-payouts-table-card">
              <div className="stitch-payouts-card-header">
                <div>
                  <h3 className="stitch-payouts-title">Top Products by Units</h3>
                  <p className="stitch-payouts-desc">Most purchased catalog items</p>
                </div>
              </div>
              {topProducts.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                  No product sales recorded in this range.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="stitch-payouts-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product Title</th>
                        <th className="align-right">Units</th>
                        <th className="align-right">Gross</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, i) => (
                        <tr key={p.productId}>
                          <td style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title}
                          </td>
                          <td className="align-right" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                            {p.unitsSold}
                          </td>
                          <td className="align-right" style={{ color: 'var(--color-text)' }}>
                            ₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Alert Section */}
          <div className="stitch-payouts-table-card">
            <div className="stitch-payouts-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>
                  <h3 className="stitch-payouts-title">Low Stock Inventory Alerts (Stock ≤ 5 units)</h3>
                  <p className="stitch-payouts-desc">Real-time warning for items nearing stock depletion</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {lowStock.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <span>✓</span>
                  <span>All active products maintain healthy stock levels above 5 units.</span>
                </div>
              ) : (
                <div className="stitch-low-stock-grid">
                  {lowStock.map((item) => (
                    <div key={item._id} className="stitch-low-stock-card">
                      <div>
                        <div className="stitch-low-stock-title">{item.title}</div>
                        <div className="stitch-low-stock-meta">
                          🏪 {item.storeName} • {item.category} • ₹{item.price.toLocaleString()}
                        </div>
                      </div>
                      <span className="badge badge-danger">
                        {item.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
