/**
 * ShapeScene3D, loaded on demand and guarded - see WebGLGate for why.
 */

import { lazy } from 'react';
import { WebGLGate } from './WebGLGate';
import { useTheme } from '../../state/theme';

const Impl = lazy(() => import('./ShapeScene3D').then((m) => ({ default: m.ShapeScene3D })));

type ShapeScene3DProps = Parameters<typeof import('./ShapeScene3D').ShapeScene3D>[0];

export function LazyShapeScene3D(props: ShapeScene3DProps) {
  const { theme } = useTheme();
  return (
    <WebGLGate height={props.height ?? 420}>
      <Impl theme={theme} {...props} />
    </WebGLGate>
  );
}
