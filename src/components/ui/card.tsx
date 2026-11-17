import React from 'react';
import { cn } from '../../core/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'gold-border' | 'interactive';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-obsidian-850/80 backdrop-blur-sm border border-obsidian-700/60 shadow-lg',
    elevated: 'bg-obsidian-800 border border-obsidian-700 shadow-obsidian-elevated',
    'gold-border': 'bg-obsidian-850 border border-gold-600/40 shadow-gold-sm hover:border-gold-500/60 transition-all',
    interactive: 'bg-obsidian-850/80 border border-obsidian-700/60 hover:border-gold-500/40 hover:bg-obsidian-800 transition-all duration-200 cursor-pointer shadow-md'
  };

  return (
    <div
      className={cn(
        'rounded-xl text-slate-100 overflow-hidden',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-5 border-b border-obsidian-700/40 flex flex-col gap-1', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-display text-lg font-semibold tracking-tight text-slate-100', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-slate-400 leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-obsidian-700/40 bg-obsidian-900/40 flex items-center', className)} {...props}>
      {children}
    </div>
  );
}
