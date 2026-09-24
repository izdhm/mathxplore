/**
 * WebGLGate - loads a Three.js component on demand, and only where it can run.
 *
 * Two demonstration-day concerns live here rather than in each renderer:
 *
 *   1. Three.js is by far the largest dependency. Splitting it out means the
 *      landing page paints immediately, and a student who only visits CodeLab
 *      never downloads a 3D engine at all.
 *
 *   2. Not every machine has usable WebGL - shared laboratory computers,
 *      remote desktops and some projector setups do not. Rather than a blank
 *      panel or a thrown error, the panel says so, briefly, and the page keeps
 *      working.
 */

import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
let webglSupport: boolean | null = null;

function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    webglSupport = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export function Placeholder({ height, message }: { height: number; message: ReactNode }) {
  return (
    <div
      className="viz-frame flex items-center justify-center px-6 text-center"
      style={{ height }}
    >
      <div className="max-w-xs text-[12px] leading-relaxed text-faint">{message}</div>
    </div>
  );
}

class WebGLBoundary extends Component<{ children: ReactNode; height: number }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <Placeholder height={this.props.height} message="3D could not start here. Everything else works." />;
    }
    return this.props.children;
  }
}

export function WebGLGate({ height, children }: { height: number; children: ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(detectWebGL());
  }, []);

  if (supported === false) {
    return <Placeholder height={height} message="No WebGL on this machine, so the 3D view stays off. The mathematics is unchanged." />;
  }

  return (
    <WebGLBoundary height={height}>
      <Suspense fallback={<Placeholder height={height} message={<span className="animate-pulse">…</span>} />}>
        {children}
      </Suspense>
    </WebGLBoundary>
  );
}
