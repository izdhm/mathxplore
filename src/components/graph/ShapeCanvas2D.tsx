/**
 * ShapeCanvas2D - draws the 2D half of a GeometryScene.
 *
 * The picture is the interface: shapes fade and draw themselves on in the
 * order the program made them, and the only words on the canvas are the ones
 * a program asked for with `label=`. Measurements (area, perimeter) appear
 * when a shape is pointed at, and nowhere else.
 *
 * The view frames whatever was drawn, so a turtle walking 100 units and a
 * circle of radius 2 both fill the panel. Drag pans, scroll zooms, and the
 * frame is recomputed whenever a new run produces a different picture.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { area2D, perimeter2D, type GeometryScene, type Shape2D } from '../../lib/pyengine';
import { fmt } from '../../lib/math/functions';
import { FullscreenButton, useFullscreen } from '../ui/Fullscreen';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';
import { IconButton } from '../ui/Primitives';
import { adapt, chartInk, withAlpha, type ChartInk } from '../../lib/chartInk';
import { useTheme } from '../../state/theme';

interface Props {
  scene: GeometryScene;
  height?: number;
  /** Re-frames the picture and replays the draw-on when this changes. */
  revealKey?: string | number;
  /** Re-frames without replaying the animation. */
  fitKey?: string | number;
  showGrid?: boolean;
  className?: string;
  /** Controls shown inside the frame while it is fullscreen (e.g. sliders). */
  fullscreenOverlay?: ReactNode;
}

interface View { xMin: number; xMax: number; yMin: number; yMax: number }

const TAU = Math.PI * 2;

