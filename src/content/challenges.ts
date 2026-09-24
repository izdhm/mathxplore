/**
 * The challenge bank.
 *
 * Three kinds, matching the three kinds of understanding the brief asks to
 * assess:
 *
 *   translate  - mathematics → Python (do you know the notation?)
 *   target     - Python → graph     (can you steer a curve by changing code?)
 *   predict    - read code, say what it does (do you know what Python will do
 *                before you run it?)
 *
 * Code challenges are graded by *running* the student's code and testing its
 * behaviour, never by matching text. Any correct solution passes, including one
 * the author did not think of.
 */

import type { PythonResult } from '../lib/pyengine';
import { runAndProbe, isNumeric, numVal } from '../lib/pyengine';
import type { MathTopicId, PythonTopicId } from '../state/progress';

export type Difficulty = 'starter' | 'core' | 'stretch';

interface Base {
  id: string;
  title: string;
  prompt: string;
  difficulty: Difficulty;
  topics: (MathTopicId | PythonTopicId)[];
  /** Progressive hints - each one gives a little more, none gives the answer. */
  hints: string[];
}

/**
 * What to draw after a run: the student's function against the goal. The
 * picture is built from the student's *code*, not from the grader, so a wrong
 * answer is shown exactly as wrong as it is.
 */
export interface ChallengeVisual {
  /** The student-defined function to graph. */
  fn: string;
  view: { xMin: number; xMax: number; yMin: number; yMax: number };
  xLabel?: string;
  yLabel?: string;
  /** The goal, drawn dashed behind the student's curve. */
  reference?: (x: number) => number;
  referenceLabel?: string;
  /** Points the curve must pass through. */
  targets?: { x: number; y: number; label?: string }[];
  /** Constraint lines - a height to reach, a time to land by. */
  guides?: { kind: 'vline' | 'hline'; at: number; label?: string }[];
  /** Inputs whose returned values are reported, e.g. [[0], [1], [2]]. */
  probes: number[][];
  /** Extra arguments passed after x when sampling the curve. */
  extraArgs?: number[];
  /** For functions that are not curves of x: points to draw and join. */
  points?: { x: number; y: number; label?: string }[];
}

export interface CodeChallenge extends Base {
  kind: 'translate' | 'target';
  starter: string;
  /** One correct answer, shown on request once every hint has been read. */
  solution: string;
  /** Mathematics the student is translating or aiming at. */
  goal: string;
  visual: ChallengeVisual;
  grade: (source: string) => { ok: boolean; message: string; result: PythonResult };
}

export interface PredictChallenge extends Base {
  kind: 'predict';
  code: string;
  options: string[];
  answer: number;
  explanation: string;
}

export type Challenge = CodeChallenge | PredictChallenge;

// --------------------------------------------------------------- utilities

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

/**
 * Grade a defined function by sampling it. `expected` is the rule the student
 * is aiming at; the code passes when its behaviour matches at every test point.
 */
function gradeFunction(
  fnName: string,
  expected: (x: number) => number,
  testPoints: number[],
  successNote: string,
) {
  return (source: string) => {
    const { result, values, missing } = runAndProbe(
      source,
      testPoints.map((x) => ({ name: fnName, args: [x] })),
    );

    if (result.lesson) {
      return { ok: false, message: 'The program stopped before it could be checked — see the error below.', result };
    }
    if (missing.length) {
      return { ok: false, message: `No function called \`${fnName}\` was defined.`, result };
    }

    for (let i = 0; i < testPoints.length; i++) {
      const x = testPoints[i];
      const got = values[i];
      const want = expected(x);
      if (got === null) {
        return {
          ok: false,
          message: `\`${fnName}(${x})\` did not return a number. Check that the function has a return line.`,
          result,
        };
      }
      if (!close(got, want, 1e-6)) {
        return {
          ok: false,
          message: `At x = ${x} your function gives ${round(got)}, but it should give ${round(want)}.`,
          result,
        };
      }
    }
    return { ok: true, message: successNote, result };
  };
}

