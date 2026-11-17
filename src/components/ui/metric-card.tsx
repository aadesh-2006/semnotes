import React from 'react';
import { cn } from '../../core/utils';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlight?: boolean;
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  unit,
  subtext,
  icon,
  trend,
  highlight = false,
  className,
  onClick
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'relative p-5 rounded-xl border transition-all duration-200 overflow-hidden',
        onClick && 'cursor-pointer hover:border-gold-500/70 hover:shadow-gold-sm active:scale-[0.99]',
        highlight
          ? 'bg-gradient-to-b from-obsidian-800 to-obsidian-850 border-gold-600/50 shadow-gold-sm'
          : 'bg-obsidian-850/80 border-obsidian-700/60 hover:border-obsidian-600/70',
        className
      )}
    >
      {/* Ambient background glow for highlighted card */}
      {highlight && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <div className="text-gold-400/80">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-bold tracking-tight text-slate-100 tabular-nums">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {(subtext || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center font-medium font-mono text-[11px] px-1.5 py-0.5 rounded',
                trend.isPositive
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'bg-red-950/60 text-red-400 border border-red-800/40'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtext && <span className="text-slate-400 truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
