import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, meta, actions }) => (
  <section className="app-page-header app-surface flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between" aria-labelledby="page-heading">
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {eyebrow && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-blue-700">{eyebrow}</span>}
        {meta}
      </div>
      <h1 id="page-heading" className="text-xl font-bold tracking-[-0.02em] text-slate-900 sm:text-2xl">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </section>
);

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'secondary', icon: Icon, className = '', children, ...props }) => {
  const styles: Record<ButtonVariant, string> = {
    primary: 'border-blue-700 bg-blue-700 text-white hover:border-blue-800 hover:bg-blue-800',
    secondary: 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    danger: 'border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700',
    ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
};

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, description, children }) => (
  <fieldset className="space-y-3 border-0 p-0">
    <div className="border-b border-slate-200 pb-2">
      <legend className="text-xs font-bold uppercase tracking-[0.07em] text-slate-700">{title}</legend>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
    </div>
    {children}
  </fieldset>
);

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon: Icon, action }) => (
  <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
    {Icon && <Icon aria-hidden="true" className="mb-3 h-6 w-6 text-slate-400" />}
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {description && <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const SearchToolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
    {children}
  </div>
);

export const TableLoadingState: React.FC<{ columns?: number; rows?: number }> = ({ columns = 5, rows = 5 }) => (
  <div aria-label="Loading records" aria-live="polite" className="space-y-px bg-slate-100">
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="grid gap-px" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((__, column) => (
          <span key={column} className="h-11 animate-pulse bg-white p-3"><span className="block h-2.5 w-3/4 rounded bg-slate-100" /></span>
        ))}
      </div>
    ))}
  </div>
);
