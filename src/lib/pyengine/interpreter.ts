/**
 * MathXplore Python Engine - Interpreter
 *
 * A tree-walking evaluator for the teaching subset of Python.
 *
 * Safety model: the interpreter has no access to the DOM, network, filesystem,
 * `eval`, or any host object. The only capabilities a student program has are
 * the builtins registered below. A hard step budget and output cap guarantee
 * that a runaway loop stops the program rather than the browser tab.
 */

import type {
  Assign, AugAssign, Expr, For, FuncDef, If, Import, Module, Stmt, While,
} from './ast';
import { parse } from './parser';
import {
  BoundMethod, Flt, NativeFn, PyFunction, PyModule, PyObject, PyRange, PyTuple, Scope,
  formatFloat, isFloatVal, isNumeric, iterate, mkNum, numVal, pyEquals, pyRepr,
  pyStr, truthy, typeName, type PyValue,
} from './values';
import { PyRuntimeError } from './errors';
import { createGeometryModules, emptyScene, type GeometryScene } from './geometry';

export { PyRuntimeError } from './errors';

class BreakSignal { }
class ContinueSignal { }
class ReturnSignal {
  constructor(readonly value: PyValue) {}
}

// -------------------------------------------------------------------- output

export interface PlotSeries {
  label: string;
  xs: number[];
  ys: number[];
  kind: 'line' | 'points';
  color?: string;
}

export interface RunResult {
  /** Everything the program printed. */
  output: string;
  plots: PlotSeries[];
  /** Shapes drawn with the `shapes` and `turtle` libraries. */
  scene: GeometryScene;
  error?: { message: string; line: number; type: string };
  steps: number;
  durationMs: number;
  /** Top-level variables after the run - used to grade challenges. */
  globals: Map<string, PyValue>;
  truncated: boolean;
}

export interface RunOptions {
  /** Values injected as globals before the program starts (e.g. slider `a`). */
  inject?: Record<string, number>;
  maxSteps?: number;
  maxOutputChars?: number;
}

const DEFAULT_MAX_STEPS = 2_000_000;
const DEFAULT_MAX_OUTPUT = 60_000;
const PLOT_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185'];

// --------------------------------------------------------------- interpreter

export class Interpreter {
  private steps = 0;
  private out: string[] = [];
  private outChars = 0;
  private truncated = false;
  private readonly plots: PlotSeries[] = [];
  private readonly scene: GeometryScene = emptyScene();
  private readonly modules: Record<string, PyModule>;
  private readonly finishScene: () => void;
  private readonly maxSteps: number;
  private readonly maxOutput: number;
  readonly globals = new Scope();

  constructor(opts: RunOptions = {}) {
    this.maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
    this.maxOutput = opts.maxOutputChars ?? DEFAULT_MAX_OUTPUT;
    const geometry = createGeometryModules(this.scene);
    this.modules = {
      math: MATH_MODULE,
      shapes: geometry.shapes,
      geometry: geometry.shapes,
      turtle: geometry.turtle,
    };
    this.finishScene = geometry.finalize;
    this.installBuiltins();
    for (const [k, v] of Object.entries(opts.inject ?? {})) {
      this.globals.set(k, Number.isInteger(v) ? v : new Flt(v));
    }
  }

  // ------------------------------------------------------------------ run

  run(source: string): RunResult {
    const started = performance.now();
    let error: RunResult['error'];
    try {
      const mod: Module = parse(source);
      this.execBlock(mod.body, this.globals);
    } catch (e) {
      error = toRunError(e);
    }
    // A turtle that is still mid-stroke when the program ends has drawn
    // something: commit it, even after an error, so the student sees how far
    // the program got.
    try {
      this.finishScene();
    } catch {
      /* the scene is already as complete as it can be */
    }
    return {
      output: this.out.join(''),
      plots: this.plots,
      scene: this.scene,
      error,
      steps: this.steps,
      durationMs: Math.round(performance.now() - started),
      globals: this.globals.vars,
      truncated: this.truncated,
    };
  }

  private tick(line: number) {
    if (++this.steps > this.maxSteps) {
      throw new PyRuntimeError(
        'This program is taking too many steps, so MathXplore stopped it. ' +
          'That usually means a loop never reaches its end - check the loop ' +
          'condition, or make sure the counter really does change each time round.',
        line,
        'TimeLimit',
      );
    }
  }

  private write(text: string) {
    if (this.outChars >= this.maxOutput) {
      if (!this.truncated) {
        this.truncated = true;
        this.out.push('\n... output stopped: too many lines printed.\n');
      }
      return;
    }
    this.outChars += text.length;
    this.out.push(text);
  }

  // ----------------------------------------------------------- statements

  private execBlock(stmts: Stmt[], scope: Scope) {
    for (const s of stmts) this.execStmt(s, scope);
  }

  private execStmt(stmt: Stmt, scope: Scope) {
    this.tick(stmt.line);
    switch (stmt.kind) {
      case 'ExprStmt':
        this.eval(stmt.value, scope);
        return;
      case 'Assign':
        return this.execAssign(stmt, scope);
      case 'AugAssign':
        return this.execAugAssign(stmt, scope);
      case 'If':
        return this.execIf(stmt, scope);
      case 'While':
        return this.execWhile(stmt, scope);
      case 'For':
        return this.execFor(stmt, scope);
      case 'FuncDef':
        return this.execFuncDef(stmt, scope);
      case 'Return':
        throw new ReturnSignal(stmt.value ? this.eval(stmt.value, scope) : null);
      case 'Break':
        throw new BreakSignal();
      case 'Continue':
        throw new ContinueSignal();
      case 'Pass':
        return;
      case 'Import':
        return this.execImport(stmt, scope);
    }
  }

