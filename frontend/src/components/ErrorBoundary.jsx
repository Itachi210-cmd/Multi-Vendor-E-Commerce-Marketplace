import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="orders-page-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
          <div className="stitch-empty-orders-card" style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="stitch-empty-orders-title" style={{ fontSize: 'var(--font-xl)', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p className="stitch-empty-orders-desc" style={{ marginBottom: '1.5rem' }}>
              An unexpected error occurred while rendering this view. You can try refreshing or returning to the marketplace home page.
            </p>
            {this.state.error?.message && (
              <pre style={{
                textAlign: 'left',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                overflowX: 'auto',
                marginBottom: '1.75rem',
                color: 'var(--color-danger-dark)',
                fontFamily: 'monospace',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="stitch-order-details-link"
                style={{ minHeight: '44px', padding: '0.65rem 1.4rem' }}
                onClick={() => window.location.reload()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
                <span>Refresh Page</span>
              </button>
              <button
                type="button"
                className="stitch-explore-btn"
                onClick={this.handleReset}
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
