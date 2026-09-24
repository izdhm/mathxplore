/**
 * Linear Functions - where gradient becomes something you can watch.
 *
 * The rise-over-run triangle is drawn on the line itself and resizes as the
 * gradient changes, so "m is the change in y for a step of 1 in x" stops being
 * a sentence to memorise and becomes a shape on the screen.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModuleFrame } from '../../components/layout/ModuleFrame';
import { Graph2D, type Curve, type Marker } from '../../components/graph/Graph2D';
import { ParameterSlider } from '../../components/ui/Slider';
import { Badge, Button, MathExpr, Panel, PanelHeader, Stat, cx } from '../../components/ui/Primitives';
import { InfoDot } from '../../components/ui/Tooltip';
import { WhatIfPanel } from '../../components/learn/WhatIfPanel';
import { CodeMathMap } from '../../components/learn/CodeMathMap';
import { LINEAR_SCENARIOS } from '../../content/whatif';
import { analyseLinear, fmt, fmtCode } from '../../lib/math/functions';
import { useProgress } from '../../state/progress';

export function LinearModule() {
  const { recordExploration } = useProgress();
  const [m, setM] = useState(2);
  const [c, setC] = useState(1);
  const [compare, setCompare] = useState(false);
  const [ghost, setGhost] = useState<{ param: string; value: number } | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const touches = useRef(0);

  const scenario = LINEAR_SCENARIOS[scenarioIndex];
  const line = useMemo(() => analyseLinear(m, c), [m, c]);

  const touch = () => {
    if (++touches.current % 14 === 0) recordExploration('linear-explorer', 'linear');
  };

  const setParam = (name: string, v: number) => (name === 'm' ? setM(v) : setC(v));

  const curves = useMemo<Curve[]>(() => {
    const out: Curve[] = [];

    if (ghost) {
      const g = { m, c, [ghost.param]: ghost.value } as { m: number; c: number };
      out.push({
        f: (x) => g.m * x + g.c,
        color: '#8fa0bf',
        dashed: true,
        opacity: 0.5,
        width: 1.8,
        label: 'before',
      });
    }

    out.push({ f: (x) => m * x + c, color: '#38bdf8', width: 2.6, label: line.equation });

    // The gradient triangle: one step right, then m up.
    out.push({
      xs: [0, 1, 1],
      ys: [c, c, m + c],
      color: '#fbbf24',
      width: 1.6,
      dashed: true,
    });

    if (compare) {
      out.push({ f: (x) => m * x + c + 4, color: '#a78bfa', width: 1.8, opacity: 0.8, label: 'parallel: same m' });
    }
    return out;
  }, [m, c, ghost, compare, line.equation]);

  const markers = useMemo<Marker[]>(() => {
    const out: Marker[] = [
      { x: 0, y: c, label: `(0, ${fmt(c)})`, color: '#34d399' },
      { x: 1, y: m + c, label: `run 1, rise ${fmt(m)}`, color: '#fbbf24' },
    ];
    if (line.xIntercept !== null) {
      out.push({ x: line.xIntercept, y: 0, label: `x = ${fmt(line.xIntercept)}`, color: '#fb7185' });
    }
    return out;
  }, [m, c, line.xIntercept]);

  const pythonCode =
    `def linear(x, m, c):\n` +
    `    return m*x + c\n\n` +
    `m, c = ${fmtCode(m)}, ${fmtCode(c)}\n\n` +
    `xs = linspace(-10, 10, 100)\n` +
    `ys = []\n` +
    `for x in xs:\n` +
    `    ys.append(linear(x, m, c))\n\n` +
    `plot(xs, ys, label="y = mx + c")`;

  // The sliders, once: in the controls column, and again inside the graph
  // when it is fullscreen so the experiment can carry on at full size.
  const sliders = (
    <div className="space-y-2.5 p-3">
      <ParameterSlider
        symbol="m"
        label="gradient"
        value={m}
        onChange={(v) => { setM(v); touch(); }}
        min={-6}
        max={6}
        step={0.1}
        domain="viz"
        focus={ghost?.param === 'm'}
        meaning="How far y moves for each step of 1 in x. Negative means the line falls."
      />
      <ParameterSlider
        symbol="c"
        label="y-intercept"
        value={c}
        onChange={(v) => { setC(v); touch(); }}
        min={-8}
        max={8}
        step={0.1}
        domain="code"
        focus={ghost?.param === 'c'}
        meaning="Where the line crosses the y-axis. Slides the whole line up or down."
      />
    </div>
  );

  return (
    <ModuleFrame
      eyebrow="Explore · Module 1"
      title="Linear Functions"
      equation="y = mx + c"
      description="Two numbers describe a straight line completely. One sets how steeply it climbs, the other sets where it starts — and they never interfere with each other."
      loop={['explore', 'predict', 'change']}
      nextTo="/explore/quadratic"
      nextLabel="Quadratic"
      controls={
        <>
          <Panel>
            <PanelHeader title="Parameters" icon="sliders" domain="viz" />
            {sliders}
            <div className="border-t border-line px-3 py-2.5">
              <button
                onClick={() => setCompare((s) => !s)}
                className={cx(
                  'w-full rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors',
                  compare ? 'border-math/40 bg-math/10 text-math' : 'border-line text-muted hover:text-paper',
                )}
              >
                {compare ? 'Hide' : 'Show'} a parallel line
              </button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Live analysis" icon="chart" domain="math" />
            <div className="grid grid-cols-2 gap-2 p-3">
              <Stat label="Direction" value={line.direction} domain="viz" />
              <Stat label="Steepness" value={line.steepness} domain="viz" />
              <Stat label="y-intercept" value={`(0, ${fmt(c)})`} domain="code" />
              <Stat
                label="x-intercept"
                value={line.xIntercept === null ? 'none' : `(${fmt(line.xIntercept)}, 0)`}
                domain="spark"
                hint={line.xIntercept === null ? 'a flat line never crosses' : 'solve mx + c = 0'}
              />
              <Stat label="Angle" value={`${fmt(line.angleDeg, 1)}°`} domain="math" hint="tan⁻¹(m)" />
              <Stat label="Rise per step" value={fmt(m)} domain="spark" hint="for run = 1" />
            </div>
          </Panel>
        </>
      }
      graph={
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <MathExpr className="text-[22px] text-paper">{line.equation}</MathExpr>
            <Badge domain="spark">
              rise {fmt(m)} for run 1
            </Badge>
          </div>
          <div className="p-3">
            <Graph2D
              fullscreenOverlay={sliders}
              curves={curves}
              markers={markers}
              view={{ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }}
              height={430}
            />
          </div>
          <div className="flex items-center gap-2 border-t border-line px-4 py-2">
            <span className="h-0.5 w-4 rounded bg-spark/70" />
            <span className="text-[11.5px] text-faint">
              run 1, rise {fmt(Math.abs(m))} {m >= 0 ? 'up' : 'down'}
            </span>
            <InfoDot label="The dashed amber triangle is the gradient itself. Move the gradient slider and watch only its height change - the base always stays 1." />
          </div>
        </Panel>
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
              Scenario {scenarioIndex + 1} of {LINEAR_SCENARIOS.length}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setScenarioIndex((i) => (i - 1 + LINEAR_SCENARIOS.length) % LINEAR_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Previous scenario"
              >
                ←
              </button>
              <button
                onClick={() => setScenarioIndex((i) => (i + 1) % LINEAR_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Next scenario"
              >
                →
              </button>
            </div>
          </div>

          <Panel className="overflow-hidden">
            <PanelHeader
              title="The same line, in code"
              icon="code"
              domain="code"
              info="These values track the sliders. Open it in CodeLab and change a number to see the graph respond."
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
            maths={[{ text: 'y = ' }, { text: 'mx', pair: 'grad' }, { text: ' + ' }, { text: 'c', pair: 'int' }]}
            python={[{ text: 'y = ' }, { text: 'm*x', pair: 'grad' }, { text: ' + ' }, { text: 'c', pair: 'int' }]}
            pairings={[
              { id: 'grad', note: 'mx means m times x. Python needs that multiplication written out as m*x.' },
              { id: 'int', note: 'The constant term is identical in both, and is always the y-intercept.' },
            ]}
          />
        </>
      }
    />
  );
}
