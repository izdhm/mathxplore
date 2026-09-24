/**
 * Trigonometric Functions.
 *
 * Four parameters that each do exactly one thing. The panel keeps them
 * separated on purpose - amplitude cannot affect period, phase cannot affect
 * height - because the usual confusion here is the belief that they interact.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModuleFrame } from '../../components/layout/ModuleFrame';
import { Graph2D, type Curve, type Guide, type Marker } from '../../components/graph/Graph2D';
import { ParameterSlider } from '../../components/ui/Slider';
import { Badge, Button, MathExpr, Panel, PanelHeader, Stat, cx } from '../../components/ui/Primitives';
import { InfoDot } from '../../components/ui/Tooltip';
import { WhatIfPanel } from '../../components/learn/WhatIfPanel';
import { TRIG_SCENARIOS } from '../../content/whatif';
import { analyseTrig, fmt, fmtCode, formatRadians } from '../../lib/math/functions';
import { useProgress } from '../../state/progress';

export function TrigModule() {
  const { recordExploration } = useProgress();
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [c, setC] = useState(0);
  const [d, setD] = useState(0);
  const [fn, setFn] = useState<'sin' | 'cos'>('sin');
  const [ghost, setGhost] = useState<{ param: string; value: number } | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const touches = useRef(0);

  const scenario = TRIG_SCENARIOS[scenarioIndex];
  const t = useMemo(() => analyseTrig(a, b, c, d, fn), [a, b, c, d, fn]);

  const touch = () => {
    if (++touches.current % 14 === 0) recordExploration('trig-explorer', 'trigonometry');
  };

  const setParam = (name: string, v: number) => {
    if (name === 'a') setA(v);
    else if (name === 'b') setB(v);
    else if (name === 'c') setC(v);
    else setD(v);
  };

  const wave = (A: number, B: number, C: number, D: number) => (x: number) =>
    A * (fn === 'sin' ? Math.sin(B * (x - C)) : Math.cos(B * (x - C))) + D;

  const curves = useMemo<Curve[]>(() => {
    const out: Curve[] = [];
    if (ghost) {
      const g = { a, b, c, d, [ghost.param]: ghost.value } as { a: number; b: number; c: number; d: number };
      out.push({
        f: wave(g.a, g.b, g.c, g.d),
        color: '#8fa0bf',
        dashed: true,
        opacity: 0.5,
        width: 1.8,
        label: 'before',
      });
    }
    out.push({ f: wave(a, b, c, d), color: '#34d399', width: 2.6, label: t.equation });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, c, d, fn, ghost, t.equation]);

  const guides = useMemo<Guide[]>(
    () => [
      { kind: 'hline', at: d, color: 'rgba(167,139,250,0.45)', label: 'centre line' },
      { kind: 'hline', at: t.maximum, color: 'rgba(251,191,36,0.3)', label: `max ${fmt(t.maximum)}` },
      { kind: 'hline', at: t.minimum, color: 'rgba(251,191,36,0.3)', label: `min ${fmt(t.minimum)}` },
    ],
    [d, t.maximum, t.minimum],
  );

  // Mark one complete cycle so the period is visible rather than stated.
  const markers = useMemo<Marker[]>(() => {
    if (!Number.isFinite(t.period)) return [];
    const start = c;
    return [
      { x: start, y: wave(a, b, c, d)(start), label: 'cycle starts', color: '#38bdf8', kind: 'ring' },
      {
        x: start + t.period,
        y: wave(a, b, c, d)(start + t.period),
        label: `one period = ${t.periodLabel}`,
        color: '#38bdf8',
        kind: 'ring',
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, c, d, fn, t.period, t.periodLabel]);

  const pythonCode =
    `import math\n\n` +
    `def wave(x, a, b, c, d):\n` +
    `    return a * math.${fn}(b * (x - c)) + d\n\n` +
    `a, b, c, d = ${fmtCode(a)}, ${fmtCode(b)}, ${fmtCode(c)}, ${fmtCode(d)}\n\n` +
    `xs = linspace(-2*math.pi, 2*math.pi, 300)\n` +
    `ys = []\n` +
    `for x in xs:\n` +
    `    ys.append(wave(x, a, b, c, d))\n\n` +
    `plot(xs, ys, label="y = a·${fn}(b(x − c)) + d")\n\n` +
    `print("period:", 2*math.pi / abs(b))`;

  // The sliders, once: in the controls column, and again inside the graph
  // when it is fullscreen so the experiment can carry on at full size.
  const sliders = (
    <div className="space-y-2.5 p-3">
      <ParameterSlider
        symbol="a" label="amplitude" value={a}
        onChange={(v) => { setA(v); touch(); }}
        min={-4} max={4} step={0.1} domain="code"
        focus={ghost?.param === 'a'}
        meaning="Vertical stretch — how far the wave reaches above and below its centre."
      />
      <ParameterSlider
        symbol="b" label="frequency" value={b}
        onChange={(v) => { setB(v); touch(); }}
        min={0.25} max={5} step={0.05} domain="viz"
        focus={ghost?.param === 'b'}
        meaning="Horizontal squeeze. A larger b packs in more cycles, so the period shortens."
      />
      <ParameterSlider
        symbol="c" label="phase shift" value={c}
        onChange={(v) => { setC(v); touch(); }}
        min={-3.2} max={3.2} step={0.05} domain="math"
        focus={ghost?.param === 'c'}
        meaning="Slides the wave sideways without changing its shape at all."
      />
      <ParameterSlider
        symbol="d" label="vertical shift" value={d}
        onChange={(v) => { setD(v); touch(); }}
        min={-3} max={3} step={0.1} domain="spark"
        focus={ghost?.param === 'd'}
        meaning="Moves the centre line the wave oscillates about."
      />
    </div>
  );

  return (
    <ModuleFrame
      eyebrow="Explore · Module 3"
      title="Trigonometric Functions"
      equation="y = a·sin(b(x − c)) + d"
      description="Four numbers, four separate jobs. Each one changes exactly one property of the wave and leaves the other three alone — which is what makes waves so useful for describing the real world."
      loop={['explore', 'predict', 'change', 'visualise']}
      nextTo="/explore/surfaces"
      nextLabel="3D Mathematics"
      controls={
        <>
          <Panel>
            <PanelHeader
              title="Parameters"
              icon="sliders"
              domain="viz"
              right={
                <div className="flex overflow-hidden rounded-md border border-line">
                  {(['sin', 'cos'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setFn(k)}
                      className={cx(
                        'px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                        fn === k ? 'bg-code/15 text-code' : 'text-faint hover:text-paper',
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              }
            />
            {sliders}
          </Panel>

          <Panel>
            <PanelHeader title="Live analysis" icon="wave" domain="math" info="In sound, amplitude is volume and frequency is pitch. They stay independent for the same reason a louder note is still the same note." />
            <div className="grid grid-cols-2 gap-2 p-3">
              <Stat label="Amplitude" value={fmt(t.amplitude)} domain="code" hint="|a|" />
              <Stat label="Period" value={t.periodLabel} domain="viz" hint="2π ÷ |b|" />
              <Stat label="Maximum" value={fmt(t.maximum)} domain="spark" hint="d + |a|" />
              <Stat label="Minimum" value={fmt(t.minimum)} domain="spark" hint="d − |a|" />
              <Stat label="Centre line" value={`y = ${fmt(d)}`} domain="math" />
              <Stat label="Frequency" value={`${fmt(t.frequency)} rad⁻¹`} domain="viz" />
            </div>
          </Panel>
        </>
      }
      graph={
        <>
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <MathExpr className="text-[21px] text-paper">{t.equation}</MathExpr>
              <div className="flex gap-2">
                <Badge domain="code">amplitude {fmt(t.amplitude)}</Badge>
                <Badge domain="viz">period {t.periodLabel}</Badge>
              </div>
            </div>
            <div className="p-3">
              <Graph2D
                fullscreenOverlay={sliders}
                curves={curves}
                guides={guides}
                markers={markers}
                view={{ xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -5, yMax: 5 }}
                height={400}
              />
            </div>
            <div className="flex items-center gap-2 border-t border-line px-4 py-2">
              <span className="h-2 w-2 rounded-full border border-viz" />
              <span className="text-[11.5px] text-faint">
                one period = {formatRadians(t.period)}
              </span>
              <InfoDot label="The two ringed points sit exactly one period apart. The wave between them repeats for ever in both directions." />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Daily temperature is a wave"
              icon="target"
              domain="spark"
              info="Coolest before dawn, warmest mid-afternoon, repeating every 24 hours. The four parameters map onto four things a meteorologist can measure."
            />
            <div className="grid gap-px bg-line sm:grid-cols-[1fr_240px]">
              <div className="bg-surface p-3">
                <Graph2D
                  curves={[
                    {
                      f: (h) => 4.5 * Math.sin(((2 * Math.PI) / 24) * (h - 9)) + 28,
                      color: '#fbbf24',
                      width: 2.4,
                      label: 'T(h)',
                    },
                  ]}
                  guides={[{ kind: 'hline', at: 28, color: 'rgba(167,139,250,0.4)', label: 'daily mean 28°' }]}
                  view={{ xMin: 0, xMax: 48, yMin: 21, yMax: 35 }}
                  height={200}
                  xLabel="hours"
                  yLabel="°C"
                  trace={false}
                />
              </div>
              <div className="bg-surface p-4">
                <ul className="space-y-1.5 text-[12.5px]">
                  {[
                    ['a', '4.5°', 'daily swing'],
                    ['b', '24 h', 'one cycle'],
                    ['c', '9', 'peak mid-afternoon'],
                    ['d', '28°', 'daily mean'],
                  ].map(([sym, val, meaning]) => (
                    <li key={sym} className="flex items-baseline gap-2">
                      <MathExpr className="w-3 text-paper">{sym}</MathExpr>
                      <span className="w-12 tabular-nums text-spark">{val}</span>
                      <span className="text-faint">{meaning}</span>
                    </li>
                  ))}
                </ul>
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
              Scenario {scenarioIndex + 1} of {TRIG_SCENARIOS.length}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setScenarioIndex((i) => (i - 1 + TRIG_SCENARIOS.length) % TRIG_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Previous scenario"
              >
                ←
              </button>
              <button
                onClick={() => setScenarioIndex((i) => (i + 1) % TRIG_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Next scenario"
              >
                →
              </button>
            </div>
          </div>

          <Panel className="overflow-hidden">
            <PanelHeader
              title="The same wave, in code"
              icon="code"
              domain="code"
              info="Trigonometry lives in the math module, and works in radians rather than degrees."
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
        </>
      }
    />
  );
}
