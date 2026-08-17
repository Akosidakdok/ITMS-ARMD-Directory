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
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    blue: {
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200',
    },
    emerald: {
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    purple: {
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    rose: {
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-rose-50 text-rose-700 border border-rose-200',
    },
    cyan: {
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-blue-50 text-blue-700 border border-blue-200',
    }
  };

  const scheme = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-lg border ${scheme.border} transition-colors shadow-2xs ${onClick ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg ${scheme.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-[1.75rem] font-bold leading-none tracking-[-0.035em] text-slate-900">{value}</span>
        {trend && (
          <span className={`text-xs font-bold ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-[11px] font-medium text-slate-500 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};