function round(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
}

// -------------------------------------------------------------- challenges

export const CHALLENGES: Challenge[] = [
  // ---- translate: mathematics → Python ------------------------------------
  {
    kind: 'translate',
    id: 'ch-line',
    title: 'Write a straight line',
    prompt: 'Define a Python function that produces this line for any value of x.',
    goal: 'y = 2x + 3',
    difficulty: 'starter',
    topics: ['linear', 'functions'],
    hints: [
      'The function needs a def line, and a return line that sends back the answer.',
      'Mathematics writes 2x with the multiplication left invisible. Python does not allow that.',
    ],
    starter: 'def line(x):\n    return \n',
    visual: {
      fn: 'line',
      view: { xMin: -6, xMax: 6, yMin: -8, yMax: 12 },
      reference: (x) => 2 * x + 3,
      referenceLabel: 'y = 2x + 3',
      targets: [{ x: 0, y: 3, label: 'y-intercept 3' }, { x: 1, y: 5 }],
      probes: [[0], [1], [-2], [4.5]],
    },
    solution:
      'def line(x):\n    return 2*x + 3\n',
    grade: gradeFunction(
      'line',
      (x) => 2 * x + 3,
      [0, 1, -2, 4.5],
      'Correct. Note that the 3 controls where the line crosses the y-axis, and the 2 controls how steeply it climbs.',
    ),
  },
  {
    kind: 'translate',
    id: 'ch-quadratic',
    title: 'Write a quadratic',
    prompt: 'Define a Python function for this quadratic.',
    goal: 'f(x) = x² + 2x + 1',
    difficulty: 'starter',
    topics: ['quadratic', 'operations'],
    hints: [
      'x² is written with two stars.',
      'Both 2x and x² need explicit operators — Python never assumes multiplication.',
    ],
    starter: 'def f(x):\n    return \n',
    visual: {
      fn: 'f',
      view: { xMin: -5, xMax: 3, yMin: -2, yMax: 10 },
      reference: (x) => x * x + 2 * x + 1,
      referenceLabel: 'f(x) = x² + 2x + 1',
      targets: [{ x: -1, y: 0, label: 'vertex (−1, 0)' }],
      probes: [[0], [1], [-1], [3]],
    },
    solution:
      'def f(x):\n    return x**2 + 2*x + 1\n',
    grade: gradeFunction(
      'f',
      (x) => x * x + 2 * x + 1,
      [0, 1, -1, 3, -2.5],
      'Correct. This one is a perfect square: x² + 2x + 1 is (x + 1)², so its vertex sits exactly on the x-axis at x = −1.',
    ),
  },
  {
    kind: 'translate',
    id: 'ch-distance',
    title: 'Distance between two points',
    prompt: 'Write a function taking four numbers and returning the distance between the points (x1, y1) and (x2, y2).',
    goal: 'd = √((x₂ − x₁)² + (y₂ − y₁)²)',
    difficulty: 'core',
    topics: ['linear', 'operations'],
    hints: [
      'Square roots come from the math module, so the program needs import math at the top.',
      'Work out each difference first and store it — the formula is easier to read that way.',
      'Pythagoras is doing the work here: the two differences are the short sides of a right-angled triangle.',
    ],
    starter: 'import math\n\ndef distance(x1, y1, x2, y2):\n    return \n',
    visual: {
      fn: 'distance',
      view: { xMin: -1, xMax: 5, yMin: -1, yMax: 5 },
      points: [{ x: 0, y: 0, label: '(0, 0)' }, { x: 3, y: 4, label: '(3, 4)' }],
      probes: [[0, 0, 3, 4], [1, 1, 4, 5], [-2, -3, 1, 1]],
    },
    solution:
      'import math\n\ndef distance(x1, y1, x2, y2):\n    dx = x2 - x1\n    dy = y2 - y1\n    return math.sqrt(dx**2 + dy**2)\n',
    grade: (source) => {
      const cases: [number, number, number, number, number][] = [
        [0, 0, 3, 4, 5],
        [1, 1, 4, 5, 5],
        [-2, -3, 1, 1, 5],
        [0, 0, 0, 0, 0],
      ];
      const { result, values, missing } = runAndProbe(
        source,
        cases.map(([a, b, c, d]) => ({ name: 'distance', args: [a, b, c, d] })),
      );
      if (result.lesson) {
        return { ok: false, message: 'The program stopped before it could be checked — see the error below.', result };
      }
      if (missing.length) return { ok: false, message: 'No function called `distance` was defined.', result };

      for (let i = 0; i < cases.length; i++) {
        const [x1, y1, x2, y2, want] = cases[i];
        const got = values[i];
        if (got === null || !close(got, want, 1e-6)) {
          return {
            ok: false,
            message: `From (${x1}, ${y1}) to (${x2}, ${y2}) the distance is ${want}, but your function gives ${got === null ? 'nothing' : round(got)}.`,
            result,
          };
        }
      }
      return {
        ok: true,
        message: 'Correct. This single function is the foundation of coordinate geometry — and of how a computer measures anything on a screen.',
        result,
      };
    },
  },

  // ---- target: code → graph -------------------------------------------------
  {
    kind: 'target',
    id: 'ch-through-points',
    title: 'Hit the target points',
    prompt:
      'Adjust a, b and c in the code so the parabola passes through all three target points: (0, 3), (1, 2) and (2, 3).',
    goal: 'y = ax² + bx + c through (0, 3), (1, 2), (2, 3)',
    difficulty: 'core',
    topics: ['quadratic', 'functions'],
    hints: [
      'Start with the easiest point. At x = 0 the terms with x vanish, so c is fixed immediately.',
      'The three points are symmetric about x = 1, so the vertex is there — which pins down the axis of symmetry.',
      'Substituting each point into y = ax² + bx + c gives you three equations. Two of them are enough once you know c.',
    ],
    starter: 'a = 1\nb = 0\nc = 0\n\ndef curve(x):\n    return a*x**2 + b*x + c\n',
    visual: {
      fn: 'curve',
      view: { xMin: -3, xMax: 5, yMin: -2, yMax: 8 },
      targets: [{ x: 0, y: 3, label: '(0, 3)' }, { x: 1, y: 2, label: '(1, 2)' }, { x: 2, y: 3, label: '(2, 3)' }],
      probes: [[0], [1], [2]],
    },
    solution:
      'a = 1\nb = -2\nc = 3\n\ndef curve(x):\n    return a*x**2 + b*x + c\n',
    grade: (source) => {
      const targets: [number, number][] = [[0, 3], [1, 2], [2, 3]];
      const { result, values, missing } = runAndProbe(
        source,
        targets.map(([x]) => ({ name: 'curve', args: [x] })),
      );
      if (result.lesson) {
        return { ok: false, message: 'The program stopped before it could be checked — see the error below.', result };
      }
      if (missing.length) return { ok: false, message: 'No function called `curve` was defined.', result };

      const misses = targets.filter(([, y], i) => values[i] === null || !close(values[i]!, y, 1e-6));
      if (misses.length) {
        const [x, y] = misses[0];
        const i = targets.findIndex((t) => t[0] === x);
        return {
          ok: false,
          message: `${misses.length} of 3 points missed. At x = ${x} the curve should reach ${y}, but it reaches ${values[i] === null ? 'nothing' : round(values[i]!)}.`,
          result,
        };
      }
      return {
        ok: true,
        message: 'All three points hit. You have just solved a system of three equations by reasoning about a graph — the same problem, approached visually.',
        result,
      };
    },
  },
  {
    kind: 'target',
    id: 'ch-downward-wide',
    title: 'Steer the parabola',
    prompt:
      'Change the code so the parabola opens downward, is wider than y = x², and has its highest point at (0, 4).',
    goal: 'Opens downward · wide · maximum at (0, 4)',
    difficulty: 'core',
    topics: ['quadratic', 'variables'],
    hints: [
      'The sign of a decides which way the curve opens.',
      'A smaller size of a spreads the curve out; a larger size pinches it in.',
      'With b = 0 the vertex sits on the y-axis, so c alone sets its height.',
    ],
    starter: 'a = 1\nb = 0\nc = 0\n\ndef curve(x):\n    return a*x**2 + b*x + c\n',
    visual: {
      fn: 'curve',
      view: { xMin: -6, xMax: 6, yMin: -8, yMax: 8 },
      reference: (x) => x * x,
      referenceLabel: 'y = x² (for width)',
      targets: [{ x: 0, y: 4, label: 'maximum (0, 4)' }],
      guides: [{ kind: 'hline', at: 4, label: 'height 4' }],
      probes: [[-2], [0], [2]],
    },
    solution:
      'a = -0.5\nb = 0\nc = 4\n\ndef curve(x):\n    return a*x**2 + b*x + c\n',
    grade: (source) => {
      const xs = [-2, -1, 0, 1, 2];
      const { result, values, missing } = runAndProbe(
        source,
        xs.map((x) => ({ name: 'curve', args: [x] })),
      );
      if (result.lesson) {
        return { ok: false, message: 'The program stopped before it could be checked — see the error below.', result };
      }
      if (missing.length) return { ok: false, message: 'No function called `curve` was defined.', result };
      if (values.some((v) => v === null)) {
        return { ok: false, message: '`curve` did not return a number for every x — check the return line.', result };
      }

      const v = values as number[];
      const at0 = v[2];
      // Recover a and b from samples: symmetric and antisymmetric parts.
      const a = (v[3] + v[1]) / 2 - at0;
      const b = (v[3] - v[1]) / 2;

      if (!close(at0, 4, 1e-6)) {
        return { ok: false, message: `The curve reaches ${round(at0)} at x = 0, but the maximum should be at height 4.`, result };
      }
      if (a >= -1e-9) {
        return { ok: false, message: 'The curve does not open downward yet — check the sign of a.', result };
      }
      if (Math.abs(b) > 1e-6) {
        return { ok: false, message: 'The highest point is not on the y-axis. With b as it is, the vertex has shifted sideways.', result };
      }
      if (Math.abs(a) >= 1) {
        return {
          ok: false,
          message: `It opens downward with the peak in the right place, but it is not wider than y = x² — the size of a is ${round(Math.abs(a))}, and it needs to be below 1.`,
          result,
        };
      }
      return {
        ok: true,
        message: 'All three conditions met. You steered a curve by reasoning about what each coefficient controls — no trial and error needed.',
        result,
      };
    },
  },
  {
    kind: 'target',
    id: 'ch-projectile',
    title: 'Clear the wall',
    prompt:
      'A ball is thrown from the ground. Its height is h(t) = v·t − 4.9t². Find a launch speed v so the ball is still above 10 m after 2 seconds, and has landed again by 5 seconds.',
    goal: 'h(2) > 10 and h(5) ≤ 0',
    difficulty: 'stretch',
    topics: ['quadratic', 'functions'],
    hints: [
      'Try a value for v, run it, and read the two heights that print out. Then adjust.',
      'The −4.9t² term is gravity, and it wins in the end — the question is how long that takes.',
      'The ball lands when h(t) returns to 0, which happens at t = v / 4.9.',
    ],
    starter:
      'v = 10   # launch speed in metres per second\n\n' +
      'def height(t):\n    return v*t - 4.9*t**2\n\n' +
      'print("at 2s:", height(2))\nprint("at 5s:", height(5))\n',
    visual: {
      fn: 'height',
      view: { xMin: 0, xMax: 6, yMin: -6, yMax: 26 },
      xLabel: 't',
      yLabel: 'h',
      guides: [
        { kind: 'vline', at: 2, label: 't = 2' },
        { kind: 'hline', at: 10, label: '10 m' },
        { kind: 'vline', at: 5, label: 't = 5' },
      ],
      probes: [[2], [5]],
    },
    solution:
      'v = 20   # launch speed in metres per second\n\ndef height(t):\n    return v*t - 4.9*t**2\n\nprint("at 2s:", height(2))\nprint("at 5s:", height(5))\n',
    grade: (source) => {
      const { result, values, missing } = runAndProbe(source, [
        { name: 'height', args: [2] },
        { name: 'height', args: [5] },
      ]);
      if (result.lesson) {
        return { ok: false, message: 'The program stopped before it could be checked — see the error below.', result };
      }
      if (missing.length) return { ok: false, message: 'No function called `height` was defined.', result };
      const [h2, h5] = values;
      if (h2 === null || h5 === null) {
        return { ok: false, message: '`height` did not return a number — check the return line.', result };
      }
      if (h2 <= 10) {
        return {
          ok: false,
          message: `After 2 seconds the ball is at ${round(h2)} m, which is not above 10 m. It needs more speed.`,
          result,
        };
      }
      if (h5 > 0) {
        return {
          ok: false,
          message: `After 5 seconds the ball is still at ${round(h5)} m, so it has not landed. That launch speed is too high.`,
          result,
        };
      }
      return {
        ok: true,
        message: 'Both conditions satisfied. You have just solved a real modelling problem by adjusting one parameter and reading the consequences — which is what engineers do all day.',
        result,
      };
    },
  },
  {
    kind: 'target',
    id: 'ch-wave-fit',
    title: 'Match the wave',
    prompt:
      'Change the wave so its highest point is 3, its lowest is −3, and one complete cycle takes exactly π (not 2π).',
    goal: 'amplitude 3 · period π',
    difficulty: 'stretch',
    topics: ['trigonometry', 'functions'],
    hints: [
      'The number in front of sin stretches the wave vertically.',
      'The number multiplying x inside sin squeezes it horizontally.',
      'Period = 2π ÷ b. If you want the period to halve, what must b do?',
    ],
    starter: 'import math\n\na = 1\nb = 1\n\ndef wave(x):\n    return a * math.sin(b * x)\n',
    visual: {
      fn: 'wave',
      view: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -4.5, yMax: 4.5 },
      reference: (x) => 3 * Math.sin(2 * x),
      referenceLabel: '3 sin(2x)',
      guides: [{ kind: 'hline', at: 3, label: '3' }, { kind: 'hline', at: -3, label: '−3' }],
      probes: [[0], [Math.PI / 4], [Math.PI / 2], [Math.PI]],
    },
    solution:
      'import math\n\na = 3\nb = 2\n\ndef wave(x):\n    return a * math.sin(b * x)\n',
    grade: (source) => {
      const xs = Array.from({ length: 65 }, (_, i) => (i * Math.PI) / 16);
      const { result, values, missing } = runAndProbe(
        source,
        xs.map((x) => ({ name: 'wave', args: [x] })),
      );
      if (result.lesson) {
        return { ok: false, message: 'The program stopped before it could be checked — see the error below.', result };
      }
      if (missing.length) return { ok: false, message: 'No function called `wave` was defined.', result };
      if (values.some((v) => v === null)) {
        return { ok: false, message: '`wave` did not return a number for every x.', result };
      }

      const v = values as number[];
      const hi = Math.max(...v);
      const lo = Math.min(...v);
      if (!close(hi, 3, 0.02) || !close(lo, -3, 0.02)) {
        return {
          ok: false,
          message: `The wave runs from ${round(lo)} to ${round(hi)}, but it should run from −3 to 3.`,
          result,
        };
      }
      // With period π, the wave returns to its starting value after π.
      const periodOk = close(v[0], v[16], 0.02) && close(v[4], v[20], 0.02) && !close(v[4], v[8], 0.02);
      if (!periodOk) {
        return {
          ok: false,
          message: 'The height is right, but one cycle does not take π yet. Check the number multiplying x inside sin.',
          result,
        };
      }
      return {
        ok: true,
        message: 'Correct. Amplitude and period are controlled by two entirely separate numbers — which is exactly how sound is described: one for loudness, one for pitch.',
        result,
      };
    },
  },

  // ---- predict: read the code -------------------------------------------------
  {
    kind: 'predict',
    id: 'pr-range',
    title: 'How many lines?',
    prompt: 'Without running it, decide what this program prints.',
    code: 'for i in range(1, 5):\n    print(i)',
    options: ['1 2 3 4 5', '1 2 3 4', '0 1 2 3 4', '1 2 3'],
    answer: 1,
    explanation:
      'range(1, 5) starts at 1 and stops before 5, so it produces 1, 2, 3, 4 — four values. The end value is never included.',
    difficulty: 'starter',
    topics: ['loops'],
    hints: ['Count carefully at the end of the range.'],
  },
  {
    kind: 'predict',
    id: 'pr-division',
    title: 'Which kind of number?',
    prompt: 'What exactly does this print?',
    code: 'print(6 / 3)',
    options: ['2', '2.0', '3', 'It causes an error'],
    answer: 1,
    explanation:
      'The / operator always produces a decimal, even when the division is exact. To get a whole number 2, you would write 6 // 3. This distinction matters as soon as you start comparing values.',
    difficulty: 'starter',
    topics: ['operations'],
    hints: ['Python distinguishes whole numbers from decimals, even when they are equal in value.'],
  },
  {
    kind: 'predict',
    id: 'pr-scope',
    title: 'The missing return',
    prompt: 'What does this print?',
    code: 'def double(x):\n    x * 2\n\nprint(double(5))',
    options: ['10', '5', 'None', 'It causes an error'],
    answer: 2,
    explanation:
      'The function calculates 10 and then throws it away, because there is no return line to hand it back. Python gives None instead — a "no value at all". This is the most common reason a graph comes out blank.',
    difficulty: 'core',
    topics: ['functions'],
    hints: ['Look for the line that sends a value back out of the function.'],
  },
  {
    kind: 'predict',
    id: 'pr-accumulate',
    title: 'Follow the total',
    prompt: 'What is the final value printed?',
    code: 'total = 0\nfor n in range(1, 5):\n    total += n\nprint(total)',
    options: ['4', '10', '15', '0'],
    answer: 1,
    explanation:
      'The loop runs over 1, 2, 3, 4 and adds each to the total: 1 + 2 + 3 + 4 = 10. Setting total = 0 before the loop is what makes accumulation possible.',
    difficulty: 'core',
    topics: ['loops'],
    hints: ['Write out the value of total after each pass through the loop.'],
  },
  {
    kind: 'predict',
    id: 'pr-precedence',
    title: 'Order of operations',
    prompt: 'What does this print?',
    code: 'print(-3**2)',
    options: ['9', '−9', '6', 'It causes an error'],
    answer: 1,
    explanation:
      'The power is applied before the minus sign, so this reads as −(3²) = −9. To square the negative number you would write (-3)**2, which gives 9. Python follows exactly the same convention as written mathematics here.',
    difficulty: 'stretch',
    topics: ['operations'],
    hints: ['Which happens first — the minus sign, or the power?'],
  },
];

/** Everything the dashboard needs to describe progress through the bank. */
export function challengeStats(solvedIds: string[]) {
  const byDifficulty = (d: Difficulty) => CHALLENGES.filter((c) => c.difficulty === d);
  return {
    total: CHALLENGES.length,
    solved: CHALLENGES.filter((c) => solvedIds.includes(c.id)).length,
    levels: (['starter', 'core', 'stretch'] as Difficulty[]).map((d) => ({
      difficulty: d,
      total: byDifficulty(d).length,
      solved: byDifficulty(d).filter((c) => solvedIds.includes(c.id)).length,
    })),
  };
}

/** Read a numeric global, for challenge graders that inspect variables. */
export function readNumber(result: PythonResult, name: string): number | null {
  const v = result.globals.get(name);
  return v !== undefined && isNumeric(v) ? numVal(v) : null;
}
