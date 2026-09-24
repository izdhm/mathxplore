/**
 * ParameterSlider - the core instrument of the Explore modules.
 *
 * A slider here is not a form control; it is the tool a student uses to run an
 * experiment. So it shows the live value in mathematical notation, remembers
 * its starting point for one-click reset, and can be nudged precisely with the
 * arrow keys for students who need exact values.
 */

import { useId } from 'react';
import { cx, MathExpr } from './Primitives';
import { InfoDot } from './Tooltip';
import { fmt } from '../../lib/math/functions';

const THUMB: Record<string, string> = {
  math: 'var(--color-math)',
  code: 'var(--color-code)',
  viz: 'var(--color-viz)',
  spark: 'var(--color-spark)',
};

interface Props {
  symbol: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  domain?: 'math' | 'code' | 'viz' | 'spark';
  /** Short note explaining what this parameter controls. */
  meaning?: string;
  /** Highlights the slider - used by What If? to point at the parameter. */
  focus?: boolean;
  disabled?: boolean;
}

export function ParameterSlider({
  symbol,
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  domain = 'viz',
  meaning,
  focus,
  disabled,
}: Props) {
  const id = useId();

  return (
    <div
      className={cx(
        'glass-chip px-3 py-2.5 transition-all',
        focus && 'border-spark/60 shadow-[0_0_28px_-8px_rgba(255,200,61,0.7)]',
        disabled && 'opacity-50',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {/* The info button sits beside the label rather than inside it: a
            <label> forwards clicks to its control, so nesting it there would
            make asking a question also grab the slider. */}
        <div className="flex min-w-0 items-center gap-1.5">
          <label htmlFor={id} className="flex min-w-0 items-center gap-1.5 truncate">
            <MathExpr className="text-[17px] leading-none">{symbol}</MathExpr>
            <span className="truncate text-[11.5px] text-faint">{label}</span>
          </label>
          {meaning && <InfoDot label={meaning} />}
        </div>
        <output
          htmlFor={id}
          className="font-math text-[17px] leading-none tabular-nums"
          style={{ color: THUMB[domain] }}
        >
          {fmt(value, 2)}
        </output>
      </div>

      <input
        id={id}
        type="range"
        className="mx-slider"
        style={{ ['--thumb' as string]: THUMB[domain] }}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`${label} (${symbol})`}
      />
    </div>
  );
}
