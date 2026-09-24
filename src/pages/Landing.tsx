/**
 * The landing page.
 *
 * One job: make it obvious within about five seconds that this is not a
 * calculator. The page is a stack of screens - one idea per screen, centred,
 * and the window snaps from one to the next: the name, the three modes, a
 * live surface, a What If? with a live slider, a scene of solids, the loop.
 * Each screen has an arrow to the next and a button back to the top. A
 * handful of words between them. The arguments a judge or teacher might want are still here,
 * one hover away, behind the info dots; a student is never made to read them.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LazySurface3D } from '../components/graph/LazySurface3D';
import { LazyShapeScene3D } from '../components/graph/LazyShapeScene3D';
import { Graph2D } from '../components/graph/Graph2D';
import { Button, MathExpr, Panel, cx } from '../components/ui/Primitives';
import { ParameterSlider } from '../components/ui/Slider';
import { Icon, type IconName } from '../components/ui/Icon';
import { InfoDot, Tooltip } from '../components/ui/Tooltip';
import { FullscreenFrame } from '../components/ui/Fullscreen';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import { runPython } from '../lib/pyengine';
import { LESSONS } from '../content/lessons';
import { CHALLENGES } from '../content/challenges';
import { ALL_SCENARIOS } from '../content/whatif';

const MODES: { id: string; name: string; domain: 'math' | 'viz' | 'code'; icon: IconName; to: string; body: string }[] = [
  { id: 'learn', name: 'Learn', domain: 'math', icon: 'book', to: '/learn', body: 'A concept and the Python that expresses it, side by side.' },
  { id: 'explore', name: 'Explore', domain: 'viz', icon: 'sliders', to: '/explore', body: 'Move a parameter; watch the mathematics answer in real time.' },
  { id: 'create', name: 'Create', domain: 'code', icon: 'flask', to: '/sandbox', body: 'Write code that makes a curve, a shape, a model of your own.' },
];

const SOLIDS_PROGRAM =
  'from shapes import *\n' +
  'sphere(1.1, at=(-3.2, 0, 0), color="cyan")\n' +
  'cube(1.8, at=(0, 0, 0), color="violet")\n' +
  'cone(1, 2.2, at=(3.2, 0, 0), color="amber")\n' +
  'torus(1.3, 0.35, at=(0, 3.2, 0), color="pink")\n' +
  'prism(6, 1, 1.4, at=(-3, 3, 0), color="mint")\n' +
  'pyramid(1.8, 1.8, at=(3, 3, 0), color="sky")\n';

/** Smooth-scrolls to a screen by id. */
function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** The chevron at the foot of a screen: one press, next screen. */
function NextArrow({ to }: { to: string }) {
  return (
    <a
      href={`#${to}`}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 text-faint transition-colors hover:text-paper animate-float"
      aria-label="Next section"
      onClick={(e) => {
        e.preventDefault();
        goTo(to);
      }}
    >
      <Icon name="chevronDown" size={22} />
    </a>
  );
}

/** Back to the top, shown once the first screen has been left. */
function TopButton() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const read = () => setShown(window.scrollY > 240);
    read();
    window.addEventListener('scroll', read, { passive: true });
    return () => window.removeEventListener('scroll', read);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={cx(
        'icon-btn fixed bottom-6 right-6 z-40 h-11 w-11 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)] transition-all duration-300',
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <Icon name="chevronUp" size={18} />
    </button>
  );
}

