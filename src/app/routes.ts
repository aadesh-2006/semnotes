import {
  LayoutDashboard,
  Flame,
  CalendarDays,
  BookOpen,
  LineChart,
  Timer,
  Trophy,
  Settings,
  type LucideIcon
} from 'lucide-react';

export type RouteId =
  | 'dashboard'
  | 'streaks'
  | 'calendar'
  | 'journal'
  | 'analytics'
  | 'focus'
  | 'milestones'
  | 'settings';

export const APP_ROUTES = {
  DASHBOARD: '/',
  HABITS: '/habits',
  STREAKS: '/streaks',
  STREAK_DETAIL: '/streaks/:habitId',
  HABIT_DETAIL: '/habits/:habitId',
  CALENDAR: '/calendar',
  JOURNAL: '/journal',
  ANALYTICS: '/analytics',
  FOCUS: '/focus',
  MILESTONES: '/milestones',
  SETTINGS: '/settings',
  DATA: '/data',
} as const;

export type AppRoutePath = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

export interface RouteConfig {
  id: RouteId;
  path: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  badge?: string;
  description: string;
}

export const NAVIGATION_ROUTES: RouteConfig[] = [
  {
    id: 'dashboard',
    path: APP_ROUTES.DASHBOARD,
    label: 'Command Center',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    description: 'High-level discipline overview, today’s habits, and streak status'
  },
  {
    id: 'streaks',
    path: APP_ROUTES.STREAKS,
    label: 'My Streaks',
    shortLabel: 'Streaks',
    icon: Flame,
    description: 'Independent abstinence, completion, and quantitative trackers'
  },
  {
    id: 'calendar',
    path: APP_ROUTES.CALENDAR,
    label: 'Consistency Calendar',
    shortLabel: 'Calendar',
    icon: CalendarDays,
    description: 'Activity heatmaps, monthly schedules, and history'
  },
  {
    id: 'journal',
    path: APP_ROUTES.JOURNAL,
    label: 'Journal & Reflections',
    shortLabel: 'Journal',
    icon: BookOpen,
    description: 'Encrypted private journaling, urge logs, and emotional triggers'
  },
  {
    id: 'analytics',
    path: APP_ROUTES.ANALYTICS,
    label: 'Discipline Analytics',
    shortLabel: 'Analytics',
    icon: LineChart,
    description: 'Rolling 30-day discipline score, habit breakdown, and trends'
  },
  {
    id: 'focus',
    path: APP_ROUTES.FOCUS,
    label: 'Focus Mode',
    shortLabel: 'Focus',
    icon: Timer,
    description: 'Minimalist deep work timer, focus history, and daily stats'
  },
  {
    id: 'milestones',
    path: APP_ROUTES.MILESTONES,
    label: 'Milestones & Rewards',
    shortLabel: 'Rewards',
    icon: Trophy,
    description: 'Custom threshold celebration rules and personal reward claims'
  },
  {
    id: 'settings',
    path: APP_ROUTES.SETTINGS,
    label: 'Settings & Storage',
    shortLabel: 'Settings',
    icon: Settings,
    description: 'Local-first database, backup export/import, and privacy'
  }
];

/**
 * Resolves the primary RouteId from a browser location pathname.
 * Handles root, exact route paths, aliases (/habits, /data), and parameterized paths (/streaks/:id).
 * Returns null if the path is unknown.
 */
export function getRouteIdFromPathname(pathname: string): RouteId | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/') return 'dashboard';
  if (normalized === '/calendar') return 'calendar';
  if (normalized === '/journal') return 'journal';
  if (normalized === '/analytics') return 'analytics';
  if (normalized === '/focus') return 'focus';
  if (normalized === '/milestones') return 'milestones';
  if (normalized === '/settings' || normalized === '/data') return 'settings';

  if (
    normalized === '/streaks' ||
    normalized === '/habits' ||
    /^\/streaks\/[^/]+$/.test(normalized) ||
    /^\/habits\/[^/]+$/.test(normalized)
  ) {
    return 'streaks';
  }

  return null;
}

/**
 * Returns the primary URL path for a given RouteId.
 */
export function getPathForRoute(routeId: RouteId): string {
  const found = NAVIGATION_ROUTES.find((r) => r.id === routeId);
  return found ? found.path : '/';
}

/**
 * Determines whether a given URL path is a known application route.
 */
export function isKnownRoutePath(pathname: string): boolean {
  return getRouteIdFromPathname(pathname) !== null;
}
