/**
 * Geometry Lab - shapes in 2D and 3D, written as Python.
 *
 * The centre of the screen is the picture. The right is the program that made
 * it. The left is a gallery of programs and four sliders whose values the
 * program can read as n, r, h and a - so a student can write `polygon(n, r)`
 * and then *drive* the polygon without touching the code.
 *
 * Every run goes through the same engine as CodeLab. The `shapes` library is
 * a real importable module with real measurements, so `print(c.area)` and the
 * circle on screen come from the same number.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModuleFrame } from '../../components/layout/ModuleFrame';
import { ShapeCanvas2D } from '../../components/graph/ShapeCanvas2D';
import { LazyShapeScene3D } from '../../components/graph/LazyShapeScene3D';
import { CodeEditor } from '../../components/code/CodeEditor';
import { OutputPanel } from '../../components/code/OutputPanel';
import { ParameterSlider } from '../../components/ui/Slider';
import { IconButton, MathExpr, Panel, cx } from '../../components/ui/Primitives';
import { Icon } from '../../components/ui/Icon';
import { Tooltip } from '../../components/ui/Tooltip';
import { FullscreenFrame } from '../../components/ui/Fullscreen';
import { runPython, emptyScene, area2D, perimeter2D, volume3D, surface3D, type PythonResult } from '../../lib/pyengine';
import { fmt } from '../../lib/math/functions';
import { GEOMETRY_PARAMS, GEOMETRY_PRESETS, type GeometryParamId } from '../../content/geometry';
import { useProgress } from '../../state/progress';

type Params = Record<GeometryParamId, number>;

const INITIAL: Params = Object.fromEntries(GEOMETRY_PARAMS.map((p) => [p.id, p.initial])) as Params;

export function GeometryModule() {
  const { recordExploration, recordRun } = useProgress();
  const [presetId, setPresetId] = useState(GEOMETRY_PRESETS[0].id);
  const [code, setCode] = useState(GEOMETRY_PRESETS[0].code);
  const [params, setParams] = useState<Params>(INITIAL);
  const [result, setResult] = useState<PythonResult | null>(null);
  const [runId, setRunId] = useState(0);
  const [rotate, setRotate] = useState(true);
  const [grid, setGrid] = useState(true);
  const [view, setView] = useState<'auto' | '2d' | '3d'>('auto');
  const touches = useRef(0);
  const frame3d = useRef<HTMLDivElement>(null);

  const preset = GEOMETRY_PRESETS.find((p) => p.id === presetId);

  const execute = useCallback(
    (source: string, p: Params, reveal: boolean) => {
      const r = runPython(source, { inject: p });
      setResult(r);
      if (reveal) {
        setRunId((n) => n + 1);
        recordRun('geometry-lab', !!r.error, r.error?.type);
      }
    },
    [recordRun],
  );

  // First paint: run the opening preset so the page never opens empty.
  useEffect(() => {
    execute(GEOMETRY_PRESETS[0].code, INITIAL, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (id: string) => {
    const next = GEOMETRY_PRESETS.find((p) => p.id === id);
    if (!next) return;
    setPresetId(id);
    setCode(next.code);
    execute(next.code, params, true);
    recordExploration('geometry-lab', 'geometry');
  };

  const run = () => execute(code, params, true);

  // Sliders re-run the program live, without replaying the build-up.
  const setParam = (id: GeometryParamId, v: number) => {
    const next = { ...params, [id]: v };
    setParams(next);
    execute(code, next, false);
    if (++touches.current % 10 === 0) recordExploration('geometry-lab', 'geometry');
  };

  const scene = result?.scene ?? emptyScene();
  const has2d = scene.shapes2d.length > 0 || scene.turtles.length > 0;
  const has3d = scene.shapes3d.length > 0;
  const show2d = view === '2d' || (view === 'auto' && (has2d || !has3d));
  const show3d = view === '3d' || (view === 'auto' && has3d);

  const facts = useMemo(() => summarise(scene), [scene]);
  const uses = new Set(preset?.uses ?? []);

  const handoff = `/codelab?code=${encodeURIComponent(withParams(code, params))}`;

  // The sliders, once: in the controls column, and again inside a fullscreen
  // view so the picture can be driven at full size.
  const sliders = (
    <div className="space-y-2 p-3">
      {GEOMETRY_PARAMS.map((p) => (
        <ParameterSlider
          key={p.id}
          symbol={p.id}
          label={p.label}
          value={params[p.id]}
          onChange={(v) => setParam(p.id, v)}
          min={p.min}
          max={p.max}
          step={p.step}
          domain={p.domain}
          focus={uses.has(p.id)}
          meaning={`Your program can read this as the variable ${p.id}.`}
        />
      ))}
    </div>
  );

  return (
    <ModuleFrame
      wide
      eyebrow="Explore · Geometry"
      title="Geometry Lab"
      equation="A, P, V"
      description="Shapes as programs. Every circle, polygon and solid here is made by Python you can read and change - and the sliders are variables the program reads as n, r, h and a. Point at a shape for its measurements."
      loop={['explore', 'visualise', 'code', 'create']}
      nextTo="/codelab"
      nextLabel="CodeLab"
      controls={
        <>
          {/* ---- Gallery: pictures, not names ------------------------------ */}
          <Panel>
            <div className="grid grid-cols-4 gap-1.5 p-2.5">
              {GEOMETRY_PRESETS.map((p) => (
                <Tooltip key={p.id} label={p.name}>
                  <button
                    onClick={() => choose(p.id)}
                    aria-label={p.name}
                    aria-pressed={p.id === presetId}
                    className={cx(
                      'flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border transition-all',
                      p.id === presetId
                        ? p.dim === '3d'
                          ? 'border-math/50 bg-math/15 text-math shadow-[0_0_24px_-6px_rgba(179,156,255,0.8)]'
                          : 'border-viz/50 bg-viz/15 text-viz shadow-[0_0_24px_-6px_rgba(76,201,255,0.8)]'
                        : 'border-transparent text-faint hover:border-line hover:bg-surface-2 hover:text-paper',
                    )}
                  >
                    <Icon name={p.icon} size={18} />
                    <span className="text-[8.5px] font-semibold uppercase tracking-wider opacity-80">
                      {p.dim}
                    </span>
                  </button>
                </Tooltip>
              ))}
            </div>
          </Panel>

          {/* ---- Sliders: the variables the program reads ------------------ */}
          <Panel>
            {sliders}
            <div className="flex items-center justify-between border-t border-line px-3 py-2">
              <span className="text-[11px] text-faint">
                <span className="font-mono text-code">n r h a</span>
              </span>
              <IconButton
                icon="reset"
                label="Reset sliders"
                size={14}
                className="h-8 w-8"
                onClick={() => { setParams(INITIAL); execute(code, INITIAL, false); }}
              />
            </div>
          </Panel>
        </>
      }
      graph={
        <>
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-1">
                <IconButton icon="shapes" label="2D" on={show2d} tone="viz" onClick={() => setView(view === '2d' ? 'auto' : '2d')} />
                <IconButton icon="cube" label="3D" on={show3d} tone="math" onClick={() => setView(view === '3d' ? 'auto' : '3d')} />
              </div>
              <div className="flex items-center gap-1">
                <IconButton icon="grid" label="Grid" on={grid} tone="neutral" onClick={() => setGrid((g) => !g)} />
                <IconButton icon="rotate" label="Spin" on={rotate} tone="neutral" onClick={() => setRotate((r) => !r)} disabled={!show3d} />
              </div>
            </div>

            <div className="space-y-2 px-3 pb-3">
              {show2d && (
                <ShapeCanvas2D scene={scene} height={show3d ? 300 : 460} revealKey={runId} showGrid={grid} fullscreenOverlay={sliders} />
              )}
              {show3d && (
                <FullscreenFrame frameRef={frame3d} className="viz-frame overflow-hidden" overlay={sliders}>
                  <LazyShapeScene3D
                    scene={scene}
                    height={show2d ? 300 : 460}
                    autoRotate={rotate}
                    showGrid={grid}
                    fitKey={presetId}
                    revealKey={runId}
                  />
                </FullscreenFrame>
              )}
            </div>

            {/* ---- Measurements: numbers only, names on hover ---------------- */}
            {facts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
                {facts.map((f) => (
                  <Tooltip key={f.key} label={f.detail}>
                    <span className="glass-chip flex cursor-help items-center gap-1.5 px-2.5 py-1 text-[11.5px] tabular-nums">
                      <span className="h-2 w-2 rounded-full" style={{ background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                      <MathExpr className="text-[12px] text-paper/85">{f.symbol}</MathExpr>
                      <span className="text-muted">{f.value}</span>
                      {f.count > 1 && <span className="text-faint">×{f.count}</span>}
                    </span>
                  </Tooltip>
                ))}
              </div>
            )}
          </Panel>
        </>
      }
      aside={
        <>
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="glass-chip flex h-7 w-7 items-center justify-center text-code">
                  <Icon name="code" size={14} />
                </span>
                <span className="font-mono text-[11px] text-faint">{code.split('\n').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <IconButton icon="reset" label="Reset code" tone="neutral" onClick={() => { if (preset) { setCode(preset.code); execute(preset.code, params, true); } }} />
                <Tooltip label="Open in CodeLab">
                  <Link to={handoff} className="icon-btn" aria-label="Open in CodeLab">
                    <Icon name="upload" size={16} />
                  </Link>
                </Tooltip>
                <Tooltip label="Run  (Ctrl + Enter)">
                  <button onClick={run} className="btn btn-code h-[38px] px-4" aria-label="Run">
                    <Icon name="play" size={13} />
                  </button>
                </Tooltip>
              </div>
            </div>
            <div
              className="px-3 pb-3"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  run();
                }
              }}
            >
              <CodeEditor value={code} onChange={setCode} errorLine={result?.lesson?.line} minRows={14} />
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="p-3">
              <OutputPanel result={result} showPlots showScene={false} graphHeight={220} />
            </div>
          </Panel>
        </>
      }
    />
  );
}

