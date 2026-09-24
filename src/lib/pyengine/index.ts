/**
 * MathXplore Python Engine - public entry point.
 *
 * Why a purpose-built engine rather than a full CPython build in the browser:
 *
 *   1. It runs offline and starts instantly - no multi-megabyte download
 *      before a student's first `print`, which matters in a classroom and in a
 *      live demonstration.
 *   2. Errors can be written for a learner. A raw traceback teaches nothing;
 *      every message here names the concept and links back to the mathematics.
 *   3. It is safe by construction: student code can reach nothing except the
 *      builtins registered in the interpreter - no DOM, no network, no `eval` -
 *      and a step budget stops runaway loops instead of freezing the tab.
 *
 * The subset covers everything in the six-level Python × Mathematics pathway:
 * variables, arithmetic, strings, f-strings, comparisons, boolean logic,
 * if/elif/else, while, for-in, range, lists, functions, and the `math` module.
 */

import { Interpreter, type RunOptions, type RunResult } from './interpreter';
import { explainError, type ErrorLesson } from './hints';
import { Flt, isNumeric, numVal } from './values';

export type { RunResult, RunOptions, PlotSeries } from './interpreter';
export type { GeometryScene, Shape2D, Shape3D, TurtleMark } from './geometry';
export { emptyScene, area2D, perimeter2D, volume3D, surface3D } from './geometry';
export type { ErrorLesson } from './hints';
export { pyStr, pyRepr, numVal, isNumeric, Flt } from './values';
export type { PyValue } from './values';

export interface PythonResult extends RunResult {
  /** Present only when the program stopped early. */
  lesson?: ErrorLesson;
}

/** Run a student program and return its output, graphs and (if any) lesson. */
export function runPython(source: string, options: RunOptions = {}): PythonResult {
  const result = new Interpreter(options).run(source);
  return result.error
    ? { ...result, lesson: explainError(result.error, source) }
    : result;
}

/**
 * Run a program, then call functions the student defined and collect what they
 * return. This is how challenges of the form "make the curve pass through
 * (2, 7)" are graded: the grader tests the actual rule rather than matching the
 * text of the code, so any correct solution is accepted.
 */
export function runAndProbe(
  source: string,
  probes: { name: string; args: number[] }[],
  options: RunOptions = {},
): { result: PythonResult; values: (number | null)[]; missing: string[] } {
  const interp = new Interpreter(options);
  const raw = interp.run(source);
  const result: PythonResult = raw.error
    ? { ...raw, lesson: explainError(raw.error, source) }
    : raw;

  const values: (number | null)[] = [];
  const missing: string[] = [];

  for (const probe of probes) {
    const fn = interp.globals.get(probe.name);
    if (fn === undefined) {
      if (!missing.includes(probe.name)) missing.push(probe.name);
      values.push(null);
      continue;
    }
    try {
      const out = interp.callValue(fn, probe.args.map((n) => new Flt(n)), {}, 0);
      values.push(isNumeric(out) ? numVal(out) : null);
    } catch {
      values.push(null);
    }
  }

  return { result, values, missing };
}

/**
 * Evaluate a single expression and return it as a JS number, or null.
 * Used by graders and by the "does this code produce that graph?" checks.
 */
export function evalNumber(
  source: string,
  inject: Record<string, number> = {},
): number | null {
  const result = runPython(`__value__ = (${source})`, { inject, maxSteps: 50_000 });
  if (result.error) return null;
  const v = result.globals.get('__value__');
  if (v === undefined || !isNumeric(v)) return null;
  const n = numVal(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build a JS function from a student-defined Python function so the 2D grapher
 * can sample it cheaply. Returns null when the function is missing or broken.
 */
export function compileFunction(
  source: string,
  funcName: string,
  extraArgs: number[] = [],
): ((x: number) => number) | null {
  const interp = new Interpreter({ maxSteps: 4_000_000 });
  const result = interp.run(source);
  if (result.error) return null;
  const fn = interp.globals.get(funcName);
  if (!fn) return null;

  return (x: number) => {
    try {
      const args = [x, ...extraArgs].map((n) => new Flt(n));
      const out = interp.callValue(fn, args, {}, 0);
      return isNumeric(out) ? numVal(out) : NaN;
    } catch {
      return NaN;
    }
  };
}
