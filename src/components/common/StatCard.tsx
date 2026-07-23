import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: 'amber' | 'blue' | 'emerald' | 'purple' | 'rose' | 'cyan';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  onClick
}) => {
  const colorMap = {
    amber: {
      border: 'border-amber-200 dark:border-amber-500/20 hover:border-amber-400',
      iconBg: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      text: 'text-amber-700 dark:text-amber-400'
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-500/20 hover:border-blue-400',
      iconBg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      text: 'text-blue-700 dark:text-blue-400'
    },
    emerald: {
      border: 'border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-400',
      iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      text: 'text-emerald-700 dark:text-emerald-400'
    },
    purple: {
      border: 'border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-400',
      iconBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
      text: 'text-indigo-700 dark:text-indigo-400'
    },
    rose: {
      border: 'border-rose-200 dark:border-rose-500/20 hover:border-rose-400',
      iconBg: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
      text: 'text-rose-700 dark:text-rose-400'
    },
    cyan: {
      border: 'border-sky-200 dark:border-sky-500/20 hover:border-sky-400',
      iconBg: 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
      text: 'text-sky-700 dark:text-sky-400'
    }
  };

  const scheme = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`glass-panel bg-white dark:bg-slate-900 p-5 rounded-2xl border ${scheme.border} transition-all duration-200 theme-transition ${onClick ? 'cursor-pointer hover:-translate-y-1 shadow-xs hover:shadow-sm' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-outfit">{value}</span>
        {trend && (
          <span className={`text-xs font-bold ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};

