import { useState } from 'react';
import { AppShell } from './app/AppShell';
import type { RouteId } from './app/routes';
import { CommandCenter } from './features/command-center/CommandCenter';
import { StreaksView } from './features/streaks/StreaksView';
import { CalendarView } from './features/calendar/CalendarView';
import { JournalView } from './features/journal/JournalView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { FocusView } from './features/focus/FocusView';
import { MilestonesView } from './features/milestones/MilestonesView';
import { RecoveryView } from './features/recovery/RecoveryView';
import { SettingsView } from './features/settings/SettingsView';
import { QuickActionModal } from './components/modals/QuickActionModal';
import { HabitFormModal } from './components/modals/HabitFormModal';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<RouteId>('dashboard');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isCreateHabitOpen, setIsCreateHabitOpen] = useState(false);

  const renderCurrentView = () => {
    switch (currentRoute) {
      case 'dashboard':
        return (
          <CommandCenter
            onNavigate={(route) => setCurrentRoute(route)}
            onOpenQuickAction={() => setIsQuickActionOpen(true)}
          />
        );
      case 'streaks':
        return (
          <StreaksView
            onOpenNewHabit={() => setIsCreateHabitOpen(true)}
          />
        );
      case 'calendar':
        return <CalendarView />;
      case 'journal':
        return <JournalView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'focus':
        return <FocusView />;
      case 'milestones':
        return <MilestonesView />;
      case 'recovery':
        return <RecoveryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <CommandCenter
            onNavigate={(route) => setCurrentRoute(route)}
            onOpenQuickAction={() => setIsQuickActionOpen(true)}
          />
        );
    }
  };

  return (
    <>
      <AppShell
        currentRoute={currentRoute}
        onRouteChange={(route) => setCurrentRoute(route)}
        onQuickAction={() => setIsQuickActionOpen(true)}
      >
        {renderCurrentView()}
      </AppShell>

      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onNavigate={(route) => setCurrentRoute(route)}
        onOpenCreateHabit={() => setIsCreateHabitOpen(true)}
      />

      <HabitFormModal
        isOpen={isCreateHabitOpen}
        onClose={() => setIsCreateHabitOpen(false)}
        onSuccess={() => {}}
      />
    </>
  );
}

export default App;