export function ShapeCanvas2D({
  scene,
  height = 380,
  revealKey,
  fitKey,
  showGrid = true,
  className,
  fullscreenOverlay,
}: Props) {
  const { theme } = useTheme();
  const ink = chartInk(theme);
  const [overlayOpen, setOverlayOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: height });
  const [view, setView] = useState<View>(() => frame(scene, 600, height));
  const [reveal, setReveal] = useState(1);
  const [hover, setHover] = useState<{ shape: Shape2D; px: number; py: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const raf = useRef(0);
  const fullscreen = useFullscreen(boxRef);
  const fsRef = useRef(false);
  fsRef.current = fullscreen.active;

  const shapes = scene.shapes2d;
  const fitSignature = useMemo(() => signature(scene), [scene]);

  // ---- sizing ---------------------------------------------------------------
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const w = Math.round(el.clientWidth);
    if (w > 1) setSize((p) => (p.w === w && p.h === height ? p : { w, h: height }));
  }, [height]);

  // In fullscreen the browser fixes the box's size, so its measured height is
  // the one to draw at; otherwise the height prop rules.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = fsRef.current ? Math.round(entry.contentRect.height) : height;
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    if (fullscreen.active) return;
    setSize((p) => (p.h === height ? p : { ...p, h: height }));
  }, [fullscreen.active, height]);

  // ---- framing --------------------------------------------------------------
  // Re-frame when a different picture arrives or the panel is resized, but
  // never while the student is mid-pan.
  const lastFit = useRef('');
  useEffect(() => {
    const key = `${fitSignature}|${size.w}x${size.h}|${fitKey ?? ''}|${revealKey ?? ''}`;
    if (lastFit.current === key) return;
    lastFit.current = key;
    setView(frame(scene, size.w, size.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignature, size.w, size.h, fitKey, revealKey]);

  // ---- draw-on ----------------------------------------------------------------
  useEffect(() => {
    if (revealKey === undefined) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setReveal(1);
      return;
    }
    cancelAnimationFrame(raf.current);
    setReveal(0);
    const started = performance.now();
    const duration = Math.min(1400, 450 + shapes.length * 40);
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      setReveal(1 - Math.pow(1 - t, 3));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

  // ---- transforms ---------------------------------------------------------------
  const toPx = useCallback((x: number) => ((x - view.xMin) / (view.xMax - view.xMin)) * size.w, [view, size.w]);
  const toPy = useCallback((y: number) => size.h - ((y - view.yMin) / (view.yMax - view.yMin)) * size.h, [view, size.h]);
  const toX = useCallback((px: number) => view.xMin + (px / size.w) * (view.xMax - view.xMin), [view, size.w]);
  const toY = useCallback((py: number) => view.yMin + ((size.h - py) / size.h) * (view.yMax - view.yMin), [view, size.h]);

  // ---- drawing --------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || size.w < 2) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.height = `${size.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    if (showGrid) drawGrid(ctx, view, size, toPx, toPy, ink);

    const scale = size.w / (view.xMax - view.xMin);
    const n = shapes.length;
    // Shapes appear one after another; each has a short window to fade in.
    const window_ = n > 1 ? 1 / Math.min(n, 12) : 1;
    const glow = n <= 400;

    shapes.forEach((s, i) => {
      const start = n > 1 ? (i / n) * (1 - window_) : 0;
      const p = Math.max(0, Math.min(1, (reveal - start) / window_));
      if (p <= 0) return;
      drawShape(ctx, s, p, scale, toPx, toPy, hover?.shape === s, glow, ink, theme);
    });

    for (const t of scene.turtles) {
      if (!t.visible) continue;
      drawTurtle(ctx, toPx(t.x), toPy(t.y), t.heading, adapt(t.color, theme), reveal);
    }
  }, [shapes, scene.turtles, view, size, reveal, hover, showGrid, toPx, toPy, ink, theme]);

  // ---- interaction ------------------------------------------------------------------
  const hit = (px: number, py: number): Shape2D | null => {
    const x = toX(px);
    const y = toY(py);
    const tol = 7 / (size.w / (view.xMax - view.xMin));
    // Topmost first, so a small shape drawn over a large one is the one picked.
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (contains(shapes[i], x, y, tol)) return shapes[i];
    }
    return null;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const drag = dragRef.current;
    if (drag) {
      const dx = ((px - drag.x) / size.w) * (drag.view.xMax - drag.view.xMin);
      const dy = ((py - drag.y) / size.h) * (drag.view.yMax - drag.view.yMin);
      if (Math.abs(px - drag.x) + Math.abs(py - drag.y) > 2) drag.moved = true;
      setView({
        xMin: drag.view.xMin - dx, xMax: drag.view.xMax - dx,
        yMin: drag.view.yMin + dy, yMax: drag.view.yMax + dy,
      });
      return;
    }
    const s = hit(px, py);
    setHover(s ? { shape: s, px, py } : null);
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ax = toX(e.clientX - rect.left);
    const ay = toY(e.clientY - rect.top);
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    setView((v) => ({
      xMin: ax + (v.xMin - ax) * k, xMax: ax + (v.xMax - ax) * k,
      yMin: ay + (v.yMin - ay) * k, yMax: ay + (v.yMax - ay) * k,
    }));
  };

  const measure = hover ? measurements(hover.shape) : null;

  return (
    <div className={className}>
      <div ref={boxRef} className="viz-frame relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          style={{ cursor: dragRef.current ? 'grabbing' : hover ? 'pointer' : 'grab' }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => { setHover(null); dragRef.current = null; }}
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, view, moved: false };
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            dragRef.current = null;
          }}
          onWheel={onWheel}
          onDoubleClick={() => setView(frame(scene, size.w, size.h))}
        />

        {/* The readout: a shape's numbers, only while it is pointed at. */}
        {hover && measure && (
          <div
            className="glass-chip pointer-events-none absolute z-10 flex items-center gap-2 px-2.5 py-1.5 text-[11.5px] tabular-nums animate-fade"
            style={{
              left: Math.min(hover.px + 14, size.w - 160),
              top: Math.max(6, Math.min(hover.py - 34, size.h - 36)),
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: hover.shape.color, boxShadow: `0 0 8px ${hover.shape.color}` }} />
            <span className="font-math italic text-paper">{hover.shape.name}</span>
            {measure.map(([k, v]) => (
              <span key={k} className="text-muted">
                <span className="font-math italic text-paper/80">{k}</span> {v}
              </span>
            ))}
          </div>
        )}

        <div className="absolute right-2 top-2 flex items-center gap-1">
          <Tooltip label="Fit">
            <button
              onClick={() => setView(frame(scene, size.w, size.h))}
              className="glass-chip flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-paper"
              aria-label="Fit to view"
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

// ------------------------------------------------------------- framing

function bounds(scene: GeometryScene) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const take = (x: number, y: number) => {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  };
  for (const s of scene.shapes2d) {
    if (s.kind === 'ellipse') {
      const r = Math.max(s.rx, s.ry);
      take(s.center[0] - r, s.center[1] - r);
      take(s.center[0] + r, s.center[1] + r);
    } else if (s.kind === 'point') {
      take(s.center[0] - s.rx, s.center[1] - s.rx);
      take(s.center[0] + s.rx, s.center[1] + s.rx);
    } else {
      for (const [x, y] of s.points) take(x, y);
    }
  }
  for (const t of scene.turtles) if (t.visible) take(t.x, t.y);
  if (!Number.isFinite(x0)) return null;
  return { x0, x1, y0, y1 };
}

