import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral', 
  size = 'md',
  className = '' 
}) => {
  const variantStyles = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-200',
    gold: 'bg-blue-50 text-blue-700 border border-blue-200',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200'
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-[11px] px-2.5 py-1 font-semibold',
    lg: 'text-xs px-3 py-1.5 font-semibold'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-md leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};


