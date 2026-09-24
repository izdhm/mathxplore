/**
 * Surface3D, loaded on demand and guarded - see WebGLGate for why.
 */

import { lazy } from 'react';
import { WebGLGate } from './WebGLGate';
import { useTheme } from '../../state/theme';

const Surface3DImpl = lazy(() =>
  import('./Surface3D').then((m) => ({ default: m.Surface3D })),
);

type Surface3DProps = Parameters<typeof import('./Surface3D').Surface3D>[0];

export function LazySurface3D(props: Surface3DProps) {
  const { theme } = useTheme();
  return (
    <WebGLGate height={props.height ?? 420}>
      <Surface3DImpl theme={theme} {...props} />
    </WebGLGate>
  );
}
