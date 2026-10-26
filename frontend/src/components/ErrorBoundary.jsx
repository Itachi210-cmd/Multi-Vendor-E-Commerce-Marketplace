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
        <div className="content-container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '520px', margin: '0 auto', background: 'var(--color-surface)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>
              Something went wrong
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              An unexpected error occurred while rendering this page. You can try refreshing or returning to the home page.
            </p>
            {this.state.error?.message && (
              <pre style={{ textAlign: 'left', background: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', overflowX: 'auto', marginBottom: '1.5rem', color: 'var(--color-danger)' }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                🔄 Refresh Page
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleReset}
              >
                🏠 Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