/** A view that shows everything, square units, with breathing room. */
function frame(scene: GeometryScene, w: number, h: number): View {
  const b = bounds(scene);
  if (!b) return { xMin: -5 * (w / h), xMax: 5 * (w / h), yMin: -5, yMax: 5 };
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const spanX = Math.max(b.x1 - b.x0, 1e-6);
  const spanY = Math.max(b.y1 - b.y0, 1e-6);
  const aspect = w / h;
  // Fit the larger of the two extents, then pad.
  let halfW = Math.max(spanX / 2, (spanY / 2) * aspect) * 1.18 + 0.001;
  let halfH = halfW / aspect;
  // Tiny scenes (a single point) still get a sensible scale.
  if (halfW < 0.5) { halfW = 0.5 * aspect; halfH = 0.5; }
  return { xMin: cx - halfW, xMax: cx + halfW, yMin: cy - halfH, yMax: cy + halfH };
}

function signature(scene: GeometryScene): string {
  const b = bounds(scene);
  return b ? `${scene.shapes2d.length}:${b.x0.toFixed(2)},${b.x1.toFixed(2)},${b.y0.toFixed(2)},${b.y1.toFixed(2)}` : 'empty';
}

// ------------------------------------------------------------- drawing

type T = (v: number) => number;

function niceStep(range: number, target: number) {
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
}

function drawGrid(ctx: CanvasRenderingContext2D, view: View, size: { w: number; h: number }, toPx: T, toPy: T, ink: ChartInk) {
  const step = niceStep(view.xMax - view.xMin, Math.max(4, size.w / 90));
  ctx.lineWidth = 1;
  ctx.strokeStyle = ink.grid;
  ctx.beginPath();
  for (let x = Math.ceil(view.xMin / step) * step; x <= view.xMax; x += step) {
    const px = Math.round(toPx(x)) + 0.5;
    ctx.moveTo(px, 0); ctx.lineTo(px, size.h);
  }
  for (let y = Math.ceil(view.yMin / step) * step; y <= view.yMax; y += step) {
    const py = Math.round(toPy(y)) + 0.5;
    ctx.moveTo(0, py); ctx.lineTo(size.w, py);
  }
  ctx.stroke();

  const ox = toPx(0);
  const oy = toPy(0);
  ctx.strokeStyle = ink.axis;
  ctx.beginPath();
  if (oy >= 0 && oy <= size.h) { ctx.moveTo(0, Math.round(oy) + 0.5); ctx.lineTo(size.w, Math.round(oy) + 0.5); }
  if (ox >= 0 && ox <= size.w) { ctx.moveTo(Math.round(ox) + 0.5, 0); ctx.lineTo(Math.round(ox) + 0.5, size.h); }
  ctx.stroke();

  // A single scale hint in the corner instead of labelled axes: one number.
  ctx.font = '10.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = ink.tick;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  const px0 = 12;
  const px1 = 12 + step * (size.w / (view.xMax - view.xMin));
  const py = size.h - 10;
  ctx.strokeStyle = ink.tick;
  ctx.beginPath();
  ctx.moveTo(px0, py); ctx.lineTo(px1, py);
  ctx.moveTo(px0, py - 3); ctx.lineTo(px0, py + 3);
  ctx.moveTo(px1, py - 3); ctx.lineTo(px1, py + 3);
  ctx.stroke();
  ctx.fillText(fmt(step, 2), px0, py - 4);
}

function tracePath(ctx: CanvasRenderingContext2D, s: Shape2D, p: number, toPx: T, toPy: T) {
  ctx.beginPath();
  if (s.kind === 'ellipse') {
    const end = TAU * p;
    ctx.ellipse(toPx(s.center[0]), toPy(s.center[1]), s.rx * scaleOf(toPx), s.ry * scaleOf(toPx), -(s.rotation * Math.PI) / 180, -Math.PI / 2, -Math.PI / 2 + end, false);
    if (p >= 1) ctx.closePath();
    return;
  }
  const pts = s.points;
  if (!pts.length) return;
  const total = s.closed ? pts.length : pts.length - 1;
  const shown = total * p;
  ctx.moveTo(toPx(pts[0][0]), toPy(pts[0][1]));
  for (let i = 1; i <= Math.floor(shown); i++) {
    const [x, y] = pts[i % pts.length];
    ctx.lineTo(toPx(x), toPy(y));
  }
  const frac = shown - Math.floor(shown);
  if (frac > 0 && Math.floor(shown) < total) {
    const i = Math.floor(shown);
    const [x0, y0] = pts[i % pts.length];
    const [x1, y1] = pts[(i + 1) % pts.length];
    ctx.lineTo(toPx(x0 + (x1 - x0) * frac), toPy(y0 + (y1 - y0) * frac));
  }
  if (p >= 1 && s.closed) ctx.closePath();
}

