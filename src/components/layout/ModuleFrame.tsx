/**
 * ModuleFrame - the shared three-column workspace used by every Explore module.
 *
 * Controls on the left, the mathematics in the centre, What If? and the Python
 * connection on the right. The arrangement is fixed across modules on purpose:
 * once a student has learned where things are, that knowledge should carry to
 * every other topic.
 *
 * The header is the equation. The module's name is a small label above it and
 * everything that merely explains sits behind the info dot.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MathExpr, cx } from '../ui/Primitives';
import { Icon } from '../ui/Icon';
import { InfoDot, Tooltip } from '../ui/Tooltip';
import { LoopRibbon, type LoopStage } from './LoopRibbon';

interface Props {
  eyebrow: string;
  title: string;
  equation: string;
  description: string;
  loop: LoopStage[];
  controls: ReactNode;
  graph: ReactNode;
  aside: ReactNode;
  /** Full-width content below the three columns. */
  below?: ReactNode;
  nextTo?: string;
  nextLabel?: string;
  /** Wider centre column - for modules whose picture is the point. */
  wide?: boolean;
}

export function ModuleFrame({
  eyebrow,
  title,
  equation,
  description,
  loop,
  controls,
  graph,
  aside,
  below,
  nextTo,
  nextLabel,
  wide,
}: Props) {
  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <LoopRibbon active={loop} />
        {nextTo && (
          <Tooltip label={nextLabel ?? 'Next'}>
            <Link to={nextTo} className="icon-btn" aria-label={nextLabel ?? 'Next'}>
              <Icon name="arrowRight" size={16} />
            </Link>
          </Tooltip>
        )}
      </div>

      <header className="mb-5 flex flex-wrap items-end gap-x-5 gap-y-2">
        <div>
          <div className="eyebrow mb-1 text-viz">{eyebrow}</div>
          <div className="flex items-center gap-3">
            <MathExpr className="math-glow text-[30px] leading-none text-math sm:text-[36px]">{equation}</MathExpr>
            <InfoDot label={description} icon="info" />
          </div>
          <h1 className="sr-only">{title}</h1>
        </div>
      </header>

      <div
        className={cx(
          'grid gap-4',
          wide
            ? 'lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1.6fr)_minmax(0,1fr)]'
            : 'lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_360px]',
        )}
      >
        <div className="order-2 space-y-4 lg:order-1">{controls}</div>
        <div className="order-1 min-w-0 space-y-4 lg:order-2">{graph}</div>
        <div className="order-3 space-y-4 lg:col-span-2 xl:col-span-1">{aside}</div>
      </div>

      {below && <div className="mt-4">{below}</div>}
    </div>
  );
}
