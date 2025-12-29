/**
 * @fileoverview ErrorBoundary.tsx
 * @module frontend/src/components/ErrorBoundary
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - ErrorBoundary
 *
 * Pos: frontend/src/components/ErrorBoundary.tsx
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  // eslint-disable-next-line no-unused-vars
  fallback?: (details: ErrorDetails) => ReactNode;
  // eslint-disable-next-line no-unused-vars
  onError?: (details: ErrorDetails) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the entire app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.({ error, errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI if provided
      if (this.props.fallback && this.state.errorInfo) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
        });
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-8">
          <div className="w-full max-w-2xl rounded-3xl border border-red-500/40 bg-red-500/10 p-8 text-white">
            <div className="mb-4 flex items-center gap-3">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-2xl font-bold">应用程序错误</h2>
            </div>

            <div className="mb-6 space-y-2">
              <p className="text-sm text-slate-300">
                应用遇到了一个意外错误。我们已经记录了这个问题。
              </p>
              <details className="mt-4 cursor-pointer rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <summary className="text-sm font-semibold text-red-300">
                  错误详情 (开发调试)
                </summary>
                <div className="mt-3 space-y-3 text-xs">
                  <div>
                    <p className="font-semibold text-red-400">错误信息:</p>
                    <pre className="mt-1 overflow-x-auto rounded bg-slate-950/50 p-2 text-red-200">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <p className="font-semibold text-red-400">组件堆栈:</p>
                      <pre className="mt-1 overflow-x-auto rounded bg-slate-950/50 p-2 text-slate-400">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                尝试恢复
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-red-500/40 bg-red-500/10 px-6 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
              >
                重新加载页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