// ------------------------------------------------------------- measures

interface Fact {
  key: string;
  symbol: string;
  value: string;
  detail: string;
  color: string;
  count: number;
}

/**
 * One chip per distinct shape (name + size), so a tiling of 36 identical
 * squares reads as one chip with ×36 rather than a wall of chips.
 */
function summarise(scene: ReturnType<typeof emptyScene>): Fact[] {
  const out = new Map<string, Fact>();
  const push = (key: string, f: Omit<Fact, 'key' | 'count'>) => {
    const existing = out.get(key);
    if (existing) existing.count++;
    else out.set(key, { key, count: 1, ...f });
  };

  for (const s of scene.shapes2d) {
    if (s.name === 'stroke' || s.name === 'fill' || s.name === 'text') continue;
    const area = area2D(s);
    const perim = perimeter2D(s);
    const symbol = area > 0 ? 'A' : 'L';
    const value = fmt(area > 0 ? area : perim, 2);
    push(`${s.name}:${symbol}:${value}`, {
      symbol,
      value,
      color: s.color,
      detail: area > 0 ? `${s.name} · area ${fmt(area, 3)} · perimeter ${fmt(perim, 3)}` : `${s.name} · length ${fmt(perim, 3)}`,
    });
  }
  for (const s of scene.shapes3d) {
    const v = volume3D(s);
    const value = fmt(v, 2);
    push(`${s.name}:V:${value}`, {
      symbol: 'V',
      value,
      color: s.color,
      detail: `${s.name} · volume ${fmt(v, 3)} · surface ${fmt(surface3D(s), 3)}`,
    });
  }

  const strokes = scene.shapes2d.filter((s) => s.name === 'stroke');
  if (strokes.length) {
    const len = strokes.reduce((t, s) => t + perimeter2D(s), 0);
    push('turtle', { symbol: 'L', value: fmt(len, 1), color: strokes[0].color, detail: `turtle · path length ${fmt(len, 2)}` });
  }
  return [...out.values()].slice(0, 10);
}

/** CodeLab has no sliders, so the values travel as plain assignments. */
function withParams(code: string, params: Params): string {
  const used = (Object.keys(params) as GeometryParamId[]).filter((k) => new RegExp(`\\b${k}\\b`).test(code));
  if (!used.length) return code;
  const lines = code.split('\n');
  // Keep imports first, as a Python file would.
  let i = 0;
  while (i < lines.length && (/^\s*(from|import)\b/.test(lines[i]) || lines[i].trim() === '')) i++;
  const assigns = used.map((k) => `${k} = ${Number.isInteger(params[k]) ? params[k] : params[k].toFixed(2)}`);
  return [...lines.slice(0, i), ...assigns, '', ...lines.slice(i)].join('\n');
}
