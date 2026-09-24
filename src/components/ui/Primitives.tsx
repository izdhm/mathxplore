/**
 * Shared interface primitives.
 *
 * Kept in one file because they are small, tightly related, and used on almost
 * every screen - splitting them would add imports without adding clarity.
 */

import { useCallback, type ReactNode, type ButtonHTMLAttributes, type HTMLAttributes, type MouseEvent, type CSSProperties } from 'react';
import { Icon, type IconName } from './Icon';
import { InfoDot, Tooltip } from './Tooltip';

type Domain = 'math' | 'code' | 'viz' | 'spark' | 'neutral';

const DOMAIN_TEXT: Record<Domain, string> = {
  math: 'text-math',
  code: 'text-code',
  viz: 'text-viz',
  spark: 'text-spark',
  neutral: 'text-muted',
};

const DOMAIN_BORDER: Record<Domain, string> = {
  math: 'border-math/35 bg-math/10',
  code: 'border-code/35 bg-code/10',
  viz: 'border-viz/35 bg-viz/10',
  spark: 'border-spark/35 bg-spark/10',
  neutral: 'border-line bg-surface-2',
};

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ------------------------------------------------------------------- panel

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  flush?: boolean;
  /** Rises toward the viewer on hover. */
  lift?: boolean;
  /** Tilts toward the cursor - for cards that are links. */
  tilt?: boolean;
  /** Hue of the hover glow. */
  glow?: Domain;
}

const DOMAIN_GLOW: Record<Domain, string> = {
  math: 'rgba(179,156,255,0.6)',
  code: 'rgba(62,230,168,0.55)',
  viz: 'rgba(76,201,255,0.6)',
  spark: 'rgba(255,200,61,0.55)',
  neutral: 'rgba(255,255,255,0.25)',
};