  private execAssign(stmt: Assign, scope: Scope) {
    const value = this.eval(stmt.value, scope);
    for (const target of stmt.targets) this.assignTo(target, value, scope);
  }

  private assignTo(target: Expr, value: PyValue, scope: Scope) {
    if (target.kind === 'Name') {
      scope.set(target.id, value);
      return;
    }
    if (target.kind === 'Subscript') {
      const container = this.eval(target.value, scope);
      const index = this.eval(target.index, scope);
      if (!Array.isArray(container)) {
        throw new PyRuntimeError(
          `You can only change items inside a list, but this is a ${typeName(container)}.`,
          target.line,
          'TypeError',
        );
      }
      const i = this.normaliseIndex(numVal(index), container.length, target.line);
      container[i] = value;
      return;
    }
    if (target.kind === 'Tuple' || target.kind === 'List') {
      const items = iterate(value);
      if (!items) {
        throw new PyRuntimeError(
          `Cannot unpack a ${typeName(value)} into several variables.`,
          target.line,
          'TypeError',
        );
      }
      if (items.length !== target.items.length) {
        throw new PyRuntimeError(
          `You are unpacking ${items.length} value${items.length === 1 ? '' : 's'} into ` +
            `${target.items.length} variables - the counts must match.`,
          target.line,
          'ValueError',
        );
      }
      target.items.forEach((t, i) => this.assignTo(t, items[i], scope));
      return;
    }
    throw new PyRuntimeError('This cannot be assigned to.', target.line, 'SyntaxError');
  }

  private execAugAssign(stmt: AugAssign, scope: Scope) {
    const current = this.eval(stmt.target, scope);
    const value = this.eval(stmt.value, scope);
    this.assignTo(stmt.target, this.binop(stmt.op, current, value, stmt.line), scope);
  }

  private execIf(stmt: If, scope: Scope) {
    if (truthy(this.eval(stmt.test, scope))) this.execBlock(stmt.body, scope);
    else this.execBlock(stmt.orelse, scope);
  }

