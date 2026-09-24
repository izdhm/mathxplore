/**
 * Fullscreen - the real thing, via the Fullscreen API.
 *
 * Any visualisation frame can be taken to the whole screen with one button;
 * Escape (or the same button) brings it back. While an element is fullscreen
 * the browser forces it to fill the viewport, so the canvases inside only
 * need to re-measure their box - see the ResizeObservers in the renderers.
 */

import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { IconButton, cx } from './Primitives';

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    setActive(!!ref.current && document.fullscreenElement === ref.current);
  }, [ref]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [sync]);

  // The state is read back from the document both when the change event fires
  // and when the request itself settles, so a missed event (some embedded and
  // headless browsers) cannot leave the button out of step with the screen.
  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen().then(sync, sync);
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().then(sync, () => {
        /* denied - e.g. inside a sandboxed iframe; nothing to do */
      });
    }
  }, [ref, sync]);

  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  return { active, toggle, supported };
}

export function FullscreenButton({
  active,
  onClick,
  className,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  const label = active ? 'Exit full screen' : 'Full screen';
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cx(
          'glass-chip flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-paper',
          className,
        )}
      >
        <Icon name={active ? 'shrink' : 'fit'} size={13} />
      </button>
    </Tooltip>
  );
}

/**
 * A frame that can go fullscreen, with the button in its corner. Used around
 * the WebGL views, which manage their own canvas and cannot host the button
 * themselves. `overlay` - typically the module's sliders - is shown inside the
 * frame while it is fullscreen, so an experiment can continue at full size.
 */
export function FullscreenFrame({
  children,
  className,
  frameRef,
  overlay,
}: {
  children: ReactNode;
  className?: string;
  frameRef: RefObject<HTMLDivElement | null>;
  overlay?: ReactNode;
}) {
  const { active, toggle, supported } = useFullscreen(frameRef);
  const [overlayOpen, setOverlayOpen] = useState(true);
  return (
    <div ref={frameRef} className={cx('relative', className)}>
      {children}
      {supported && (
        <div className="absolute right-2 top-2 z-30 flex items-center gap-1">
          {active && overlay && (
            <IconButton
              icon="sliders"
              label={overlayOpen ? 'Hide controls' : 'Show controls'}
              on={overlayOpen}
              size={13}
              className="h-7 w-7"
              onClick={() => setOverlayOpen((o) => !o)}
            />
          )}
          <FullscreenButton active={active} onClick={toggle} />
        </div>
      )}
      {active && overlay && overlayOpen && <div className="fs-overlay animate-fade">{overlay}</div>}
    </div>
  );
}
