import React from 'react';
import { cn } from '../../core/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'gold-subtle' | 'success' | 'danger' | 'warning' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    gold: 'bg-gold-500/15 text-gold-300 border border-gold-500/30',
    'gold-subtle': 'bg-gold-950/60 text-gold-400 border border-gold-800/40',
    success: 'bg-discipline-success-muted/60 text-emerald-400 border border-discipline-success/40',
    danger: 'bg-discipline-danger-muted/60 text-red-400 border border-discipline-danger/40',
    warning: 'bg-discipline-warning-muted/60 text-amber-300 border border-discipline-warning/40',
    neutral: 'bg-obsidian-800 text-slate-300 border border-obsidian-700',
    outline: 'bg-transparent text-slate-400 border border-obsidian-700'
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-medium tracking-wide rounded-md',
    md: 'text-xs px-2.5 py-1 font-medium tracking-wide rounded-lg'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 select-none transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
