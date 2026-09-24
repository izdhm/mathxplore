/**
 * Graph2D - the platform's 2D plotting engine.
 *
 * Written directly against Canvas rather than pulled from a charting library:
 * a teaching graph needs things charting libraries do not offer - annotated
 * mathematical features (vertex, roots, axis of symmetry), a "ghost" of the
 * previous curve so a change can be seen rather than described, and a trace
 * readout that ties a point on the curve to its coordinates.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { fmt } from '../../lib/math/functions';
import { adapt, chartInk, type ChartInk } from '../../lib/chartInk';
import { useTheme } from '../../state/theme';
import { IconButton } from '../ui/Primitives';
import { FullscreenButton, useFullscreen } from '../ui/Fullscreen';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';

export interface Curve {
  /** Continuous function, sampled per pixel column. */
  f?: (x: number) => number;
  /** Or explicit data points. */
  xs?: number[];
  ys?: number[];
  color: string;
  width?: number;
  dashed?: boolean;
  label?: string;
  opacity?: number;
  kind?: 'line' | 'points';
}

export interface Marker {
  x: number;
  y: number;
  label?: string;
  color?: string;
  kind?: 'dot' | 'ring' | 'cross';
}

export interface Guide {
  kind: 'vline' | 'hline';
  at: number;
  color?: string;
  label?: string;
}

export interface View {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface Props {
  curves: Curve[];
  markers?: Marker[];
  guides?: Guide[];
  view?: View;
  /** Re-centres the graph whenever this value changes. */
  resetKey?: string | number;
  /**
   * Draws the curves on as an animation whenever this value changes. Used after
   * a program runs, so a student watches their code become a graph rather than
   * being handed a finished picture.
   */
  revealKey?: string | number;
  height?: number;
  /** Show the crosshair readout on hover. */
  trace?: boolean;
  /** Label for the horizontal axis (default "x"). */
  xLabel?: string;
  yLabel?: string;
  className?: string;
  onTrace?: (point: { x: number; y: number } | null) => void;
  /** Controls shown inside the frame while it is fullscreen (e.g. sliders). */
  fullscreenOverlay?: ReactNode;
}

const DEFAULT_VIEW: View = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

export function Graph2D({
  curves,
  markers = [],
  guides = [],
  view: viewProp,
  resetKey,
  revealKey,
  height = 380,
  trace = true,
  xLabel = 'x',
  yLabel = 'y',
  className,
  onTrace,
  fullscreenOverlay,
}: Props) {
  const { theme } = useTheme();
  const ink = chartInk(theme);
  const [overlayOpen, setOverlayOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The bordered box the canvas fills - the only thing worth measuring. */
  const boxRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(viewProp ?? DEFAULT_VIEW);
  const [size, setSize] = useState({ w: 600, h: height });
  const [cursor, setCursor] = useState<{ px: number; py: number } | null>(null);
  const [reveal, setReveal] = useState(1);
  const dragRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const revealRaf = useRef(0);
  const fullscreen = useFullscreen(boxRef);
  const fsRef = useRef(false);
  fsRef.current = fullscreen.active;

  // Draw-on animation. Skipped entirely for reduced-motion users, who get the
  // finished curve immediately rather than a degraded version of the effect.
  useEffect(() => {
    if (revealKey === undefined) return;
    if (typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setReveal(1);
      return;
    }
    cancelAnimationFrame(revealRaf.current);
    setReveal(0);
    const started = performance.now();
    const DURATION = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / DURATION);
      setReveal(1 - Math.pow(1 - t, 3)); // ease-out: quick start, gentle finish
      if (t < 1) revealRaf.current = requestAnimationFrame(tick);
    };
    revealRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(revealRaf.current);
  }, [revealKey]);

