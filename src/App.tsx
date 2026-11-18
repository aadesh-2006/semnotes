import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { getPathForRoute, type RouteId } from './app/routes';
import { CommandCenter } from './features/command-center/CommandCenter';
import { StreaksView } from './features/streaks/StreaksView';
import { CalendarView } from './features/calendar/CalendarView';
import { JournalView } from './features/journal/JournalView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { FocusView } from './features/focus/FocusView';
import { MilestonesView } from './features/milestones/MilestonesView';
import { SettingsView } from './features/settings/SettingsView';
import { NotFoundView } from './features/not-found/NotFoundView';
import { QuickActionModal } from './components/modals/QuickActionModal';
import { HabitFormModal } from './components/modals/HabitFormModal';

function HabitDetailRedirect() {
  const { habitId } = useParams<{ habitId: string }>();
  return <Navigate to={`/streaks/${habitId || ''}`} replace />;
}

export function AppContent() {
  const navigate = useNavigate();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isCreateHabitOpen, setIsCreateHabitOpen] = useState(false);

  const handleNavigate = (route: RouteId) => {
    navigate(getPathForRoute(route));
  };

  return (
    <>
      <AppShell
        onRouteChange={handleNavigate}
        onQuickAction={() => setIsQuickActionOpen(true)}
      >
        <Routes>
          <Route
            path="/"
            element={
              <CommandCenter
                onNavigate={handleNavigate}
                onOpenQuickAction={() => setIsQuickActionOpen(true)}
              />
            }
          />
          <Route
            path="/streaks"
            element={<StreaksView onOpenNewHabit={() => setIsCreateHabitOpen(true)} />}
          />
          <Route
            path="/streaks/:habitId"
            element={<StreaksView onOpenNewHabit={() => setIsCreateHabitOpen(true)} />}
          />
          <Route
            path="/habits"
            element={<Navigate to="/streaks" replace />}
          />
          <Route
            path="/habits/:habitId"
            element={<HabitDetailRedirect />}
          />
          <Route
            path="/calendar"
            element={<CalendarView onNavigate={handleNavigate} />}
          />
          <Route path="/journal" element={<JournalView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/focus" element={<FocusView />} />
          <Route path="/milestones" element={<MilestonesView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route
            path="/data"
            element={<Navigate to="/settings" replace />}
          />
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </AppShell>

      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onNavigate={handleNavigate}
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

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
