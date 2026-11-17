import React from 'react';
import { cn } from '../../core/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  variant?: 'gold' | 'emerald' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function Progress({
  value,
  max = 100,
  variant = 'gold',
  size = 'md',
  showLabel = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variants = {
    gold: 'bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300 shadow-[0_0_12px_rgba(197,168,105,0.4)]',
    emerald: 'bg-emerald-500 shadow-[0_0_10px_rgba(46,125,78,0.4)]',
    subtle: 'bg-slate-400'
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">Progress</span>
          <span className="font-mono text-gold-300 font-semibold">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-obsidian-900 rounded-full overflow-hidden border border-obsidian-750/80', sizes[size])}>
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', variants[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
