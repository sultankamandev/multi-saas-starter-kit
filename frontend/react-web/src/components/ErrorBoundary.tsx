import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("ErrorBoundary caught:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">An unexpected error occurred.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Go Home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
