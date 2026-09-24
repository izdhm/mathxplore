/**
 * Mathematical analysis behind the Explore modules.
 *
 * Everything a student sees annotated on a graph - vertex, roots, gradient,
 * period - is derived here rather than hard-coded per module, so the same
 * facts drive the graph, the readouts, the explanations and the challenges.
 */

// ------------------------------------------------------------------ numbers

/** Format for display: trims trailing zeros, avoids "-0", keeps it readable. */
export function fmt(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '−∞';
  const r = Math.abs(n) < 1e-10 ? 0 : n;
  const s = r.toFixed(dp).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s.replace('-', '−');
}

/** Format for use inside Python code, where the minus sign must be ASCII. */
export function fmtCode(n: number, dp = 2): string {
  const r = Math.abs(n) < 1e-10 ? 0 : n;
  return r.toFixed(dp).replace(/\.?0+$/, '') || '0';
}

/** Build "+ 3x" / "− 3x" / "" style terms so equations read naturally. */
function term(coef: number, symbol: string, leading = false): string {
  if (Math.abs(coef) < 1e-10) return '';
  const sign = coef < 0 ? '−' : '+';
  const mag = Math.abs(coef);
  const num = Math.abs(mag - 1) < 1e-10 && symbol ? '' : fmt(mag);
  const body = `${num}${symbol}`;
  if (leading) return coef < 0 ? `−${body}` : body;
  return ` ${sign} ${body}`;
}

// ----------------------------------------------------------------- linear

export interface LinearAnalysis {
  m: number;
  c: number;
  equation: string;
  /** Where the line crosses the x-axis, or null for a horizontal line. */
  xIntercept: number | null;
  yIntercept: number;
  angleDeg: number;
  direction: 'rising' | 'falling' | 'horizontal';
  steepness: string;
  python: string;
}

export function analyseLinear(m: number, c: number): LinearAnalysis {
  const equation =
    Math.abs(m) < 1e-10
      ? `y = ${fmt(c)}`
      : `y = ${term(m, 'x', true)}${term(c, '')}`.trim();

  return {
    m,
    c,
    equation,
    xIntercept: Math.abs(m) < 1e-10 ? null : -c / m,
    yIntercept: c,
    angleDeg: (Math.atan(m) * 180) / Math.PI,
    direction: m > 1e-10 ? 'rising' : m < -1e-10 ? 'falling' : 'horizontal',
    steepness:
      Math.abs(m) < 1e-10 ? 'flat'
      : Math.abs(m) < 0.5 ? 'gentle'
      : Math.abs(m) < 2 ? 'moderate'
      : Math.abs(m) < 5 ? 'steep'
      : 'very steep',
    python: `def linear(x):\n    return ${fmtCode(m)}*x + ${fmtCode(c)}`,
  };
}

// -------------------------------------------------------------- quadratic

export interface QuadraticAnalysis {
  a: number;
  b: number;
  c: number;
  equation: string;
  isQuadratic: boolean;
  vertex: { x: number; y: number };
  axisOfSymmetry: number;
  discriminant: number;
  roots: number[];
  rootCount: 0 | 1 | 2;
  opens: 'upward' | 'downward' | 'neither';
  width: string;
  yIntercept: number;
  /** Completed-square form, e.g. "y = 2(x − 1)² + 3". */
  vertexForm: string;
  python: string;
}

export function analyseQuadratic(a: number, b: number, c: number): QuadraticAnalysis {
  const isQuadratic = Math.abs(a) > 1e-10;
  const h = isQuadratic ? -b / (2 * a) : 0;
  const k = isQuadratic ? a * h * h + b * h + c : c;
  const discriminant = b * b - 4 * a * c;

  let roots: number[] = [];
  if (isQuadratic) {
    if (discriminant > 1e-10) {
      const s = Math.sqrt(discriminant);
      roots = [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((p, q) => p - q);
    } else if (Math.abs(discriminant) <= 1e-10) {
      roots = [-b / (2 * a)];
    }
  } else if (Math.abs(b) > 1e-10) {
    roots = [-c / b];
  }

  const equation = isQuadratic
    ? `y = ${term(a, 'x²', true)}${term(b, 'x')}${term(c, '')}`.trim()
    : `y = ${term(b, 'x', true) || fmt(c)}${Math.abs(b) > 1e-10 ? term(c, '') : ''}`.trim();

  const hSign = h < 0 ? '+' : '−';
  const aPart = Math.abs(a - 1) < 1e-10 ? '' : Math.abs(a + 1) < 1e-10 ? '−' : fmt(a);
  const vertexForm = isQuadratic
    ? `y = ${aPart}(x ${hSign} ${fmt(Math.abs(h))})²${term(k, '')}`
    : equation;

  return {
    a, b, c,
    equation,
    isQuadratic,
    vertex: { x: h, y: k },
    axisOfSymmetry: h,
    discriminant,
    roots,
    rootCount: roots.length as 0 | 1 | 2,
    opens: a > 1e-10 ? 'upward' : a < -1e-10 ? 'downward' : 'neither',
    width:
      Math.abs(a) < 1e-10 ? 'not a parabola'
      : Math.abs(a) < 0.4 ? 'wide'
      : Math.abs(a) < 1.5 ? 'standard'
      : Math.abs(a) < 3 ? 'narrow'
      : 'very narrow',
    yIntercept: c,
    vertexForm,
    python: `def quadratic(x):\n    return ${fmtCode(a)}*x**2 + ${fmtCode(b)}*x + ${fmtCode(c)}`,
  };
}

// ------------------------------------------------------------ trigonometry

export interface TrigAnalysis {
  a: number;
  b: number;
  c: number;
  d: number;
  fn: 'sin' | 'cos';
  equation: string;
  amplitude: number;
  period: number;
  periodLabel: string;
  frequency: number;
  phaseShift: number;
  verticalShift: number;
  maximum: number;
  minimum: number;
  python: string;
}

/** y = a·sin(b(x − c)) + d */
export function analyseTrig(
  a: number,
  b: number,
  c: number,
  d: number,
  fn: 'sin' | 'cos',
): TrigAnalysis {
  const period = Math.abs(b) < 1e-10 ? Infinity : (2 * Math.PI) / Math.abs(b);
  const inner = `${Math.abs(b - 1) < 1e-10 ? '' : fmt(b)}(x ${c < 0 ? '+' : '−'} ${fmt(Math.abs(c))})`;
  const shown = Math.abs(c) < 1e-10
    ? `${Math.abs(b - 1) < 1e-10 ? 'x' : `${fmt(b)}x`}`
    : inner;

  return {
    a, b, c, d, fn,
    equation: `y = ${Math.abs(a - 1) < 1e-10 ? '' : fmt(a)}${fn}(${shown})${term(d, '')}`,
    amplitude: Math.abs(a),
    period,
    periodLabel: formatRadians(period),
    frequency: Math.abs(b),
    phaseShift: c,
    verticalShift: d,
    maximum: d + Math.abs(a),
    minimum: d - Math.abs(a),
    python:
      `import math\n\ndef wave(x):\n    return ${fmtCode(a)} * math.${fn}(${fmtCode(b)} * (x - ${fmtCode(c)})) + ${fmtCode(d)}`,
  };
}

/** Express a length as a multiple of π where that reads better. */
export function formatRadians(x: number): string {
  if (!Number.isFinite(x)) return 'undefined';
  const ratio = x / Math.PI;
  const rounded = Math.round(ratio * 12) / 12;
  if (Math.abs(ratio - rounded) > 1e-6) return fmt(x);
  if (Math.abs(rounded) < 1e-10) return '0';
  if (Math.abs(rounded - 1) < 1e-10) return 'π';
  if (Math.abs(rounded - 2) < 1e-10) return '2π';
  const denominators = [2, 3, 4, 6, 8, 12];
  for (const d of denominators) {
    const n = rounded * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      const num = Math.round(n);
      if (Math.abs(num) === d) return num > 0 ? 'π' : '−π';
      return `${num}π/${d}`;
    }
  }
  return `${fmt(ratio)}π`;
}

