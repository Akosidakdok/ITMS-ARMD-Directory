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
      border: 'border-slate-200 hover:border-amber-400',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
    },
    blue: {
      border: 'border-slate-200 hover:border-blue-400',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200',
    },
    emerald: {
      border: 'border-slate-200 hover:border-emerald-400',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    },
    purple: {
      border: 'border-slate-200 hover:border-indigo-400',
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
    },
    rose: {
      border: 'border-slate-200 hover:border-rose-400',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200',
    },
    cyan: {
      border: 'border-slate-200 hover:border-sky-400',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-200',
    }
  };

  const scheme = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl border ${scheme.border} transition-all duration-200 shadow-2xs ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xs' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-outfit">{value}</span>
        {trend && (
          <span className={`text-xs font-bold ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs font-medium text-slate-500 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};


