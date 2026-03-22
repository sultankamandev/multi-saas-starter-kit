'use client';

import React, { Component, ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // You could log to an error reporting service here (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ 
  error, 
  onReset 
}: { 
  error: Error | null; 
  onReset: () => void;
}) {
  const t = useTranslations('errors');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
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
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          {t('title', { defaultValue: 'Something went wrong' })}
        </h2>

        <p className="text-gray-600 text-center mb-4">
          {t('message', { defaultValue: 'An unexpected error occurred. Please try again.' })}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 p-3 bg-gray-100 rounded text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              {t('errorDetailsDevelopment', { defaultValue: 'Error Details (Development)' })}
            </summary>
            <pre className="text-xs text-gray-600 overflow-auto">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            {t('tryAgain', { defaultValue: 'Try Again' })}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            {t('goHome', { defaultValue: 'Go Home' })}
          </button>
        </div>
      </div>
    </div>
  );
}

