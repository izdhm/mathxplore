/**
 * What If? - MathXplore's signature interaction.
 *
 * The sequence is deliberate and always the same:
 *
 *   ASK → PREDICT → CHANGE → SEE → EXPLAIN → CODE
 *
 * The prediction step is the whole point. A student who has committed to an
 * answer before the graph moves is no longer watching an animation; they are
 * testing a belief, and a wrong prediction is the moment the concept actually
 * lands. So the reveal is locked until a prediction is made, and a wrong
 * prediction is treated as progress rather than failure.
 */

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Panel, cx } from '../ui/Primitives';
import { useProgress, type TopicId } from '../../state/progress';

export interface WhatIfScenario {
  id: string;
  topic: TopicId;
  /** Which parameter moves, in mathematical notation. */
  parameter: string;
  question: string;
  from: number;
  to: number;
  options: { id: string; label: string; correct: boolean }[];
  /** What actually happened, and why. */
  explanation: string;
  /** The idea this connects to. */
  concept: string;
  /** The same change, expressed in Python. */
  python: string;
}

interface Props {
  scenario: WhatIfScenario;
  /** Called on every animation frame with the parameter's current value. */
  onValue: (v: number) => void;
  /** Called with the "before" value so the module can draw a ghost curve. */
  onGhost: (v: number | null) => void;
  className?: string;
}

type Phase = 'ask' | 'revealing' | 'revealed';

const DURATION = 1500;

export function WhatIfPanel({ scenario, onValue, onGhost, className }: Props) {
  const { recordPrediction } = useProgress();
  const [phase, setPhase] = useState<Phase>('ask');
  const [picked, setPicked] = useState<string | null>(null);
  const rafRef = useRef(0);

  // Reset whenever the scenario changes.
  useEffect(() => {
    setPhase('ask');
    setPicked(null);
    onGhost(null);
    onValue(scenario.from);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  const chosen = scenario.options.find((o) => o.id === picked);
  const wasRight = !!chosen?.correct;

  const reveal = () => {
    if (!picked || !chosen) return;
    recordPrediction(scenario.id, chosen.label, chosen.correct, scenario.topic);
    setPhase('revealing');
    onGhost(scenario.from);

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Ease in and out, so the change reads as a transformation not a jump.
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      onValue(scenario.from + (scenario.to - scenario.from) * e);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else setPhase('revealed');
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const again = () => {
    cancelAnimationFrame(rafRef.current);
    setPhase('ask');
    setPicked(null);
    onGhost(null);
    onValue(scenario.from);
  };

  return (
    <Panel className={cx('overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line bg-spark/8 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-spark">◈</span>
          <span className="text-[13px] font-semibold tracking-tight text-paper">What If?</span>
        </div>
        <Badge domain="spark">predict first</Badge>
      </div>

      <div className="space-y-3.5 p-4">
        <p className="text-[14px] leading-relaxed text-paper">{scenario.question}</p>

        {/* ---- Step 1: commit to a prediction ----------------------------- */}
        <div className="space-y-1.5">
          <div className="eyebrow">Your prediction</div>
          {scenario.options.map((o) => {
            const isPicked = picked === o.id;
            const settled = phase === 'revealed';
            return (
              <button
                key={o.id}
                disabled={phase !== 'ask'}
                onClick={() => setPicked(o.id)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition-all',
                  settled && o.correct && 'border-code/60 bg-code/12 text-paper',
                  settled && isPicked && !o.correct && 'border-danger/60 bg-danger/12 text-paper',
                  settled && !isPicked && !o.correct && 'border-line text-faint opacity-55',
                  !settled && isPicked && 'border-spark/70 bg-spark/10 text-paper',
                  !settled && !isPicked && 'border-line bg-surface/50 text-muted hover:border-spark/40 hover:text-paper',
                  phase === 'ask' ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span
                  className={cx(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]',
                    isPicked ? 'border-spark bg-spark text-ink' : 'border-faint',
                  )}
                >
                  {settled && o.correct ? '✓' : settled && isPicked ? '×' : isPicked ? '●' : ''}
                </span>
                <span className="leading-snug">{o.label}</span>
              </button>
            );
          })}
        </div>

        {/* ---- Step 2: run the experiment ---------------------------------- */}
        {phase === 'ask' && (
          <Button
            variant="primary"
            disabled={!picked}
            onClick={reveal}
            className={cx('w-full', picked && 'pulse-ring')}
          >
            {picked ? 'Lock in and see what happens' : 'Choose a prediction first'}
          </Button>
        )}

        {phase === 'revealing' && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-viz/30 bg-viz/8 py-2.5 text-[12.5px] text-viz">
            <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-viz" />
            watching <span className="math not-italic">{scenario.parameter}</span> move from{' '}
            {scenario.from} to {scenario.to}
          </div>
        )}

        {/* ---- Step 3: the explanation ------------------------------------- */}
        {phase === 'revealed' && (
          <div className="animate-rise space-y-3">
            <div
              className={cx(
                'rounded-lg border px-3 py-2.5',
                wasRight ? 'border-code/40 bg-code/10' : 'border-math/40 bg-math/10',
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className={wasRight ? 'text-code' : 'text-math'}>{wasRight ? '✓' : '↻'}</span>
                <span className="text-[13px] font-semibold text-paper">
                  {wasRight ? 'Your prediction was right' : 'Not what you expected'}
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-muted">
                {wasRight
                  ? 'You already understood this relationship. Now check that you can explain why.'
                  : 'This is the useful moment - the graph has just shown you something your intuition did not. Read what happened, then try the next one.'}
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface/60 px-3 py-2.5">
              <div className="eyebrow mb-1 text-viz">What happened</div>
              <p className="text-[13px] leading-relaxed text-paper/90">{scenario.explanation}</p>
            </div>

            <div className="rounded-lg border border-math/25 bg-math/8 px-3 py-2.5">
              <div className="eyebrow mb-1 text-math">The concept</div>
              <p className="text-[12.5px] leading-relaxed text-paper/85">{scenario.concept}</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-code/25 bg-code/6">
              <div className="border-b border-code/20 px-3 py-1.5">
                <span className="eyebrow text-code">The same change in Python</span>
              </div>
              <pre className="code-surface overflow-x-auto px-3 py-2.5 text-[12.5px] text-paper/90">
                {scenario.python}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button onClick={again} className="flex-1">
                Try again
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  cancelAnimationFrame(rafRef.current);
                  onGhost(null);
                  onValue(scenario.to);
                }}
                className="flex-1"
              >
                Keep this value
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
