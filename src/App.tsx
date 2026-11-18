import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { getPathForRoute, type RouteId } from './app/routes';
import { CommandCenter } from './features/command-center/CommandCenter';
import { RouteLoadingFallback } from './components/feedback/RouteLoadingFallback';

// Route-level code splitting: secondary views are loaded on demand
const StreaksView = lazy(() => import('./features/streaks/StreaksView').then((m) => ({ default: m.StreaksView })));
const CalendarView = lazy(() => import('./features/calendar/CalendarView').then((m) => ({ default: m.CalendarView })));
const JournalView = lazy(() => import('./features/journal/JournalView').then((m) => ({ default: m.JournalView })));
const AnalyticsView = lazy(() => import('./features/analytics/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const FocusView = lazy(() => import('./features/focus/FocusView').then((m) => ({ default: m.FocusView })));
const MilestonesView = lazy(() => import('./features/milestones/MilestonesView').then((m) => ({ default: m.MilestonesView })));
const SettingsView = lazy(() => import('./features/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const NotFoundView = lazy(() => import('./features/not-found/NotFoundView').then((m) => ({ default: m.NotFoundView })));

// Lazy-loaded modal overlays to keep initial bundle lean
const QuickActionModal = lazy(() => import('./components/modals/QuickActionModal').then((m) => ({ default: m.QuickActionModal })));
const HabitFormModal = lazy(() => import('./components/modals/HabitFormModal').then((m) => ({ default: m.HabitFormModal })));

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
        <Suspense fallback={<RouteLoadingFallback />}>
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
        </Suspense>
      </AppShell>

      {isQuickActionOpen && (
        <Suspense fallback={null}>
          <QuickActionModal
            isOpen={isQuickActionOpen}
            onClose={() => setIsQuickActionOpen(false)}
            onNavigate={handleNavigate}
            onOpenCreateHabit={() => setIsCreateHabitOpen(true)}
          />
        </Suspense>
      )}

      {isCreateHabitOpen && (
        <Suspense fallback={null}>
          <HabitFormModal
            isOpen={isCreateHabitOpen}
            onClose={() => setIsCreateHabitOpen(false)}
            onSuccess={() => {}}
          />
        </Suspense>
      )}
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