  // Follow an externally supplied view - but compare by value, not identity.
  // Modules pass an object literal, so syncing on identity would throw away a
  // student's pan and zoom every time they nudged a slider.
  const viewKey = viewProp
    ? `${viewProp.xMin},${viewProp.xMax},${viewProp.yMin},${viewProp.yMax}`
    : '';
  useEffect(() => {
    if (viewProp) setView(viewProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  useEffect(() => {
    if (resetKey !== undefined) setView(viewProp ?? DEFAULT_VIEW);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // ---- responsive sizing ---------------------------------------------------
  //
  // Measure the box the canvas actually fills, never an ancestor. Measuring the
  // outer wrapper and then giving the canvas that width in pixels makes the
  // canvas wider than its bordered parent's content box, and in any container
  // sized by its contents (a bare `1fr` grid track has an `auto` minimum) that
  // overflow widens the track, which re-fires the observer, which widens the
  // canvas again - the graph creeps sideways a couple of pixels at a time.
  //
  // The canvas is laid out at width:100% instead, so it can never push its own
  // container wider; only the backing-store resolution is set from these
  // measurements.

  // Measure once before the first paint, so the graph is never drawn at the
  // placeholder width and then snapped to the real one.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const w = Math.round(el.clientWidth);
    if (w > 1) setSize((prev) => (prev.w === w ? prev : { ...prev, w }));
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      // In fullscreen the box is fixed to the viewport, so its measured height
      // is the drawing height; otherwise the prop rules. Sub-pixel jitter is
      // ignored, or the observer would loop for ever.
      const h = fsRef.current ? Math.round(entry.contentRect.height) : height;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    if (fullscreen.active) return;
    setSize((p) => (p.h === height ? p : { ...p, h: height }));
  }, [fullscreen.active, height]);

  // ---- transforms ----------------------------------------------------------
  const toPx = useCallback(
    (x: number) => ((x - view.xMin) / (view.xMax - view.xMin)) * size.w,
    [view, size.w],
  );
  const toPy = useCallback(
    (y: number) => size.h - ((y - view.yMin) / (view.yMax - view.yMin)) * size.h,
    [view, size.h],
  );
  const toX = useCallback(
    (px: number) => view.xMin + (px / size.w) * (view.xMax - view.xMin),
    [view, size.w],
  );
  const toY = useCallback(
    (py: number) => view.yMin + ((size.h - py) / size.h) * (view.yMax - view.yMin),
    [view, size.h],
  );

  // ---- drawing --------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (size.w < 2 || size.h < 2) return;

    // Only the backing store is sized here. The CSS width stays at 100% (set on
    // the element itself) so the canvas can never widen its own container.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.height = `${size.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    drawGrid(ctx, view, size, toPx, toPy, xLabel, yLabel, ink);

    for (const g of guides) drawGuide(ctx, g, size, toPx, toPy);
    for (const c of curves) drawCurve(ctx, c, view, size, toPx, toPy, reveal, theme);
    // Feature labels arrive once the curve they annotate has been drawn.
    if (reveal > 0.55) {
      ctx.globalAlpha = Math.min(1, (reveal - 0.55) / 0.45);
      for (const m of markers) drawMarker(ctx, m, toPx, toPy, size, ink, theme);
      ctx.globalAlpha = 1;
    }

    if (trace && cursor) drawTrace(ctx, cursor, curves, view, size, toPy, toX, ink, theme);
  }, [curves, markers, guides, view, size, cursor, trace, reveal, toPx, toPy, toX, xLabel, yLabel, ink, theme]);

  // ---- interaction ------------------------------------------------------------
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (dragRef.current) {
      const start = dragRef.current;
      const dx = ((px - start.x) / size.w) * (start.view.xMax - start.view.xMin);
      const dy = ((py - start.y) / size.h) * (start.view.yMax - start.view.yMin);
      setView({
        xMin: start.view.xMin - dx,
        xMax: start.view.xMax - dx,
        yMin: start.view.yMin + dy,
        yMax: start.view.yMax + dy,
      });
      return;
    }

    setCursor({ px, py });
    if (onTrace && curves[0]?.f) {
      const x = toX(px);
      const y = curves[0].f(x);
      onTrace(Number.isFinite(y) ? { x, y } : null);
    }
  };

