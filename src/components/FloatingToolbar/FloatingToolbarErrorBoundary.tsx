/**
 * Error Boundary specifically for FloatingToolbar
 * Handles errors gracefully and provides recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class FloatingToolbarErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FloatingToolbar ErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Auto-recovery: Try to reset after a short delay
    if (this.state.retryCount < 3) {
      this.retryTimeoutId = window.setTimeout(() => {
        console.log(`[FloatingToolbar ErrorBoundary] Auto-retry attempt ${this.state.retryCount + 1}/3`);
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: this.state.retryCount + 1
        });
      }, 1000 + (this.state.retryCount * 1000)); // Increasing delay
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show minimal fallback - just return null to hide toolbar
      console.log('[FloatingToolbar ErrorBoundary] Rendering fallback (hiding toolbar)');
      return null;
    }

    return this.props.children;
  }
}

// HOC to wrap any component with FloatingToolbar error boundary
export const withFloatingToolbarErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <FloatingToolbarErrorBoundary>
      <Component {...props} />
    </FloatingToolbarErrorBoundary>
  );
};