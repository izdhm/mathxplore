/**
 * MathXplore Python Engine - Parser
 *
 * A recursive-descent parser producing the AST in `ast.ts`. It covers the
 * teaching subset used across the platform: assignment, arithmetic,
 * comparisons, boolean logic, if/elif/else, while, for-in, def/return, lists,
 * indexing, attribute access, calls, and f-strings.
 *
 * Error messages are written for a beginner, not a compiler engineer.
 */

import type {
  Expr, Module, Stmt,
} from './ast';
import { tokenize, type Token } from './tokenizer';

export class PySyntaxError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly col: number,
  ) {
    super(message);
    this.name = 'PySyntaxError';
  }
}

const COMPARE_OPS = new Set(['==', '!=', '<', '>', '<=', '>=']);
const AUG_OPS = new Set(['+=', '-=', '*=', '/=', '//=', '%=', '**=']);

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  // ------------------------------------------------------------ token helpers

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private at(type: Token['type'], value?: string): boolean {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private accept(type: Token['type'], value?: string): Token | null {
    if (this.at(type, value)) return this.next();
    return null;
  }

  private expect(type: Token['type'], value?: string, hint?: string): Token {
    if (this.at(type, value)) return this.next();
    const t = this.peek();
    const found =
      t.type === 'NEWLINE' ? 'the end of the line'
      : t.type === 'EOF' ? 'the end of your code'
      : t.type === 'INDENT' || t.type === 'DEDENT' ? 'a change of indentation'
      : `"${t.value}"`;
    const want = value ? `"${value}"` : type.toLowerCase();
    throw new PySyntaxError(
      hint ?? `Python expected ${want} here, but found ${found}.`,
      t.line,
      t.col,
    );
  }

  private skipNewlines() {
    while (this.at('NEWLINE')) this.next();
  }

  // ----------------------------------------------------------------- entry

  parseModule(): Module {
    const body: Stmt[] = [];
    this.skipNewlines();
    while (!this.at('EOF')) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    return { body };
  }

  /** A `:`-introduced block, either inline (`if x: y = 1`) or indented. */
  private parseBlock(keyword: string): Stmt[] {
    this.expect(
      'OP',
      ':',
      `A \`${keyword}\` line must end with a colon ( : ) before its block.`,
    );

    // Inline single-statement body.
    if (!this.at('NEWLINE')) {
      const stmt = this.parseStatement();
      return [stmt];
    }

    this.skipNewlines();
    if (!this.at('INDENT')) {
      const t = this.peek();
      throw new PySyntaxError(
        `The lines inside this \`${keyword}\` block must be indented (usually 4 spaces).`,
        t.line,
        t.col,
      );
    }
    this.next(); // INDENT

    const body: Stmt[] = [];
    this.skipNewlines();
    while (!this.at('DEDENT') && !this.at('EOF')) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    this.accept('DEDENT');
    return body;
  }

  // ------------------------------------------------------------- statements

  private parseStatement(): Stmt {
    const t = this.peek();

    if (t.type === 'NAME') {
      switch (t.value) {
        case 'if': return this.parseIf();
        case 'while': return this.parseWhile();
        case 'for': return this.parseFor();
        case 'def': return this.parseFuncDef();
        case 'import': case 'from': return this.parseImport();
        case 'return': {
          this.next();
          const value = this.at('NEWLINE') || this.at('EOF') || this.at('DEDENT')
            ? undefined
            : this.parseExpr();
          return { kind: 'Return', value, line: t.line, col: t.col };
        }
        case 'break': this.next(); return { kind: 'Break', line: t.line, col: t.col };
        case 'continue': this.next(); return { kind: 'Continue', line: t.line, col: t.col };
        case 'pass': this.next(); return { kind: 'Pass', line: t.line, col: t.col };
        case 'elif': case 'else':
          throw new PySyntaxError(
            `\`${t.value}\` must line up with an \`if\` above it.`,
            t.line,
            t.col,
          );
      }
    }

    return this.parseSimpleStatement();
  }

  /**
   * A comma-separated list at statement level builds a tuple, so both
   * `a, b = 1, 2` and `print(x)` parse through the same path.
   */
  private parseExprList(): Expr {
    const first = this.parseExpr();
    if (!this.at('OP', ',')) return first;
    const items: Expr[] = [first];
    while (this.accept('OP', ',')) {
      if (this.at('NEWLINE') || this.at('EOF') || this.at('OP', '=')) break;
      items.push(this.parseExpr());
    }
    return { kind: 'Tuple', items, line: first.line, col: first.col };
  }

  /** Assignment, augmented assignment, or a bare expression. */
  private parseSimpleStatement(): Stmt {
    const start = this.peek();
    const first = this.parseExprList();

    if (this.at('OP', '=')) {
      const targets: Expr[] = [first];
      let value: Expr = first;
      while (this.accept('OP', '=')) {
        value = this.parseExprList();
        if (this.at('OP', '=')) targets.push(value);
      }
      for (const target of targets) this.checkAssignable(target);
      return { kind: 'Assign', targets, value, line: start.line, col: start.col };
    }

    if (this.peek().type === 'OP' && AUG_OPS.has(this.peek().value)) {
      const op = this.next().value.slice(0, -1);
      this.checkAssignable(first);
      const value = this.parseExpr();
      return { kind: 'AugAssign', target: first, op, value, line: start.line, col: start.col };
    }

    return { kind: 'ExprStmt', value: first, line: start.line, col: start.col };
  }

  private checkAssignable(target: Expr) {
    if (
      target.kind === 'Name' ||
      target.kind === 'Subscript' ||
      target.kind === 'Attribute' ||
      target.kind === 'Tuple' ||
      target.kind === 'List'
    ) return;
    if (target.kind === 'Call') {
      throw new PySyntaxError(
        'You cannot assign a value to a function call. Did you mean `==` to compare, instead of `=` to assign?',
        target.line,
        target.col,
      );
    }
    throw new PySyntaxError(
      'The left-hand side of `=` must be a variable name.',
      target.line,
      target.col,
    );
  }

  private parseIf(): Stmt {
    const t = this.next(); // if / elif
    const test = this.parseExpr();
    const body = this.parseBlock(t.value);
    let orelse: Stmt[] = [];

    this.skipNewlines();
    if (this.at('NAME', 'elif')) {
      orelse = [this.parseIf()];
    } else if (this.at('NAME', 'else')) {
      this.next();
      orelse = this.parseBlock('else');
    }
    return { kind: 'If', test, body, orelse, line: t.line, col: t.col };
  }

  private parseWhile(): Stmt {
    const t = this.next();
    const test = this.parseExpr();
    const body = this.parseBlock('while');
    return { kind: 'While', test, body, line: t.line, col: t.col };
  }

  private parseFor(): Stmt {
    const t = this.next();
    const target = this.parseTargetList();
    if (!this.accept('NAME', 'in')) {
      const bad = this.peek();
      throw new PySyntaxError(
        'A `for` loop is written `for <variable> in <sequence>:` - the word `in` is missing.',
        bad.line,
        bad.col,
      );
    }
    const iter = this.parseExpr();
    const body = this.parseBlock('for');
    return { kind: 'For', target, iter, body, line: t.line, col: t.col };
  }

  private parseTargetList(): Expr {
    const first = this.parseAtomTarget();
    if (!this.at('OP', ',')) return first;
    const items: Expr[] = [first];
    while (this.accept('OP', ',')) {
      if (this.at('NAME', 'in')) break;
      items.push(this.parseAtomTarget());
    }
    return { kind: 'Tuple', items, line: first.line, col: first.col };
  }

  private parseAtomTarget(): Expr {
    const t = this.expect('NAME', undefined, 'A loop variable must be a name, such as `x`.');
    return { kind: 'Name', id: t.value, line: t.line, col: t.col };
  }

  private parseFuncDef(): Stmt {
    const t = this.next(); // def
    const nameTok = this.expect(
      'NAME',
      undefined,
      'After `def`, Python expects the function name - for example `def quadratic(x):`',
    );
    this.expect('OP', '(', `The function name \`${nameTok.value}\` must be followed by ( ).`);

    const params: { name: string; def?: Expr }[] = [];
    while (!this.at('OP', ')')) {
      const p = this.expect('NAME', undefined, 'Function inputs must be names, such as `x`.');
      let def: Expr | undefined;
      if (this.accept('OP', '=')) def = this.parseExpr();
      params.push({ name: p.value, def });
      if (!this.accept('OP', ',')) break;
    }
    this.expect('OP', ')');
    const body = this.parseBlock('def');
    return { kind: 'FuncDef', name: nameTok.value, params, body, line: t.line, col: t.col };
  }

  private parseImport(): Stmt {
    const t = this.next();
    if (t.value === 'import') {
      const mod = this.expect('NAME', undefined, 'Write the module name after `import`, e.g. `import math`.');
      let alias: string | undefined;
      if (this.accept('NAME', 'as')) alias = this.expect('NAME').value;
      return { kind: 'Import', module: mod.value, alias, line: t.line, col: t.col };
    }
    // from <module> import a, b
    const mod = this.expect('NAME');
    this.expect('NAME', 'import', 'A `from` line is written `from math import sqrt`.');
    const names: string[] = [];
    do {
      if (this.at('OP', '*')) { this.next(); names.push('*'); break; }
      names.push(this.expect('NAME').value);
    } while (this.accept('OP', ','));
    return { kind: 'Import', module: mod.value, names, line: t.line, col: t.col };
  }

  // ------------------------------------------------------------ expressions

  private parseExpr(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.at('NAME', 'or')) {
      const t = this.next();
      const right = this.parseAnd();
      left = { kind: 'BoolOp', op: 'or', left, right, line: t.line, col: t.col };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.at('NAME', 'and')) {
      const t = this.next();
      const right = this.parseNot();
      left = { kind: 'BoolOp', op: 'and', left, right, line: t.line, col: t.col };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.at('NAME', 'not')) {
      const t = this.next();
      return { kind: 'Unary', op: 'not', operand: this.parseNot(), line: t.line, col: t.col };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expr {
    const first = this.parseArith();
    const ops: string[] = [];
    const operands: Expr[] = [first];

    for (;;) {
      const t = this.peek();
      if (t.type === 'OP' && COMPARE_OPS.has(t.value)) {
        this.next();
        ops.push(t.value);
        operands.push(this.parseArith());
        continue;
      }
      if (t.type === 'NAME' && t.value === 'in') {
        this.next();
        ops.push('in');
        operands.push(this.parseArith());
        continue;
      }
      if (t.type === 'NAME' && t.value === 'not' && this.peek(1).value === 'in') {
        this.next(); this.next();
        ops.push('not in');
        operands.push(this.parseArith());
        continue;
      }
      if (t.type === 'NAME' && t.value === 'is') {
        this.next();
        const neg = !!this.accept('NAME', 'not');
        ops.push(neg ? 'is not' : 'is');
        operands.push(this.parseArith());
        continue;
      }
      break;
    }

    if (ops.length === 0) return first;
    return { kind: 'Compare', ops, operands, line: first.line, col: first.col };
  }

  private parseArith(): Expr {
    let left = this.parseTerm();
    while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const t = this.next();
      const right = this.parseTerm();
      left = { kind: 'Bin', op: t.value, left, right, line: t.line, col: t.col };
    }
    return left;
  }

  private parseTerm(): Expr {
    let left = this.parseUnary();
    while (
      this.peek().type === 'OP' &&
      ['*', '/', '//', '%'].includes(this.peek().value)
    ) {
      const t = this.next();
      const right = this.parseUnary();
      left = { kind: 'Bin', op: t.value, left, right, line: t.line, col: t.col };
    }
    return left;
  }

  private parseUnary(): Expr {
    const t = this.peek();
    if (t.type === 'OP' && (t.value === '-' || t.value === '+')) {
      this.next();
      return {
        kind: 'Unary',
        op: t.value as '-' | '+',
        operand: this.parseUnary(),
        line: t.line,
        col: t.col,
      };
    }
    return this.parsePower();
  }

  /** `**` binds tighter than unary minus on its left, and is right-associative. */
  private parsePower(): Expr {
    const base = this.parsePostfix();
    if (this.at('OP', '**')) {
      const t = this.next();
      const exp = this.parseUnary();
      return { kind: 'Bin', op: '**', left: base, right: exp, line: t.line, col: t.col };
    }
    return base;
  }

  private parsePostfix(): Expr {
    let node = this.parseAtom();
    for (;;) {
      if (this.at('OP', '(')) {
        node = this.parseCallArgs(node);
      } else if (this.at('OP', '[')) {
        const t = this.next();
        node = this.parseSubscript(node, t);
      } else if (this.at('OP', '.')) {
        this.next();
        const attr = this.expect('NAME', undefined, 'Write a name after the dot, e.g. `math.sqrt`.');
        node = { kind: 'Attribute', value: node, attr: attr.value, line: attr.line, col: attr.col };
      } else {
        return node;
      }
    }
  }

  private parseSubscript(value: Expr, t: Token): Expr {
    // Slice with an omitted lower bound: a[:3]
    if (this.at('OP', ':')) {
      this.next();
      const upper = this.at('OP', ']') ? undefined : this.parseExpr();
      this.expect('OP', ']');
      return {
        kind: 'Subscript', value, index: { kind: 'None', line: t.line, col: t.col },
        slice: { upper }, line: t.line, col: t.col,
      };
    }
    const index = this.parseExpr();
    if (this.at('OP', ':')) {
      this.next();
      const upper = this.at('OP', ']') ? undefined : this.parseExpr();
      this.expect('OP', ']');
      return {
        kind: 'Subscript', value, index, slice: { lower: index, upper },
        line: t.line, col: t.col,
      };
    }
    this.expect('OP', ']', 'This opening [ needs a matching ] to close it.');
    return { kind: 'Subscript', value, index, line: t.line, col: t.col };
  }

  private parseCallArgs(func: Expr): Expr {
    const open = this.next(); // (
    const args: Expr[] = [];
    const keywords: { name: string; value: Expr }[] = [];

    while (!this.at('OP', ')')) {
      if (this.at('EOF')) {
        throw new PySyntaxError(
          'This opening ( was never closed - add a matching ) at the end.',
          open.line,
          open.col,
        );
      }
      // keyword argument: name=value
      if (this.peek().type === 'NAME' && this.peek(1).type === 'OP' && this.peek(1).value === '=') {
        const name = this.next().value;
        this.next(); // =
        keywords.push({ name, value: this.parseExpr() });
      } else {
        args.push(this.parseExpr());
      }
      if (!this.accept('OP', ',')) break;
    }
    this.expect('OP', ')', 'This opening ( needs a matching ) to close it.');
    return { kind: 'Call', func, args, keywords, line: func.line, col: func.col };
  }

  private parseAtom(): Expr {
    const t = this.peek();

    if (t.type === 'NUMBER') {
      this.next();
      return {
        kind: 'Num', value: parseFloat(t.value), isFloat: !!t.isFloat,
        line: t.line, col: t.col,
      };
    }

    if (t.type === 'STRING') {
      this.next();
      if (t.isFString) return this.buildFString(t);
      return { kind: 'Str', value: t.text ?? '', line: t.line, col: t.col };
    }

    if (t.type === 'NAME') {
      if (t.value === 'True' || t.value === 'False') {
        this.next();
        return { kind: 'Bool', value: t.value === 'True', line: t.line, col: t.col };
      }
      if (t.value === 'None') {
        this.next();
        return { kind: 'None', line: t.line, col: t.col };
      }
      if (t.value === 'true' || t.value === 'false') {
        throw new PySyntaxError(
          `Python writes this with a capital letter: \`${t.value === 'true' ? 'True' : 'False'}\`.`,
          t.line,
          t.col,
        );
      }
      this.next();
      return { kind: 'Name', id: t.value, line: t.line, col: t.col };
    }

    if (t.type === 'OP' && t.value === '(') {
      this.next();
      if (this.at('OP', ')')) {
        this.next();
        return { kind: 'Tuple', items: [], line: t.line, col: t.col };
      }
      const first = this.parseExpr();
      if (this.at('OP', ',')) {
        const items = [first];
        while (this.accept('OP', ',')) {
          if (this.at('OP', ')')) break;
          items.push(this.parseExpr());
        }
        this.expect('OP', ')');
        return { kind: 'Tuple', items, line: t.line, col: t.col };
      }
      this.expect('OP', ')', 'This opening ( needs a matching ) to close it.');
      return first;
    }

    if (t.type === 'OP' && t.value === '[') {
      this.next();
      const items: Expr[] = [];
      while (!this.at('OP', ']')) {
        if (this.at('EOF')) {
          throw new PySyntaxError('This opening [ was never closed.', t.line, t.col);
        }
        items.push(this.parseExpr());
        if (!this.accept('OP', ',')) break;
      }
      this.expect('OP', ']', 'This opening [ needs a matching ] to close it.');
      return { kind: 'List', items, line: t.line, col: t.col };
    }

    if (t.type === 'NEWLINE' || t.type === 'EOF') {
      throw new PySyntaxError(
        'This line is incomplete - Python reached the end of the line while still expecting a value.',
        t.line,
        t.col,
      );
    }

    if (t.type === 'OP' && t.value === '=') {
      throw new PySyntaxError(
        'Unexpected `=`. Use one `=` to store a value in a variable, and `==` to check whether two values are equal.',
        t.line,
        t.col,
      );
    }

    throw new PySyntaxError(`Python did not expect "${t.value}" here.`, t.line, t.col);
  }

  /** Parse the {expr} holes inside an f-string by re-tokenizing each hole. */
  private buildFString(t: Token): Expr {
    const raw = t.text ?? '';
    const parts: ({ text: string } | { expr: Expr; spec?: string })[] = [];
    let buf = '';
    let i = 0;

    while (i < raw.length) {
      const c = raw[i];
      if (c === '{' && raw[i + 1] === '{') { buf += '{'; i += 2; continue; }
      if (c === '}' && raw[i + 1] === '}') { buf += '}'; i += 2; continue; }
      if (c === '{') {
        if (buf) { parts.push({ text: buf }); buf = ''; }
        let depth = 1;
        let expr = '';
        i++;
        while (i < raw.length && depth > 0) {
          if (raw[i] === '{') depth++;
          else if (raw[i] === '}') { depth--; if (depth === 0) break; }
          expr += raw[i];
          i++;
        }
        if (depth !== 0) {
          throw new PySyntaxError('An f-string has a { without a matching }.', t.line, t.col);
        }
        i++; // consume }
        let spec: string | undefined;
        const colon = splitFormatSpec(expr);
        if (colon) { expr = colon.expr; spec = colon.spec; }
        const sub = new Parser(tokenize(expr.trim()));
        parts.push({ expr: sub.parseExpr(), spec });
        continue;
      }
      buf += c;
      i++;
    }
    if (buf) parts.push({ text: buf });
    return { kind: 'FString', parts, line: t.line, col: t.col };
  }
}

/** Split `value:.2f` into expression and format spec, ignoring colons in brackets. */
function splitFormatSpec(src: string): { expr: string; spec: string } | null {
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ':' && depth === 0) {
      return { expr: src.slice(0, i), spec: src.slice(i + 1) };
    }
  }
  return null;
}

export function parse(source: string): Module {
  return new Parser(tokenize(source)).parseModule();
}
