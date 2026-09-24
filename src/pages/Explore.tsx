/**
 * Explore hub - five modules, each shown as its picture and its equation so
 * the choice is made by looking rather than by reading a label. Mastery is a
 * ring, not a sentence.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Graph2D } from '../components/graph/Graph2D';
import { ShapeCanvas2D } from '../components/graph/ShapeCanvas2D';
import { MathExpr, Panel, Ring, cx } from '../components/ui/Primitives';
import { Icon, type IconName } from '../components/ui/Icon';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import { Tooltip } from '../components/ui/Tooltip';
import { runPython } from '../lib/pyengine';
import { useProgress, MATH_TOPICS } from '../state/progress';
import type { MathTopicId } from '../state/progress';

interface ModuleCard {
  id: MathTopicId;
  to: string;
  name: string;
  equation: string;
  blurb: string;
  icon: IconName;
  domain: 'math' | 'viz' | 'code' | 'spark';
  preview?: { f: (x: number) => number; color: string }[];
  view?: { xMin: number; xMax: number; yMin: number; yMax: number };
  kind: 'graph' | 'shapes';
}

const MODULES: ModuleCard[] = [
  {
    id: 'linear',
    to: '/explore/linear',
    name: 'Linear',
    equation: 'y = mx + c',
    blurb: 'Two numbers describe a line completely: gradient, intercept.',
    icon: 'function',
    domain: 'viz',
    kind: 'graph',
    preview: [
      { f: (x) => 2 * x + 1, color: '#4cc9ff' },
      { f: (x) => -0.5 * x + 3, color: '#b39cff' },
    ],
    view: { xMin: -6, xMax: 6, yMin: -6, yMax: 8 },
  },
  {
    id: 'quadratic',
    to: '/explore/quadratic',
    name: 'Quadratic',
    equation: 'y = ax^2 + bx + c',
    blurb: 'Three coefficients: vertex, roots, axis of symmetry, discriminant.',
    icon: 'wave',
    domain: 'math',
    kind: 'graph',
    preview: [
      { f: (x) => 0.5 * x * x - 2, color: '#4cc9ff' },
      { f: (x) => -0.8 * x * x + 4, color: '#ffc83d' },
    ],
    view: { xMin: -6, xMax: 6, yMin: -6, yMax: 8 },
  },
  {
    id: 'trigonometry',
    to: '/explore/trigonometry',
    name: 'Trigonometry',
    equation: 'y = a·sin(b(x − c)) + d',
    blurb: 'Four numbers, four independent controls: amplitude, period, phase, shift.',
    icon: 'wave',
    domain: 'code',
    kind: 'graph',
    preview: [
      { f: (x) => 2 * Math.sin(x), color: '#3ee6a8' },
      { f: (x) => Math.sin(2 * x) + 1, color: '#4cc9ff' },
    ],
    view: { xMin: -7, xMax: 7, yMin: -3.5, yMax: 3.5 },
  },
  {
    id: 'surfaces',
    to: '/explore/surfaces',
    name: 'Surfaces',
    equation: 'z = f(x, y)',
    blurb: 'A function of two inputs becomes a surface. Rotate it, slice it, read it.',
    icon: 'cube',
    domain: 'math',
    kind: 'graph',
    preview: [
      { f: (x) => x * x, color: '#b39cff' },
      { f: (x) => -x * x, color: '#ffc83d' },
    ],
    view: { xMin: -4, xMax: 4, yMin: -8, yMax: 8 },
  },
  {
    id: 'geometry',
    to: '/explore/geometry',
    name: 'Geometry',
    equation: 'A, P, V',
    blurb: 'Shapes in 2D and 3D written as Python, with live area, perimeter and volume.',
    icon: 'shapes',
    domain: 'spark',
    kind: 'shapes',
  },
];

const PREVIEW_PROGRAM =
  'from shapes import *\n' +
  'star(5, 1.6, at=(-3.6, 0), color="amber")\n' +
  'polygon(6, 1.7, color="violet")\n' +
  'circle(1.5, at=(3.6, 0), color="cyan")\n' +
  'square(1.1, at=(0, -2.6), color="mint")\n';

export function ExploreHub() {
  const { mastery } = useProgress();
  const previewScene = useMemo(() => runPython(PREVIEW_PROGRAM).scene, []);

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <LoopRibbon active={['explore', 'change']} />
        <div className="flex items-center gap-2">
          {MATH_TOPICS.map((topic) => (
            <Ring key={topic.id} value={mastery(topic.id)} size={38} label={topic.name} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod, i) => (
          <Link key={mod.id} to={mod.to} className="group block animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <Panel tilt glow={mod.domain} className="h-full overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-5 pt-4">
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      'glass-chip flex h-10 w-10 items-center justify-center',
                      mod.domain === 'math' && 'text-math',
                      mod.domain === 'viz' && 'text-viz',
                      mod.domain === 'code' && 'text-code',
                      mod.domain === 'spark' && 'text-spark',
                    )}
                  >
                    <Icon name={mod.icon} size={18} />
                  </span>
                  <div>
                    <Tooltip label={mod.blurb}>
                      <span className="cursor-help text-[12px] font-medium text-muted">{mod.name}</span>
                    </Tooltip>
                    <MathExpr className="math-glow block text-[21px] leading-tight text-paper">{mod.equation}</MathExpr>
                  </div>
                </div>
                <Ring value={mastery(mod.id)} size={40} domain={mod.domain === 'spark' ? 'spark' : 'math'} />
              </div>

              <div className="p-3 pt-3">
                {mod.kind === 'shapes' ? (
                  <ShapeCanvas2D scene={previewScene} height={168} showGrid={false} />
                ) : (
                  <Graph2D
                    curves={(mod.preview ?? []).map((p) => ({ f: p.f, color: p.color, width: 2.2 }))}
                    view={mod.view}
                    height={168}
                    trace={false}
                  />
                )}
              </div>
            </Panel>
          </Link>
        ))}

        {/* The sixth cell: where the loop goes next. */}
        <Link to="/codelab" className="group block animate-rise" style={{ animationDelay: '300ms' }}>
          <Panel tilt glow="code" className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <span className="glass-chip flex h-14 w-14 items-center justify-center text-code animate-float">
              <Icon name="code" size={24} />
            </span>
            <span className="font-mono text-[13px] text-muted">print(f(x))</span>
            <Icon name="arrowRight" size={16} className="text-faint transition-transform group-hover:translate-x-1" />
          </Panel>
        </Link>
      </div>
    </div>
  );
}
