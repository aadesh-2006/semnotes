/**
 * SEMNÓTĒS — Route Loading Fallback
 * Dignity. Self-respect. Discipline.
 *
 * Rendered within React.Suspense when dynamic route chunks are loading.
 * Preserves the Obsidian & Gold aesthetic, avoids layout shifts,
 * respects reduced-motion preferences, and provides accessible status.
 */

import { Compass } from 'lucide-react';

export function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading workspace module"
      className="min-h-[55vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200"
    >
      <div className="relative w-12 h-12 flex items-center justify-center mb-4">
        {/* Subtle ambient gold glow */}
        <div className="absolute inset-0 rounded-xl bg-gold-500/10 blur-sm" />
        <div className="relative w-12 h-12 rounded-xl bg-obsidian-850 border border-gold-500/30 flex items-center justify-center shadow-gold-sm">
          <Compass className="w-6 h-6 text-gold-400 stroke-[1.75] animate-spin motion-reduce:animate-none" />
        </div>
      </div>

      <span className="font-serif text-sm font-semibold tracking-wider text-slate-200 uppercase mb-1">
        Aligning Protocol
      </span>
      <p className="text-xs text-slate-500 font-sans tracking-wide">
        Loading module workspace...
      </p>
    </div>
  );
}

export default RouteLoadingFallback;