  private execWhile(stmt: While, scope: Scope) {
    while (truthy(this.eval(stmt.test, scope))) {
      this.tick(stmt.line);
      try {
        this.execBlock(stmt.body, scope);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) continue;
        throw e;
      }
    }
  }

  private execFor(stmt: For, scope: Scope) {
    const iterable = this.eval(stmt.iter, scope);
    const items = iterate(iterable);
    if (!items) {
      const extra =
        isNumeric(iterable)
          ? ' To repeat something a set number of times, loop over `range(...)` instead - for example `for i in range(5):`'
          : '';
      throw new PyRuntimeError(
        `A \`for\` loop needs something it can step through, but this is a ${typeName(iterable)}.${extra}`,
        stmt.line,
        'TypeError',
      );
    }
    for (const item of items) {
      this.tick(stmt.line);
      this.assignTo(stmt.target, item, scope);
      try {
        this.execBlock(stmt.body, scope);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) continue;
        throw e;
      }
    }
  }

  private execFuncDef(stmt: FuncDef, scope: Scope) {
    const params = stmt.params.map((p) => ({
      name: p.name,
      def: p.def ? this.eval(p.def, scope) : undefined,
    }));
    scope.set(stmt.name, new PyFunction(stmt.name, params, stmt.body, scope));
  }

  private execImport(stmt: Import, scope: Scope) {
    const mod = this.modules[stmt.module];
    if (!mod) {
      const near = suggest(stmt.module, Object.keys(this.modules));
      throw new PyRuntimeError(
        `MathXplore's Python includes the \`math\`, \`shapes\` and \`turtle\` libraries. ` +
          `\`${stmt.module}\` is not available here.${near ? ` Did you mean \`${near}\`?` : ''}`,
        stmt.line,
        'ImportError',
      );
    }
    if (stmt.names) {
      for (const n of stmt.names) {
        if (n === '*') {
          for (const [k, v] of Object.entries(mod.dict)) {
            if (!k.startsWith('__')) scope.set(k, v);
          }
          continue;
        }
        const v = mod.dict[n];
        if (v === undefined) {
          const near = suggest(n, Object.keys(mod.dict));
          throw new PyRuntimeError(
            `\`${mod.name}\` has no member called \`${n}\`.${near ? ` Did you mean \`${near}\`?` : ''}`,
            stmt.line,
            'ImportError',
          );
        }
        scope.set(n, v);
      }
      return;
    }
    scope.set(stmt.alias ?? stmt.module, mod);
  }

  // ---------------------------------------------------------- expressions

  private eval(expr: Expr, scope: Scope): PyValue {
    this.tick(expr.line);
    switch (expr.kind) {
      case 'Num': return mkNum(expr.value, expr.isFloat);
      case 'Str': return expr.value;
      case 'Bool': return expr.value;
      case 'None': return null;
      case 'List': return expr.items.map((e) => this.eval(e, scope));
      case 'Tuple': return new PyTuple(expr.items.map((e) => this.eval(e, scope)));

      case 'Name': {
        const v = scope.get(expr.id);
        if (v === undefined) throw this.nameError(expr.id, scope, expr.line);
        return v;
      }

      case 'Unary': {
        const v = this.eval(expr.operand, scope);
        if (expr.op === 'not') return !truthy(v);
        if (!isNumeric(v)) {
          throw new PyRuntimeError(
            `Cannot apply ${expr.op} to a ${typeName(v)}.`,
            expr.line,
            'TypeError',
          );
        }
        const n = numVal(v);
        return mkNum(expr.op === '-' ? -n : n, isFloatVal(v));
      }

      case 'Bin':
        return this.binop(
          expr.op,
          this.eval(expr.left, scope),
          this.eval(expr.right, scope),
          expr.line,
        );

      case 'BoolOp': {
        const left = this.eval(expr.left, scope);
        if (expr.op === 'and') return truthy(left) ? this.eval(expr.right, scope) : left;
        return truthy(left) ? left : this.eval(expr.right, scope);
      }

      case 'Compare': {
        for (let i = 0; i < expr.ops.length; i++) {
          const a = this.eval(expr.operands[i], scope);
          const b = this.eval(expr.operands[i + 1], scope);
          if (!this.compare(expr.ops[i], a, b, expr.line)) return false;
        }
        return true;
      }

      case 'FString': {
        let s = '';
        for (const part of expr.parts) {
          if ('text' in part) s += part.text;
          else s += applyFormat(this.eval(part.expr, scope), part.spec, expr.line);
        }
        return s;
      }

      case 'Attribute':
        return this.getAttribute(this.eval(expr.value, scope), expr.attr, expr.line);

      case 'Subscript':
        return this.getSubscript(expr, scope);

      case 'Call':
        return this.evalCall(expr, scope);
    }
  }

  private getSubscript(expr: Extract<Expr, { kind: 'Subscript' }>, scope: Scope): PyValue {
    const container = this.eval(expr.value, scope);

    if (expr.slice) {
      const items = iterate(container);
      if (!items) {
        throw new PyRuntimeError(`A ${typeName(container)} cannot be sliced.`, expr.line, 'TypeError');
      }
      const len = items.length;
      const lo = expr.slice.lower ? clampSlice(numVal(this.eval(expr.slice.lower, scope)), len) : 0;
      const hi = expr.slice.upper ? clampSlice(numVal(this.eval(expr.slice.upper, scope)), len) : len;
      const part = items.slice(lo, hi);
      if (typeof container === 'string') return part.join('');
      if (container instanceof PyTuple) return new PyTuple(part);
      return part;
    }

    const index = this.eval(expr.index, scope);
    if (!isNumeric(index)) {
      throw new PyRuntimeError(
        `A list position must be a whole number, not a ${typeName(index)}.`,
        expr.line,
        'TypeError',
      );
    }
    const items = iterate(container);
    if (!items) {
      throw new PyRuntimeError(
        `A ${typeName(container)} does not have numbered positions, so [ ] cannot be used on it.`,
        expr.line,
        'TypeError',
      );
    }
    const i = this.normaliseIndex(numVal(index), items.length, expr.line);
    return items[i];
  }

  private normaliseIndex(raw: number, length: number, line: number): number {
    const i = raw < 0 ? length + raw : raw;
    if (!Number.isInteger(raw)) {
      throw new PyRuntimeError(
        `List positions must be whole numbers - ${formatFloat(raw)} is not.`,
        line,
        'TypeError',
      );
    }
    if (i < 0 || i >= length) {
      throw new PyRuntimeError(
        `Position ${raw} is outside this list. It holds ${length} item${length === 1 ? '' : 's'}, ` +
          `so the valid positions are 0 to ${Math.max(0, length - 1)}.`,
        line,
        'IndexError',
      );
    }
    return i;
  }

  private evalCall(expr: Extract<Expr, { kind: 'Call' }>, scope: Scope): PyValue {
    const callee = this.eval(expr.func, scope);
    const args = expr.args.map((a) => this.eval(a, scope));
    const kwargs: Record<string, PyValue> = {};
    for (const kw of expr.keywords) kwargs[kw.name] = this.eval(kw.value, scope);
    return this.callValue(callee, args, kwargs, expr.line, describeCallee(expr));
  }

  callValue(
    callee: PyValue,
    args: PyValue[],
    kwargs: Record<string, PyValue>,
    line: number,
    label = 'this value',
  ): PyValue {
    if (callee instanceof NativeFn) return callee.call(args, kwargs);

    if (callee instanceof BoundMethod) {
      return callee.fn.call([callee.self, ...args], kwargs);
    }

    if (callee instanceof PyFunction) {
      const local = new Scope(callee.closure);
      const required = callee.params.filter((p) => p.def === undefined).length;
      if (args.length > callee.params.length || args.length < required) {
        const names = callee.params.map((p) => p.name).join(', ');
        throw new PyRuntimeError(
          `\`${callee.name}\` expects ${callee.params.length} input${callee.params.length === 1 ? '' : 's'}` +
            `${names ? ` (${names})` : ''}, but you gave ${args.length}.`,
          line,
          'TypeError',
        );
      }
      callee.params.forEach((p, i) => {
        if (i < args.length) local.set(p.name, args[i]);
        else if (kwargs[p.name] !== undefined) local.set(p.name, kwargs[p.name]);
        else local.set(p.name, p.def as PyValue);
      });
      for (const [k, v] of Object.entries(kwargs)) {
        if (callee.params.some((p) => p.name === k)) local.set(k, v);
      }
      try {
        this.execBlock(callee.body as Stmt[], local);
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        throw e;
      }
      return null;
    }

    const hint = isNumeric(callee)
      ? ' If you meant to multiply, Python needs the * sign: for example 2*(x+1), not 2(x+1).'
      : '';
    throw new PyRuntimeError(
      `${label} is a ${typeName(callee)}, so it cannot be called like a function.${hint}`,
      line,
      'TypeError',
    );
  }

  // ------------------------------------------------------------ operators

  private binop(op: string, a: PyValue, b: PyValue, line: number): PyValue {
    // String and list building
    if (op === '+') {
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (typeof a === 'string' || typeof b === 'string') {
        if (isNumeric(a) || isNumeric(b)) {
          const num = typeof a === 'string' ? b : a;
          throw new PyRuntimeError(
            'Python will not add text and a number together. Turn the number into text first ' +
              `with str(...) - for example "answer: " + str(${pyStr(num)}) - or use an f-string.`,
            line,
            'TypeError',
          );
        }
      }
      if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
    }

    if (op === '*') {
      if (typeof a === 'string' && isNumeric(b)) return a.repeat(Math.max(0, Math.trunc(numVal(b))));
      if (isNumeric(a) && typeof b === 'string') return b.repeat(Math.max(0, Math.trunc(numVal(a))));
      if (Array.isArray(a) && isNumeric(b)) return repeatList(a, numVal(b));
      if (isNumeric(a) && Array.isArray(b)) return repeatList(b, numVal(a));
    }

    if (!isNumeric(a) || !isNumeric(b)) {
      throw new PyRuntimeError(
        `Python cannot use \`${op}\` between a ${typeName(a)} and a ${typeName(b)}.`,
        line,
        'TypeError',
      );
    }

    const x = numVal(a);
    const y = numVal(b);
    const anyFloat = isFloatVal(a) || isFloatVal(b);

    switch (op) {
      case '+': return mkNum(x + y, anyFloat);
      case '-': return mkNum(x - y, anyFloat);
      case '*': return mkNum(x * y, anyFloat);
      case '/':
        if (y === 0) {
          throw new PyRuntimeError(
            'Division by zero. In mathematics dividing by 0 has no answer, and Python stops here too. ' +
              'Check the value of the number you are dividing by.',
            line,
            'ZeroDivisionError',
          );
        }
        return new Flt(x / y); // `/` always produces a float in Python 3
      case '//':
        if (y === 0) {
          throw new PyRuntimeError('Division by zero using //.', line, 'ZeroDivisionError');
        }
        return mkNum(Math.floor(x / y), anyFloat);
      case '%':
        if (y === 0) {
          throw new PyRuntimeError('Cannot take the remainder after dividing by zero.', line, 'ZeroDivisionError');
        }
        return mkNum(((x % y) + y) % y, anyFloat);
      case '**': {
        const r = Math.pow(x, y);
        if (Number.isNaN(r) && x < 0) {
          throw new PyRuntimeError(
            `Raising the negative number ${pyStr(a)} to the power ${pyStr(b)} does not give a real number.`,
            line,
            'ValueError',
          );
        }
        return mkNum(r, anyFloat || y < 0);
      }
      default:
        throw new PyRuntimeError(`Unknown operator \`${op}\`.`, line, 'SyntaxError');
    }
  }

  private compare(op: string, a: PyValue, b: PyValue, line: number): boolean {
    switch (op) {
      case '==': return pyEquals(a, b);
      case '!=': return !pyEquals(a, b);
      case 'is': return a === b || (a === null && b === null);
      case 'is not': return !(a === b || (a === null && b === null));
      case 'in': case 'not in': {
        let found: boolean;
        if (typeof b === 'string') {
          found = typeof a === 'string' && b.includes(a);
        } else {
          const items = iterate(b);
          if (!items) {
            throw new PyRuntimeError(
              `\`in\` needs a list, tuple, range or text on the right-hand side, not a ${typeName(b)}.`,
              line,
              'TypeError',
            );
          }
          found = items.some((it) => pyEquals(it, a));
        }
        return op === 'in' ? found : !found;
      }
    }

    if (typeof a === 'string' && typeof b === 'string') {
      const c = a < b ? -1 : a > b ? 1 : 0;
      return applyOrder(op, c);
    }
    if (!isNumeric(a) || !isNumeric(b)) {
      throw new PyRuntimeError(
        `Python cannot compare a ${typeName(a)} with a ${typeName(b)} using \`${op}\`.`,
        line,
        'TypeError',
      );
    }
    const x = numVal(a);
    const y = numVal(b);
    return applyOrder(op, x < y ? -1 : x > y ? 1 : 0);
  }

  // ----------------------------------------------------------- attributes

  private getAttribute(value: PyValue, attr: string, line: number): PyValue {
    if (value instanceof PyModule) {
      const v = value.dict[attr];
      if (v === undefined) {
        const near = suggest(attr, Object.keys(value.dict));
        throw new PyRuntimeError(
          `\`${value.name}\` has nothing called \`${attr}\`.${near ? ` Did you mean \`${value.name}.${near}\`?` : ''}`,
          line,
          'AttributeError',
        );
      }
      return v;
    }

    if (value instanceof PyObject) {
      const method = value.methods[attr];
      if (method) return new BoundMethod(value, method);
      const v = value.attr(attr);
      if (v !== undefined) return v;
      const near = suggest(attr, [...Object.keys(value.methods), ...Object.keys(value.attrs)]);
      throw new PyRuntimeError(
        `A ${value.typeName} has no \`${attr}\`.${near ? ` Did you mean \`.${near}\`?` : ''}`,
        line,
        'AttributeError',
      );
    }

    const table =
      Array.isArray(value) ? LIST_METHODS
      : typeof value === 'string' ? STR_METHODS
      : null;

    if (table && table[attr]) return new BoundMethod(value, table[attr]);

    const near = table ? suggest(attr, Object.keys(table)) : null;
    throw new PyRuntimeError(
      `A ${typeName(value)} has no \`${attr}\`.${near ? ` Did you mean \`${near}\`?` : ''}`,
      line,
      'AttributeError',
    );
  }

  private nameError(id: string, scope: Scope, line: number): PyRuntimeError {
    for (const lib of ['shapes', 'turtle'] as const) {
      if (this.modules[lib].dict[id] !== undefined) {
        return new PyRuntimeError(
          `\`${id}\` comes from the \`${lib}\` library, which this program has not imported yet. ` +
            `Add \`from ${lib} import *\` at the top.`,
          line,
          'NameError',
        );
      }
    }
    const near = suggest(id, [...scope.names(), ...Object.keys(BUILTIN_NAMES)]);
    if (near) {
      return new PyRuntimeError(
        `\`${id}\` has not been given a value yet. Did you mean \`${near}\`?`,
        line,
        'NameError',
      );
    }
    return new PyRuntimeError(
      `\`${id}\` has not been given a value yet. Create it first with a line such as ` +
        `\`${id} = 0\`, or check the spelling - Python treats capital and small letters as different.`,
      line,
      'NameError',
    );
  }

  // ------------------------------------------------------------- builtins

  private installBuiltins() {
    const g = this.globals;
    const def = (name: string, fn: NativeFn['call']) => g.set(name, new NativeFn(name, fn));

    def('print', (args, kw) => {
      const sep = typeof kw.sep === 'string' ? kw.sep : ' ';
      const end = typeof kw.end === 'string' ? kw.end : '\n';
      this.write(args.map(pyStr).join(sep) + end);
      return null;
    });

    def('range', (args) => {
      const nums = args.map((a) => {
        if (!isNumeric(a) || !Number.isInteger(numVal(a))) {
          throw new PyRuntimeError(
            `range() needs whole numbers, but got ${pyRepr(a)}.`,
            0,
            'TypeError',
          );
        }
        return numVal(a);
      });
      if (nums.length === 0) {
        throw new PyRuntimeError('range() needs at least one number, e.g. range(5).', 0, 'TypeError');
      }
      if (nums.length === 1) return new PyRange(0, nums[0], 1);
      if (nums.length === 2) return new PyRange(nums[0], nums[1], 1);
      if (nums[2] === 0) {
        throw new PyRuntimeError('range() cannot have a step of 0 - it would never move.', 0, 'ValueError');
      }
      return new PyRange(nums[0], nums[1], nums[2]);
    });

    def('len', (args) => {
      const items = iterate(args[0]);
      if (!items) {
        throw new PyRuntimeError(`len() does not work on a ${typeName(args[0])}.`, 0, 'TypeError');
      }
      return items.length;
    });

    def('abs', (args) => {
      requireNumber(args[0], 'abs');
      return mkNum(Math.abs(numVal(args[0])), isFloatVal(args[0]));
    });

    def('round', (args) => {
      requireNumber(args[0], 'round');
      const n = numVal(args[0]);
      if (args.length > 1) {
        const d = numVal(args[1]);
        const f = Math.pow(10, d);
        return new Flt(Math.round((n + Number.EPSILON * Math.sign(n)) * f) / f);
      }
      // Python rounds halves to the nearest even number.
      const floor = Math.floor(n);
      const diff = n - floor;
      let r: number;
      if (Math.abs(diff - 0.5) < 1e-12) r = floor % 2 === 0 ? floor : floor + 1;
      else r = Math.round(n);
      return r;
    });

    def('min', (args) => reduceExtreme(args, 'min'));
    def('max', (args) => reduceExtreme(args, 'max'));

    def('sum', (args) => {
      const items = iterate(args[0]);
      if (!items) throw new PyRuntimeError(`sum() needs a list or range, not a ${typeName(args[0])}.`, 0, 'TypeError');
      let total = 0;
      let float = false;
      for (const it of items) {
        requireNumber(it, 'sum');
        total += numVal(it);
        float ||= isFloatVal(it);
      }
      return mkNum(total, float);
    });

    def('int', (args) => {
      const v = args[0];
      if (typeof v === 'string') {
        const t = v.trim();
        if (!/^[+-]?\d+$/.test(t)) {
          throw new PyRuntimeError(
            `int() cannot turn the text ${pyRepr(v)} into a whole number.`,
            0,
            'ValueError',
          );
        }
        return parseInt(t, 10);
      }
      requireNumber(v, 'int');
      return Math.trunc(numVal(v));
    });

    def('float', (args) => {
      const v = args[0];
      if (typeof v === 'string') {
        const n = Number(v.trim());
        if (Number.isNaN(n)) {
          throw new PyRuntimeError(`float() cannot turn the text ${pyRepr(v)} into a number.`, 0, 'ValueError');
        }
        return new Flt(n);
      }
      requireNumber(v, 'float');
      return new Flt(numVal(v));
    });

    def('str', (args) => (args.length ? pyStr(args[0]) : ''));
    def('bool', (args) => (args.length ? truthy(args[0]) : false));
    def('type', (args) => `<class '${typeName(args[0])}'>`);

    def('list', (args) => {
      if (!args.length) return [];
      const items = iterate(args[0]);
      if (!items) throw new PyRuntimeError(`list() cannot convert a ${typeName(args[0])}.`, 0, 'TypeError');
      return [...items];
    });

    def('sorted', (args, kw) => {
      const items = iterate(args[0]);
      if (!items) throw new PyRuntimeError(`sorted() needs a list or range.`, 0, 'TypeError');
      const copy = [...items];
      copy.sort((a, b) => compareForSort(a, b));
      if (truthy(kw.reverse ?? false)) copy.reverse();
      return copy;
    });

    def('reversed', (args) => {
      const items = iterate(args[0]);
      if (!items) throw new PyRuntimeError('reversed() needs a list or range.', 0, 'TypeError');
      return [...items].reverse();
    });

    def('enumerate', (args) => {
      const items = iterate(args[0]);
      if (!items) throw new PyRuntimeError('enumerate() needs a list or range.', 0, 'TypeError');
      const start = args.length > 1 ? numVal(args[1]) : 0;
      return items.map((v, i) => new PyTuple([i + start, v]));
    });

    def('zip', (args) => {
      const lists = args.map((a) => {
        const items = iterate(a);
        if (!items) throw new PyRuntimeError('zip() needs lists or ranges.', 0, 'TypeError');
        return items;
      });
      const n = Math.min(...lists.map((l) => l.length));
      const out: PyValue[] = [];
      for (let i = 0; i < n; i++) out.push(new PyTuple(lists.map((l) => l[i])));
      return out;
    });

    def('input', () => {
      throw new PyRuntimeError(
        'CodeLab has no keyboard input while a program runs. Set the value directly instead - ' +
          'for example `x = 5` - or use the sliders, which appear in your code as variables.',
        0,
        'NotAvailable',
      );
    });

    // ---- MathXplore visualisation builtins ---------------------------------

    const addSeries = (kind: 'line' | 'points') => (args: PyValue[], kw: Record<string, PyValue>) => {
      const label = typeof kw.label === 'string' ? kw.label : `series ${this.plots.length + 1}`;
      const color = typeof kw.color === 'string' ? kw.color : PLOT_COLORS[this.plots.length % PLOT_COLORS.length];

      // plot(f) or plot(f, -5, 5) - sample a function directly.
      if (args[0] instanceof PyFunction || args[0] instanceof NativeFn) {
        const lo = args.length > 1 ? numVal(args[1]) : -10;
        const hi = args.length > 2 ? numVal(args[2]) : 10;
        const n = 240;
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i <= n; i++) {
          const x = lo + ((hi - lo) * i) / n;
          const y = this.callValue(args[0], [new Flt(x)], {}, 0, 'the plotted function');
          if (!isNumeric(y)) {
            throw new PyRuntimeError(
              `plot() needs the function to return a number, but it returned ${pyRepr(y)}. ` +
                'Check that the function has a `return` line.',
              0,
              'TypeError',
            );
          }
          xs.push(x);
          ys.push(numVal(y));
        }
        this.plots.push({ label, xs, ys, kind, color });
        return null;
      }

      const xsRaw = iterate(args[0]);
      const ysRaw = args.length > 1 ? iterate(args[1]) : null;
      if (!xsRaw || !ysRaw) {
        throw new PyRuntimeError(
          'plot() takes two lists of numbers - the x values and the y values. ' +
            'For example: plot(xs, ys)',
          0,
          'TypeError',
        );
      }
      if (xsRaw.length !== ysRaw.length) {
        throw new PyRuntimeError(
          `plot() needs the same number of x and y values, but got ${xsRaw.length} x values ` +
            `and ${ysRaw.length} y values.`,
          0,
          'ValueError',
        );
      }
      this.plots.push({
        label,
        xs: xsRaw.map((v) => numVal(v)),
        ys: ysRaw.map((v) => numVal(v)),
        kind,
        color,
      });
      return null;
    };

    def('plot', addSeries('line'));
    def('scatter', addSeries('points'));
    def('show', () => null); // accepted for familiarity; graphs are always shown

    def('linspace', (args) => {
      const lo = numVal(args[0]);
      const hi = numVal(args[1]);
      const n = args.length > 2 ? Math.trunc(numVal(args[2])) : 50;
      if (n < 2) throw new PyRuntimeError('linspace() needs at least 2 points.', 0, 'ValueError');
      if (n > 20000) throw new PyRuntimeError('linspace() is limited to 20000 points here.', 0, 'ValueError');
      const out: PyValue[] = [];
      for (let i = 0; i < n; i++) out.push(new Flt(lo + ((hi - lo) * i) / (n - 1)));
      return out;
    });
  }
}

