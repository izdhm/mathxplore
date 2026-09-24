/**
 * Render smoke test.
 *
 * Renders every page to a string with the real providers and router in place.
 * It cannot exercise canvas or WebGL (both live in effects, which do not run
 * here), but it does catch the failures that actually break a demo: a bad hook
 * order, a missing provider, an undefined field read during render, a route
 * that throws on first paint.
 *
 * Run with:  npm run test:pages
 */

import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';

import { ProgressProvider } from '../src/state/progress';
import { ThemeProvider } from '../src/state/theme';
import { Landing } from '../src/pages/Landing';
import { ExploreHub } from '../src/pages/Explore';
import { LinearModule } from '../src/pages/explore/LinearModule';
import { QuadraticModule } from '../src/pages/explore/QuadraticModule';
import { TrigModule } from '../src/pages/explore/TrigModule';
import { SurfaceModule } from '../src/pages/explore/SurfaceModule';
import { GeometryModule } from '../src/pages/explore/GeometryModule';
import { LearnHub } from '../src/pages/Learn';
import { LessonView } from '../src/pages/LessonView';
import { CodeLab } from '../src/pages/CodeLab';
import { Challenges } from '../src/pages/Challenges';
import { Sandbox } from '../src/pages/Sandbox';
import { Dashboard } from '../src/pages/Dashboard';
import { Teacher } from '../src/pages/Teacher';
import { LESSONS } from '../src/content/lessons';
import { CHALLENGES } from '../src/content/challenges';
import { ALL_SCENARIOS } from '../src/content/whatif';

interface PageCase {
  name: string;
  route: string;
  /** Route pattern, when the page reads URL parameters. */
  path?: string;
  element: ReactElement;
  /** Text that must appear in the rendered markup. */
  expect: string[];
}

const pages: PageCase[] = [
  { name: 'Landing', route: '/', element: <Landing />, expect: ['Xplore', 'What If?', 'Shapes as code'] },
  { name: 'Explore hub', route: '/explore', element: <ExploreHub />, expect: ['Quadratic', 'Geometry', 'Surfaces'] },
  { name: 'Linear module', route: '/explore/linear', element: <LinearModule />, expect: ['gradient', 'y-intercept'] },
  { name: 'Quadratic module', route: '/explore/quadratic', element: <QuadraticModule />, expect: ['Discriminant', 'axis of symmetry', 'What If?'] },
  { name: 'Trig module', route: '/explore/trigonometry', element: <TrigModule />, expect: ['amplitude', 'Period'] },
  { name: 'Surface module', route: '/explore/surfaces', element: <SurfaceModule />, expect: ['Cross-sections', 'Saddle'] },
  { name: 'Surface module via ?preset=ripple', route: '/explore/surfaces?preset=ripple', element: <SurfaceModule />, expect: ['Ripple', 'math.sqrt(x**2 + y**2)'] },
  { name: 'Geometry lab', route: '/explore/geometry', element: <GeometryModule />, expect: ['Geometry Lab', 'circle', 'Polygon', 'Solids'] },
  { name: 'Learn hub', route: '/learn', element: <LearnHub />, expect: ['Python', 'Level'] },
  { name: 'Lesson: functions', route: '/learn/functions', path: '/learn/:lessonId', element: <LessonView />, expect: ['def f(x)', 'Common mistakes', 'Solution'] },
  { name: 'CodeLab', route: '/codelab', element: <CodeLab />, expect: ['Run', 'Shapes', 'Turtle'] },
  { name: 'Challenges', route: '/challenges', element: <Challenges />, expect: ['Challenges', 'Hints', 'Solution'] },
  { name: 'Sandbox', route: '/sandbox', element: <Sandbox />, expect: ['MathSandbox', 'Python Sandbox'] },
  { name: 'Dashboard', route: '/progress', element: <Dashboard />, expect: ['Topic mastery', 'Evaluation data'] },
  { name: 'Teacher', route: '/teacher', element: <Teacher />, expect: ['Class insight', 'not implemented'] },
];

let passed = 0;
const failures: string[] = [];

for (const page of pages) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[page.route]}>
        <ThemeProvider>
        <ProgressProvider>
          {page.path ? (
            <Routes>
              <Route path={page.path} element={page.element} />
            </Routes>
          ) : (
            page.element
          )}
        </ProgressProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    const missing = page.expect.filter((text) => !html.includes(text));
    if (missing.length) {
      failures.push(`  ${page.name}\n    rendered, but missing: ${missing.join(', ')}`);
    } else if (html.length < 500) {
      failures.push(`  ${page.name}\n    rendered only ${html.length} characters - probably empty`);
    } else {
      passed++;
    }
  } catch (e) {
    failures.push(`  ${page.name}\n    threw during render: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---- Content integrity ----------------------------------------------------

const contentChecks: { name: string; ok: boolean; detail: string }[] = [
  {
    name: 'lesson ids are unique',
    ok: new Set(LESSONS.map((l) => l.id)).size === LESSONS.length,
    detail: 'two lessons share an id',
  },
  {
    name: 'lesson levels are 1..6 in order',
    ok: LESSONS.every((l, i) => l.level === i + 1),
    detail: 'lesson levels are out of order',
  },
  {
    name: 'challenge ids are unique',
    ok: new Set(CHALLENGES.map((c) => c.id)).size === CHALLENGES.length,
    detail: 'two challenges share an id',
  },
  {
    name: 'every What If? has exactly one correct option',
    ok: ALL_SCENARIOS.every((s) => s.options.filter((o) => o.correct).length === 1),
    detail: 'a scenario has zero or several correct options',
  },
  {
    name: 'every What If? actually changes its parameter',
    ok: ALL_SCENARIOS.every((s) => s.from !== s.to),
    detail: 'a scenario animates from a value to itself',
  },
  {
    name: 'multiple-choice answers are in range',
    ok: CHALLENGES.every((c) => c.kind !== 'predict' || (c.answer >= 0 && c.answer < c.options.length)),
    detail: 'a predict challenge points at a non-existent option',
  },
  {
    name: 'every challenge offers at least one hint',
    ok: CHALLENGES.every((c) => c.hints.length > 0),
    detail: 'a challenge has no hints',
  },
  {
    name: 'every code challenge draws the function its solution defines',
    ok: CHALLENGES.every((c) => c.kind === 'predict' || c.solution.includes(`def ${c.visual.fn}(`)),
    detail: 'a challenge visual names a function its solution does not define',
  },
  {
    name: 'every code challenge and lesson carries a solution',
    ok: CHALLENGES.every((c) => c.kind === 'predict' || c.solution.trim().length > 0) && LESSONS.every((l) => l.solution.trim().length > 0),
    detail: 'a code task has no reference solution to reveal',
  },
];

for (const check of contentChecks) {
  if (check.ok) passed++;
  else failures.push(`  ${check.name}\n    ${check.detail}`);
}

const total = pages.length + contentChecks.length;
console.log(`\nMathXplore pages & content - ${passed}/${total} checks passed`);
if (failures.length) {
  console.log('\nFailures:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('All good.\n');
