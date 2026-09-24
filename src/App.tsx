import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ProgressProvider } from './state/progress';
import { ThemeProvider } from './state/theme';

import { Landing } from './pages/Landing';
import { ExploreHub } from './pages/Explore';
import { LinearModule } from './pages/explore/LinearModule';
import { QuadraticModule } from './pages/explore/QuadraticModule';
import { TrigModule } from './pages/explore/TrigModule';
import { SurfaceModule } from './pages/explore/SurfaceModule';
import { GeometryModule } from './pages/explore/GeometryModule';
import { LearnHub } from './pages/Learn';
import { LessonView } from './pages/LessonView';
import { CodeLab } from './pages/CodeLab';
import { Challenges } from './pages/Challenges';
import { Sandbox } from './pages/Sandbox';
import { Dashboard } from './pages/Dashboard';
import { Teacher } from './pages/Teacher';

/** Scroll to the top on navigation - long pages otherwise keep their offset. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Braces matter here. An arrow with an implicit return hands whatever
    // scrollTo returns to React as this effect's clean-up function, and React
    // then tries to call it on the next navigation.
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    // Hash routing so the built app runs on any plain static host, in any
    // subdirectory, with no server-side rewrite rules - it has to work on
    // whatever machine is available on demonstration day.
    <ErrorBoundary>
      <HashRouter>
        <ThemeProvider>
        <ProgressProvider>
          <ScrollToTop />
          <AppShell>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/explore" element={<ExploreHub />} />
              <Route path="/explore/linear" element={<LinearModule />} />
              <Route path="/explore/quadratic" element={<QuadraticModule />} />
              <Route path="/explore/trigonometry" element={<TrigModule />} />
              <Route path="/explore/surfaces" element={<SurfaceModule />} />
              <Route path="/explore/geometry" element={<GeometryModule />} />
              <Route path="/learn" element={<LearnHub />} />
              <Route path="/learn/:lessonId" element={<LessonView />} />
              <Route path="/codelab" element={<CodeLab />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/sandbox" element={<Sandbox />} />
              <Route path="/progress" element={<Dashboard />} />
              <Route path="/teacher" element={<Teacher />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </ProgressProvider>
        </ThemeProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