// ------------------------------------------------------------ math module

function mathFn(name: string, fn: (...n: number[]) => number, arity = 1): NativeFn {
  return new NativeFn(name, (args) => {
    if (args.length < arity) {
      throw new PyRuntimeError(
        `math.${name}() needs ${arity} number${arity === 1 ? '' : 's'}, but got ${args.length}.`,
        0,
        'TypeError',
      );
    }
    const nums = args.map((a) => {
      requireNumber(a, `math.${name}`);
      return numVal(a);
    });
    const r = fn(...nums);
    if (Number.isNaN(r)) {
      throw new PyRuntimeError(
        `math.${name}(${nums.map((n) => formatFloat(n)).join(', ')}) has no real answer. ` +
          (name === 'sqrt' ? 'The square root of a negative number is not a real number.' : ''),
        0,
        'ValueError',
      );
    }
    return new Flt(r);
  });
}

export const MATH_MODULE = new PyModule('math', {
  pi: new Flt(Math.PI),
  e: new Flt(Math.E),
  tau: new Flt(Math.PI * 2),
  inf: new Flt(Infinity),
  sqrt: mathFn('sqrt', Math.sqrt),
  pow: mathFn('pow', Math.pow, 2),
  sin: mathFn('sin', Math.sin),
  cos: mathFn('cos', Math.cos),
  tan: mathFn('tan', Math.tan),
  asin: mathFn('asin', Math.asin),
  acos: mathFn('acos', Math.acos),
  atan: mathFn('atan', Math.atan),
  atan2: mathFn('atan2', Math.atan2, 2),
  exp: mathFn('exp', Math.exp),
  log: new NativeFn('log', (args) => {
    const x = numVal(args[0]);
    if (x <= 0) {
      throw new PyRuntimeError(
        `math.log(${formatFloat(x)}) has no answer - logarithms are only defined for positive numbers.`,
        0,
        'ValueError',
      );
    }
    return new Flt(args.length > 1 ? Math.log(x) / Math.log(numVal(args[1])) : Math.log(x));
  }),
  log10: mathFn('log10', Math.log10),
  log2: mathFn('log2', Math.log2),
  hypot: mathFn('hypot', Math.hypot, 2),
  degrees: mathFn('degrees', (r) => (r * 180) / Math.PI),
  radians: mathFn('radians', (d) => (d * Math.PI) / 180),
  fabs: mathFn('fabs', Math.abs),
  floor: new NativeFn('floor', (args) => Math.floor(numVal(args[0]))),
  ceil: new NativeFn('ceil', (args) => Math.ceil(numVal(args[0]))),
  trunc: new NativeFn('trunc', (args) => Math.trunc(numVal(args[0]))),
  factorial: new NativeFn('factorial', (args) => {
    const n = numVal(args[0]);
    if (!Number.isInteger(n) || n < 0) {
      throw new PyRuntimeError('math.factorial() needs a whole number that is 0 or more.', 0, 'ValueError');
    }
    if (n > 170) throw new PyRuntimeError('That factorial is too large to calculate here.', 0, 'ValueError');
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }),
  isclose: new NativeFn('isclose', (args) => Math.abs(numVal(args[0]) - numVal(args[1])) < 1e-9),
});

