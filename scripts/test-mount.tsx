/**
 * Mount test.
 *
 * The render smoke test proves the pages produce markup; it cannot prove the
 * app survives being mounted in a browser, because effects do not run under
 * server rendering. This mounts the real app into a DOM and fails on any error
 * that reaches the console or an error boundary.
 *
 * Run with:  npm run test:mount
 */

import { JSDOM } from 'jsdom';

// ---- browser environment ---------------------------------------------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const { window } = dom;

// Things jsdom does not implement but a real browser does. Stubbed rather than
// faked: enough for mounting to proceed, so genuine failures still surface.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.assign(window, {
  ResizeObserver: ResizeObserverStub,
  matchMedia: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
  // Deliberately returns a value. Real browsers return undefined here, but a
  // patched window.scrollTo (browser extensions do this) returns something -
  // and an effect written as `useEffect(() => window.scrollTo(...))` then hands
  // that value to React as its cleanup function, crashing the whole tree on the
  // first navigation. Returning a value here keeps that class of bug caught.
  scrollTo: () => true,
});

// Canvas: jsdom implements no contexts. When MOUNT_WEBGL is set we claim a
// WebGL context exists so the lazy 3D component really loads Three.js - that
// exercises the error path a real browser would take if WebGL then failed.
const claimWebGL = process.env.MOUNT_WEBGL === '1';
window.HTMLCanvasElement.prototype.getContext = ((kind: string) =>
  claimWebGL && kind.startsWith('webgl') ? {} : null) as never;

const globals = [
  'window', 'document', 'navigator', 'location', 'history', 'HTMLElement',
  'HTMLCanvasElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent',
  'KeyboardEvent', 'getComputedStyle', 'requestAnimationFrame',
  'cancelAnimationFrame', 'ResizeObserver', 'matchMedia', 'localStorage',
  'sessionStorage', 'Blob', 'DOMRect',
  // `performance` is deliberately left as Node's own: assigning jsdom's over it
  // makes the two delegate to each other and blow the stack.
] as const;

for (const key of globals) {
  // Node defines some of these (navigator, performance) as getter-only, so
  // assign through a property descriptor rather than plain assignment.
  Object.defineProperty(globalThis, key, {
    value: (window as unknown as Record<string, unknown>)[key],
    writable: true,
    configurable: true,
  });
}

// ---- capture every failure route -------------------------------------------
const problems: string[] = [];

const originalError = console.error;
console.error = (...args: unknown[]) => {
  const text = args.map(String).join(' ');
  // React logs a warning for useLayoutEffect under some renderers; harmless.
  if (!text.includes('useLayoutEffect does nothing on the server')) {
    problems.push(`console.error: ${text.slice(0, 400)}`);
  }
  originalError(...args);
};

window.addEventListener('error', (e) => problems.push(`window error: ${e.message}`));
window.addEventListener('unhandledrejection', (e: Event) =>
  problems.push(`unhandled rejection: ${String((e as PromiseRejectionEvent).reason)}`),
);

// ---- mount -------------------------------------------------------------------
const { createRoot } = await import('react-dom/client');
const { default: App } = await import('../src/App');
const { StrictMode, createElement } = await import('react');

const container = window.document.getElementById('root')!;

let html = '';
try {
  const root = createRoot(container);
  root.render(createElement(StrictMode, null, createElement(App)));
  // Let effects, lazy chunks and microtasks settle.
  await new Promise((r) => setTimeout(r, 400));
  html = container.innerHTML;
} catch (e) {
  problems.push(`threw while mounting: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
}

console.error = originalError;

// ---- report --------------------------------------------------------------------
console.log('\nMathXplore mount test');
console.log(`  rendered ${html.length} characters into #root`);

if (html.length < 1000) {
  problems.push(
    `#root is essentially empty (${html.length} chars) - this is the blank-screen failure`,
  );
}
for (const marker of ['MathXplore', 'What If?', 'Shapes as code']) {
  if (!html.includes(marker)) problems.push(`expected text missing from the mounted page: ${marker}`);
}

// A canvas given an explicit pixel width can end up wider than its bordered
// parent's content box. In a container sized by its contents that overflow
// widens the container, which re-fires the ResizeObserver, which widens the
// canvas - and the graph creeps sideways for ever. Canvases must be laid out at
// width:100% and only have their backing store sized in code.
const canvases = [...container.querySelectorAll('canvas')];
for (const canvas of canvases) {
  if ((canvas as HTMLCanvasElement).style.width) {
    problems.push(
      'a canvas has an inline CSS width; this re-introduces the ResizeObserver growth loop',
    );
    break;
  }
}
console.log(`  checked ${canvases.length} canvas element(s) for layout feedback`);

if (problems.length) {
  console.log('\nProblems:');
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('  mounted cleanly, no console errors.\n');
// The landing page schedules requestAnimationFrame for ever, and jsdom's
// pretendToBeVisual keeps honouring it, so the process would never exit on its
// own. The verdict is in; leave explicitly.
window.close();
process.exit(0);
