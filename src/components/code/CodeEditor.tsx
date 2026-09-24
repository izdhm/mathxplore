/**
 * CodeEditor - the writing surface in CodeLab.
 *
 * Deliberately not a professional IDE. A beginner meeting Python for the first
 * time does not need a file tree, a minimap or IntelliSense; they need to see
 * their code clearly, know which line broke, and be able to type an indented
 * block without fighting the keyboard. So: syntax colour, line numbers, a
 * marked error line, Tab that inserts spaces, and automatic indentation after
 * a colon - and nothing else.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { cx } from '../ui/Primitives';

const KEYWORDS = new Set([
  'and', 'as', 'break', 'continue', 'def', 'elif', 'else', 'False', 'for',
  'from', 'if', 'import', 'in', 'is', 'None', 'not', 'or', 'pass', 'return',
  'True', 'while',
]);

const BUILTINS = new Set([
  'print', 'range', 'len', 'abs', 'round', 'min', 'max', 'sum', 'int', 'float',
  'str', 'bool', 'list', 'sorted', 'reversed', 'enumerate', 'zip', 'type',
  'plot', 'scatter', 'linspace', 'show', 'math', 'input',
  // The shapes and turtle libraries
  'shapes', 'turtle', 'circle', 'ellipse', 'square', 'rect', 'rectangle', 'triangle',
  'polygon', 'star', 'line', 'path', 'point', 'cube', 'box', 'sphere', 'cylinder',
  'cone', 'pyramid', 'prism', 'torus', 'forward', 'backward', 'left', 'right',
  'penup', 'pendown', 'goto', 'color', 'begin_fill', 'end_fill', 'Turtle',
]);

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** 1-based line to mark as the source of an error. */
  errorLine?: number;
  readOnly?: boolean;
  minRows?: number;
  className?: string;
  ariaLabel?: string;
}

export function CodeEditor({
  value,
  onChange,
  errorLine,
  readOnly,
  minRows = 10,
  className,
  ariaLabel = 'Python code editor',
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const rows = Math.max(minRows, lines.length);

  // Keep the highlight layer and gutter aligned with the textarea's scroll.
  const syncScroll = () => {
    if (!taRef.current) return;
    const { scrollTop, scrollLeft } = taRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
  };

  // Wrapped rather than passed directly, so the effect can never accidentally
  // hand a return value to React as a clean-up function.
  useLayoutEffect(() => {
    syncScroll();
  }, [value]);
  useEffect(() => {
    syncScroll();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;

    // Tab inserts four spaces; Shift+Tab removes them.
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en } = ta;
      if (e.shiftKey) {
        const lineStart = value.lastIndexOf('\n', s - 1) + 1;
        const removed = value.slice(lineStart, lineStart + 4).match(/^ {1,4}/)?.[0];
        if (removed) {
          const next = value.slice(0, lineStart) + value.slice(lineStart + removed.length);
          onChange(next);
          queueMicrotask(() => ta.setSelectionRange(s - removed.length, en - removed.length));
        }
        return;
      }
      const next = `${value.slice(0, s)}    ${value.slice(en)}`;
      onChange(next);
      queueMicrotask(() => ta.setSelectionRange(s + 4, s + 4));
      return;
    }

    // Enter keeps the current indentation, and adds a level after a colon.
    if (e.key === 'Enter') {
      const s = ta.selectionStart;
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const current = value.slice(lineStart, s);
      const indent = current.match(/^[ \t]*/)?.[0] ?? '';
      const extra = current.trimEnd().endsWith(':') ? '    ' : '';
      if (indent || extra) {
        e.preventDefault();
        const insert = `\n${indent}${extra}`;
        const next = value.slice(0, s) + insert + value.slice(ta.selectionEnd);
        onChange(next);
        const caret = s + insert.length;
        queueMicrotask(() => ta.setSelectionRange(caret, caret));
      }
    }
  };

  return (
    <div className={cx('code-frame relative flex overflow-hidden rounded-lg', className)}>
      {/* Line numbers */}
      <div
        ref={gutterRef}
        className="code-surface code-gutter select-none overflow-hidden py-3 text-right"
        style={{ minWidth: 42 }}
        aria-hidden
      >
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className={cx(
              'px-2',
              errorLine === i + 1 && 'bg-danger/20 font-semibold text-danger',
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="relative flex-1">
        {/* Highlight layer */}
        <pre
          ref={preRef}
          aria-hidden
          className="code-surface pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-3 py-3"
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={cx(
                '-mx-3 px-3',
                errorLine === i + 1 && 'bg-danger/12 shadow-[inset_2px_0_0_0_var(--color-danger)]',
              )}
            >
              {highlight(line)}
              {'\n'}
            </div>
          ))}
        </pre>

        {/* Input layer: transparent text, visible caret */}
        <textarea
          ref={taRef}
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          className="code-surface code-caret relative block w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 text-transparent outline-none"
          style={{ minHeight: `${rows * 1.65 * 13.5 + 24}px` }}
        />
      </div>
    </div>
  );
}

/** Regex-based colouring - display only, so it need not match the real parser. */
function highlight(line: string) {
  const out: React.ReactNode[] = [];
  let key = 0;

  const commentAt = findCommentStart(line);
  const code = commentAt === -1 ? line : line.slice(0, commentAt);
  const comment = commentAt === -1 ? '' : line.slice(commentAt);

  const pattern =
    /("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(\b\d+\.?\d*\b)|(\b[A-Za-z_]\w*\b)|([+\-*/%=<>!(),:[\].]+)|(\s+)/g;

  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = pattern.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    last = pattern.lastIndex;
    const [text, str, num, word, op, space] = m;

    if (str) out.push(<span key={key++} className="tok-str">{text}</span>);
    else if (num) out.push(<span key={key++} className="tok-num">{text}</span>);
    else if (word) {
      const after = code.slice(pattern.lastIndex);
      const isCall = /^\s*\(/.test(after);
      const isDef = code.slice(0, m.index).trimEnd().endsWith('def');
      const cls =
        KEYWORDS.has(word) ? 'tok-kw'
        : isDef ? 'tok-def'
        : BUILTINS.has(word) ? 'tok-builtin'
        : isCall ? 'tok-fn'
        : '';
      out.push(cls ? <span key={key++} className={cls}>{text}</span> : text);
    } else if (op) out.push(<span key={key++} className="tok-op">{text}</span>);
    else if (space) out.push(text);
  }
  if (last < code.length) out.push(code.slice(last));
  if (comment) out.push(<span key={key++} className="tok-com">{comment}</span>);

  return out.length ? out : ' ';
}

/** The first `#` that is not inside a string literal. */
function findCommentStart(line: string): number {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '#') return i;
  }
  return -1;
}