/** Names the "did you mean?" helper can suggest even before they are defined. */
const BUILTIN_NAMES: Record<string, true> = Object.fromEntries(
  [
    'print', 'range', 'len', 'abs', 'round', 'min', 'max', 'sum', 'int', 'float',
    'str', 'bool', 'list', 'sorted', 'reversed', 'enumerate', 'zip', 'type',
    'plot', 'scatter', 'linspace', 'math', 'shapes', 'turtle', 'True', 'False', 'None',
  ].map((n) => [n, true as const]),
);

// ----------------------------------------------------------- method tables

function listMethod(name: string, call: NativeFn['call']) {
  return new NativeFn(name, call);
}

const LIST_METHODS: Record<string, NativeFn> = {
  append: listMethod('append', (args) => {
    (args[0] as PyValue[]).push(args[1]);
    return null;
  }),
  extend: listMethod('extend', (args) => {
    const items = iterate(args[1]);
    if (!items) throw new PyRuntimeError('extend() needs a list.', 0, 'TypeError');
    (args[0] as PyValue[]).push(...items);
    return null;
  }),
  insert: listMethod('insert', (args) => {
    (args[0] as PyValue[]).splice(numVal(args[1]), 0, args[2]);
    return null;
  }),
  pop: listMethod('pop', (args) => {
    const list = args[0] as PyValue[];
    if (!list.length) throw new PyRuntimeError('pop() cannot take an item from an empty list.', 0, 'IndexError');
    const i = args.length > 1 ? numVal(args[1]) : list.length - 1;
    const idx = i < 0 ? list.length + i : i;
    if (idx < 0 || idx >= list.length) {
      throw new PyRuntimeError(`pop(${i}) is outside this list of ${list.length} items.`, 0, 'IndexError');
    }
    return list.splice(idx, 1)[0];
  }),
  remove: listMethod('remove', (args) => {
    const list = args[0] as PyValue[];
    const i = list.findIndex((v) => pyEquals(v, args[1]));
    if (i < 0) throw new PyRuntimeError(`${pyRepr(args[1])} is not in this list.`, 0, 'ValueError');
    list.splice(i, 1);
    return null;
  }),
  clear: listMethod('clear', (args) => {
    (args[0] as PyValue[]).length = 0;
    return null;
  }),
  copy: listMethod('copy', (args) => [...(args[0] as PyValue[])]),
  index: listMethod('index', (args) => {
    const i = (args[0] as PyValue[]).findIndex((v) => pyEquals(v, args[1]));
    if (i < 0) throw new PyRuntimeError(`${pyRepr(args[1])} is not in this list.`, 0, 'ValueError');
    return i;
  }),
  count: listMethod('count', (args) =>
    (args[0] as PyValue[]).filter((v) => pyEquals(v, args[1])).length),
  sort: listMethod('sort', (args, kw) => {
    const list = args[0] as PyValue[];
    list.sort((a, b) => compareForSort(a, b));
    if (truthy(kw.reverse ?? false)) list.reverse();
    return null;
  }),
  reverse: listMethod('reverse', (args) => {
    (args[0] as PyValue[]).reverse();
    return null;
  }),
};

