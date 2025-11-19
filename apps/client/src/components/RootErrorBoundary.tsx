import React from 'react';

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  state = { error: null };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, info: any) {
    // Log full error to console for debugging
    // This ensures we surface issues that previously resulted in a blank screen
    console.error('RootErrorBoundary caught render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f8f8', padding: 16, borderRadius: 8 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RootErrorBoundary;
