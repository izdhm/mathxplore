/**
 * MathXplore Python Engine - Tokenizer
 *
 * Converts Python source into a token stream, including the significant
 * INDENT / DEDENT tokens that give Python its block structure.
 *
 * The tokenizer is deliberately opinionated about the things students get
 * wrong (smart quotes pasted from slides, `2x`, `^` for powers) so that the
 * error layer can turn those failures into teaching moments rather than
 * stack traces.
 */

export type TokenType =
  | 'NAME'
  | 'NUMBER'
  | 'STRING'
  | 'OP'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number; // 1-based
  col: number; // 0-based
  /** For NUMBER tokens: true when the literal is a float (has `.` or an exponent). */
  isFloat?: boolean;
  /** For STRING tokens: the decoded contents. */
  text?: string;
  /** For STRING tokens: true when written as an f-string. */
  isFString?: boolean;
}

export class PyTokenError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly col: number,
  ) {
    super(message);
    this.name = 'PyTokenError';
  }
}

export const KEYWORDS = new Set([
  'and', 'as', 'break', 'continue', 'def', 'elif', 'else', 'False', 'for',
  'from', 'if', 'import', 'in', 'is', 'None', 'not', 'or', 'pass', 'return',
  'True', 'while',
]);

/** Multi-character operators first, so greedy matching works. */
const OPERATORS = [
  '**=', '//=', '==', '!=', '<=', '>=', '**', '//', '+=', '-=', '*=', '/=',
  '%=', '->',
  '+', '-', '*', '/', '%', '=', '<', '>', '(', ')', '[', ']', '{', '}',
  ',', ':', '.',
];

const SMART_QUOTES: Record<string, string> = {
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
};

const NBSP = ' ';

const isDigit = (c: string) => c >= '0' && c <= '9';
const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);

