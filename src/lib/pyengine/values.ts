/**
 * MathXplore Python Engine - the value model.
 *
 * Python's int/float distinction is educationally important (students must see
 * why `7 / 2` is 3.5 while `7 // 2` is 3, and why `4 / 2` prints `2.0`), so
 * floats are wrapped in `Flt` while ints stay as plain JS numbers.
 */

/** A Python float. Ints are represented as bare JS numbers. */
export class Flt {
  constructor(readonly v: number) {}
}

export class PyTuple {
  constructor(readonly items: PyValue[]) {}
}

export class PyRange {
  constructor(
    readonly start: number,
    readonly stop: number,
    readonly step: number,
  ) {}

  get length(): number {
    if (this.step === 0) return 0;
    const n = Math.ceil((this.stop - this.start) / this.step);
    return Math.max(0, n);
  }

  item(i: number): number {
    return this.start + i * this.step;
  }

  toArray(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.length; i++) out.push(this.item(i));
    return out;
  }
}

export class PyFunction {
  constructor(
    readonly name: string,
    readonly params: { name: string; def?: PyValue }[],
    readonly body: unknown[],
    readonly closure: Scope,
  ) {}
}

export class NativeFn {
  constructor(
    readonly name: string,
    readonly call: (args: PyValue[], kwargs: Record<string, PyValue>) => PyValue,
  ) {}
}

export class BoundMethod {
  constructor(
    readonly self: PyValue,
    readonly fn: NativeFn,
  ) {}
}

export class PyModule {
  constructor(
    readonly name: string,
    readonly dict: Record<string, PyValue>,
  ) {}
}

/**
 * A native object with attributes and methods - the value a shape or a turtle
 * is represented by. Attributes may be getters so that `circle.area` always
 * reflects the shape's current size rather than the size it was created with.
 */
export class PyObject {
  constructor(
    readonly typeName: string,
    readonly attrs: Record<string, PyValue | (() => PyValue)>,
    readonly methods: Record<string, NativeFn>,
    readonly describe: () => string,
  ) {}

  attr(name: string): PyValue | undefined {
    const v = this.attrs[name];
    return typeof v === 'function' ? (v as () => PyValue)() : v;
  }
}

export type PyValue =
  | number
  | Flt
  | boolean
  | string
  | null
  | PyValue[]
  | PyTuple
  | PyRange
  | PyFunction
  | NativeFn
  | BoundMethod
  | PyModule
  | PyObject;

export class Scope {
  readonly vars = new Map<string, PyValue>();

  constructor(readonly parent?: Scope) {}

  get(name: string): PyValue | undefined {
    let s: Scope | undefined = this;
    while (s) {
      if (s.vars.has(name)) return s.vars.get(name);
      s = s.parent;
    }
    return undefined;
  }

  has(name: string): boolean {
    return this.get(name) !== undefined || this.hasKey(name);
  }

  private hasKey(name: string): boolean {
    let s: Scope | undefined = this;
    while (s) {
      if (s.vars.has(name)) return true;
      s = s.parent;
    }
    return false;
  }

  set(name: string, value: PyValue) {
    this.vars.set(name, value);
  }

  /** Every name visible from this scope - used for "did you mean?" hints. */
  names(): string[] {
    const out = new Set<string>();
    let s: Scope | undefined = this;
    while (s) {
      for (const k of s.vars.keys()) out.add(k);
      s = s.parent;
    }
    return [...out];
  }
}

// ------------------------------------------------------------------- numbers

export function isNumeric(v: PyValue): boolean {
  return typeof v === 'number' || v instanceof Flt || typeof v === 'boolean';
}

export function numVal(v: PyValue): number {
  if (typeof v === 'number') return v;
  if (v instanceof Flt) return v.v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return NaN;
}

export function isFloatVal(v: PyValue): boolean {
  return v instanceof Flt;
}

/** Build a number, tagging it as float when required. */
export function mkNum(value: number, asFloat: boolean): PyValue {
  return asFloat ? new Flt(value) : value;
}

export function truthy(v: PyValue): boolean {
  if (v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v instanceof Flt) return v.v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof PyTuple) return v.items.length > 0;
  if (v instanceof PyRange) return v.length > 0;
  return true;
}

// ----------------------------------------------------------------- rendering

/** Python's `repr` - how a value looks inside a list. */
export function pyRepr(v: PyValue): string {
  if (typeof v === 'string') {
    return v.includes("'") && !v.includes('"') ? `"${v}"` : `'${v.replace(/'/g, "\\'")}'`;
  }
  return pyStr(v);
}

/** Python's `str` - how a value looks when printed. */
export function pyStr(v: PyValue): string {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return formatInt(v);
  if (v instanceof Flt) return formatFloat(v.v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`;
  if (v instanceof PyTuple) {
    if (v.items.length === 1) return `(${pyRepr(v.items[0])},)`;
    return `(${v.items.map(pyRepr).join(', ')})`;
  }
  if (v instanceof PyRange) {
    return v.step === 1 ? `range(${v.start}, ${v.stop})` : `range(${v.start}, ${v.stop}, ${v.step})`;
  }
  if (v instanceof PyFunction) return `<function ${v.name}>`;
  if (v instanceof NativeFn) return `<built-in function ${v.name}>`;
  if (v instanceof BoundMethod) return `<built-in method ${v.fn.name}>`;
  if (v instanceof PyModule) return `<module '${v.name}'>`;
  if (v instanceof PyObject) return v.describe();
  return String(v);
}

function formatInt(n: number): string {
  if (!Number.isFinite(n)) return formatFloat(n);
  return Object.is(n, -0) ? '0' : String(n);
}

export function formatFloat(n: number): string {
  if (Number.isNaN(n)) return 'nan';
  if (n === Infinity) return 'inf';
  if (n === -Infinity) return '-inf';
  if (Number.isInteger(n) && Math.abs(n) < 1e16) return `${n}.0`;
  const s = String(n);
  // JS writes 1e+21 as "1e+21" already; align smaller exponents with Python.
  return s.replace(/e([+-])(\d)$/, 'e$10$2');
}

/** The name Python would use for a value's type. */
export function typeName(v: PyValue): string {
  if (v === null) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return 'int';
  if (v instanceof Flt) return 'float';
  if (typeof v === 'string') return 'str';
  if (Array.isArray(v)) return 'list';
  if (v instanceof PyTuple) return 'tuple';
  if (v instanceof PyRange) return 'range';
  if (v instanceof PyModule) return 'module';
  if (v instanceof PyObject) return v.typeName;
  if (v instanceof PyFunction || v instanceof NativeFn || v instanceof BoundMethod) return 'function';
  return 'object';
}

/** Structural equality, matching Python's `==`. */
export function pyEquals(a: PyValue, b: PyValue): boolean {
  if (isNumeric(a) && isNumeric(b)) return numVal(a) === numVal(b);
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => pyEquals(x, b[i]));
  }
  if (a instanceof PyTuple && b instanceof PyTuple) {
    return a.items.length === b.items.length && a.items.every((x, i) => pyEquals(x, b.items[i]));
  }
  return a === b;
}

/** Turn any iterable Python value into a JS array. */
export function iterate(v: PyValue): PyValue[] | null {
  if (Array.isArray(v)) return v;
  if (v instanceof PyTuple) return v.items;
  if (v instanceof PyRange) return v.toArray();
  if (typeof v === 'string') return [...v];
  return null;
}
