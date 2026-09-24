/**
 * Quadratic Functions - the flagship Explore module.
 *
 * Everything the brief asks a module to do happens here: parameters that move
 * the mathematics in real time, features labelled on the curve as they move,
 * a What If? that demands a prediction first, the Python that produces the same
 * result, and a real application at the bottom so the algebra has somewhere to
 * land.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModuleFrame } from '../../components/layout/ModuleFrame';
import { Graph2D, type Curve, type Guide, type Marker } from '../../components/graph/Graph2D';
import { ParameterSlider } from '../../components/ui/Slider';
import {
  Badge, Button, MathExpr, Panel, PanelHeader, Stat, cx,
} from '../../components/ui/Primitives';
import { InfoDot } from '../../components/ui/Tooltip';
import { WhatIfPanel } from '../../components/learn/WhatIfPanel';
import { CodeMathMap } from '../../components/learn/CodeMathMap';
import { QUADRATIC_SCENARIOS } from '../../content/whatif';
import { analyseQuadratic, fmt, fmtCode } from '../../lib/math/functions';
import { useProgress } from '../../state/progress';

const PRESETS = [
  { name: 'y = x²', a: 1, b: 0, c: 0 },
  { name: 'Two roots', a: 1, b: -1, c: -6 },
  { name: 'Touching', a: 1, b: 2, c: 1 },
  { name: 'No real roots', a: 1, b: 0, c: 4 },
  { name: 'Downward', a: -0.6, b: 1.2, c: 4 },
];

export function QuadraticModule() {
  const { recordExploration } = useProgress();
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(-3);
  const [ghost, setGhost] = useState<{ param: string; value: number } | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [showFeatures, setShowFeatures] = useState(true);
  const touches = useRef(0);

  const scenario = QUADRATIC_SCENARIOS[scenarioIndex];
  const q = useMemo(() => analyseQuadratic(a, b, c), [a, b, c]);

  const touch = () => {
    if (++touches.current % 14 === 0) recordExploration('quadratic-explorer', 'quadratic');
  };

  const setParam = (name: string, v: number) => {
    if (name === 'a') setA(v);
    else if (name === 'b') setB(v);
    else setC(v);
  };

  // The "before" curve, drawn faintly during a What If? animation.
  const ghostCurve = useMemo<Curve | null>(() => {
    if (!ghost) return null;
    const g = { a, b, c, [ghost.param]: ghost.value } as { a: number; b: number; c: number };
    return {
      f: (x) => g.a * x * x + g.b * x + g.c,
      color: '#8fa0bf',
      dashed: true,
      opacity: 0.5,
      width: 1.8,
      label: 'before',
    };
  }, [ghost, a, b, c]);

  const curves = useMemo<Curve[]>(() => {
    const main: Curve = {
      f: (x) => a * x * x + b * x + c,
      color: '#38bdf8',
      width: 2.6,
      label: q.equation,
    };
    return ghostCurve ? [ghostCurve, main] : [main];
  }, [a, b, c, q.equation, ghostCurve]);

  const markers = useMemo<Marker[]>(() => {
    if (!showFeatures) return [];
    const out: Marker[] = [];
    if (q.isQuadratic) {
      out.push({
        x: q.vertex.x,
        y: q.vertex.y,
        label: `vertex (${fmt(q.vertex.x)}, ${fmt(q.vertex.y)})`,
        color: '#a78bfa',
        kind: 'ring',
      });
    }
    for (const r of q.roots) {
      out.push({ x: r, y: 0, label: `x = ${fmt(r)}`, color: '#fbbf24' });
    }
    out.push({ x: 0, y: c, label: `y-intercept ${fmt(c)}`, color: '#34d399' });
    return out;
  }, [q, c, showFeatures]);

  const guides = useMemo<Guide[]>(
    () =>
      showFeatures && q.isQuadratic
        ? [{ kind: 'vline', at: q.axisOfSymmetry, color: 'rgba(167,139,250,0.45)', label: 'axis of symmetry' }]
        : [],
    [q, showFeatures],
  );

  const pythonCode =
    `def quadratic(x, a, b, c):\n` +
    `    return a*x**2 + b*x + c\n\n` +
    `a, b, c = ${fmtCode(a)}, ${fmtCode(b)}, ${fmtCode(c)}\n\n` +
    `xs = linspace(-10, 10, 200)\n` +
    `ys = []\n` +
    `for x in xs:\n` +
    `    ys.append(quadratic(x, a, b, c))\n\n` +
    `plot(xs, ys, label="y = ax² + bx + c")`;

  // The sliders, once: in the controls column, and again inside the graph
  // when it is fullscreen so the experiment can carry on at full size.
  const sliders = (
    <div className="space-y-2.5 p-3">
      <ParameterSlider
        symbol="a"
        label="shape"
        value={a}
        onChange={(v) => { setA(v); touch(); }}
        min={-3}
        max={3}
        step={0.05}
        domain="viz"
        focus={ghost?.param === 'a'}
        meaning="Sign decides which way it opens; size decides how narrow it is."
      />
      <ParameterSlider
        symbol="b"
        label="slide"
        value={b}
        onChange={(v) => { setB(v); touch(); }}
        min={-8}
        max={8}
        step={0.1}
        domain="math"
        focus={ghost?.param === 'b'}
        meaning="Moves the vertex along a curved path — not simply sideways."
      />
      <ParameterSlider
        symbol="c"
        label="height"
        value={c}
        onChange={(v) => { setC(v); touch(); }}
        min={-10}
        max={10}
        step={0.1}
        domain="code"
        focus={ghost?.param === 'c'}
        meaning="Lifts the whole curve. Always equals the y-intercept."
      />
    </div>
  );

  return (
    <ModuleFrame
      eyebrow="Explore · Module 2"
      title="Quadratic Functions"
      equation="y = ax^2 + bx + c"
      description="Three coefficients, and each one controls something different. Move them and watch which features follow — and, just as importantly, which ones do not."
      loop={['explore', 'predict', 'change', 'visualise']}
      nextTo="/explore/trigonometry"
      nextLabel="Trigonometry"
      controls={
        <>
          <Panel>
            <PanelHeader title="Parameters" icon="sliders" domain="viz" />
            {sliders}

            <div className="border-t border-line px-3 py-2.5">
              <div className="eyebrow mb-2">Presets</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { setA(p.a); setB(p.b); setC(p.c); setGhost(null); }}
                    className="rounded-md border border-line bg-surface-2/60 px-2 py-1 text-[11.5px] text-muted transition-colors hover:border-viz/40 hover:text-viz"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Live analysis"
              icon="chart"
              domain="math"
              right={
                <button
                  onClick={() => setShowFeatures((s) => !s)}
                  className={cx(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    showFeatures ? 'border-math/40 bg-math/10 text-math' : 'border-line text-faint',
                  )}
                >
                  labels
                </button>
              }
            />
            <div className="grid grid-cols-2 gap-2 p-3">
              <Stat
                label="Opens"
                value={q.opens === 'neither' ? 'not a parabola' : q.opens}
                domain="viz"
                hint={q.opens === 'upward' ? 'vertex is a minimum' : q.opens === 'downward' ? 'vertex is a maximum' : 'a = 0 gives a line'}
              />
              <Stat label="Width" value={q.width} domain="viz" />
              <Stat
                label="Vertex"
                value={q.isQuadratic ? `(${fmt(q.vertex.x)}, ${fmt(q.vertex.y)})` : '—'}
                domain="math"
                hint="x = −b / 2a"
              />
              <Stat
                label="Axis"
                value={q.isQuadratic ? `x = ${fmt(q.axisOfSymmetry)}` : '—'}
                domain="math"
              />
              <Stat
                label="Discriminant"
                value={fmt(q.discriminant)}
                domain={q.discriminant > 0 ? 'code' : q.discriminant < 0 ? 'spark' : 'math'}
                hint="b² − 4ac"
              />
              <Stat
                label="Real roots"
                value={q.rootCount}
                domain="spark"
                hint={
                  q.rootCount === 2 ? 'crosses the x-axis twice'
                  : q.rootCount === 1 ? 'touches the x-axis once'
                  : 'never reaches the x-axis'
                }
              />
            </div>
            <div className="border-t border-line px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="eyebrow">Completed square</span>
                <InfoDot label="The same curve, rewritten so the vertex can be read straight off it." />
              </div>
              <MathExpr className="text-[16px] text-paper">{q.vertexForm}</MathExpr>
            </div>
          </Panel>
        </>
      }
      graph={
        <>
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <MathExpr className="text-[22px] text-paper">{q.equation}</MathExpr>
              <div className="flex items-center gap-2">
                {q.rootCount > 0 && (
                  <Badge domain="spark">
                    roots at {q.roots.map((r) => fmt(r)).join(' and ')}
                  </Badge>
                )}
                <Badge domain={q.discriminant > 0 ? 'code' : q.discriminant < 0 ? 'math' : 'spark'}>
                  D = {fmt(q.discriminant)}
                </Badge>
              </div>
            </div>
            <div className="p-3">
              <Graph2D
                fullscreenOverlay={sliders}
                curves={curves}
                markers={markers}
                guides={guides}
                view={{ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }}
                height={430}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="A thrown ball is a quadratic"
              icon="target"
              domain="spark"
              info="Height against time follows h(t) = v·t − 4.9t². Gravity supplies the negative a, which is why the path rises to a peak and comes back down."
            />
            <div className="grid gap-px bg-line sm:grid-cols-[1fr_240px]">
              <div className="bg-surface p-3">
                <Graph2D
                  curves={[
                    {
                      f: (t) => 20 * t - 4.9 * t * t,
                      color: '#fbbf24',
                      width: 2.4,
                      label: 'h(t) = 20t − 4.9t²',
                    },
                  ]}
                  markers={[
                    { x: 20 / 9.8, y: (20 * 20) / (4 * 4.9), label: 'highest point', color: '#a78bfa', kind: 'ring' },
                    { x: 20 / 4.9, y: 0, label: 'lands', color: '#fb7185' },
                  ]}
                  view={{ xMin: 0, xMax: 4.6, yMin: 0, yMax: 24 }}
                  height={210}
                  xLabel="t"
                  yLabel="h"
                  trace={false}
                />
              </div>
              <div className="bg-surface p-4">
                <ul className="space-y-2 text-[12.5px] text-muted">
                  {[
                    ['vertex', 'the top of the throw'],
                    ['axis of symmetry', 'up takes as long as down'],
                    ['positive root', 'when it lands'],
                  ].map(([term, meaning]) => (
                    <li key={term} className="flex items-baseline gap-2">
                      <span className="text-spark">{'→'}</span>
                      <span>
                        <span className="text-paper">{term}</span> — {meaning}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/challenges" className="mt-3 inline-block">
                  <Button variant="ghost" className="px-3 py-1.5 text-[12px]">
                    Try the projectile challenge →
                  </Button>
                </Link>
              </div>
            </div>
          </Panel>
        </>
      }
      aside={
        <>
          <WhatIfPanel
            scenario={scenario}
            onValue={(v) => setParam(scenario.parameter, v)}
            onGhost={(v) => setGhost(v === null ? null : { param: scenario.parameter, value: v })}
          />

          <div className="flex items-center justify-between rounded-lg border border-line bg-surface/40 px-3 py-2">
            <span className="text-[11.5px] text-faint">
              Scenario {scenarioIndex + 1} of {QUADRATIC_SCENARIOS.length}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setScenarioIndex((i) => (i - 1 + QUADRATIC_SCENARIOS.length) % QUADRATIC_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Previous scenario"
              >
                ←
              </button>
              <button
                onClick={() => setScenarioIndex((i) => (i + 1) % QUADRATIC_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Next scenario"
              >
                →
              </button>
            </div>
          </div>

          <Panel className="overflow-hidden">
            <PanelHeader
              title="The same curve, in code"
              icon="code"
              domain="code"
              info="These values track the sliders. Open it in CodeLab, change a number, and the graph you get back is the one above."
              right={
                <Link to={`/codelab?code=${encodeURIComponent(pythonCode)}`}>
                  <Button variant="code" className="px-3 py-1.5 text-[12px]">
                    Open in CodeLab
                  </Button>
                </Link>
              }
            />
            <pre className="code-surface overflow-x-auto px-4 py-3 text-[12.5px] text-paper/90">
              {pythonCode}
            </pre>
          </Panel>

          <CodeMathMap
            title="Code → Math"
            maths={[
              { text: 'y = ' },
              { text: 'ax^2', pair: 'sq' },
              { text: ' + ' },
              { text: 'bx', pair: 'lin' },
              { text: ' + ' },
              { text: 'c', pair: 'con' },
            ]}
            python={[
              { text: 'y = ' },
              { text: 'a*x**2', pair: 'sq' },
              { text: ' + ' },
              { text: 'b*x', pair: 'lin' },
              { text: ' + ' },
              { text: 'c', pair: 'con' },
            ]}
            pairings={[
              { id: 'sq', note: 'ax² needs two things spelled out: the multiplication (*) and the power (**).' },
              { id: 'lin', note: 'bx becomes b*x. Python cannot tell bx apart from a variable named bx.' },
              { id: 'con', note: 'The constant is written identically — and it is always the y-intercept.' },
            ]}
          />
        </>
      }
    />
  );
}
