/**
 * LoopRibbon - the learning loop, made visible.
 *
 * Nine nodes on a line. The stage a student is in glows and carries its name;
 * every other stage is a dot whose name is one hover away. The loop stays in
 * the interface without adding a sentence to it.
 */

import { Link } from 'react-router-dom';
import { cx } from '../ui/Primitives';
import { Tooltip } from '../ui/Tooltip';

export const LOOP_STAGES = [
  { id: 'learn', label: 'Learn', to: '/learn' },
  { id: 'explore', label: 'Explore', to: '/explore' },
  { id: 'predict', label: 'Predict', to: '/explore/quadratic' },
  { id: 'change', label: 'Change', to: '/explore/quadratic' },
  { id: 'visualise', label: 'Visualise', to: '/explore/geometry' },
  { id: 'code', label: 'Code', to: '/codelab' },
  { id: 'test', label: 'Test', to: '/challenges' },
  { id: 'understand', label: 'Understand', to: '/progress' },
  { id: 'create', label: 'Create', to: '/sandbox' },
] as const;

export type LoopStage = (typeof LOOP_STAGES)[number]['id'];

export function LoopRibbon({
  active,
  className,
}: {
  active: LoopStage | LoopStage[];
  className?: string;
}) {
  const on = Array.isArray(active) ? active : [active];

  return (
    <nav aria-label="Learning loop" className={cx('flex min-w-0 max-w-full items-center overflow-x-auto', className)}>
      <ol className="glass-chip flex shrink-0 items-center gap-0 rounded-full px-3 py-1.5">
        {LOOP_STAGES.map((stage, i) => {
          const isOn = on.includes(stage.id);
          return (
            <li key={stage.id} className="flex items-center">
              <Tooltip label={stage.label}>
                <Link
                  to={stage.to}
                  aria-current={isOn ? 'step' : undefined}
                  className={cx(
                    'group flex items-center gap-1.5 rounded-full px-1.5 py-1 transition-all',
                    isOn ? 'text-viz' : 'text-faint hover:text-muted',
                  )}
                >
                  <span
                    className={cx(
                      'block rounded-full transition-all duration-300',
                      isOn
                        ? 'h-2.5 w-2.5 bg-viz shadow-[0_0_14px_2px_rgba(76,201,255,0.55)]'
                        : 'h-1.5 w-1.5 bg-faint/60 group-hover:bg-muted',
                    )}
                  />
                  <span className={cx('text-[10.5px] font-semibold uppercase tracking-[0.14em]', isOn ? 'inline' : 'sr-only')}>
                    {stage.label}
                  </span>
                </Link>
              </Tooltip>
              {i < LOOP_STAGES.length - 1 && (
                <span className={cx('mx-0.5 h-px w-3 sm:w-4', isOn ? 'bg-viz/40' : 'bg-line')} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