const STR_METHODS: Record<string, NativeFn> = {
  upper: new NativeFn('upper', (a) => (a[0] as string).toUpperCase()),
  lower: new NativeFn('lower', (a) => (a[0] as string).toLowerCase()),
  strip: new NativeFn('strip', (a) => (a[0] as string).trim()),
  title: new NativeFn('title', (a) =>
    (a[0] as string).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())),
  capitalize: new NativeFn('capitalize', (a) => {
    const s = a[0] as string;
    return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
  }),
  replace: new NativeFn('replace', (a) =>
    (a[0] as string).split(a[1] as string).join(a[2] as string)),
  split: new NativeFn('split', (a) =>
    a.length > 1 ? (a[0] as string).split(a[1] as string) : (a[0] as string).trim().split(/\s+/)),
  join: new NativeFn('join', (a) => {
    const items = iterate(a[1]);
    if (!items) throw new PyRuntimeError('join() needs a list of text values.', 0, 'TypeError');
    return items.map(pyStr).join(a[0] as string);
  }),
  startswith: new NativeFn('startswith', (a) => (a[0] as string).startsWith(a[1] as string)),
  endswith: new NativeFn('endswith', (a) => (a[0] as string).endsWith(a[1] as string)),
  count: new NativeFn('count', (a) => (a[0] as string).split(a[1] as string).length - 1),
  find: new NativeFn('find', (a) => (a[0] as string).indexOf(a[1] as string)),
  isdigit: new NativeFn('isdigit', (a) => /^\d+$/.test(a[0] as string)),
};