/** Pixels per unit, recovered from the transform rather than threaded through. */
function scaleOf(toPx: T) {
  return toPx(1) - toPx(0);
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  s: Shape2D,
  p: number,
  scale: number,
  toPx: T,
  toPy: T,
  lit: boolean,
  glow: boolean,
  ink: ChartInk,
  theme: 'dark' | 'light',
) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, p * 1.4);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const color = adapt(s.color, theme);

  if (s.kind === 'point') {
    const px = toPx(s.center[0]);
    const py = toPy(s.center[1]);
    const r = Math.max(3, Math.min(14, s.rx * scale));
    if (s.name !== 'text') {
      ctx.fillStyle = color;
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = lit ? 18 : 10; }
      ctx.beginPath();
      ctx.arc(px, py, r * p, 0, TAU);
      ctx.fill();
    }
    if (s.label) drawLabel(ctx, s.label, px + r + 4, py, color, ink);
    ctx.restore();
    return;
  }

  // Fill: a soft glassy wash that brightens when pointed at.
  if (s.fill && (s.kind !== 'path' || s.closed)) {
    tracePath(ctx, s, 1, toPx, toPy);
    ctx.fillStyle = withAlpha(color, lit ? 0.34 : 0.17);
    ctx.fill();
  }

  // Stroke, drawn on as `p` grows.
  tracePath(ctx, s, p, toPx, toPy);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.6, s.width) * (lit ? 1.35 : 1);
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = lit ? 22 : 12; }
  ctx.stroke();

  // Vertices as tiny dots, once the outline is complete.
  if (p >= 1 && s.kind === 'polygon' && s.points.length <= 24 && s.name !== 'fill') {
    ctx.shadowBlur = 0;
    ctx.fillStyle = withAlpha(color, 0.9);
    for (const [x, y] of s.points) {
      ctx.beginPath();
      ctx.arc(toPx(x), toPy(y), 2.2, 0, TAU);
      ctx.fill();
    }
  }

  if (s.label && p > 0.6) {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(1, (p - 0.6) / 0.4);
    const [cx, cy] = s.center;
    drawLabel(ctx, s.label, toPx(cx), toPy(cy), color, ink, 'center');
  }
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, ink: ChartInk, align: CanvasTextAlign = 'left') {
  ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  const lx = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = ink.labelBg;
  ctx.beginPath();
  ctx.roundRect(lx - 5, y - 9, w + 10, 18, 6);
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawTurtle(ctx: CanvasRenderingContext2D, px: number, py: number, heading: number, color: string, p: number) {
  if (p < 0.98) return;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-(heading * Math.PI) / 180);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, 5.5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, -5.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --------------------------------------------------------- hit-testing

function contains(s: Shape2D, x: number, y: number, tol: number): boolean {
  if (s.kind === 'ellipse') {
    const t = -(s.rotation * Math.PI) / 180;
    const dx = x - s.center[0];
    const dy = y - s.center[1];
    const u = dx * Math.cos(t) - dy * Math.sin(t);
    const v = dx * Math.sin(t) + dy * Math.cos(t);
    const d = (u / s.rx) ** 2 + (v / s.ry) ** 2;
    return s.fill ? d <= 1 : Math.abs(Math.sqrt(d) - 1) * Math.min(s.rx, s.ry) < tol;
  }
  if (s.kind === 'point') return Math.hypot(x - s.center[0], y - s.center[1]) < Math.max(s.rx, tol);
  if ((s.kind === 'polygon' || s.closed) && s.fill && pointInPolygon(s.points, x, y)) return true;
  return nearPath(s.points, s.closed, x, y, tol);
}

function pointInPolygon(pts: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function nearPath(pts: [number, number][], closed: boolean, x: number, y: number, tol: number): boolean {
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1e-12;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
    if (Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) < tol) return true;
  }
  return false;
}

// -------------------------------------------------------- measurements

function measurements(s: Shape2D): [string, string][] {
  if (s.kind === 'point') return [['', `(${fmt(s.center[0], 2)}, ${fmt(s.center[1], 2)})`]];
  const area = area2D(s);
  const perim = perimeter2D(s);
  return area > 0 ? [['A', fmt(area, 2)], ['P', fmt(perim, 2)]] : [['L', fmt(perim, 2)]];
}
