/**
 * Tooltip - the mechanism that lets the interface stay quiet.
 *
 * The explanations in this platform are worth keeping; what they should not do
 * is fill the screen before anyone has asked for them. So the default view is
 * visual, and the words sit one hover (or one tap) away.
 *
 * Two details make this honest rather than merely tidy:
 *
 *   - The text is always present in the DOM inside a screen-reader-only span,
 *     so hiding it visually never hides it from assistive technology.
 *   - The floating panel is portalled to <body> and positioned in viewport
 *     coordinates, so it is never clipped by the `overflow-hidden` panels it
 *     usually lives inside.
 *
 * Touch is handled by treating the trigger as a button: tapping toggles it.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { cx } from './Primitives';

interface Props {
  /** The explanation. Kept short - a tooltip is not a paragraph. */
  label: ReactNode;
  children: ReactNode;
  /** Plain-text mirror for screen readers when `label` is rich content. */
  srLabel?: string;
  className?: string;
}

export function Tooltip({ label, children, srLabel, className }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, above: true });
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  const place = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Flip below when there is not enough room above.
    const above = r.top > 120;
    setPos({ x: r.left + r.width / 2, y: above ? r.top - 8 : r.bottom + 8, above });
    setOpen(true);
  };

  // Dismiss on scroll or Escape - a tooltip should never outlive its anchor.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={cx('relative inline-flex items-center', className)}
      onMouseEnter={place}
      onMouseLeave={() => setOpen(false)}
      onFocus={place}
      onBlur={() => setOpen(false)}
      onClick={() => (open ? setOpen(false) : place())}
      aria-describedby={id}
    >
      {children}

      {/* Always in the DOM: hidden from sight, not from screen readers. */}
      <span id={id} className="sr-only">
        {srLabel ?? (typeof label === 'string' ? label : '')}
      </span>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            className={cx(
              'glass-chip pointer-events-none fixed z-[100] block max-w-[260px] -translate-x-1/2',
              'px-3 py-2 text-[12px] leading-relaxed text-paper animate-fade',
              pos.above ? '-translate-y-full' : '',
            )}
            style={{ left: pos.x, top: pos.y }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}

/**
 * The small "i" that replaces a paragraph of explanatory text.
 * Deliberately low-contrast until hovered: present, but not competing.
 */
export function InfoDot({
  label,
  srLabel,
  icon = 'info',
  className,
}: {
  label: ReactNode;
  srLabel?: string;
  icon?: IconName;
  className?: string;
}) {
  return (
    <Tooltip label={label} srLabel={srLabel}>
      <button
        type="button"
        aria-label="More information"
        className={cx(
          'flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border border-transparent',
          'text-faint/80 transition-all hover:border-line hover:bg-surface-2 hover:text-viz',
          className,
        )}
      >
        <Icon name={icon} size={13} />
      </button>
    </Tooltip>
  );
}