// -------------------------------------------------------------- utilities

function requireNumber(v: PyValue, fnName: string) {
  if (!isNumeric(v)) {
    throw new PyRuntimeError(
      `${fnName}() needs a number, but was given a ${typeName(v)}${
        typeof v === 'string' ? ' (text). Use float(...) to turn text into a number first.' : '.'
      }`,
      0,
      'TypeError',
    );
  }
}

function reduceExtreme(args: PyValue[], mode: 'min' | 'max'): PyValue {
  const items = args.length === 1 ? iterate(args[0]) ?? [args[0]] : args;
  if (!items.length) {
    throw new PyRuntimeError(`${mode}() cannot work on an empty list.`, 0, 'ValueError');
  }
  let best = items[0];
  for (const it of items) {
    const c = compareForSort(it, best);
    if (mode === 'min' ? c < 0 : c > 0) best = it;
  }
  return best;
}

function compareForSort(a: PyValue, b: PyValue): number {
  if (isNumeric(a) && isNumeric(b)) return numVal(a) - numVal(b);
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  throw new PyRuntimeError(
    `Cannot put a ${typeName(a)} and a ${typeName(b)} in order together.`,
    0,
    'TypeError',
  );
}

function repeatList(list: PyValue[], times: number): PyValue[] {
  const n = Math.max(0, Math.trunc(times));
  if (list.length * n > 200000) {
    throw new PyRuntimeError('That list would be too large to build here.', 0, 'MemoryError');
  }
  const out: PyValue[] = [];
  for (let i = 0; i < n; i++) out.push(...list);
  return out;
}

