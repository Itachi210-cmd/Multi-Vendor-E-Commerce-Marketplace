import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function RbacDemoPage() {
  const { user, isAuthenticated } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState('');

  useEffect(() => {
    setTestResult(null);
  }, [user?._id]);

  const runTest = async (endpoint) => {
    setLoadingRoute(endpoint);
    setTestResult(null);
    try {
      const response = await api.get(endpoint);
      setTestResult({
        endpoint,
        status: response.status,
        success: true,
        data: response.data,
      });
    } catch (error) {
      setTestResult({
        endpoint,
        status: error.status || 500,
        success: false,
        message: error.message,
        data: error.data,
      });
    } finally {
      setLoadingRoute('');
    }
  };

  return (
    <div className="content-container" style={{ padding: '3rem 1.5rem' }}>
      <div className="section-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="section-title">Role-Based Access Control (RBAC) Sandbox</h1>
        <p className="section-subtitle">
          Test backend endpoints protected by <code>authenticate</code> and <code>authorizeRoles</code>.
        </p>
      </div>

      <div className="rbac-status-banner">
        <div>
          <strong>Current Active Session:</strong>{' '}
          {isAuthenticated ? (
            <span>
              Logged in as <strong>{user?.name}</strong> (Role: <span className="badge badge-connected">{user?.role}</span>)
            </span>
          ) : (
            <span style={{ color: 'var(--color-danger)' }}>
              Anonymous (No JWT token in Authorization header)
            </span>
          )}
        </div>
      </div>

      <div className="features-grid" style={{ marginTop: '2rem' }}>
        {/* Customer Route Card */}
        <div className="feature-card">
          <div className="feature-card-header">
            <h3>Customer Route</h3>
            <span className="badge badge-connected">customer</span>
          </div>
          <p style={{ margin: '0.75rem 0 1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Endpoint: <code>GET /api/test/customer</code>. Allowed for customers.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => runTest('/test/customer')}
            disabled={loadingRoute === '/test/customer'}
          >
            {loadingRoute === '/test/customer' ? 'Testing...' : 'Test Customer Route'}
          </button>
        </div>

        {/* Vendor Route Card */}
        <div className="feature-card">
          <div className="feature-card-header">
            <h3>Vendor Route</h3>
            <span className="badge badge-degraded">vendor</span>
          </div>
          <p style={{ margin: '0.75rem 0 1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Endpoint: <code>GET /api/test/vendor</code>. Allowed only for approved vendors.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => runTest('/test/vendor')}
            disabled={loadingRoute === '/test/vendor'}
          >
            {loadingRoute === '/test/vendor' ? 'Testing...' : 'Test Vendor Route'}
          </button>
        </div>

        {/* Admin Route Card */}
        <div className="feature-card">
          <div className="feature-card-header">
            <h3>Admin Route</h3>
            <span className="badge badge-error">admin</span>
          </div>
          <p style={{ margin: '0.75rem 0 1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Endpoint: <code>GET /api/test/admin</code>. Requires administrative privileges.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => runTest('/test/admin')}
            disabled={loadingRoute === '/test/admin'}
          >
            {loadingRoute === '/test/admin' ? 'Testing...' : 'Test Admin Route'}
          </button>
        </div>
      </div>

      {/* Output Console */}
      {testResult && (
        <div className="test-output-console">
          <div className="console-header">
            <span>Result for: <strong>{testResult.endpoint}</strong></span>
            <span
              className={`badge ${
                testResult.status === 200
                  ? 'badge-connected'
                  : testResult.status === 403
                  ? 'badge-degraded'
                  : 'badge-error'
              }`}
            >
              HTTP {testResult.status} {testResult.status === 403 ? 'FORBIDDEN' : testResult.status === 200 ? 'OK' : 'UNAUTHORIZED'}
            </span>
          </div>
          <pre className="console-body">
            {JSON.stringify(testResult.data || { message: testResult.message }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