export function Panel({ children, flush, lift, tilt, glow = 'viz', className, style, ...rest }: PanelProps) {
  const tiltProps = useTilt(!!tilt);
  return (
    <div
      className={cx(flush ? 'panel-flush' : 'panel', lift && 'lift', tilt && 'tilt', className)}
      style={{ ['--glow' as string]: DOMAIN_GLOW[glow], ...style }}
      {...tiltProps}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Sets --rx/--ry from the cursor's position over the element so `.tilt` can
 * rotate it in perspective. Cheap: two custom properties per mousemove.
 */
export function useTilt(enabled = true, strength = 7) {
  const onMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${(x * strength).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-y * strength).toFixed(2)}deg`);
    },
    [enabled, strength],
  );
  const onMouseLeave = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
  }, []);
  return enabled ? { onMouseMove, onMouseLeave } : {};
}

interface PanelHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  domain?: Domain;
  right?: ReactNode;
  /** Shown inline. Use sparingly - prefer `info` so the panel stays quiet. */
  description?: ReactNode;
  /** Tucked into a tooltip beside the title. */
  info?: ReactNode;
  icon?: IconName;
}

const DOMAIN_CHIP: Record<Domain, string> = {
  math: 'border-math/30 bg-math/10 text-math',
  code: 'border-code/30 bg-code/10 text-code',
  viz: 'border-viz/30 bg-viz/10 text-viz',
  spark: 'border-spark/30 bg-spark/10 text-spark',
  neutral: 'border-line bg-surface-2 text-muted',
};

export function PanelHeader({
  eyebrow,
  title,
  domain = 'neutral',
  right,
  description,
  info,
  icon,
}: PanelHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span
            className={cx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
              DOMAIN_CHIP[domain],
            )}
          >
            <Icon name={icon} size={15} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <div className={cx('eyebrow', DOMAIN_TEXT[domain], 'opacity-90')}>{eyebrow}</div>}
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[14px] font-semibold text-paper">{title}</h3>
            {info && <InfoDot label={info} />}
          </div>
          {description && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ button

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'code' | 'ghost';
  children: ReactNode;
}

export function Button({ variant = 'ghost', className, children, ...rest }: ButtonProps) {
  return (
    <button className={cx('btn', `btn-${variant}`, className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * A round icon button with the label in a tooltip - the v2 control of choice.
 * The label is always in the DOM for assistive technology.
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  on?: boolean;
  tone?: Domain;
  size?: number;
}

export function IconButton({ icon, label, on, tone = 'viz', size = 16, className, style, ...rest }: IconButtonProps) {
  const tones: Record<Domain, string> = {
    math: 'var(--color-math)',
    code: 'var(--color-code)',
    viz: 'var(--color-viz)',
    spark: 'var(--color-spark)',
    neutral: 'var(--color-muted)',
  };
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={on}
        data-on={on ? 'true' : undefined}
        className={cx('icon-btn', className)}
        style={{ ['--tone' as string]: tones[tone], ...(style as CSSProperties) }}
        {...rest}
      >
        <Icon name={icon} size={size} />
      </button>
    </Tooltip>
  );
}

/** Progress as a ring. Shows a number in the middle, nothing else. */
export function Ring({
  value,
  domain = 'math',
  size = 44,
  className,
  label,
}: {
  value: number;
  domain?: Domain;
  size?: number;
  className?: string;
  label?: string;
}) {
  const tones: Record<Domain, string> = {
    math: 'var(--color-math)',
    code: 'var(--color-code)',
    viz: 'var(--color-viz)',
    spark: 'var(--color-spark)',
    neutral: 'var(--color-muted)',
  };
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const ring = (
    <span
      className={cx('ring', className)}
      style={{ ['--p' as string]: v, ['--tone' as string]: tones[domain], width: size, height: size }}
      role="img"
      aria-label={`${label ?? 'progress'} ${v}%`}
    >
      {v}
    </span>
  );
  return label ? <Tooltip label={label}>{ring}</Tooltip> : ring;
}

// ------------------------------------------------------------------- badge

export function Badge({
  children,
  domain = 'neutral',
  className,
}: {
  children: ReactNode;
  domain?: Domain;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        DOMAIN_BORDER[domain],
        DOMAIN_TEXT[domain],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------- meter

export function Meter({
  value,
  domain = 'math',
  className,
}: {
  value: number;
  domain?: Domain;
  className?: string;
}) {
  const fill: Record<Domain, string> = {
    math: 'bg-math',
    code: 'bg-code',
    viz: 'bg-viz',
    spark: 'bg-spark',
    neutral: 'bg-muted',
  };
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-700 ease-out', fill[domain])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// -------------------------------------------------------------------- stat

/**
 * A single readout. The explanation lives in a tooltip rather than a line of
 * small print, so a grid of six stats reads as six numbers instead of a wall.
 */
export function Stat({
  label,
  value,
  hint,
  domain = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  domain?: Domain;
}) {
  return (
    <div className="glass-chip px-3 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-1">
        <div className="eyebrow truncate">{label}</div>
        {hint && <InfoDot label={hint} />}
      </div>
      <div className={cx('mt-1 font-math text-lg leading-none', DOMAIN_TEXT[domain])}>{value}</div>
    </div>
  );
}

// --------------------------------------------------------- section heading

export function SectionHeading({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow mb-2 text-viz">{eyebrow}</div>}
        <h2 className="text-[22px] font-semibold tracking-tight text-paper sm:text-[26px]">{title}</h2>
        {description && <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>}
      </div>
      {right}
    </div>
  );
}

// ------------------------------------------------------- mathematical text

/**
 * Renders light mathematical notation without pulling in a full TeX engine:
 * `^` raises, `_` lowers, and single letters are set in italic as convention
 * requires. Handles everything the platform actually displays.
 */
export function MathExpr({ children, className }: { children: string; className?: string }) {
  const nodes: ReactNode[] = [];
  const src = children;
  let buf = '';
  let key = 0;

  const flush = () => {
    if (!buf) return;
    // Split so that letters render italic and everything else stays upright.
    const parts = buf.split(/([A-Za-z]+)/g).filter(Boolean);
    for (const p of parts) {
      nodes.push(
        /^[A-Za-z]+$/.test(p) && p.length <= 2 && !RESERVED.has(p)
          ? <i key={key++}>{p}</i>
          : <span key={key++} className="not-italic">{p}</span>,
      );
    }
    buf = '';
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '^' || c === '_') {
      flush();
      let content = '';
      if (src[i + 1] === '{') {
        i += 2;
        while (i < src.length && src[i] !== '}') content += src[i++];
      } else {
        content = src[++i] ?? '';
      }
      nodes.push(
        c === '^'
          ? <sup key={key++} className="text-[0.72em]">{content}</sup>
          : <sub key={key++} className="text-[0.72em]">{content}</sub>,
      );
      continue;
    }
    buf += c;
  }
  flush();

  return <span className={cx('math', className)}>{nodes}</span>;
}

/** Function names that should stay upright, as in printed mathematics. */
const RESERVED = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'if', 'to']);

// ------------------------------------------------------------------ arrows

export function FlowArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx('h-4 w-4 shrink-0 text-faint', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- empty UI

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 px-6 py-12 text-center">
      <span className="glass-chip flex h-12 w-12 items-center justify-center rounded-full text-faint animate-float">
        <Icon name={icon} size={20} />
      </span>
      <div className="text-[13.5px] font-medium text-muted">{title}</div>
      {hint && <div className="max-w-xs text-[12px] leading-relaxed text-faint">{hint}</div>}
    </div>
  );
}