function applyOrder(op: string, c: number): boolean {
  switch (op) {
    case '<': return c < 0;
    case '<=': return c <= 0;
    case '>': return c > 0;
    case '>=': return c >= 0;
    default: return false;
  }
}

function clampSlice(raw: number, len: number): number {
  const i = raw < 0 ? len + raw : raw;
  return Math.max(0, Math.min(len, Math.trunc(i)));
}

/** Format-spec subset for f-strings: fill, align, width, precision, type. */
function applyFormat(value: PyValue, spec: string | undefined, line: number): string {
  if (!spec) return pyStr(value);
  const m = /^(?:(.)?([<>^]))?(\d+)?(?:\.(\d+))?([fdeg%])?$/.exec(spec);
  if (!m) {
    throw new PyRuntimeError(
      `MathXplore's Python does not understand the format \`:${spec}\` yet. Try something like :.2f`,
      line,
      'ValueError',
    );
  }
  const [, fill, align, widthS, precS, type] = m;
  let text: string;

  if (type === 'f' || type === '%' || type === 'e') {
    requireNumber(value, 'format');
    const prec = precS ? parseInt(precS, 10) : 6;
    const n = numVal(value);
    text =
      type === 'e' ? n.toExponential(prec)
      : type === '%' ? `${(n * 100).toFixed(prec)}%`
      : n.toFixed(prec);
  } else if (type === 'd') {
    requireNumber(value, 'format');
    text = String(Math.round(numVal(value)));
  } else if (precS) {
    requireNumber(value, 'format');
    text = String(Number(numVal(value).toPrecision(parseInt(precS, 10))));
  } else {
    text = pyStr(value);
  }

  const width = widthS ? parseInt(widthS, 10) : 0;
  if (text.length >= width) return text;
  const pad = (fill ?? ' ').repeat(width - text.length);
  if (align === '<') return text + pad;
  if (align === '^') {
    const left = Math.floor(pad.length / 2);
    return pad.slice(0, left) + text + pad.slice(left);
  }
  // Numbers default to right-aligned, text to left-aligned - as in Python.
  if (!align) return isNumeric(value) ? pad + text : text + pad;
  return pad + text;
}

/** Closest match by edit distance, for "did you mean?" hints. */
function suggest(word: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    if (c === word) continue;
    const d = editDistance(word.toLowerCase(), c.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  const limit = word.length <= 4 ? 1 : 2;
  return bestScore <= limit ? best : null;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function describeCallee(expr: Extract<Expr, { kind: 'Call' }>): string {
  if (expr.func.kind === 'Name') return `\`${expr.func.id}\``;
  if (expr.func.kind === 'Attribute') return `\`${expr.func.attr}\``;
  return 'this value';
}

function toRunError(e: unknown): RunResult['error'] {
  if (e instanceof PyRuntimeError) {
    return { message: e.message, line: e.line, type: e.errorType };
  }
  if (e && typeof e === 'object' && 'line' in e && 'message' in e) {
    const err = e as { message: string; line: number; name?: string };
    return {
      message: err.message,
      line: err.line,
      type: err.name === 'PyTokenError' ? 'SyntaxError' : 'SyntaxError',
    };
  }
  if (e instanceof RangeError) {
    return {
      message:
        'Your code called itself too many times without stopping. If a function calls itself, ' +
        'it needs a case where it stops calling itself.',
      line: 0,
      type: 'RecursionError',
    };
  }
  return { message: e instanceof Error ? e.message : String(e), line: 0, type: 'Error' };
}