export function tokenize(source: string): Token[] {
  // Normalise line endings and the invisible characters that break pasted code.
  const src = source.replace(/\r\n?/g, '\n').split(NBSP).join(' ');
  const lines = src.split('\n');

  const tokens: Token[] = [];
  const indents: number[] = [0];
  let depth = 0; // bracket nesting - newlines inside brackets are not significant

  const push = (t: Token) => tokens.push(t);

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const lineNo = li + 1;

    // ---- Indentation (only meaningful at bracket depth 0) -------------------
    let i = 0;
    let indent = 0;
    if (depth === 0) {
      while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) {
        indent += raw[i] === '\t' ? 4 : 1;
        i++;
      }
      const rest = raw.slice(i);
      // Blank lines and comment-only lines never change indentation.
      if (rest.trim() === '' || rest.trimStart().startsWith('#')) continue;

      if (indent > indents[indents.length - 1]) {
        indents.push(indent);
        push({ type: 'INDENT', value: '', line: lineNo, col: i });
      } else {
        while (indent < indents[indents.length - 1]) {
          indents.pop();
          push({ type: 'DEDENT', value: '', line: lineNo, col: i });
        }
        if (indent !== indents[indents.length - 1]) {
          throw new PyTokenError(
            'This line does not line up with any block above it. Check the spaces at the start of the line.',
            lineNo,
            i,
          );
        }
      }
    } else {
      while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i++;
    }

    // ---- Tokens on this line -------------------------------------------------
    while (i < raw.length) {
      let c = raw[i];

      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '#') break; // rest of the line is a comment
      if (c === '\\' && i === raw.length - 1) { i++; break; } // line continuation

      // Normalise smart quotes copied from documents and slides.
      if (SMART_QUOTES[c]) c = SMART_QUOTES[c];

      // ---- Strings ----------------------------------------------------------
      const startsString =
        c === '"' || c === "'" ||
        ((c === 'f' || c === 'F') && (raw[i + 1] === '"' || raw[i + 1] === "'"));

      if (startsString) {
        const isF = c === 'f' || c === 'F';
        const startCol = i;
        if (isF) i++;
        const quote = SMART_QUOTES[raw[i]] ?? raw[i];
        i++;
        let text = '';
        let closed = false;
        while (i < raw.length) {
          const ch = raw[i];
          const norm = SMART_QUOTES[ch] ?? ch;
          if (ch === '\\' && i + 1 < raw.length) {
            const n = raw[i + 1];
            text += n === 'n' ? '\n' : n === 't' ? '\t' : n;
            i += 2;
            continue;
          }
          if (norm === quote) { i++; closed = true; break; }
          text += ch;
          i++;
        }
        if (!closed) {
          throw new PyTokenError(
            `This text is missing its closing ${quote} quote mark.`,
            lineNo,
            startCol,
          );
        }
        push({
          type: 'STRING',
          value: raw.slice(startCol, i),
          text,
          isFString: isF,
          line: lineNo,
          col: startCol,
        });
        continue;
      }

      // ---- Numbers ------------------------------------------------------------
      if (isDigit(c) || (c === '.' && isDigit(raw[i + 1] ?? ''))) {
        const start = i;
        let isFloat = false;
        while (i < raw.length && isDigit(raw[i])) i++;
        if (raw[i] === '.' && isDigit(raw[i + 1] ?? '')) {
          isFloat = true;
          i++;
          while (i < raw.length && isDigit(raw[i])) i++;
        } else if (raw[i] === '.' && !isIdentStart(raw[i + 1] ?? '')) {
          isFloat = true;
          i++;
        }
        if (raw[i] === 'e' || raw[i] === 'E') {
          const save = i;
          i++;
          if (raw[i] === '+' || raw[i] === '-') i++;
          if (isDigit(raw[i] ?? '')) {
            isFloat = true;
            while (i < raw.length && isDigit(raw[i])) i++;
          } else {
            i = save;
          }
        }
        const value = raw.slice(start, i);
        // `2x` - the classic maths-to-Python slip. Catch it precisely, here.
        if (isIdentStart(raw[i] ?? '')) {
          const name = raw.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0] ?? raw[i];
          throw new PyTokenError(
            `Python cannot read "${value}${name}". In maths, ${value}${name} means ` +
              `${value} times ${name} - but Python always needs the multiplication ` +
              `sign written out: ${value}*${name}`,
            lineNo,
            start,
          );
        }
        push({ type: 'NUMBER', value, isFloat, line: lineNo, col: start });
        continue;
      }

      // ---- Names and keywords ---------------------------------------------------
      if (isIdentStart(c)) {
        const start = i;
        while (i < raw.length && isIdentPart(raw[i])) i++;
        push({ type: 'NAME', value: raw.slice(start, i), line: lineNo, col: start });
        continue;
      }

      // ---- Operators -------------------------------------------------------------
      const op = OPERATORS.find((o) => raw.startsWith(o, i));
      if (op) {
        if ('([{'.includes(op)) depth++;
        if (')]}'.includes(op)) depth = Math.max(0, depth - 1);
        push({ type: 'OP', value: op, line: lineNo, col: i });
        i += op.length;
        continue;
      }

      if (c === '^') {
        throw new PyTokenError(
          'In Python, `^` does not mean "to the power of". Use `**` instead - for example x**2 for x squared.',
          lineNo,
          i,
        );
      }
      if (c === '×') {
        throw new PyTokenError(
          'Python uses `*` for multiplication, not the maths symbol ×.',
          lineNo,
          i,
        );
      }
      throw new PyTokenError(`Python does not understand the character "${c}".`, lineNo, i);
    }

    if (depth === 0) {
      const last = tokens[tokens.length - 1];
      if (last && last.type !== 'NEWLINE' && last.type !== 'INDENT' && last.type !== 'DEDENT') {
        push({ type: 'NEWLINE', value: '', line: lineNo, col: raw.length });
      }
    }
  }

  if (depth > 0) {
    throw new PyTokenError(
      'A bracket was opened but never closed. Check that every ( has a matching ).',
      lines.length,
      0,
    );
  }

  const endLine = lines.length;
  while (indents.length > 1) {
    indents.pop();
    push({ type: 'DEDENT', value: '', line: endLine, col: 0 });
  }
  push({ type: 'EOF', value: '', line: endLine, col: 0 });
  return tokens;
}
