/**
 * MathXplore Python Engine - geometry libraries.
 *
 * Two importable modules that let a student program build pictures:
 *
 *   from shapes import *      2D and 3D primitives with live measurements
 *   import turtle             the classic pen-on-paper drawing API
 *
 * Both write into one GeometryScene, which the renderers draw after the run.
 * Every shape is a PyObject whose attributes (`area`, `volume`, `x`, ...) are
 * computed from its *current* state, so a program can build a shape, move and
 * scale it, and print what those operations did to its measurements - the
 * mathematics and the picture stay tied together.
 *
 * Conventions:
 *   - 2D shapes are placed by their centre; `at=(x, y)`.
 *   - 3D shapes *stand* on `at=(x, y, z)`: `z` is the ground they rest on, so
 *     `cube(2)` followed by `cube(1, at=(0, 0, 2))` stacks. z is up.
 *   - Angles are degrees everywhere, as in turtle.
 */

import { PyRuntimeError } from './errors';
import {
  Flt, NativeFn, PyModule, PyObject, PyTuple, isNumeric, iterate, numVal,
  type PyValue,
} from './values';

// ------------------------------------------------------------------- scene

export interface Shape2D {
  id: number;
  /** `circle`, `square`, `path`, ... - what the student called it. */
  name: string;
  kind: 'polygon' | 'ellipse' | 'path' | 'point';
  /** World-space vertices for polygons and paths. */
  points: [number, number][];
  center: [number, number];
  rx: number;
  ry: number;
  /** Degrees, anticlockwise. Only ellipses need it; polygons bake it in. */
  rotation: number;
  color: string;
  fill: boolean;
  closed: boolean;
  width: number;
  label?: string;
}

export type Shape3DKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'prism' | 'pyramid';

export interface Shape3D {
  id: number;
  name: string;
  kind: Shape3DKind;
  /** Where the shape stands. Mathematical axes: z is up. */
  position: [number, number, number];
  /** Degrees about x, y and z. */
  rotation: [number, number, number];
  /**
   * Kind-specific dimensions:
   *   box [w, d, h] · sphere [r] · cylinder [r, h] · cone [r, h]
   *   torus [R, r] · prism [n, r, h] · pyramid [n, r, h]
   */
  size: number[];
  color: string;
  opacity: number;
  wireframe: boolean;
  label?: string;
}

export interface TurtleMark {
  x: number;
  y: number;
  heading: number;
  color: string;
  visible: boolean;
}

export interface GeometryScene {
  shapes2d: Shape2D[];
  shapes3d: Shape3D[];
  turtles: TurtleMark[];
}

export function emptyScene(): GeometryScene {
  return { shapes2d: [], shapes3d: [], turtles: [] };
}

const MAX_SHAPES = 4000;
const MAX_POINTS = 250_000;

// The domain palette, cycled when a program does not choose a colour.
const PALETTE = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#f472b6', '#22d3ee'];

const NAMED_COLORS: Record<string, string> = {
  red: '#fb7185', orange: '#fb923c', yellow: '#fbbf24', amber: '#fbbf24', gold: '#f59e0b',
  green: '#34d399', lime: '#a3e635', teal: '#2dd4bf', cyan: '#22d3ee', blue: '#38bdf8',
  navy: '#6366f1', indigo: '#818cf8', purple: '#a78bfa', violet: '#a78bfa', magenta: '#e879f9',
  pink: '#f472b6', white: '#e8edf7', grey: '#8fa0bf', gray: '#8fa0bf', silver: '#cbd5e1',
  black: '#0b1020', brown: '#b45309', coral: '#fb7185', sky: '#7dd3fc', mint: '#6ee7b7',
};

export function resolveColor(v: PyValue | undefined, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const key = v.trim().toLowerCase();
  if (NAMED_COLORS[key]) return NAMED_COLORS[key];
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(key)) return key;
  throw new PyRuntimeError(
    `\`${v}\` is not a colour this library knows. Try one of: ${Object.keys(NAMED_COLORS).slice(0, 12).join(', ')} - or a hex code such as "#38bdf8".`,
    0,
    'ValueError',
  );
}

// ---------------------------------------------------------------- helpers

const TAU = Math.PI * 2;
const rad = (deg: number) => (deg * Math.PI) / 180;

function needNumber(v: PyValue | undefined, fn: string, what: string, positive = false): number {
  if (v === undefined || !isNumeric(v)) {
    throw new PyRuntimeError(
      `${fn}() needs a number for its ${what}${v === undefined ? ', but none was given' : `, not ${describeValue(v)}`}.`,
      0,
      'TypeError',
    );
  }
  const n = numVal(v);
  if (!Number.isFinite(n)) throw new PyRuntimeError(`${fn}() was given a value that is not a finite number.`, 0, 'ValueError');
  if (positive && n <= 0) {
    throw new PyRuntimeError(`${fn}() needs a ${what} greater than 0, but got ${formatNum(n)}.`, 0, 'ValueError');
  }
  return n;
}

function describeValue(v: PyValue): string {
  if (typeof v === 'string') return `the text "${v}"`;
  if (Array.isArray(v)) return 'a list';
  if (v instanceof PyTuple) return 'a tuple';
  return 'that value';
}

function needPair(v: PyValue | undefined, fn: string, what: string): [number, number] {
  const items = v === undefined ? null : iterate(v);
  if (!items || items.length < 2 || !isNumeric(items[0]) || !isNumeric(items[1])) {
    throw new PyRuntimeError(
      `${fn}() needs ${what} as a pair of numbers in brackets, for example (2, 3).`,
      0,
      'TypeError',
    );
  }
  return [numVal(items[0]), numVal(items[1])];
}