// ------------------------------------------------------------ 3D surfaces

export interface SurfacePreset {
  id: string;
  name: string;
  /** Displayed equation. */
  equation: string;
  /** Evaluated with the live coefficient `a`. */
  f: (x: number, y: number, a: number) => number;
  python: string;
  insight: string;
  /** Sensible range for the coefficient slider. */
  range: [number, number];
  defaultA: number;
}

export const SURFACES: SurfacePreset[] = [
  {
    id: 'paraboloid',
    name: 'Paraboloid',
    equation: 'z = a(x² + y²)',
    f: (x, y, a) => a * (x * x + y * y),
    python: 'def surface(x, y, a):\n    return a * (x**2 + y**2)',
    insight:
      'Every vertical slice through the centre is a parabola. The 3D surface is what you get ' +
      'when the same parabola is swept all the way round - so the 2D and 3D pictures are the same idea.',
    range: [-1, 1],
    defaultA: 0.3,
  },
  {
    id: 'saddle',
    name: 'Saddle',
    equation: 'z = a(x² − y²)',
    f: (x, y, a) => a * (x * x - y * y),
    python: 'def surface(x, y, a):\n    return a * (x**2 - y**2)',
    insight:
      'The centre curves upward in one direction and downward in the other. It is a minimum ' +
      'and a maximum at the same point - something that cannot happen on a 2D curve.',
    range: [-1, 1],
    defaultA: 0.3,
  },
  {
    id: 'ripple',
    name: 'Ripple',
    equation: 'z = a·sin(√(x² + y²))',
    f: (x, y, a) => a * Math.sin(Math.sqrt(x * x + y * y)),
    python:
      'import math\n\ndef surface(x, y, a):\n    r = math.sqrt(x**2 + y**2)\n    return a * math.sin(r)',
    insight:
      'The height depends only on the distance from the centre, so a 2D sine wave becomes ' +
      'circular ripples - exactly how a drop of water spreads on a pond.',
    range: [-3, 3],
    defaultA: 1.5,
  },
  {
    id: 'plane',
    name: 'Plane',
    equation: 'z = a·x + y',
    f: (x, y, a) => a * x + y,
    python: 'def surface(x, y, a):\n    return a * x + y',
    insight:
      'A straight line has one gradient. A plane has two - one along x and one along y - ' +
      'and the coefficient a tilts it in the x direction only.',
    range: [-2, 2],
    defaultA: 0.5,
  },
  {
    id: 'hill',
    name: 'Gaussian hill',
    equation: 'z = a·e^−(x² + y²)/4',
    f: (x, y, a) => a * Math.exp(-(x * x + y * y) / 4),
    python:
      'import math\n\ndef surface(x, y, a):\n    return a * math.exp(-(x**2 + y**2) / 4)',
    insight:
      'This is the bell curve from statistics, spun into a hill. It appears wherever things ' +
      'cluster around an average - test scores, measurement errors, rainfall.',
    range: [-4, 4],
    defaultA: 3,
  },
];

// ---------------------------------------------------------------- sampling

/** Sample a function safely, returning NaN where it is undefined. */
export function sample(
  f: (x: number) => number,
  xMin: number,
  xMax: number,
  steps = 400,
): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    let y: number;
    try {
      y = f(x);
    } catch {
      y = NaN;
    }
    xs.push(x);
    ys.push(Number.isFinite(y) ? y : NaN);
  }
  return { xs, ys };
}