  const onPointerLeave = () => {
    setCursor(null);
    dragRef.current = null;
    onTrace?.(null);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      view,
    };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ax = toX(e.clientX - rect.left);
    const ay = toY(e.clientY - rect.top);
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    setView((v) => ({
      xMin: ax + (v.xMin - ax) * k,
      xMax: ax + (v.xMax - ax) * k,
      yMin: ay + (v.yMin - ay) * k,
      yMax: ay + (v.yMax - ay) * k,
    }));
  };

  const reset = () => setView(viewProp ?? DEFAULT_VIEW);

  return (
    <div className={className}>
      <div ref={boxRef} className="viz-frame relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          title="drag · pan  scroll · zoom"
          style={{ cursor: dragRef.current ? 'grabbing' : 'crosshair' }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        />

        {/* Legend */}
        {curves.some((c) => c.label) && (
          <div className="glass-chip pointer-events-none absolute left-2 top-2 flex flex-col gap-1 px-2.5 py-1.5">
            {curves
              .filter((c) => c.label)
              .map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span
                    className="h-0.5 w-4 rounded"
                    style={{ background: adapt(c.color, theme), opacity: c.opacity ?? 1 }}
                  />
                  <span className="font-math italic">{c.label}</span>
                </div>
              ))}
          </div>
        )}

        <div className="absolute right-2 top-2 flex items-center gap-1">
          <Tooltip label="Recentre">
            <button
              onClick={reset}
              className="glass-chip flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-paper"
              aria-label="Recentre"
            >
              <Icon name="center" size={13} />
            </button>
          </Tooltip>
          {fullscreen.active && fullscreenOverlay && (
            <IconButton icon="sliders" label={overlayOpen ? 'Hide controls' : 'Show controls'} on={overlayOpen} size={13} className="h-7 w-7" onClick={() => setOverlayOpen((o) => !o)} />
          )}
          {fullscreen.supported && <FullscreenButton active={fullscreen.active} onClick={fullscreen.toggle} />}
        </div>

        {fullscreen.active && fullscreenOverlay && overlayOpen && (
          <div className="fs-overlay animate-fade">{fullscreenOverlay}</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- rendering

type Transform = (v: number) => number;

/** Grid spacing that lands on 1, 2 or 5 times a power of ten. */
function niceStep(range: number, targetLines: number): number {
  const raw = range / targetLines;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  return step * mag;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: View,
  size: { w: number; h: number },
  toPx: Transform,
  toPy: Transform,
  xLabel: string,
  yLabel: string,
  ink: ChartInk,
) {
  const stepX = niceStep(view.xMax - view.xMin, Math.max(4, size.w / 90));
  const stepY = niceStep(view.yMax - view.yMin, Math.max(4, size.h / 70));

  // Minor grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = ink.grid;
  ctx.beginPath();
  for (let x = Math.ceil(view.xMin / stepX) * stepX; x <= view.xMax; x += stepX) {
    const px = Math.round(toPx(x)) + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, size.h);
  }
  for (let y = Math.ceil(view.yMin / stepY) * stepY; y <= view.yMax; y += stepY) {
    const py = Math.round(toPy(y)) + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(size.w, py);
  }
  ctx.stroke();

  // Axes
  const originX = toPx(0);
  const originY = toPy(0);
  ctx.strokeStyle = ink.axis;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  if (originY >= 0 && originY <= size.h) {
    ctx.moveTo(0, Math.round(originY) + 0.5);
    ctx.lineTo(size.w, Math.round(originY) + 0.5);
  }
  if (originX >= 0 && originX <= size.w) {
    ctx.moveTo(Math.round(originX) + 0.5, 0);
    ctx.lineTo(Math.round(originX) + 0.5, size.h);
  }
  ctx.stroke();

  // Tick labels
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = ink.tick;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const axisY = Math.min(Math.max(originY, 2), size.h - 16);
  for (let x = Math.ceil(view.xMin / stepX) * stepX; x <= view.xMax; x += stepX) {
    if (Math.abs(x) < stepX / 1000) continue;
    ctx.fillText(fmt(x, 2), toPx(x), axisY + 4);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const axisX = Math.min(Math.max(originX, 22), size.w - 4);
  for (let y = Math.ceil(view.yMin / stepY) * stepY; y <= view.yMax; y += stepY) {
    if (Math.abs(y) < stepY / 1000) continue;
    ctx.fillText(fmt(y, 2), axisX - 6, toPy(y));
  }

  // Axis names
  ctx.fillStyle = ink.axisName;
  ctx.font = 'italic 13px Cambria, Georgia, serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(xLabel, size.w - 6, Math.min(size.h - 2, axisY - 4));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(yLabel, Math.min(size.w - 12, axisX + 6), 4);
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  curve: Curve,
  view: View,
  size: { w: number; h: number },
  toPx: Transform,
  toPy: Transform,
  progress = 1,
  theme: 'dark' | 'light' = 'dark',
) {
  if (progress <= 0) return;
  ctx.save();
  ctx.globalAlpha = curve.opacity ?? 1;
  const color = adapt(curve.color, theme);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = curve.width ?? 2.25;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (curve.dashed) ctx.setLineDash([6, 5]);

  if (curve.kind === 'points' && curve.xs && curve.ys) {
    const shown = Math.ceil(curve.xs.length * progress);
    for (let i = 0; i < shown; i++) {
      const px = toPx(curve.xs[i]);
      const py = toPy(curve.ys[i]);
      if (!Number.isFinite(py)) continue;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  ctx.beginPath();
  let started = false;
  let lastPy = 0;
  // A vertical jump larger than the canvas is an asymptote, not a line.
  const breakAt = size.h * 2.5;

  if (curve.f) {
    const last = size.w * progress;
    for (let px = 0; px <= last; px += 1) {
      const x = view.xMin + (px / size.w) * (view.xMax - view.xMin);
      let y: number;
      try {
        y = curve.f(x);
      } catch {
        y = NaN;
      }
      if (!Number.isFinite(y)) {
        started = false;
        continue;
      }
      const py = toPy(y);
      if (started && Math.abs(py - lastPy) > breakAt) started = false;
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
      lastPy = py;
    }
  } else if (curve.xs && curve.ys) {
    const shown = Math.ceil(curve.xs.length * progress);
    for (let i = 0; i < shown; i++) {
      const py = toPy(curve.ys[i]);
      if (!Number.isFinite(py)) {
        started = false;
        continue;
      }
      const px = toPx(curve.xs[i]);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawGuide(
  ctx: CanvasRenderingContext2D,
  guide: Guide,
  size: { w: number; h: number },
  toPx: Transform,
  toPy: Transform,
) {
  ctx.save();
  ctx.strokeStyle = guide.color ?? 'rgba(251,191,36,0.5)';
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  if (guide.kind === 'vline') {
    const px = toPx(guide.at);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, size.h);
  } else {
    const py = toPy(guide.at);
    ctx.moveTo(0, py);
    ctx.lineTo(size.w, py);
  }
  ctx.stroke();

  if (guide.label) {
    ctx.setLineDash([]);
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = guide.color ?? 'rgba(251,191,36,0.9)';
    if (guide.kind === 'vline') {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(guide.label, toPx(guide.at) + 5, 6);
    } else {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(guide.label, size.w - 6, toPy(guide.at) - 4);
    }
  }
  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  m: Marker,
  toPx: Transform,
  toPy: Transform,
  size: { w: number; h: number },
  ink: ChartInk,
  theme: 'dark' | 'light',
) {
  const px = toPx(m.x);
  const py = toPy(m.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return;

  const color = adapt(m.color ?? '#fbbf24', theme);
  ctx.save();

  if (m.kind === 'cross') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 5, py - 5);
    ctx.lineTo(px + 5, py + 5);
    ctx.moveTo(px + 5, py - 5);
    ctx.lineTo(px - 5, py + 5);
    ctx.stroke();
  } else {
    ctx.fillStyle = ink.markerCore;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, py, m.kind === 'ring' ? 6 : 4.5, 0, Math.PI * 2);
    if (m.kind === 'ring') ctx.stroke();
    else {
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = ink.markerCore;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  if (m.label) {
    ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
    const w = ctx.measureText(m.label).width;
    // Keep the label inside the canvas.
    const flip = px + w + 18 > size.w;
    const lx = flip ? px - w - 12 : px + 10;
    const ly = Math.max(10, py - 10);

    ctx.fillStyle = ink.labelBg;
    ctx.beginPath();
    ctx.roundRect(lx - 5, ly - 9, w + 10, 18, 5);
    ctx.fill();
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.label, lx, ly);
  }
  ctx.restore();
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  cursor: { px: number; py: number },
  curves: Curve[],
  view: View,
  size: { w: number; h: number },
  toPy: Transform,
  toX: Transform,
  ink: ChartInk,
  theme: 'dark' | 'light',
) {
  const primary = curves.find((c) => c.f);
  const x = toX(cursor.px);
  let y: number | null = null;

  if (primary?.f) {
    const v = primary.f(x);
    if (Number.isFinite(v) && v >= view.yMin - 1e6 && v <= view.yMax + 1e6) y = v;
  }

  ctx.save();
  ctx.strokeStyle = ink.crosshair;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(cursor.px, 0);
  ctx.lineTo(cursor.px, size.h);
  ctx.stroke();
  ctx.setLineDash([]);

  if (y !== null) {
    const py = toPy(y);
    ctx.fillStyle = adapt(primary?.color ?? '#38bdf8', theme);
    ctx.beginPath();
    ctx.arc(cursor.px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink.markerCore;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const text = `(${fmt(x, 2)}, ${fmt(y, 2)})`;
    ctx.font = '600 12px ui-monospace, monospace';
    const w = ctx.measureText(text).width;
    const bx = Math.min(Math.max(cursor.px + 12, 4), size.w - w - 16);
    const by = Math.max(12, Math.min(py - 26, size.h - 30));

    ctx.fillStyle = ink.labelBg;
    ctx.beginPath();
    ctx.roundRect(bx, by, w + 12, 22, 6);
    ctx.fill();
    ctx.strokeStyle = ink.readoutBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = ink.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 6, by + 11);
  }
  ctx.restore();
}
