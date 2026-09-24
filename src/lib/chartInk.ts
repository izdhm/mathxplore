/**
 * Ink for the canvas renderers, per theme.
 *
 * The 2D graphs draw with raw canvas colours rather than CSS, so they need to
 * be told which theme they are in. Curve and marker colours arrive from the
 * modules as bright hues chosen for a dark ground; on paper they are darkened
 * a little so a cyan line still reads as a line and not a highlight.
 */

import type { Theme } from '../state/theme';

export interface ChartInk {
  grid: string;
  axis: string;
  tick: string;
  axisName: string;
  /** Text drawn directly on the canvas. */
  text: string;
  /** Background of small labels and readouts. */
  labelBg: string;
  /** Hollow-marker fill and the ring around solid markers. */
  markerCore: string;
  crosshair: string;
  readoutBorder: string;
}

const DARK: ChartInk = {
  grid: 'rgba(120,150,200,0.09)',
  axis: 'rgba(160,190,235,0.42)',
  tick: 'rgba(143,160,191,0.85)',
  axisName: 'rgba(143,160,191,0.95)',
  text: '#e8edf7',
  labelBg: 'rgba(10,15,30,0.88)',
  markerCore: '#05070f',
  crosshair: 'rgba(232,237,247,0.22)',
  readoutBorder: 'rgba(56,189,248,0.35)',
};

const LIGHT: ChartInk = {
  grid: 'rgba(30,50,100,0.10)',
  axis: 'rgba(30,50,100,0.45)',
  tick: 'rgba(60,75,110,0.9)',
  axisName: 'rgba(40,55,90,0.95)',
  text: '#111730',
  labelBg: 'rgba(255,255,255,0.92)',
  markerCore: '#ffffff',
  crosshair: 'rgba(20,30,60,0.3)',
  readoutBorder: 'rgba(11,135,201,0.4)',
};

export function chartInk(theme: Theme): ChartInk {
  return theme === 'light' ? LIGHT : DARK;
}

/** Darken a bright hue for paper; leave it alone on the dark ground. */
export function adapt(color: string, theme: Theme): string {
  if (theme !== 'light') return color;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const k = 0.74;
  const ch = (i: number) => Math.round(parseInt(h.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/** rgba() from a hex colour and an alpha. */
export function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
