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
    <div className="content-container" style={{ padding: '3rem 1.5rem 5rem' }}>
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="section-title" style={{ margin: 0 }}>
              Platform Analytics &amp; KPIs
            </h1>
            {data?.cached && (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  border: '1px solid #fde68a',
                }}
              >
                ⚡ Redis Cached (5m)
              </span>
            )}
          </div>
          <p className="section-subtitle" style={{ marginTop: '0.35rem' }}>
            Aggregated revenue (minus refunds), platform commissions (excluding reversed payouts), timeseries, and product metrics.
          </p>
        </div>

        {/* Range Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          {[
            { key: '7d', label: 'Last 7 Days' },
            { key: '30d', label: 'Last 30 Days' },
            { key: '90d', label: 'Last 90 Days' },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`btn btn-sm ${range === r.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontWeight: 700,
                border: 'none',
                background: range === r.key ? 'var(--color-primary)' : 'transparent',
              }}
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
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Calculating platform analytics from database...</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2.5rem',
            }}
          >
            {/* Card 1: Net Revenue */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Net Revenue (Paid - Refunded)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.35rem 0' }}>
                ₹{totals.revenue.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                ✓ Excludes refunded orders
              </div>
            </div>

            {/* Card 2: Commission Earned */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Platform Commission
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0284C7', margin: '0.35rem 0' }}>
                ₹{totals.commission.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                From verified vendor payouts
              </div>
            </div>

            {/* Card 3: Orders Count */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Orders Placed
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.35rem 0' }}>
                {totals.orders}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                In selected period ({range})
              </div>
            </div>

            {/* Card 4: Average Order Value */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Average Order Value (AOV)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.35rem 0' }}>
                ₹{totals.averageOrderValue.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Net revenue / order count
              </div>
            </div>

            {/* Card 5: Active Customers */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Active Customers
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.35rem 0' }}>
                {totals.activeCustomers}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Shoppers who placed orders
              </div>
            </div>

            {/* Card 6: Active Vendors */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Approved Vendors
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0.35rem 0' }}>
                {totals.activeVendors}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Approved active storefronts
              </div>
            </div>
          </div>

          {/* SVG Charts Grid (Hand-made Plain SVG/CSS) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: '1.5rem',
              marginBottom: '2.5rem',
            }}
          >
            {/* Chart 1: Revenue Per Day (Plain SVG Area Chart) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Daily Net Revenue (₹)
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Zero-filled timeseries
                </span>
              </div>

              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines (Light Blue) */}
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
                          stroke="#BAE6FD"
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

                  {/* Polyline Line */}
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
                      {/* X-axis date labels (show every few points to avoid crowding) */}
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
                        fill="#1e293b"
                        opacity="0.9"
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

            {/* Chart 2: Orders Per Day (Plain SVG Bar Chart) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Daily Order Volume
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Orders placed per day
                </span>
              </div>

              <div style={{ width: '100%', overflowX: 'auto' }}>
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
                          stroke="#BAE6FD"
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

                  {/* SVG Bars */}
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
                          opacity="0.85"
                          onMouseEnter={() =>
                            setHoveredPoint({ x: x + barWidth / 2, y, val: d.orders, date: d.date, type: 'orders' })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                          style={{ cursor: 'pointer' }}
                        />

                        {/* X-axis date labels */}
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
                        fill="#1e293b"
                        opacity="0.9"
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
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              padding: '1.5rem',
              marginBottom: '2.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              Sub-Order Fulfillment Status Breakdown
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Tracks progress across vendor fulfillment lifecycles ({totalSubOrders} total sub-orders)
            </p>

            {/* Stacked Multi-Color Progress Bar */}
            <div
              style={{
                height: '18px',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                background: '#f1f5f9',
                marginBottom: '1rem',
              }}
            >
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
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'placed', label: 'Placed', color: '#64748b' },
                { key: 'packed', label: 'Packed', color: '#0284c7' },
                { key: 'shipped', label: 'Shipped', color: '#06b6d4' },
                { key: 'delivered', label: 'Delivered', color: '#10b981' },
                { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
              ].map((st) => (
                <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: st.color }} />
                  <span style={{ fontWeight: 600, color: '#334155' }}>{st.label}:</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{statusBreakdown[st.key] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Vendors & Top Products Tables Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '1.5rem',
              marginBottom: '2.5rem',
            }}
          >
            {/* Top 5 Vendors */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.5rem', minWidth: 0 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>
                Top 5 Vendors by Revenue
              </h3>
              {topVendors.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No vendor sales recorded in this range.</p>
              ) : (
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '0.5rem 0' }}>#</th>
                        <th style={{ padding: '0.5rem 0.5rem' }}>Store Name</th>
                        <th style={{ padding: '0.5rem 0.5rem', textAlign: 'right' }}>Revenue</th>
                        <th style={{ padding: '0.5rem 0.5rem', textAlign: 'right' }}>Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topVendors.map((v, i) => (
                        <tr key={v.vendorId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</td>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#1e293b' }}>
                            🏪 {v.storeName}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            ₹{v.revenue.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#64748b' }}>
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
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1.5rem', minWidth: 0 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>
                Top 5 Products by Units Sold
              </h3>
              {topProducts.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No product sales recorded in this range.</p>
              ) : (
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '0.5rem 0' }}>#</th>
                        <th style={{ padding: '0.5rem 0.5rem' }}>Product Title</th>
                      <th style={{ padding: '0.5rem 0.5rem', textAlign: 'right' }}>Units Sold</th>
                      <th style={{ padding: '0.5rem 0.5rem', textAlign: 'right' }}>Gross Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={p.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</td>
                        <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#1e293b', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0284C7' }}>
                          {p.unitsSold}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#0f172a' }}>
                          ₹{p.revenue.toLocaleString()}
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
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.3rem' }}>⚠️</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Low Stock Inventory Alerts (Stock ≤ 5 units)
              </h3>
            </div>

            {lowStock.length === 0 ? (
              <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
                ✓ All active products maintain healthy stock levels above 5 units.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {lowStock.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      border: '1px solid #fee2e2',
                      background: '#fffaf0',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        🏪 {item.storeName} • {item.category} • ₹{item.price.toLocaleString()}
                      </div>
                    </div>
                    <span
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.stock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
