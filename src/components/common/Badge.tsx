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
    primary: 'bg-blue-100 text-blue-700 border border-blue-200/60 font-bold',
    gold: 'bg-blue-100 text-blue-800 border border-blue-200/60 font-bold',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200/60 font-bold',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200/60 font-bold',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200/60 font-bold',
    info: 'bg-sky-100 text-sky-800 border border-sky-200/60 font-bold',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60 font-bold'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 font-semibold',
    md: 'text-xs px-3 py-1 font-semibold',
    lg: 'text-xs px-3.5 py-1.5 font-bold'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};


