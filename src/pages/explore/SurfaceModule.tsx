/**
 * 3D Mathematics - functions of two variables.
 *
 * The 3D view is not decoration. It earns its place by showing what a 2D graph
 * structurally cannot: a point that is a minimum in one direction and a maximum
 * in another. To keep it honest, the cross-section panel underneath shows the
 * ordinary 2D curves you get by slicing the surface - so the new picture is
 * always tied back to the familiar one.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ModuleFrame } from '../../components/layout/ModuleFrame';
import { LazySurface3D } from '../../components/graph/LazySurface3D';
import { Graph2D } from '../../components/graph/Graph2D';
import { ParameterSlider } from '../../components/ui/Slider';
import { Badge, Button, MathExpr, Panel, PanelHeader, Stat, cx } from '../../components/ui/Primitives';
import { InfoDot } from '../../components/ui/Tooltip';
import { FullscreenFrame } from '../../components/ui/Fullscreen';
import { WhatIfPanel } from '../../components/learn/WhatIfPanel';
import { SURFACE_SCENARIOS } from '../../content/whatif';
import { SURFACES, fmt, fmtCode } from '../../lib/math/functions';
import { useProgress } from '../../state/progress';

export function SurfaceModule() {
  const { recordExploration } = useProgress();
  // A link can open a particular surface: /explore/surfaces?preset=ripple
  const [params] = useSearchParams();
  const requested = SURFACES.find((s) => s.id === params.get('preset')) ?? SURFACES[0];
  const [presetId, setPresetId] = useState(requested.id);
  const [a, setA] = useState(requested.defaultA);
  const frame = useRef<HTMLDivElement>(null);
  const [probeX, setProbeX] = useState(1);
  const [probeY, setProbeY] = useState(1);
  const [wireframe, setWireframe] = useState(true);
  const [axes, setAxes] = useState(true);
  const [rotate, setRotate] = useState(true);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const touches = useRef(0);

  const preset = SURFACES.find((s) => s.id === presetId) ?? SURFACES[0];
  const scenario = SURFACE_SCENARIOS[scenarioIndex];

  const touch = () => {
    if (++touches.current % 12 === 0) recordExploration('surface-explorer', 'surfaces');
  };

  const choose = (id: string) => {
    const next = SURFACES.find((s) => s.id === id);
    if (!next) return;
    setPresetId(id);
    setA(next.defaultA);
    recordExploration('surface-explorer', 'surfaces');
  };

  // Bound to the live coefficient. Recreated on change so the mesh rebuilds.
  const surface = useCallback((x: number, y: number) => preset.f(x, y, a), [preset, a]);

  const probeZ = useMemo(() => preset.f(probeX, probeY, a), [preset, probeX, probeY, a]);

  // The sliders, once: in the controls column, and again inside the 3D view
  // when it is fullscreen so the surface can be driven at full size.
  const sliders = (
    <div className="space-y-2.5 p-3">
      <ParameterSlider
        symbol="a"
        label="coefficient"
        value={a}
        onChange={(v) => { setA(v); touch(); }}
        min={preset.range[0]}
        max={preset.range[1]}
        step={0.05}
        domain="viz"
        meaning="Scales the height of the whole surface. Its sign flips the surface over."
      />
      <ParameterSlider
        symbol="x" label="probe" value={probeX}
        onChange={setProbeX} min={-5} max={5} step={0.1} domain="math"
      />
      <ParameterSlider
        symbol="y" label="probe" value={probeY}
        onChange={setProbeY} min={-5} max={5} step={0.1} domain="math"
      />
    </div>
  );

  const pythonCode =
    `${preset.python.replace(', a', ', a')}\n\n` +
    `a = ${fmtCode(a)}\n` +
    `print(surface(${fmtCode(probeX)}, ${fmtCode(probeY)}, a))`;

  return (
    <ModuleFrame
      eyebrow="Explore · Module 4"
      title="3D Mathematics"
      equation="z = f(x, y)"
      description="Give a function two inputs instead of one and its graph becomes a surface. Rotate it, slice it, and read a height off it — the same skills you use on a 2D curve, one dimension up."
      loop={['explore', 'visualise', 'understand']}
      nextTo="/codelab"
      nextLabel="CodeLab"
      controls={
        <>
          <Panel>
            <PanelHeader title="Choose a surface" icon="cube" domain="math" />
            <div className="space-y-1.5 p-3">
              {SURFACES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => choose(s.id)}
                  className={cx(
                    'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                    s.id === presetId
                      ? 'border-math/50 bg-math/10'
                      : 'border-line bg-surface/50 hover:border-math/30',
                  )}
                >
                  <span className={cx('text-[12.5px] font-medium', s.id === presetId ? 'text-paper' : 'text-muted')}>
                    {s.name}
                  </span>
                  <MathExpr className={cx('text-[13px]', s.id === presetId ? 'text-math' : 'text-faint')}>
                    {s.equation}
                  </MathExpr>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Parameters" icon="sliders" domain="viz" />
            {sliders}

            <div className="border-t border-line p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="eyebrow">Coordinate inspection</span>
                <InfoDot label="One point on the surface: go x along, y across, and the surface sits that high above the ground there." />
              </div>
              <div className="rounded-lg border border-viz/25 bg-viz/8 px-3 py-2.5">
                <MathExpr className="text-[17px] text-paper">
                  {`f(${fmt(probeX)}, ${fmt(probeY)}) = ${fmt(probeZ)}`}
                </MathExpr>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
              {[
                { label: 'wireframe', on: wireframe, set: setWireframe },
                { label: 'axes & grid', on: axes, set: setAxes },
                { label: 'auto-rotate', on: rotate, set: setRotate },
              ].map((tgl) => (
                <button
                  key={tgl.label}
                  onClick={() => tgl.set(!tgl.on)}
                  className={cx(
                    'rounded-md border px-2 py-1 text-[11.5px] transition-colors',
                    tgl.on ? 'border-viz/40 bg-viz/10 text-viz' : 'border-line text-faint hover:text-muted',
                  )}
                >
                  {tgl.label}
                </button>
              ))}
            </div>
          </Panel>
        </>
      }
      graph={
        <>
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <MathExpr className="text-[21px] text-paper">{preset.equation}</MathExpr>
              <div className="flex gap-2">
                <Badge domain="math">a = {fmt(a)}</Badge>
                <Badge domain="viz">72 × 72 samples</Badge>
              </div>
            </div>
            <FullscreenFrame
              frameRef={frame}
              className="viz-frame mx-3 overflow-hidden"
              overlay={
                <>
                  <div className="glass-chip flex flex-wrap gap-1 p-1.5">
                    {SURFACES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => choose(s.id)}
                        className={cx(
                          'rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                          s.id === presetId ? 'bg-math/20 text-math' : 'text-muted hover:text-paper',
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                  {sliders}
                </>
              }
            >
              <LazySurface3D
                f={surface}
                extent={5}
                resolution={72}
                height={440}
                showWireframe={wireframe}
                showAxes={axes}
                autoRotate={rotate}
              />
            </FullscreenFrame>
            <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-faint">
              {[['drag', 'rotate'], ['scroll', 'zoom'], ['right-drag', 'pan']].map(([verb, what]) => (
                <span key={verb} className="flex items-center gap-1.5">
                  <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                    {verb}
                  </kbd>
                  {what}
                </span>
              ))}
              <InfoDot label="Colour encodes height, so the shape stays readable on a projector." />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Cross-sections"
              icon="chart"
              domain="viz"
              info="Slice it and 2D graphs come back. Cut the surface along each axis and you get ordinary curves - the ones from the earlier modules. A surface is what those curves look like when they are all present at once."
            />
            <div className="grid gap-px bg-line sm:grid-cols-2">
              <div className="bg-surface p-3">
                <div className="eyebrow mb-2">
                  Along <MathExpr className="text-paper">{`y = ${fmt(probeY)}`}</MathExpr>
                </div>
                <Graph2D
                  fullscreenOverlay={sliders}
                  curves={[{ f: (x) => preset.f(x, probeY, a), color: '#f87171', width: 2.2 }]}
                  markers={[{ x: probeX, y: probeZ, color: '#fbbf24' }]}
                  view={{ xMin: -5, xMax: 5, yMin: -8, yMax: 8 }}
                  height={190}
                  xLabel="x"
                  yLabel="z"
                  trace={false}
                />
              </div>
              <div className="bg-surface p-3">
                <div className="eyebrow mb-2">
                  Along <MathExpr className="text-paper">{`x = ${fmt(probeX)}`}</MathExpr>
                </div>
                <Graph2D
                  fullscreenOverlay={sliders}
                  curves={[{ f: (y) => preset.f(probeX, y, a), color: '#4ade80', width: 2.2 }]}
                  markers={[{ x: probeY, y: probeZ, color: '#fbbf24' }]}
                  view={{ xMin: -5, xMax: 5, yMin: -8, yMax: 8 }}
                  height={190}
                  xLabel="y"
                  yLabel="z"
                  trace={false}
                />
              </div>
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="eyebrow mb-1 text-spark">Why this surface matters</div>
              <p className="text-[13px] leading-relaxed text-muted">{preset.insight}</p>
            </div>
          </Panel>
        </>
      }
      aside={
        <>
          <WhatIfPanel
            scenario={scenario}
            onValue={setA}
            onGhost={() => {
              /* A 3D surface animates in place; the "before" shape is the
                 memory of the previous frame rather than a ghost mesh. */
            }}
          />

          <div className="flex items-center justify-between rounded-lg border border-line bg-surface/40 px-3 py-2">
            <span className="text-[11.5px] text-faint">
              Scenario {scenarioIndex + 1} of {SURFACE_SCENARIOS.length}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setScenarioIndex((i) => (i - 1 + SURFACE_SCENARIOS.length) % SURFACE_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Previous scenario"
              >
                ←
              </button>
              <button
                onClick={() => setScenarioIndex((i) => (i + 1) % SURFACE_SCENARIOS.length)}
                className="rounded border border-line px-2 py-0.5 text-[12px] text-muted hover:text-paper"
                aria-label="Next scenario"
              >
                →
              </button>
            </div>
          </div>

          <Panel>
            <PanelHeader title="At the probe point" icon="target" domain="math" />
            <div className="grid grid-cols-2 gap-2 p-3">
              <Stat label="x" value={fmt(probeX)} domain="spark" />
              <Stat label="y" value={fmt(probeY)} domain="code" />
              <Stat label="z" value={fmt(probeZ)} domain="viz" hint="height above the ground plane" />
              <Stat
                label="At the origin"
                value={fmt(preset.f(0, 0, a))}
                domain="math"
                hint="f(0, 0)"
              />
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader
              title="Two inputs, one output"
              icon="code"
              domain="code"
              info="Nothing new to learn here - a Python function has always been able to take two inputs. The surface is what you get when you evaluate it across a whole grid of them."
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
