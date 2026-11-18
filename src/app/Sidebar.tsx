import { NavLink, useLocation } from 'react-router-dom';
import { NAVIGATION_ROUTES, getRouteIdFromPathname, type RouteId } from './routes';
import { cn } from '../core/utils';
import { ChevronLeft, ChevronRight, ShieldCheck, Flame } from 'lucide-react';

interface SidebarProps {
  currentRoute?: RouteId;
  onRouteChange?: (route: RouteId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  currentRoute,
  onRouteChange,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const location = useLocation();

  // URL location is the primary source of truth; falls back to currentRoute or 'dashboard'
  const activeRouteId = getRouteIdFromPathname(location.pathname) || currentRoute || 'dashboard';

  const handleNavClick = (routeId: RouteId) => {
    if (onRouteChange) {
      onRouteChange(routeId);
    }
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-obsidian-900 border-r border-obsidian-700/60 h-screen sticky top-0 transition-all duration-300 z-30 select-none',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center px-5 border-b border-obsidian-750/70 justify-between">
        {!isCollapsed ? (
          <NavLink
            to="/"
            className="flex items-center gap-3 overflow-hidden group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 rounded-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-obsidian-800 to-obsidian-900 border border-gold-500/40 flex items-center justify-center shadow-gold-sm flex-shrink-0 group-hover:border-gold-400 transition-colors">
              <span className="font-serif text-lg font-bold text-gold-300 tracking-wider">Σ</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-base font-bold tracking-widest text-slate-100 uppercase group-hover:text-gold-200 transition-colors">
                SEMNÓTĒS
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gold-400/80 font-medium font-sans">
                Dignity &bull; Discipline
              </span>
            </div>
          </NavLink>
        ) : (
          <NavLink
            to="/"
            className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-obsidian-800 to-obsidian-900 border border-gold-500/40 flex items-center justify-center shadow-gold-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 hover:border-gold-400 transition-colors"
          >
            <span className="font-serif text-lg font-bold text-gold-300">Σ</span>
          </NavLink>
        )}

        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-gold-300 p-1.5 rounded-lg hover:bg-obsidian-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Routes */}
      <nav
        aria-label="Desktop primary navigation"
        className="flex-1 py-4 px-3 space-y-1 overflow-y-auto"
      >
        <div className="px-3 pb-2">
          {!isCollapsed ? (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Navigation
            </span>
          ) : (
            <div className="w-full h-px bg-obsidian-750 my-1" />
          )}
        </div>

        {NAVIGATION_ROUTES.map((route) => {
          const Icon = route.icon;
          const isActive = activeRouteId === route.id;

          return (
            <NavLink
              key={route.id}
              to={route.path}
              onClick={() => handleNavClick(route.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400',
                isActive
                  ? 'bg-gradient-to-r from-gold-500/15 via-gold-500/10 to-transparent text-gold-300 border-l-2 border-gold-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/60'
              )}
              title={isCollapsed ? route.label : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-gold-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />

              {!isCollapsed && (
                <div className="flex items-center justify-between w-full truncate">
                  <span className="truncate">{route.label}</span>
                  {route.id === 'streaks' && (
                    <Flame className="w-3.5 h-3.5 text-gold-500/70" />
                  )}
                </div>
              )}

              {/* Active Indicator pip when collapsed */}
              {isCollapsed && isActive && (
                <span className="absolute right-1.5 w-1.5 h-1.5 rounded-full bg-gold-400" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Status */}
      <div className="p-4 border-t border-obsidian-750/70 bg-obsidian-900/60">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-obsidian-850 border border-obsidian-700/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex flex-col text-xs leading-none overflow-hidden">
              <span className="font-medium text-slate-200">Strict Engine</span>
              <span className="text-[10px] text-slate-400 mt-1">Local-First &bull; Active</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Strict Engine Active">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        )}
      </div>
    </aside>
  );
}
