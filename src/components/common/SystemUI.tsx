import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  reference?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, meta, actions, reference }) => (
  <section className="app-page-header app-surface flex flex-col gap-4 px-4 pb-4 pt-5 sm:px-5 md:flex-row md:items-center md:justify-between" aria-labelledby="page-heading">
    <div className="min-w-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {eyebrow && <span className="record-kicker">{eyebrow}</span>}
        {reference && <span className="record-reference">REF: {reference}</span>}
        {meta && <span className="text-[11px] text-slate-500">{meta}</span>}
      </div>
      <h1 id="page-heading" className="text-xl font-bold tracking-[-0.018em] text-slate-900 sm:text-[1.45rem]">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 sm:text-[13px]">{description}</p>}
    </div>
    {actions && <div className="record-page-actions flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </section>
);

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'secondary', icon: Icon, className = '', children, ...props }) => {
  const styles: Record<ButtonVariant, string> = {
    primary: 'border-blue-800 bg-blue-800 text-white hover:border-blue-900 hover:bg-blue-900',
    secondary: 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50',
    danger: 'border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700',
    ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded border px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
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
      <legend className="record-kicker text-slate-700">{title}</legend>
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
  <div className="record-toolbar flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
    {children}
  </div>
);

interface SummaryItem {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'success' | 'warning' | 'attention';
  onClick?: () => void;
}

export const OperationalSummary: React.FC<{ items: SummaryItem[]; label?: string }> = ({ items, label = 'Operational summary' }) => (
  <section aria-label={label} className="overflow-hidden rounded-md border border-slate-300 bg-white">
    <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const toneStyles = {
          neutral: 'text-blue-800',
          success: 'text-emerald-700',
          warning: 'text-amber-800',
          attention: 'text-rose-700'
        }[item.tone || 'neutral'];
        const content = (
          <>
            <span className="flex items-center justify-between gap-2">
              <span className="record-kicker text-slate-500">{item.label}</span>
              {Icon && <Icon aria-hidden="true" className={`h-4 w-4 ${toneStyles}`} />}
            </span>
            <span className="mt-2 flex items-end gap-2">
              <strong className={`text-[1.65rem] font-bold leading-none tabular-nums ${toneStyles}`}>{item.value}</strong>
              {item.detail && <small className="pb-0.5 text-[10px] leading-3 text-slate-500">{item.detail}</small>}
            </span>
          </>
        );
        return item.onClick ? (
          <button key={item.label} type="button" onClick={item.onClick} className="min-h-[82px] p-3.5 text-left hover:bg-blue-50/60">
            {content}
          </button>
        ) : (
          <div key={item.label} className="min-h-[82px] p-3.5">{content}</div>
        );
      })}
    </div>
  </section>
);

export const SectionHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode; id?: string }> = ({ title, description, actions, id }) => (
  <div className="record-section-header">
    <div>
      <h2 id={id} className="app-section-title">{title}</h2>
      {description && <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
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