/** The viewport height, so a screen's visualisation can be sized to it. */
function useViewportHeight() {
  const [vh, setVh] = useState(900);
  useEffect(() => {
    const read = () => setVh(window.innerHeight);
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return vh;
}

export function Landing() {
  const [t, setT] = useState(0);
  // The What If? parabola's coefficient - a live slider, so the answer to the
  // question can be found by moving it rather than by reading about it.
  const [wa, setWa] = useState(-1);
  const solids = useMemo(() => runPython(SOLIDS_PROGRAM).scene, []);
  const heroFrame = useRef<HTMLDivElement>(null);
  const solidsFrame = useRef<HTMLDivElement>(null);
  const vh = useViewportHeight();
  // Each screen's picture takes a little over half the window, leaving room
  // for its title row and the panel's own frame.
  const vizHeight = Math.round(Math.max(320, Math.min(vh * 0.6, 720)));

  // Scroll snapping is a property of the document, so it is switched on only
  // while this page is showing.
  useEffect(() => {
    document.documentElement.classList.add('snap');
    return () => document.documentElement.classList.remove('snap');
  }, []);

  // A slow travelling ripple: z = sin(√(x² + y²) − t). Real mathematics,
  // animated - not a decorative mesh.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 42) {
        last = now;
        setT((v) => v + 0.055);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const whatIfSlider = (
    <ParameterSlider
      symbol="a"
      label="shape"
      value={wa}
      onChange={setWa}
      min={-3}
      max={3}
      step={0.1}
      domain="spark"
      meaning="Sign decides which way the parabola opens; size decides how narrow it is. The dashed curve is a = 1, for comparison."
    />
  );

  const heroSurface = (x: number, y: number) => {
    const r = Math.sqrt(x * x + y * y);
    return Math.sin(r - t) * (2.2 / (1 + r * 0.25));
  };

  return (
    <div className="px-4 sm:px-6">
      {/* ================================================== 1 · THE NAME */}
      <section id="top" className="snap-section relative mx-auto max-w-[1200px] text-center">
        <div className="animate-rise flex flex-col items-center">
          <h1 className="text-[64px] font-semibold leading-[0.95] tracking-tight text-paper sm:text-[110px] lg:text-[136px]">
            Math
            <span className="bg-gradient-to-r from-viz via-math to-spark bg-clip-text text-transparent">
              Xplore
            </span>
          </h1>

          <p className="mt-6 flex items-center justify-center gap-4 text-[26px] font-medium text-paper/85 sm:text-[38px]">
            <span className="text-viz">See.</span>
            <span className="text-math">Change.</span>
            <span className="text-code">Code.</span>
            <InfoDot
              className="ml-1"
              label="An interactive mathematics laboratory: students visualise concepts, experiment with mathematical ideas, and learn Python through real mathematical applications - entirely in the browser, with no installation and no internet connection."
            />
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/explore/quadratic">
              <Button variant="primary" className="px-6 py-3.5 text-[16px]">
                <Icon name="sliders" size={17} />
                Explore
              </Button>
            </Link>
            <Link to="/explore/geometry">
              <Button variant="ghost" className="px-6 py-3.5 text-[16px]">
                <Icon name="shapes" size={17} />
                Shapes
              </Button>
            </Link>
            <Link to="/codelab">
              <Button variant="code" className="px-6 py-3.5 text-[16px]">
                <Icon name="play" size={15} />
                Code
              </Button>
            </Link>
          </div>

          {/* Numbers, not sentences. */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {[
              { n: '5', label: 'modules', icon: 'grid' as IconName },
              { n: String(LESSONS.length), label: 'levels', icon: 'book' as IconName },
              { n: String(CHALLENGES.length), label: 'challenges', icon: 'target' as IconName },
              { n: String(ALL_SCENARIOS.length), label: 'what ifs', icon: 'sparkle' as IconName },
            ].map((stat) => (
              <Tooltip key={stat.label} label={stat.label}>
                <span className="glass-chip flex cursor-help items-center gap-2 px-3.5 py-2">
                  <Icon name={stat.icon} size={14} className="text-faint" />
                  <span className="font-math text-[22px] leading-none text-paper">{stat.n}</span>
                </span>
              </Tooltip>
            ))}
          </div>
        </div>

        <NextArrow to="modes" />
      </section>

      {/* ================================================== 2 · THREE MODES */}
      <section id="modes" className="snap-section relative mx-auto w-full max-w-[880px]">
        <div className="flex w-full flex-col gap-4">
          {MODES.map((mode, i) => (
            <Link key={mode.id} to={mode.to} className="group block animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
              <Panel tilt glow={mode.domain} className="flex items-center gap-5 p-6">
                <span
                  className={cx(
                    'glass-chip flex h-16 w-16 shrink-0 items-center justify-center',
                    mode.domain === 'math' && 'text-math',
                    mode.domain === 'viz' && 'text-viz',
                    mode.domain === 'code' && 'text-code',
                  )}
                >
                  <Icon name={mode.icon} size={28} />
                </span>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-[26px] font-semibold text-paper">{mode.name}</span>
                  <Tooltip label={mode.body}>
                    <span className="icon-btn h-9 w-9" aria-hidden>
                      <Icon name="arrowRight" size={15} />
                    </span>
                  </Tooltip>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
        <NextArrow to="live" />
      </section>

      {/* ================================================== 3 · A LIVE SURFACE */}
      <section id="live" className="snap-section relative mx-auto w-full max-w-[1200px]">
        {/* The equation is a link to the module where this surface lives, so
            the picture is a door, not a poster. */}
        <Panel className="w-full overflow-hidden animate-fade">
          <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-viz shadow-[0_0_10px_2px_rgba(76,201,255,0.6)]" />
            <Tooltip label="Open this surface in Explore → Surfaces">
              <Link
                to="/explore/surfaces?preset=ripple"
                className="group flex items-center gap-2 rounded-full border border-transparent px-3 py-1 transition-colors hover:border-line hover:bg-surface-2"
              >
                <MathExpr className="math-glow text-[18px] text-paper/90 sm:text-[22px]">
                  z = sin(√(x^2 + y^2) − t)
                </MathExpr>
                <Icon name="arrowRight" size={15} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-viz" />
              </Link>
            </Tooltip>
            <InfoDot label="Every vertex is a value of the function beside it, recalculated as it moves. Nothing here is a video. Drag to rotate, scroll to zoom - or follow the equation to the Surfaces module, where you can change it." />
          </div>
          <FullscreenFrame frameRef={heroFrame} className="viz-frame mx-3 mb-3 overflow-hidden">
            <LazySurface3D
              f={heroSurface}
              extent={6}
              resolution={56}
              height={vizHeight}
              showWireframe
              showAxes={false}
              autoRotate
            />
          </FullscreenFrame>
        </Panel>
        <NextArrow to="whatif" />
      </section>

      {/* ================================================== 4 · WHAT IF? */}
      <section id="whatif" className="snap-section relative mx-auto w-full max-w-[1200px]">
        <Panel className="w-full overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon name="sparkle" size={16} className="text-spark" />
              <span className="text-[17px] font-semibold text-paper">What If?</span>
              <InfoDot label="Predict first; only then does the graph move. A student watching an animation is a spectator. One who has committed to an answer is testing a belief - and a wrong prediction is where the concept lands." />
            </div>
            <div className="hidden items-center gap-1 sm:flex">
              {['Ask', 'Predict', 'Change', 'See'].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="rounded-full border border-spark/30 bg-spark/10 px-2 py-0.5 text-[11px] font-semibold text-spark">{s}</span>
                  {i < arr.length - 1 && <Icon name="arrowRight" size={10} className="text-faint" />}
                </span>
              ))}
            </div>
          </div>
          {/* The slider lives only in the fullscreen overlay, as with the 3D
              views: in the page the picture stands alone. */}
          <div className="px-3">
            <Graph2D
              curves={[
                { f: (x) => x * x, color: '#4cc9ff', label: 'a = 1', opacity: 0.35, dashed: true },
                { f: (x) => wa * x * x, color: '#ffc83d', label: `a = ${wa.toFixed(1)}`, width: 2.6 },
              ]}
              markers={[{ x: 0, y: 0, color: '#b39cff', kind: 'ring' }]}
              view={{ xMin: -9, xMax: 9, yMin: -9, yMax: 9 }}
              height={Math.round(vizHeight * 0.9)}
              trace={false}
              fullscreenOverlay={whatIfSlider}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <MathExpr className="text-[18px] text-math">{`y = ${wa.toFixed(1)}x^2`}</MathExpr>
            <Link to="/explore/quadratic">
              <Button variant="primary" className="px-5 py-2 text-[14px]">
                Try
                <Icon name="arrowRight" size={14} />
              </Button>
            </Link>
          </div>
        </Panel>
        <NextArrow to="shapes" />
      </section>

      {/* ================================================== 5 · SHAPES AS CODE */}
      <section id="shapes" className="snap-section relative mx-auto w-full max-w-[1200px]">
        <Panel className="w-full overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon name="shapes" size={16} className="text-viz" />
              <span className="text-[17px] font-semibold text-paper">Shapes as code</span>
              <InfoDot label="A shapes library inside the Python engine. circle(), polygon(), cube(), sphere() and friends draw themselves and report their own area, perimeter and volume. A turtle module is included too." />
            </div>
            <span className="hidden font-mono text-[12px] text-code sm:block">from shapes import *</span>
          </div>
          <FullscreenFrame frameRef={solidsFrame} className="viz-frame mx-3 overflow-hidden">
            <LazyShapeScene3D scene={solids} height={Math.round(vizHeight * 0.9)} autoRotate fitKey="landing" />
          </FullscreenFrame>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-mono text-[13px] text-muted">cube(2).volume</span>
            <Link to="/explore/geometry">
              <Button variant="ghost" className="px-5 py-2 text-[14px]">
                Open
                <Icon name="arrowRight" size={14} />
              </Button>
            </Link>
          </div>
        </Panel>
        <NextArrow to="loop" />
      </section>

      {/* ================================================== 6 · THE LOOP */}
      <section id="loop" className="snap-section relative mx-auto w-full max-w-[1200px] gap-6 text-center">
        <div className="flex max-w-full items-center gap-2">
          <LoopRibbon active={[]} />
          <InfoDot label="Every module runs this same cycle - Learn, Explore, Predict, Change, Visualise, Code, Test, Understand, Create - and it is visible in the interface rather than described in a document, so a student can always see which stage they are in and that there is another one after it." />
        </div>
        <Tooltip label="A digital interactive mathematics laboratory that integrates mathematical visualisation and Python programming to transform students from passive problem solvers into active mathematical explorers and creators. The innovation is the integration: visualisation, experimentation, programming, guided conceptual learning, interactive assessment and computational thinking, arranged so each reinforces the others.">
          <span className="cursor-help text-[22px] font-medium tracking-tight text-paper/85 sm:text-[28px]">
            See it. Change it. Code it. Question it. Create it.
          </span>
        </Tooltip>
        <Link to="/explore">
          <Button variant="primary" className="px-6 py-3 text-[15px]">
            Begin
            <Icon name="arrowRight" size={15} />
          </Button>
        </Link>
      </section>

      <TopButton />
    </div>
  );
}
