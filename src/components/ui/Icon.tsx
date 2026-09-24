/**
 * Icon set.
 *
 * Line icons at a single weight, drawn on a 24-unit grid and inheriting
 * currentColor, so they sit correctly beside text at any size. Inline SVG
 * rather than an icon font or a package: there are about twenty of them, and
 * they must render with no network and no extra dependency.
 */

import type { SVGProps } from 'react';

export type IconName =
  | 'info' | 'play' | 'reset' | 'save' | 'share' | 'trash' | 'check' | 'alert'
  | 'sparkle' | 'chart' | 'code' | 'book' | 'target' | 'eye' | 'cube'
  | 'wave' | 'function' | 'arrowRight' | 'grid' | 'rotate' | 'download'
  | 'lightbulb' | 'flask' | 'clock' | 'chevronDown' | 'sliders'
  | 'home' | 'shapes' | 'square' | 'circle' | 'triangle' | 'hexagon' | 'star'
  | 'users' | 'menu' | 'x' | 'layers' | 'fit' | 'pen' | 'spiral' | 'upload'
  | 'arrowLeft' | 'chevronRight' | 'chevronLeft' | 'link' | 'orbit' | 'wire'
  | 'sun' | 'moon' | 'center' | 'shrink' | 'key' | 'chevronUp';

const PATHS: Record<IconName, string> = {
  info: 'M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  play: 'M6 4.5v15l13-7.5-13-7.5Z',
  reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h7',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  check: 'M20 6 9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8',
  chart: 'M3 3v16a2 2 0 0 0 2 2h16M7 15l4-5 3 3 5-7',
  code: 'm8 17-5-5 5-5M16 7l5 5-5 5M14 4l-4 16',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  cube: 'm12 2 9 5v10l-9 5-9-5V7l9-5ZM12 12l9-5M12 12v10M12 12 3 7',
  wave: 'M2 12c2.5-6 5-6 7.5 0S15 18 17.5 12 22 6 22 6',
  function: 'M5 20c2 0 3-1 3-4V8c0-3 1-4 3-4M8 12h6M13 20l6-8M19 20l-6-8',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  grid: 'M3 9h18M3 15h18M9 3v18M15 3v18M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
  rotate: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  lightbulb: 'M9 21h6M10 18h4M12 3a6 6 0 0 0-4 10.5c.7.8 1 1.5 1 2.5h6c0-1 .3-1.7 1-2.5A6 6 0 0 0 12 3Z',
  flask: 'M9 3h6M10 3v6l-6 9a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3l-6-9V3M7.5 15h9',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  chevronDown: 'm6 9 6 6 6-6',
  sliders: 'M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4',
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10M10 20v-6h4v6',
  shapes: 'M8.5 3 3 12h11L8.5 3ZM17 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM3 15h7v6H3v-6Z',
  square: 'M4 4h16v16H4z',
  circle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  triangle: 'M12 4 3 20h18L12 4Z',
  hexagon: 'M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3Z',
  star: 'M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.3 6.4 20.3l1.2-6.3L3 9.6l6.3-.8L12 3Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  menu: 'M4 7h16M4 12h16M4 17h16',
  x: 'M6 6l12 12M18 6L6 18',
  layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  pen: 'M12 19l7-7 3 3-7 7-3-3ZM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5ZM2 2l7.6 7.6M11 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  spiral: 'M12 12a1 1 0 0 1 1 1 2 2 0 0 1-2 2 3 3 0 0 1-3-3 4 4 0 0 1 4-4 5 5 0 0 1 5 5 6 6 0 0 1-6 6 7 7 0 0 1-7-7 8 8 0 0 1 8-8 9 9 0 0 1 9 9',
  upload: 'M12 15V3M7 8l5-5 5 5M4 21h16',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5',
  orbit: 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M20.5 7.5c1.5 2.6-1 7.2-5.6 10.2S5.3 21.2 3.8 18.6 4.8 11.4 9.4 8.4 19 4.9 20.5 7.5Z',
  wire: 'M4 4h16v16H4zM4 12h16M12 4v16M4 4l16 16',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  center: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  key: 'M15 7a4 4 0 1 1-2.8 6.8L7 19H4v-3l5.2-5.2A4 4 0 0 1 15 7ZM7 16l2 2',
  chevronUp: 'm6 15 6-6 6 6',
};

/** Icons whose shape reads better filled than stroked. */
const FILLED: Partial<Record<IconName, true>> = { play: true };

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Size in pixels. Defaults to 16, which sits well beside 13px text. */
  size?: number;
}

export function Icon({ name, size = 16, className, ...rest }: Props) {
  const filled = FILLED[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
