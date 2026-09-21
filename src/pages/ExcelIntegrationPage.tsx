import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { ExcelWorksheetModule } from '../components/spreadsheet/ExcelWorksheetModule';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WorksheetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Spreadsheet Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Spreadsheet Encountered an Issue
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected error occurred while rendering the interactive spreadsheet.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Spreadsheet
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ExcelIntegrationPage: React.FC = () => {
  const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="mx-auto max-w-[1680px] space-y-4">
      {/* Top Banner */}
      <section className="no-print flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs dark:bg-[#101b2b] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
              PAIS 2.0 Spreadsheet Module
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">disposition {todayFormatted}.xlsx</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Interactive Excel Worksheets
          </h1>
        </div>
      </section>

      {/* FULL EXCEL WORKSHEET MODULE (5 TABS) */}
      <div className="w-full">
        <WorksheetErrorBoundary>
          <ExcelWorksheetModule />
        </WorksheetErrorBoundary>
      </div>
    </div>
  );
};


