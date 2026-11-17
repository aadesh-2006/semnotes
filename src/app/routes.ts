import {
  LayoutDashboard,
  Flame,
  CalendarDays,
  BookOpen,
  LineChart,
  Timer,
  Trophy,
  ShieldAlert,
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
  | 'recovery'
  | 'settings';

export interface RouteConfig {
  id: RouteId;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  badge?: string;
  description: string;
}

export const NAVIGATION_ROUTES: RouteConfig[] = [
  {
    id: 'dashboard',
    label: 'Command Center',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    description: 'High-level discipline overview, today’s habits, and streak status'
  },
  {
    id: 'streaks',
    label: 'My Streaks',
    shortLabel: 'Streaks',
    icon: Flame,
    description: 'Independent abstinence, completion, and quantitative trackers'
  },
  {
    id: 'calendar',
    label: 'Consistency Calendar',
    shortLabel: 'Calendar',
    icon: CalendarDays,
    description: 'Activity heatmaps, monthly schedules, and history'
  },
  {
    id: 'journal',
    label: 'Journal & Reflections',
    shortLabel: 'Journal',
    icon: BookOpen,
    description: 'Encrypted private journaling, urge logs, and emotional triggers'
  },
  {
    id: 'analytics',
    label: 'Discipline Analytics',
    shortLabel: 'Analytics',
    icon: LineChart,
    description: 'Rolling 30-day discipline score, habit breakdown, and trends'
  },
  {
    id: 'focus',
    label: 'Focus Mode',
    shortLabel: 'Focus',
    icon: Timer,
    description: 'Minimalist deep work timer, focus history, and daily stats'
  },
  {
    id: 'milestones',
    label: 'Milestones & Rewards',
    shortLabel: 'Rewards',
    icon: Trophy,
    description: 'Custom threshold celebration rules and personal reward claims'
  },
  {
    id: 'recovery',
    label: 'Recovery Protocol',
    shortLabel: 'Recovery',
    icon: ShieldAlert,
    description: 'Constructive setback analysis without shame or guilt'
  },
  {
    id: 'settings',
    label: 'Settings & Storage',
    shortLabel: 'Settings',
    icon: Settings,
    description: 'Local-first database, backup export/import, and privacy'
  }
];
