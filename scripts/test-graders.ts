/**
 * Grader test.
 *
 * A grader that never passes would quietly ruin a lesson, and a grader that
 * passes anything would quietly ruin the assessment. So every lesson check and
* every code challenge is run twice: once against the reference solution the
 * interface can reveal to a student, which must pass, and once against a
 * plausible wrong answer, which must fail.
 *
 * Run with:  npm run test:graders
 */

import { LESSONS } from '../src/content/lessons';
import { CHALLENGES, type CodeChallenge } from '../src/content/challenges';
import { runPython } from '../src/lib/pyengine';

interface Solutions {
  /** A wrong answer a student could plausibly write. */
  wrong: string;
}

// ---- lesson tasks ----------------------------------------------------------

const LESSON_SOLUTIONS: Record<string, Solutions> = {
  variables: {
    wrong: 'length = 7\nwidth = 3\nperimeter = length + width\nprint(perimeter)',
  },
  operations: {
    // The classic slip: forgetting that the power binds before the minus.
    wrong: 'a = 1\nb = -5\nc = 6\nD = b*2 - 4*a*c\nprint(D)',
  },
  conditions: {
    // Uses > where >= would be needed, so the D = 0 case falls through.
    wrong:
      'a = 1\nb = 2\nc = 1\nD = b**2 - 4*a*c\n' +
      'if D > 0:\n    print("Two roots")\nelse:\n    print("No real roots")',
  },
  loops: {
    // Off by one: range stops short.
    wrong: 'total = 0\nfor n in range(1, 50):\n    total += n\nprint(total)',
  },
  functions: {
    // Calculates the value but never returns it.
    wrong: 'def quadratic(x, a, b, c):\n    a*x**2 + b*x + c\n\nprint(quadratic(3, 2, -1, 5))',
  },
  visualisation: {
    // Plots y = x rather than y = x².
    wrong:
      'xs = []\nys = []\nfor i in range(-50, 51):\n    x = i / 10\n    xs.append(x)\n    ys.append(x)\n\nplot(xs, ys)',
  },
};

// ---- challenges -------------------------------------------------------------

const CHALLENGE_SOLUTIONS: Record<string, Solutions> = {
  'ch-line': {
    wrong: 'def line(x):\n    return 2*x - 3',
  },
  'ch-quadratic': {
    wrong: 'def f(x):\n    return x**2 + 2*x',
  },
  'ch-distance': {
    // Forgets the square root.
    wrong: 'import math\n\ndef distance(x1, y1, x2, y2):\n    return (x2 - x1)**2 + (y2 - y1)**2',
  },
  'ch-through-points': {
    wrong: 'a = 1\nb = 0\nc = 3\n\ndef curve(x):\n    return a*x**2 + b*x + c',
  },
  'ch-downward-wide': {
    // Right height and direction, but not wider than y = x².
    wrong: 'a = -2\nb = 0\nc = 4\n\ndef curve(x):\n    return a*x**2 + b*x + c',
  },
  'ch-projectile': {
    // Too slow: never gets above 10 m at t = 2.
    wrong: 'v = 10\n\ndef height(t):\n    return v*t - 4.9*t**2',
  },
  'ch-wave-fit': {
    // Correct amplitude, untouched period.
    wrong: 'import math\n\na = 3\nb = 1\n\ndef wave(x):\n    return a * math.sin(b * x)',
  },
};

// ---- run --------------------------------------------------------------------

let passed = 0;
const failures: string[] = [];

for (const lesson of LESSONS) {
  const sol = LESSON_SOLUTIONS[lesson.id];
  if (!sol) {
    failures.push(`  lesson "${lesson.id}"\n    no reference solution written for this lesson`);
    continue;
  }

  const good = lesson.check(runPython(lesson.solution));
  if (!good.ok) {
    failures.push(`  lesson "${lesson.id}" (reference solution)\n    rejected its own solution: ${good.message}`);
  } else passed++;

  const bad = lesson.check(runPython(sol.wrong));
  if (bad.ok) {
    failures.push(`  lesson "${lesson.id}" (wrong answer)\n    accepted an incorrect solution`);
  } else passed++;
}

for (const challenge of CHALLENGES) {
  if (challenge.kind === 'predict') {
    // Nothing to run: correctness is the recorded answer index, already checked
    // for range by the content tests.
    passed++;
    continue;
  }

  const code = challenge as CodeChallenge;
  const sol = CHALLENGE_SOLUTIONS[code.id];
  if (!sol) {
    failures.push(`  challenge "${code.id}"\n    no reference solution written for this challenge`);
    continue;
  }

  const good = code.grade(code.solution);
  if (!good.ok) {
    failures.push(`  challenge "${code.id}" (reference solution)\n    rejected its own solution: ${good.message}`);
  } else passed++;

  const bad = code.grade(sol.wrong);
  if (bad.ok) {
    failures.push(`  challenge "${code.id}" (wrong answer)\n    accepted an incorrect solution`);
  } else passed++;

  // The starting code must never already be a passing answer.
  if (code.grade(code.starter).ok) {
    failures.push(`  challenge "${code.id}" (starter)\n    the starting code already passes`);
  } else passed++;
}

const total = passed + failures.length;
console.log(`\nMathXplore graders - ${passed}/${total} checks passed`);
if (failures.length) {
  console.log('\nFailures:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('All good.\n');
