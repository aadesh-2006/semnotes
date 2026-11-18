import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NAVIGATION_ROUTES, getRouteIdFromPathname, type RouteId } from './routes';
import { formatFriendlyDate, cn } from '../core/utils';
import { Menu, X, Plus, HardDrive, Compass } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

interface AppShellProps {
  currentRoute?: RouteId;
  onRouteChange?: (route: RouteId) => void;
  onQuickAction?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  currentRoute,
  onRouteChange,
  onQuickAction,
  children
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // URL location is the primary source of truth; falls back to currentRoute or 'dashboard'
  const activeRouteId = getRouteIdFromPathname(location.pathname) || currentRoute;
  const activeRouteConfig = activeRouteId ? NAVIGATION_ROUTES.find((r) => r.id === activeRouteId) : null;
  const todayFormatted = formatFriendlyDate(new Date());

  const handleMobileRouteSelect = (route: RouteId) => {
    if (onRouteChange) {
      onRouteChange(route);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col md:flex-row text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar
        currentRoute={activeRouteId || 'dashboard'}
        onRouteChange={onRouteChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header */}
        <header className="h-20 bg-obsidian-900/80 backdrop-blur-md border-b border-obsidian-750/70 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          {/* Left section: mobile hamburger + current view title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-obsidian-800 text-slate-300 hover:text-gold-300 border border-obsidian-700"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-100">
                  {activeRouteConfig ? activeRouteConfig.label : 'SEMNÓTĒS'}
                </h1>
                <Badge variant="gold-subtle" size="sm" className="hidden sm:inline-flex">
                  V1.0
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-normal hidden sm:block">
                {todayFormatted}
              </p>
            </div>
          </div>

          {/* Right section: status indicators & quick action */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-850 border border-obsidian-700/80 text-xs text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-gold-400" />
              <span>Local-First DB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={onQuickAction}
              className="flex items-center shadow-gold-sm"
            >
              <Plus className="w-4 h-4 mr-1 text-obsidian-950 stroke-[2.5]" />
              <span className="font-semibold text-obsidian-950 text-xs sm:text-sm">Quick Action</span>
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Backdrop & Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-obsidian-900 border-r border-obsidian-700 h-full flex flex-col p-5 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-5 border-b border-obsidian-750">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-obsidian-800 border border-gold-500/40 flex items-center justify-center">
                  <span className="font-serif text-gold-300 font-bold">Σ</span>
                </div>
                <span className="font-serif font-bold text-slate-100 tracking-wider">SEMNÓTĒS</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav aria-label="Mobile full navigation" className="flex-1 py-4 space-y-1 overflow-y-auto">
              <span className="text-[10px] uppercase font-semibold text-slate-400 px-3 pb-2 block">
                Modules
              </span>
              {NAVIGATION_ROUTES.map((route) => {
                const Icon = route.icon;
                const isActive = activeRouteId === route.id;
                return (
                  <NavLink
                    key={route.id}
                    to={route.path}
                    onClick={() => handleMobileRouteSelect(route.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400',
                      isActive
                        ? 'bg-gold-500/15 text-gold-300 border-l-2 border-gold-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-gold-400' : 'text-slate-400')} />
                    <span>{route.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-obsidian-750 text-xs text-slate-400 flex flex-col gap-1">
              <span className="text-gold-400 font-medium">Dignity &bull; Self-respect &bull; Discipline</span>
              <span className="text-[11px] text-slate-400">Offline-first local storage</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (High frequency shortcuts) */}
      <nav
        aria-label="Mobile quick shortcuts"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-obsidian-900/95 backdrop-blur-md border-t border-obsidian-750 px-3 flex items-center justify-around z-30"
      >
        {[
          NAVIGATION_ROUTES[0], // Dashboard
          NAVIGATION_ROUTES[1], // Streaks
          NAVIGATION_ROUTES[2], // Calendar
          NAVIGATION_ROUTES[3], // Journal
        ].map((route) => {
          const Icon = route.icon;
          const isActive = activeRouteId === route.id;
          return (
            <NavLink
              key={route.id}
              to={route.path}
              onClick={() => onRouteChange?.(route.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-12 rounded-lg text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400',
                isActive ? 'text-gold-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-gold-400' : 'text-slate-400')} />
              <span>{route.shortLabel}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center w-16 h-12 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
          aria-label="Open navigation modules drawer"
        >
          <Compass className="w-5 h-5 mb-0.5 text-slate-400" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
