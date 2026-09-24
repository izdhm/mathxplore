/**
 * CodeMathMap - showing that mathematical notation and Python are two ways of
 * writing the same thing.
 *
 * Students meet `x**2` as unfamiliar syntax to memorise. Pointing at x² and
 * seeing `x**2` light up at the same instant reframes it: not a new thing to
 * learn, a different spelling of a thing already known. Each linked pair also
 * carries a note explaining why the two notations differ, because the
 * differences are never arbitrary.
 */

import { useState } from 'react';
import { MathExpr, cx } from '../ui/Primitives';

export interface Segment {
  text: string;
  /** Segments sharing a pair id highlight together. */
  pair?: string;
}

export interface Pairing {
  id: string;
  note: string;
}

interface Props {
  maths: Segment[];
  python: Segment[];
  pairings: Pairing[];
  title?: string;
  className?: string;
}

export function CodeMathMap({ maths, python, pairings, title, className }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const note = pairings.find((p) => p.id === active)?.note;

  const segment = (s: Segment, i: number, kind: 'maths' | 'python') => {
    if (!s.pair) {
      return kind === 'maths' ? (
        <MathExpr key={i}>{s.text}</MathExpr>
      ) : (
        <span key={i}>{s.text}</span>
      );
    }
    const on = active === s.pair;
    return (
      <button
        key={i}
        onMouseEnter={() => setActive(s.pair!)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(s.pair!)}
        onBlur={() => setActive(null)}
        onClick={() => setActive((a) => (a === s.pair ? null : s.pair!))}
        className={cx(
          'rounded px-0.5 transition-all duration-150',
          on
            ? 'bg-spark/25 text-spark ring-1 ring-spark/50'
            : 'bg-paper/6 hover:bg-paper/12',
        )}
      >
        {kind === 'maths' ? <MathExpr>{s.text}</MathExpr> : s.text}
      </button>
    );
  };

  return (
    <div className={cx('overflow-hidden rounded-lg border border-line bg-surface/50', className)}>
      {title && (
        <div className="border-b border-line px-4 py-2">
          <span className="eyebrow">{title}</span>
        </div>
      )}

      <div className="grid gap-px bg-line sm:grid-cols-2">
        <div className="bg-surface px-4 py-3.5">
          <div className="eyebrow mb-2 text-math">Mathematics</div>
          <div className="math-display flex flex-wrap items-baseline text-paper">
            {maths.map((s, i) => segment(s, i, 'maths'))}
          </div>
        </div>

        <div className="bg-surface px-4 py-3.5">
          <div className="eyebrow mb-2 text-code">Python</div>
          <pre className="code-surface whitespace-pre-wrap text-[14px] text-paper">
            {python.map((s, i) => segment(s, i, 'python'))}
          </pre>
        </div>
      </div>

      <div
        className={cx(
          'border-t border-line px-4 py-2.5 text-[12.5px] leading-relaxed transition-colors',
          note ? 'bg-spark/8 text-paper/90' : 'text-faint',
        )}
      >
        {note ?? 'Point at any highlighted piece to see how the two notations line up.'}
      </div>
    </div>
  );
}
