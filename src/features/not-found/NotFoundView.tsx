/**
 * SEMNÓTĒS — 404 Not Found View
 * Dignity. Self-respect. Discipline.
 *
 * Rendered when a user navigates to an unrecognized URL path.
 * Guarantees zero blank screens, maintains the Obsidian & Gold aesthetic,
 * displays the unrecognized coordinate, and offers immediate return paths.
 */

import { Link, useLocation } from 'react-router-dom';
import { Compass, LayoutDashboard, Flame } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function NotFoundView() {
  const location = useLocation();

  return (
    <div
      role="region"
      aria-label="Page Not Found Notice"
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-obsidian-850 to-obsidian-900 border border-gold-500/30 flex items-center justify-center shadow-gold-sm mb-6">
        <Compass className="w-8 h-8 text-gold-400 stroke-[1.5]" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-semibold tracking-widest uppercase mb-4">
        Unknown Coordinate
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 mb-3">
        404 — Path Not Found
      </h1>

      <p className="max-w-md text-sm text-slate-400 leading-relaxed mb-4">
        The requested pathway does not exist within the SEMNÓTĒS discipline matrix.
      </p>

      {/* Unrecognized path banner */}
      <div className="px-3.5 py-1.5 rounded-lg bg-obsidian-850 border border-obsidian-750 text-xs font-mono text-slate-400 mb-8 max-w-sm truncate">
        <span>Path: </span>
        <span className="text-gold-300 font-semibold">{location.pathname}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="focus-visible:outline-none">
          <Button variant="primary" size="md" className="flex items-center gap-2 shadow-gold-sm">
            <LayoutDashboard className="w-4 h-4 text-obsidian-950" />
            <span className="font-semibold text-obsidian-950">Return to Command Center</span>
          </Button>
        </Link>

        <Link to="/streaks" className="focus-visible:outline-none">
          <Button variant="outline" size="md" className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-gold-400" />
            <span>My Streaks</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundView;
