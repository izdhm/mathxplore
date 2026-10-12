/**
 * AppShell - navigation and the frame every page sits in.
 *
 * v2 navigation is a row of icons. Each has its name in a tooltip and in a
 * screen-reader-only span, so the interface reads as pictures to the eye and
 * as words to assistive technology.
 */

import { useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { IconButton, cx } from '../ui/Primitives';
import { Icon, type IconName } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';
import { useFullscreen } from '../ui/Fullscreen';
import { useTheme } from '../../state/theme';

const NAV: { to: string; label: string; icon: IconName; tone: string }[] = [
  { to: '/explore', label: 'Explore', icon: 'sliders', tone: 'var(--color-viz)' },
  { to: '/learn', label: 'Learn', icon: 'book', tone: 'var(--color-math)' },
  { to: '/codelab', label: 'CodeLab', icon: 'code', tone: 'var(--color-code)' },
  { to: '/challenges', label: 'Challenges', icon: 'target', tone: 'var(--color-spark)' },
  { to: '/sandbox', label: 'Sandbox', icon: 'flask', tone: 'var(--color-code)' },
  { to: '/progress', label: 'Progress', icon: 'chart', tone: 'var(--color-viz)' },
  { to: '/teacher', label: 'Educators', icon: 'users', tone: 'var(--color-math)' },
];

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('h-7 w-7', className)} aria-hidden>
      <defs>
        <linearGradient id="mx-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4cc9ff" />
          <stop offset="55%" stopColor="#b39cff" />
          <stop offset="100%" stopColor="#ffc83d" />
        </linearGradient>
      </defs>
      {/* The parabola: mathematics */}
      <path d="M5 26 Q16 2 27 26" fill="none" stroke="url(#mx-logo)" strokeWidth="2.6" strokeLinecap="round" />
      {/* The brackets: code */}
      <path
        d="M9 9 L5.5 12.5 L9 16 M23 9 L26.5 12.5 L23 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <circle cx="16" cy="24.5" r="2" fill="#ffc83d" />
    </svg>
  );
}

/** The drifting ground behind everything: horizon, haze, two orbs, one glass sphere. */
function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div className="ambient-haze" />
      <div className="ambient-floor" />
      <div
        className="ambient-orb"
        style={{ width: '46vw', height: '46vw', left: '-12vw', top: '-18vw', background: 'rgba(179,156,255,0.35)', animation: 'orb-a 26s ease-in-out infinite' }}
      />
      <div
        className="ambient-orb"
        style={{ width: '38vw', height: '38vw', right: '-10vw', top: '30vh', background: 'rgba(76,201,255,0.28)', animation: 'orb-b 32s ease-in-out infinite' }}
      />
      <div
        className="ambient-glass"
        style={{ width: 'clamp(90px, 11vw, 170px)', height: 'clamp(90px, 11vw, 170px)', right: '7vw', top: '14vh', animation: 'orb-c 18s ease-in-out infinite' }}
      />
      <div
        className="ambient-glass"
        style={{ width: 'clamp(40px, 5vw, 80px)', height: 'clamp(40px, 5vw, 80px)', left: '9vw', bottom: '26vh', animation: 'orb-a 22s ease-in-out infinite', opacity: 0.6 }}
      />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onLanding = pathname === '/';
  const { theme, toggle } = useTheme();
  const themeButton = (
    <Tooltip label={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      <button
        type="button"
        onClick={toggle}
        className="icon-btn"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      </button>
    </Tooltip>
  );
  // The whole app on the whole screen: the page itself is the fullscreen
  // element, so routes change underneath it without leaving full screen.
  const pageRef = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.documentElement);
  const fullscreen = useFullscreen(pageRef);
  const fullscreenButton = fullscreen.supported && (
    <IconButton
      icon={fullscreen.active ? 'shrink' : 'fit'}
      label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
      on={fullscreen.active}
      size={17}
      onClick={fullscreen.toggle}
    />
  );

  return (
    <>
      <Ambient />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className={cx('sticky top-0 z-50', onLanding ? '' : '')}>
          <div className="mx-auto max-w-[1560px] px-3 pt-3 sm:px-5">
            <div className="glass-chip flex h-14 items-center gap-2 rounded-full px-3 pr-2">
              <Link to="/" className="flex shrink-0 items-center gap-2.5 pl-1 text-paper" aria-label="MathXplore home">
                <Logo />
                <span className="hidden text-[14px] font-semibold tracking-tight sm:block">
                  MathXplore
                </span>
              </Link>

              <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
                {NAV.map((item) => (
                  <Tooltip key={item.to} label={item.label}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => cx('icon-btn', isActive && 'is-active')}
                      style={({ isActive }) =>
                        isActive
                          ? { color: item.tone, borderColor: `color-mix(in oklab, ${item.tone} 45%, transparent)`, background: `color-mix(in oklab, ${item.tone} 14%, transparent)`, boxShadow: `0 0 24px -6px ${item.tone}` }
                          : undefined
                      }
                    >
                      <Icon name={item.icon} size={17} />
                      <span className="sr-only">{item.label}</span>
                    </NavLink>
                  </Tooltip>
                ))}
                <span className="mx-1 h-6 w-px bg-line" />
                {fullscreenButton}
                {themeButton}
              </nav>

              <span className="ml-auto flex items-center gap-1 md:hidden">
                {fullscreenButton}
                {themeButton}
              </span>
              <button
                onClick={() => setOpen((o) => !o)}
                className="icon-btn md:hidden"
                aria-label="Menu"
                aria-expanded={open}
              >
                <Icon name={open ? 'x' : 'menu'} size={17} />
              </button>
            </div>

            {open && (
              <div className="glass-chip mt-2 flex flex-wrap gap-2 p-2 animate-fade md:hidden">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cx('flex items-center gap-2 rounded-full border px-3 py-2 text-[13px]', isActive ? 'border-line bg-surface-2 text-paper' : 'border-transparent text-muted')
                    }
                  >
                    <Icon name={item.icon} size={15} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-[1560px] items-center text-[11px] text-faint">
            <div className="flex items-center gap-2">
              <Logo className="h-4 w-4 opacity-60" />
              <span>MathXplore v2</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
