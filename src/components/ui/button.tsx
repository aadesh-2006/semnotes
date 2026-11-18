import React from 'react';
import { cn } from '../../core/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold-glow';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const variants = {
      primary: 'bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 text-obsidian-950 font-semibold shadow-gold-sm hover:brightness-105 active:brightness-95 border border-gold-300/30',
      secondary: 'bg-obsidian-800 hover:bg-obsidian-750 text-slate-200 border border-obsidian-700 hover:border-gold-600/40 shadow-sm',
      outline: 'bg-transparent border border-gold-500/30 hover:border-gold-400/80 text-gold-300 hover:bg-gold-500/10',
      ghost: 'bg-transparent hover:bg-obsidian-800 text-slate-300 hover:text-gold-200',
      danger: 'bg-discipline-danger-muted border border-discipline-danger/40 text-red-300 hover:bg-discipline-danger/30 hover:text-red-200',
      'gold-glow': 'bg-gold-400 text-obsidian-950 font-semibold shadow-gold-glow hover:shadow-gold-glow-lg hover:brightness-110 active:brightness-95 border border-gold-200/40'
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
      md: 'text-sm px-4 py-2 rounded-lg gap-2',
      lg: 'text-base px-6 py-2.5 rounded-xl gap-2.5',
      icon: 'h-9 w-9 p-0 rounded-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            aria-hidden="true"
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
