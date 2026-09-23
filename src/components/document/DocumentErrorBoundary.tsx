import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DocumentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Document Editor Render Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0b1320] text-center">
          <div className="rounded-2xl border border-rose-200 bg-white dark:bg-[#101b2b] dark:border-rose-900/50 p-8 shadow-xl max-w-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Document Editor Encountered an Issue
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {this.state.error?.message || 'An unexpected rendering error occurred inside the document canvas.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {this.props.onClose && (
                <button
                  type="button"
                  onClick={this.props.onClose}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={14} /> Close Editor
                </button>
              )}
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