function needTriple(v: PyValue | undefined, fn: string, what: string): [number, number, number] {
  const items = v === undefined ? null : iterate(v);
  if (!items || items.length < 2 || items.some((it) => !isNumeric(it))) {
    throw new PyRuntimeError(
      `${fn}() needs ${what} as numbers in brackets, for example (0, 0, 2).`,
      0,
      'TypeError',
    );
  }
  return [numVal(items[0]), numVal(items[1]), items.length > 2 ? numVal(items[2]) : 0];
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(3)));
}

const flt = (n: number) => new Flt(n);

function regularPolygon(n: number, r: number, cx: number, cy: number, angle = 0): [number, number][] {
  const out: [number, number][] = [];
  // Start at the top so squares and triangles sit the way a student draws them.
  const start = Math.PI / 2 + rad(angle);
  for (let i = 0; i < n; i++) {
    const t = start + (TAU * i) / n;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

function shoelace(points: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

function pathLength(points: [number, number][], closed: boolean): number {
  let s = 0;
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    s += Math.hypot(x2 - x1, y2 - y1);
  }
  return s;
}

function centroid(points: [number, number][]): [number, number] {
  if (!points.length) return [0, 0];
  let x = 0;
  let y = 0;
  for (const [px, py] of points) {
    x += px;
    y += py;
  }
  return [x / points.length, y / points.length];
}

// ---------------------------------------------------------- 2D measures

export function area2D(s: Shape2D): number {
  if (s.kind === 'ellipse') return Math.PI * s.rx * s.ry;
  if (s.kind === 'polygon' || (s.kind === 'path' && s.closed)) return shoelace(s.points);
  return 0;
}

export function perimeter2D(s: Shape2D): number {
  if (s.kind === 'ellipse') {
    if (Math.abs(s.rx - s.ry) < 1e-12) return TAU * s.rx;
    // Ramanujan's approximation - accurate to well beyond what is displayed.
    const h = ((s.rx - s.ry) ** 2) / ((s.rx + s.ry) ** 2);
    return Math.PI * (s.rx + s.ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  }
  if (s.kind === 'point') return 0;
  return pathLength(s.points, s.closed);
}

// ---------------------------------------------------------- 3D measures

function baseArea(n: number, r: number): number {
  return (n / 2) * r * r * Math.sin(TAU / n);
}
function baseSide(n: number, r: number): number {
  return 2 * r * Math.sin(Math.PI / n);
}

export function volume3D(s: Shape3D): number {
  const d = s.size;
  switch (s.kind) {
    case 'box': return d[0] * d[1] * d[2];
    case 'sphere': return (4 / 3) * Math.PI * d[0] ** 3;
    case 'cylinder': return Math.PI * d[0] ** 2 * d[1];
    case 'cone': return (Math.PI * d[0] ** 2 * d[1]) / 3;
    case 'torus': return 2 * Math.PI ** 2 * d[0] * d[1] ** 2;
    case 'prism': return baseArea(d[0], d[1]) * d[2];
    case 'pyramid': return (baseArea(d[0], d[1]) * d[2]) / 3;
  }
}

export function surface3D(s: Shape3D): number {
  const d = s.size;
  switch (s.kind) {
    case 'box': return 2 * (d[0] * d[1] + d[0] * d[2] + d[1] * d[2]);
    case 'sphere': return 4 * Math.PI * d[0] ** 2;
    case 'cylinder': return 2 * Math.PI * d[0] * (d[0] + d[1]);
    case 'cone': return Math.PI * d[0] * (d[0] + Math.hypot(d[0], d[1]));
    case 'torus': return 4 * Math.PI ** 2 * d[0] * d[1];
    case 'prism': return 2 * baseArea(d[0], d[1]) + d[0] * baseSide(d[0], d[1]) * d[2];
    case 'pyramid': {
      const apothem = d[1] * Math.cos(Math.PI / d[0]);
      const slant = Math.hypot(apothem, d[2]);
      return baseArea(d[0], d[1]) + (d[0] * baseSide(d[0], d[1]) * slant) / 2;
    }
  }
}

function height3D(s: Shape3D): number {
  switch (s.kind) {
    case 'box': return s.size[2];
    case 'sphere': return s.size[0] * 2;
    case 'torus': return s.size[1] * 2;
    case 'cylinder': case 'cone': return s.size[1];
    case 'prism': case 'pyramid': return s.size[2];
  }
}

// ------------------------------------------------------------ the module

/**
 * Build the `shapes` and `turtle` modules bound to one scene. A fresh pair is
 * made for every run so that shapes from a previous run never linger.
 */
export function createGeometryModules(scene: GeometryScene): {
  shapes: PyModule;
  turtle: PyModule;
  /** Commit any half-finished turtle strokes. Called when the run ends. */
  finalize: () => void;
} {
  let nextId = 1;
  let pointBudget = MAX_POINTS;

  const spend = (points: number) => {
    pointBudget -= points;
    if (pointBudget < 0 || scene.shapes2d.length + scene.shapes3d.length >= MAX_SHAPES) {
      throw new PyRuntimeError(
        `That is more drawing than MathXplore can show at once (the limit is ${MAX_SHAPES} shapes). ` +
          'Check that a loop is not drawing far more than you intended.',
        0,
        'MemoryError',
      );
    }
  };

  const autoColor = () => PALETTE[(scene.shapes2d.length + scene.shapes3d.length) % PALETTE.length];

  // ---------------------------------------------------------------- 2D

  function add2D(partial: Omit<Shape2D, 'id' | 'color' | 'fill' | 'width' | 'label'> & { color?: string }, kw: Record<string, PyValue>): PyObject {
    spend(partial.points.length + 1);
    const { color: baseColor, ...rest } = partial;
    const shape: Shape2D = {
      id: nextId++,
      ...rest,
      color: resolveColor(kw.color, baseColor ?? autoColor()),
      fill: kw.fill === undefined ? rest.kind !== 'path' : truthyish(kw.fill),
      width: kw.width !== undefined ? needNumber(kw.width, rest.name, 'width', true) : 2,
      label: typeof kw.label === 'string' ? kw.label : undefined,
    };
    scene.shapes2d.push(shape);
    return wrap2D(shape);
  }

  function wrap2D(s: Shape2D): PyObject {
    const self: PyObject = new PyObject(
      s.name,
      {
        name: s.name,
        x: () => flt(s.center[0]),
        y: () => flt(s.center[1]),
        area: () => flt(area2D(s)),
        perimeter: () => flt(perimeter2D(s)),
        radius: () => flt(s.kind === 'ellipse' ? s.rx : circumradius(s)),
        width: () => flt(extent(s)[0]),
        height: () => flt(extent(s)[1]),
        sides: () => (s.kind === 'polygon' ? s.points.length : 0),
        vertices: () => s.points.map(([x, y]) => new PyTuple([flt(x), flt(y)])),
        center: () => new PyTuple([flt(s.center[0]), flt(s.center[1])]),
      },
      {
        move: new NativeFn('move', (args) => {
          const dx = needNumber(args[1], 'move', 'x distance');
          const dy = args.length > 2 ? needNumber(args[2], 'move', 'y distance') : 0;
          s.center = [s.center[0] + dx, s.center[1] + dy];
          s.points = s.points.map(([x, y]) => [x + dx, y + dy]);
          return self;
        }),
        rotate: new NativeFn('rotate', (args) => {
          const deg = needNumber(args[1], 'rotate', 'angle');
          const [cx, cy] = s.center;
          const c = Math.cos(rad(deg));
          const sn = Math.sin(rad(deg));
          s.points = s.points.map(([x, y]) => [
            cx + (x - cx) * c - (y - cy) * sn,
            cy + (x - cx) * sn + (y - cy) * c,
          ]);
          s.rotation += deg;
          return self;
        }),
        scale: new NativeFn('scale', (args) => {
          const k = needNumber(args[1], 'scale', 'factor', true);
          const [cx, cy] = s.center;
          s.points = s.points.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
          s.rx *= k;
          s.ry *= k;
          return self;
        }),
        color: new NativeFn('color', (args) => {
          s.color = resolveColor(args[1], s.color);
          return self;
        }),
        fill: new NativeFn('fill', (args) => {
          s.fill = args.length > 1 ? truthyish(args[1]) : true;
          return self;
        }),
        label: new NativeFn('label', (args) => {
          s.label = args.length > 1 ? String(args[1] ?? '') : undefined;
          return self;
        }),
      },
      () => describe2D(s),
    );
    return self;
  }

  const shapes2D: Record<string, NativeFn> = {
    circle: new NativeFn('circle', (args, kw) => {
      const r = needNumber(args[0] ?? kw.radius ?? kw.r, 'circle', 'radius', true);
      const [cx, cy] = kw.at !== undefined ? needPair(kw.at, 'circle', 'its centre') : [0, 0];
      return add2D({ name: 'circle', kind: 'ellipse', points: [], center: [cx, cy], rx: r, ry: r, rotation: 0, closed: true }, kw);
    }),

    ellipse: new NativeFn('ellipse', (args, kw) => {
      const rx = needNumber(args[0], 'ellipse', 'first radius', true);
      const ry = needNumber(args[1], 'ellipse', 'second radius', true);
      const [cx, cy] = kw.at !== undefined ? needPair(kw.at, 'ellipse', 'its centre') : [0, 0];
      const angle = kw.angle !== undefined ? needNumber(kw.angle, 'ellipse', 'angle') : 0;
      return add2D({ name: 'ellipse', kind: 'ellipse', points: [], center: [cx, cy], rx, ry, rotation: angle, closed: true }, kw);
    }),

    square: new NativeFn('square', (args, kw) => {
      const side = needNumber(args[0], 'square', 'side length', true);
      return rectangle('square', side, side, kw);
    }),

    rect: new NativeFn('rect', (args, kw) => {
      const w = needNumber(args[0], 'rect', 'width', true);
      const h = needNumber(args[1], 'rect', 'height', true);
      return rectangle('rect', w, h, kw);
    }),

    triangle: new NativeFn('triangle', (args, kw) => {
      // triangle((x1, y1), (x2, y2), (x3, y3)) - three corners
      if (args.length === 3 && !isNumeric(args[0])) {
        const pts = args.map((a, i) => needPair(a, 'triangle', `corner ${i + 1}`));
        return add2D({ name: 'triangle', kind: 'polygon', points: pts, center: centroid(pts), rx: 0, ry: 0, rotation: 0, closed: true }, kw);
      }
      // triangle(base, height) - isosceles, or equilateral when height is omitted
      const base = needNumber(args[0], 'triangle', 'base', true);
      const h = args.length > 1 ? needNumber(args[1], 'triangle', 'height', true) : (base * Math.sqrt(3)) / 2;
      const [cx, cy] = kw.at !== undefined ? needPair(kw.at, 'triangle', 'its centre') : [0, 0];
      const pts: [number, number][] = [
        [cx - base / 2, cy - h / 3],
        [cx + base / 2, cy - h / 3],
        [cx, cy + (2 * h) / 3],
      ];
      const obj = add2D({ name: 'triangle', kind: 'polygon', points: pts, center: [cx, cy], rx: 0, ry: 0, rotation: 0, closed: true }, kw);
      if (kw.angle !== undefined) rotateObj(obj, needNumber(kw.angle, 'triangle', 'angle'));
      return obj;
    }),

    polygon: new NativeFn('polygon', (args, kw) => {
      // polygon([(x, y), ...]) - explicit corners
      if (args.length === 1 && !isNumeric(args[0])) {
        const items = iterate(args[0]);
        if (!items || items.length < 3) {
          throw new PyRuntimeError('polygon() needs at least three corners, each written as (x, y).', 0, 'ValueError');
        }
        const pts = items.map((it, i) => needPair(it, 'polygon', `corner ${i + 1}`));
        return add2D({ name: 'polygon', kind: 'polygon', points: pts, center: centroid(pts), rx: 0, ry: 0, rotation: 0, closed: true }, kw);
      }
      // polygon(n, radius) - regular
      const n = Math.round(needNumber(args[0] ?? kw.sides, 'polygon', 'number of sides'));
      if (n < 3 || n > 360) throw new PyRuntimeError('polygon() needs between 3 and 360 sides.', 0, 'ValueError');
      const r = needNumber(args[1] ?? kw.radius ?? 1, 'polygon', 'radius', true);
      const [cx, cy] = kw.at !== undefined ? needPair(kw.at, 'polygon', 'its centre') : [0, 0];
      const angle = kw.angle !== undefined ? needNumber(kw.angle, 'polygon', 'angle') : 0;
      const pts = regularPolygon(n, r, cx, cy, angle);
      return add2D({ name: 'polygon', kind: 'polygon', points: pts, center: [cx, cy], rx: r, ry: r, rotation: angle, closed: true }, kw);
    }),

    star: new NativeFn('star', (args, kw) => {
      const n = Math.round(needNumber(args[0] ?? 5, 'star', 'number of points'));
      if (n < 3 || n > 180) throw new PyRuntimeError('star() needs between 3 and 180 points.', 0, 'ValueError');
      const outer = needNumber(args[1] ?? 1, 'star', 'outer radius', true);
      const inner = args.length > 2 ? needNumber(args[2], 'star', 'inner radius', true) : outer * 0.45;
      const [cx, cy] = kw.at !== undefined ? needPair(kw.at, 'star', 'its centre') : [0, 0];
      const angle = kw.angle !== undefined ? needNumber(kw.angle, 'star', 'angle') : 0;
      const pts: [number, number][] = [];
      const start = Math.PI / 2 + rad(angle);
      for (let i = 0; i < n * 2; i++) {
        const t = start + (Math.PI * i) / n;
        const r = i % 2 === 0 ? outer : inner;
        pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
      return add2D({ name: 'star', kind: 'polygon', points: pts, center: [cx, cy], rx: outer, ry: outer, rotation: angle, closed: true }, kw);
    }),

    line: new NativeFn('line', (args, kw) => {
      let a: [number, number];
      let b: [number, number];
      if (args.length >= 4) {
        a = [needNumber(args[0], 'line', 'x1'), needNumber(args[1], 'line', 'y1')];
        b = [needNumber(args[2], 'line', 'x2'), needNumber(args[3], 'line', 'y2')];
      } else {
        a = needPair(args[0], 'line', 'its start');
        b = needPair(args[1], 'line', 'its end');
      }
      return add2D({ name: 'line', kind: 'path', points: [a, b], center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], rx: 0, ry: 0, rotation: 0, closed: false }, kw);
    }),

    path: new NativeFn('path', (args, kw) => {
      const items = args.length === 1 ? iterate(args[0]) : args;
      if (!items || items.length < 2) throw new PyRuntimeError('path() needs a list of at least two points, each written as (x, y).', 0, 'ValueError');
      const pts = items.map((it, i) => needPair(it, 'path', `point ${i + 1}`));
      const closed = kw.closed !== undefined && truthyish(kw.closed);
      return add2D({ name: 'path', kind: 'path', points: pts, center: centroid(pts), rx: 0, ry: 0, rotation: 0, closed }, kw);
    }),

    point: new NativeFn('point', (args, kw) => {
      const [x, y] = args.length >= 2
        ? [needNumber(args[0], 'point', 'x'), needNumber(args[1], 'point', 'y')]
        : needPair(args[0], 'point', 'its position');
      return add2D({ name: 'point', kind: 'point', points: [[x, y]], center: [x, y], rx: 0.08, ry: 0.08, rotation: 0, closed: false }, kw);
    }),
  };

  function rectangle(name: string, w: number, h: number, kw: Record<string, PyValue>): PyObject {
    const [cx, cy] = kw.at !== undefined ? needPair(kw.at, name, 'its centre') : [0, 0];
    const pts: [number, number][] = [
      [cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2],
      [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2],
    ];
    const obj = add2D({ name, kind: 'polygon', points: pts, center: [cx, cy], rx: w / 2, ry: h / 2, rotation: 0, closed: true }, kw);
    if (kw.angle !== undefined) rotateObj(obj, needNumber(kw.angle, name, 'angle'));
    return obj;
  }

  function rotateObj(obj: PyObject, deg: number) {
    obj.methods.rotate.call([obj, flt(deg)], {});
  }

  // ---------------------------------------------------------------- 3D

  function add3D(kind: Shape3DKind, name: string, size: number[], kw: Record<string, PyValue>): PyObject {
    spend(1);
    const shape: Shape3D = {
      id: nextId++,
      name,
      kind,
      position: kw.at !== undefined ? needTriple(kw.at, name, 'its position') : [0, 0, 0],
      rotation: kw.rotate !== undefined ? needTriple(kw.rotate, name, 'its rotation') : [0, 0, 0],
      size,
      color: resolveColor(kw.color, autoColor()),
      opacity: kw.opacity !== undefined ? Math.max(0.05, Math.min(1, needNumber(kw.opacity, name, 'opacity'))) : 0.92,
      wireframe: kw.wireframe !== undefined && truthyish(kw.wireframe),
      label: typeof kw.label === 'string' ? kw.label : undefined,
    };
    if (kw.angle !== undefined) shape.rotation[2] += needNumber(kw.angle, name, 'angle');
    scene.shapes3d.push(shape);
    return wrap3D(shape);
  }

  function wrap3D(s: Shape3D): PyObject {
    const self: PyObject = new PyObject(
      s.name,
      {
        name: s.name,
        x: () => flt(s.position[0]),
        y: () => flt(s.position[1]),
        z: () => flt(s.position[2]),
        volume: () => flt(volume3D(s)),
        surface_area: () => flt(surface3D(s)),
        height: () => flt(height3D(s)),
        radius: () => flt(s.kind === 'box' ? Math.hypot(s.size[0], s.size[1]) / 2 : s.kind === 'prism' || s.kind === 'pyramid' ? s.size[1] : s.size[0]),
        top: () => flt(s.position[2] + height3D(s)),
        position: () => new PyTuple(s.position.map(flt)),
      },
      {
        move: new NativeFn('move', (args) => {
          const dx = needNumber(args[1], 'move', 'x distance');
          const dy = args.length > 2 ? needNumber(args[2], 'move', 'y distance') : 0;
          const dz = args.length > 3 ? needNumber(args[3], 'move', 'z distance') : 0;
          s.position = [s.position[0] + dx, s.position[1] + dy, s.position[2] + dz];
          return self;
        }),
        rotate: new NativeFn('rotate', (args) => {
          // rotate(deg) spins about the vertical axis; rotate(rx, ry, rz) does all three.
          if (args.length === 2) {
            s.rotation[2] += needNumber(args[1], 'rotate', 'angle');
          } else {
            s.rotation = [
              s.rotation[0] + needNumber(args[1], 'rotate', 'x angle'),
              s.rotation[1] + needNumber(args[2], 'rotate', 'y angle'),
              s.rotation[2] + (args.length > 3 ? needNumber(args[3], 'rotate', 'z angle') : 0),
            ];
          }
          return self;
        }),
        scale: new NativeFn('scale', (args) => {
          const k = needNumber(args[1], 'scale', 'factor', true);
          // The side count of a prism or pyramid is not a length.
          s.size = s.size.map((v, i) => ((s.kind === 'prism' || s.kind === 'pyramid') && i === 0 ? v : v * k));
          return self;
        }),
        color: new NativeFn('color', (args) => {
          s.color = resolveColor(args[1], s.color);
          return self;
        }),
        opacity: new NativeFn('opacity', (args) => {
          s.opacity = Math.max(0.05, Math.min(1, needNumber(args[1], 'opacity', 'value')));
          return self;
        }),
        wireframe: new NativeFn('wireframe', (args) => {
          s.wireframe = args.length > 1 ? truthyish(args[1]) : true;
          return self;
        }),
        label: new NativeFn('label', (args) => {
          s.label = args.length > 1 ? String(args[1] ?? '') : undefined;
          return self;
        }),
      },
      () => describe3D(s),
    );
    return self;
  }

  const shapes3D: Record<string, NativeFn> = {
    cube: new NativeFn('cube', (args, kw) => {
      const s = needNumber(args[0] ?? kw.side ?? 1, 'cube', 'side length', true);
      return add3D('box', 'cube', [s, s, s], kw);
    }),
    box: new NativeFn('box', (args, kw) => {
      const w = needNumber(args[0], 'box', 'width', true);
      const d = needNumber(args[1] ?? w, 'box', 'depth', true);
      const h = needNumber(args[2] ?? w, 'box', 'height', true);
      return add3D('box', 'box', [w, d, h], kw);
    }),
    sphere: new NativeFn('sphere', (args, kw) => {
      const r = needNumber(args[0] ?? kw.radius ?? 1, 'sphere', 'radius', true);
      return add3D('sphere', 'sphere', [r], kw);
    }),
    cylinder: new NativeFn('cylinder', (args, kw) => {
      const r = needNumber(args[0] ?? kw.radius, 'cylinder', 'radius', true);
      const h = needNumber(args[1] ?? kw.height, 'cylinder', 'height', true);
      return add3D('cylinder', 'cylinder', [r, h], kw);
    }),
    cone: new NativeFn('cone', (args, kw) => {
      const r = needNumber(args[0] ?? kw.radius, 'cone', 'radius', true);
      const h = needNumber(args[1] ?? kw.height, 'cone', 'height', true);
      return add3D('cone', 'cone', [r, h], kw);
    }),
    torus: new NativeFn('torus', (args, kw) => {
      const R = needNumber(args[0] ?? 2, 'torus', 'ring radius', true);
      const r = needNumber(args[1] ?? R * 0.35, 'torus', 'tube radius', true);
      return add3D('torus', 'torus', [R, r], kw);
    }),
    prism: new NativeFn('prism', (args, kw) => {
      const n = Math.round(needNumber(args[0] ?? kw.sides ?? 6, 'prism', 'number of sides'));
      if (n < 3 || n > 120) throw new PyRuntimeError('prism() needs between 3 and 120 sides.', 0, 'ValueError');
      const r = needNumber(args[1] ?? kw.radius ?? 1, 'prism', 'radius', true);
      const h = needNumber(args[2] ?? kw.height ?? 1, 'prism', 'height', true);
      return add3D('prism', 'prism', [n, r, h], kw);
    }),
    pyramid: new NativeFn('pyramid', (args, kw) => {
      // pyramid(base, height): square base of the given side, as in a textbook.
      const base = needNumber(args[0] ?? kw.base ?? 2, 'pyramid', 'base', true);
      const h = needNumber(args[1] ?? kw.height ?? base, 'pyramid', 'height', true);
      const n = kw.sides !== undefined ? Math.round(needNumber(kw.sides, 'pyramid', 'number of sides')) : 4;
      if (n < 3 || n > 120) throw new PyRuntimeError('pyramid() needs between 3 and 120 sides.', 0, 'ValueError');
      // Circumradius of a regular n-gon whose side is `base`.
      const r = base / (2 * Math.sin(Math.PI / n));
      const obj = add3D('pyramid', 'pyramid', [n, r, h], kw);
      // A square pyramid should face the axes, not sit on a corner.
      if (n === 4 && kw.angle === undefined) scene.shapes3d[scene.shapes3d.length - 1].rotation[2] += 45;
      return obj;
    }),
  };

  const shapesModule = new PyModule('shapes', {
    ...shapes2D,
    ...shapes3D,
    rectangle: shapes2D.rect,
    clear: new NativeFn('clear', () => {
      scene.shapes2d.length = 0;
      scene.shapes3d.length = 0;
      return null;
    }),
    count: new NativeFn('count', () => scene.shapes2d.length + scene.shapes3d.length),
  });

  // ------------------------------------------------------------ turtle

  const turtle = createTurtleModule(scene, add2D, spend);

  return { shapes: shapesModule, turtle: turtle.module, finalize: turtle.finalize };
}

// ------------------------------------------------------------- describe

function describe2D(s: Shape2D): string {
  const f = (n: number) => formatNum(n);
  switch (s.name) {
    case 'circle': return `circle(r=${f(s.rx)}, at=(${f(s.center[0])}, ${f(s.center[1])}))`;
    case 'ellipse': return `ellipse(${f(s.rx)}, ${f(s.ry)})`;
    case 'square': return `square(side=${f(extent(s)[0])})`;
    case 'rect': return `rect(${f(extent(s)[0])} × ${f(extent(s)[1])})`;
    case 'polygon': return `polygon(sides=${s.points.length}, area=${f(area2D(s))})`;
    case 'point': return `point(${f(s.center[0])}, ${f(s.center[1])})`;
    default: return `${s.name}(points=${s.points.length})`;
  }
}

function describe3D(s: Shape3D): string {
  const f = (n: number) => formatNum(n);
  const d = s.size;
  switch (s.kind) {
    case 'box': return s.name === 'cube' ? `cube(side=${f(d[0])})` : `box(${f(d[0])} × ${f(d[1])} × ${f(d[2])})`;
    case 'sphere': return `sphere(r=${f(d[0])})`;
    case 'cylinder': return `cylinder(r=${f(d[0])}, h=${f(d[1])})`;
    case 'cone': return `cone(r=${f(d[0])}, h=${f(d[1])})`;
    case 'torus': return `torus(R=${f(d[0])}, r=${f(d[1])})`;
    case 'prism': return `prism(sides=${d[0]}, r=${f(d[1])}, h=${f(d[2])})`;
    case 'pyramid': return `pyramid(sides=${d[0]}, h=${f(d[2])})`;
  }
}

function extent(s: Shape2D): [number, number] {
  if (s.kind === 'ellipse') return [s.rx * 2, s.ry * 2];
  if (!s.points.length) return [0, 0];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of s.points) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return [x1 - x0, y1 - y0];
}

function circumradius(s: Shape2D): number {
  const [cx, cy] = s.center;
  return s.points.reduce((m, [x, y]) => Math.max(m, Math.hypot(x - cx, y - cy)), 0);
}

/** Strip floating-point noise from a coordinate before a student sees it. */
function tidy(n: number): number {
  const r = Math.round(n * 1e9) / 1e9;
  return Object.is(r, -0) ? 0 : r;
}

function truthyish(v: PyValue): boolean {
  if (typeof v === 'boolean') return v;
  if (isNumeric(v)) return numVal(v) !== 0;
  if (v === null) return false;
  return true;
}

// --------------------------------------------------------------- turtle

type Add2D = (
  partial: Omit<Shape2D, 'id' | 'color' | 'fill' | 'width' | 'label'> & { color?: string },
  kw: Record<string, PyValue>,
) => PyObject;

/**
 * The turtle: a pen that walks. Each pen-down stretch becomes one path in the
 * scene; begin_fill/end_fill turn a closed walk into a filled polygon. Both the
 * module-level functions (`turtle.forward(50)`) and `Turtle()` objects work,
 * as they do in CPython.
 */
function createTurtleModule(
  scene: GeometryScene,
  add2D: Add2D,
  spend: (n: number) => void,
): { module: PyModule; finalize: () => void } {
  class Turtle {
    x = 0;
    y = 0;
    heading = 0;
    down = true;
    color = '#38bdf8';
    fillColor = '#38bdf8';
    width = 2;
    visible = true;
    path: [number, number][] = [[0, 0]];
    filling: [number, number][] | null = null;
    mark: TurtleMark;

    constructor() {
      this.mark = { x: 0, y: 0, heading: 0, color: this.color, visible: true };
      scene.turtles.push(this.mark);
    }

    sync() {
      this.mark.x = this.x;
      this.mark.y = this.y;
      this.mark.heading = this.heading;
      this.mark.color = this.color;
      this.mark.visible = this.visible;
    }

    /** Commit the current pen-down stretch to the scene. */
    flush() {
      if (this.path.length > 1) {
        add2D(
          { name: 'stroke', kind: 'path', points: this.path, center: centroid(this.path), rx: 0, ry: 0, rotation: 0, closed: false, color: this.color },
          { fill: false, width: new Flt(this.width) },
        );
      }
      this.path = [[this.x, this.y]];
    }

    moveTo(x: number, y: number) {
      spend(1);
      this.x = x;
      this.y = y;
      if (this.down) this.path.push([x, y]);
      else this.path = [[x, y]];
      if (this.filling) this.filling.push([x, y]);
      this.sync();
    }

    forward(d: number) {
      const t = rad(this.heading);
      this.moveTo(this.x + d * Math.cos(t), this.y + d * Math.sin(t));
    }

    turn(deg: number) {
      this.heading = ((this.heading + deg) % 360 + 360) % 360;
      this.sync();
    }

    circle(r: number, extent = 360, steps?: number) {
      // As in CPython: the centre is `r` to the turtle's left, and the turtle
      // walks the arc as a polyline of short steps.
      const n = steps ?? Math.max(12, Math.min(180, Math.round(Math.abs(extent) / 6)));
      const step = extent / n;
      const len = 2 * Math.abs(r) * Math.sin(rad(Math.abs(step)) / 2);
      const sign = r >= 0 ? 1 : -1;
      this.turn(sign * step / 2);
      for (let i = 0; i < n; i++) {
        this.forward(len);
        if (i < n - 1) this.turn(sign * step);
      }
      this.turn(sign * step / 2);
    }

    finishFill() {
      if (!this.filling) return;
      const pts = this.filling;
      this.filling = null;
      if (pts.length >= 3) {
        add2D(
          { name: 'fill', kind: 'polygon', points: pts, center: centroid(pts), rx: 0, ry: 0, rotation: 0, closed: true, color: this.fillColor },
          { fill: true, width: new Flt(0.001) },
        );
      }
    }
  }

  const turtles: Turtle[] = [];
  const main = () => {
    if (!turtles.length) turtles.push(new Turtle());
    return turtles[0];
  };

  // Every turtle flushes when the run ends: the interpreter calls this.
  const finalize = () => {
    for (const t of turtles) {
      t.finishFill();
      t.flush();
    }
  };

  const n = (v: PyValue | undefined, fn: string, what = 'distance') => needNumber(v, fn, what);

  function methodsFor(get: (args: PyValue[]) => Turtle, offset: number): Record<string, NativeFn> {
    const a = (args: PyValue[], i: number) => args[i + offset];
    const m = (name: string, fn: (t: Turtle, args: PyValue[], kw: Record<string, PyValue>) => PyValue) =>
      new NativeFn(name, (args, kw) => fn(get(args), args, kw));

    const table: Record<string, NativeFn> = {
      forward: m('forward', (t, args) => { t.forward(n(a(args, 0), 'forward')); return null; }),
      backward: m('backward', (t, args) => { t.forward(-n(a(args, 0), 'backward')); return null; }),
      left: m('left', (t, args) => { t.turn(n(a(args, 0), 'left', 'angle')); return null; }),
      right: m('right', (t, args) => { t.turn(-n(a(args, 0), 'right', 'angle')); return null; }),
      goto: m('goto', (t, args) => {
        const [x, y] = a(args, 1) !== undefined
          ? [n(a(args, 0), 'goto', 'x'), n(a(args, 1), 'goto', 'y')]
          : needPair(a(args, 0), 'goto', 'a position');
        t.moveTo(x, y);
        return null;
      }),
      setheading: m('setheading', (t, args) => { t.heading = ((n(a(args, 0), 'setheading', 'angle') % 360) + 360) % 360; t.sync(); return null; }),
      home: m('home', (t) => { t.moveTo(0, 0); t.heading = 0; t.sync(); return null; }),
      penup: m('penup', (t) => { t.flush(); t.down = false; return null; }),
      pendown: m('pendown', (t) => { t.down = true; t.path = [[t.x, t.y]]; return null; }),
      pensize: m('pensize', (t, args) => { t.flush(); t.width = Math.max(0.5, n(a(args, 0), 'pensize', 'width')); return null; }),
      color: m('color', (t, args) => {
        t.flush();
        t.color = resolveColor(a(args, 0), t.color);
        t.fillColor = a(args, 1) !== undefined ? resolveColor(a(args, 1), t.fillColor) : t.color;
        t.sync();
        return null;
      }),
      pencolor: m('pencolor', (t, args) => { t.flush(); t.color = resolveColor(a(args, 0), t.color); t.sync(); return null; }),
      fillcolor: m('fillcolor', (t, args) => { t.fillColor = resolveColor(a(args, 0), t.fillColor); return null; }),
      begin_fill: m('begin_fill', (t) => { t.filling = [[t.x, t.y]]; return null; }),
      end_fill: m('end_fill', (t) => { t.finishFill(); return null; }),
      circle: m('circle', (t, args) => {
        const r = n(a(args, 0), 'circle', 'radius');
        const extent = a(args, 1) !== undefined ? n(a(args, 1), 'circle', 'extent') : 360;
        const steps = a(args, 2) !== undefined ? Math.max(3, Math.round(n(a(args, 2), 'circle', 'steps'))) : undefined;
        t.circle(r, extent, steps);
        return null;
      }),
      dot: m('dot', (t, args, kw) => {
        const size = a(args, 0) !== undefined ? n(a(args, 0), 'dot', 'size') : t.width * 2;
        const color = a(args, 1) !== undefined ? resolveColor(a(args, 1), t.color) : t.color;
        add2D(
          { name: 'point', kind: 'point', points: [[t.x, t.y]], center: [t.x, t.y], rx: size / 2, ry: size / 2, rotation: 0, closed: false, color },
          { ...kw, fill: true },
        );
        return null;
      }),
      write: m('write', (t, args) => {
        add2D(
          { name: 'text', kind: 'point', points: [[t.x, t.y]], center: [t.x, t.y], rx: 0, ry: 0, rotation: 0, closed: false, color: t.color },
          { label: String(a(args, 0) ?? ''), fill: false },
        );
        return null;
      }),
      hideturtle: m('hideturtle', (t) => { t.visible = false; t.sync(); return null; }),
      showturtle: m('showturtle', (t) => { t.visible = true; t.sync(); return null; }),
      // Readouts are rounded so a square walk ends at (0.0, 0.0), not (-1.8e-14, ...).
      position: m('position', (t) => new PyTuple([flt(tidy(t.x)), flt(tidy(t.y))])),
      xcor: m('xcor', (t) => flt(tidy(t.x))),
      ycor: m('ycor', (t) => flt(tidy(t.y))),
      heading: m('heading', (t) => flt(tidy(t.heading))),
      isdown: m('isdown', (t) => t.down),
      distance: m('distance', (t, args) => {
        const [x, y] = a(args, 1) !== undefined
          ? [n(a(args, 0), 'distance', 'x'), n(a(args, 1), 'distance', 'y')]
          : needPair(a(args, 0), 'distance', 'a position');
        return flt(Math.hypot(x - t.x, y - t.y));
      }),
      reset: m('reset', (t) => { t.flush(); t.x = 0; t.y = 0; t.heading = 0; t.path = [[0, 0]]; t.sync(); return null; }),
      // Accepted for familiarity; the picture is always shown when the run ends.
      speed: m('speed', () => null),
      shape: m('shape', () => null),
      done: m('done', () => null),
      mainloop: m('mainloop', () => null),
      exitonclick: m('exitonclick', () => null),
      tracer: m('tracer', () => null),
      update: m('update', () => null),
      bgcolor: m('bgcolor', () => null),
      title: m('title', () => null),
      screensize: m('screensize', () => null),
      setup: m('setup', () => null),
    };
    // Short aliases, as in CPython's turtle.
    table.fd = table.forward;
    table.bk = table.backward;
    table.back = table.backward;
    table.lt = table.left;
    table.rt = table.right;
    table.setpos = table.goto;
    table.setposition = table.goto;
    table.seth = table.setheading;
    table.pu = table.penup;
    table.up = table.penup;
    table.pd = table.pendown;
    table.down = table.pendown;
    table.width = table.pensize;
    table.ht = table.hideturtle;
    table.st = table.showturtle;
    table.pos = table.position;
    return table;
  }

  // Module-level functions drive the default turtle.
  const moduleFns = methodsFor(() => main(), 0);
  // Methods on a Turtle() object receive the object as their first argument;
  // the turtle behind each object is looked up here rather than exposed as an
  // attribute a program could reach.
  const handles = new WeakMap<PyObject, Turtle>();
  const objectMethods = methodsFor((args) => {
    const t = args[0] instanceof PyObject ? handles.get(args[0]) : undefined;
    if (!t) throw new PyRuntimeError('This turtle method needs to be called on a Turtle().', 0, 'TypeError');
    return t;
  }, 1);

  const TurtleCtor = new NativeFn('Turtle', () => {
    const t = new Turtle();
    turtles.push(t);
    const obj = new PyObject('Turtle', {}, objectMethods, () => `<Turtle at (${formatNum(t.x)}, ${formatNum(t.y)})>`);
    handles.set(obj, t);
    return obj;
  });

  const module = new PyModule('turtle', {
    ...moduleFns,
    Turtle: TurtleCtor,
    Pen: TurtleCtor,
    Screen: new NativeFn('Screen', () => new PyObject('Screen', {}, {
      bgcolor: new NativeFn('bgcolor', () => null),
      title: new NativeFn('title', () => null),
      setup: new NativeFn('setup', () => null),
      tracer: new NativeFn('tracer', () => null),
      update: new NativeFn('update', () => null),
      mainloop: new NativeFn('mainloop', () => null),
      exitonclick: new NativeFn('exitonclick', () => null),
    }, () => '<Screen>')),
  });

  return { module, finalize };
}
