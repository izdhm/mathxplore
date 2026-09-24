/**
 * OutputPanel - what comes back after Run.
 *
 * Designed to be *watched*, not read. A student who presses Run should see
 * something happen: the printed lines arrive in sequence, and the graph draws
 * itself on rather than appearing finished, which makes the chain
 * code → data → graph visible instead of asserted.
 *
 * Text is kept to a minimum. Run statistics are chips, not sentences, and the
 * long half of an error lesson - why Python behaves this way, and the notation
 * either side of it - is folded away until asked for. What stays visible is the
 * one-line description and the nudge, because those are what unblock a student.
 */

import { useMemo, useRef } from 'react';
import type { PythonResult } from '../../lib/pyengine';
import { Graph2D, type Curve } from '../graph/Graph2D';
import { ShapeCanvas2D } from '../graph/ShapeCanvas2D';
import { LazyShapeScene3D } from '../graph/LazyShapeScene3D';
import { Icon } from '../ui/Icon';
import { EmptyState, cx } from '../ui/Primitives';
import { Tooltip } from '../ui/Tooltip';
import { FullscreenFrame } from '../ui/Fullscreen';

interface Props {
  result: PythonResult | null;
  showPlots?: boolean;
  /** Draw shapes made with the `shapes` and `turtle` libraries. */
  showScene?: boolean;
  graphHeight?: number;
  className?: string;
}

export function OutputPanel({ result, showPlots = true, showScene = true, graphHeight = 300, className }: Props) {
  const signature = useMemo(
    () => (result ? plotSignature(result.plots) + result.steps + sceneSignature(result) : ''),
    [result],
  );
  const frame3d = useRef<HTMLDivElement>(null);

  if (!result) {
    return (
      <div className={cx('flex h-full flex-col', className)}>
        <EmptyState icon="play" title="Run" />
      </div>
    );
  }

  const { output, plots, lesson, steps, durationMs, scene } = result;
  const shapes2d = scene.shapes2d.length + scene.turtles.length;
  const shapes3d = scene.shapes3d.length;
  const lines = output.length ? output.replace(/\n$/, '').split('\n') : [];

  return (
    <div className={cx('flex h-full flex-col gap-3', className)}>
      {/* ---- Result chips: the run at a glance --------------------------- */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          tone={lesson ? 'bad' : 'good'}
          icon={lesson ? 'alert' : 'check'}
          label={lesson ? 'stopped' : 'ran'}
          tip={lesson ? 'The program stopped before it finished.' : 'The program ran to the end.'}
        />
        {lines.length > 0 && (
          <Chip
            icon="code"
            label={`${lines.length} line${lines.length === 1 ? '' : 's'}`}
            tip="How many lines your program printed."
          />
        )}
        {plots.length > 0 && (
          <Chip
            tone="viz"
            icon="chart"
            label={`${plots.length} graph${plots.length === 1 ? '' : 's'}`}
            tip="Graphs your code generated with plot() or scatter()."
          />
        )}
        {shapes2d + shapes3d > 0 && (
          <Chip
            tone="viz"
            icon={shapes3d ? 'cube' : 'shapes'}
            label={`${scene.shapes2d.length + shapes3d} shape${scene.shapes2d.length + shapes3d === 1 ? '' : 's'}`}
            tip="Shapes your code drew with the shapes or turtle library."
          />
        )}
        <Chip
          icon="clock"
          label={`${durationMs} ms`}
          tip={`${steps.toLocaleString()} steps of Python executed in ${durationMs} milliseconds.`}
        />
      </div>

      {/* ---- Error as a lesson ------------------------------------------- */}
      {lesson && (
        <div className="animate-rise overflow-hidden rounded-xl border border-danger/40 bg-danger/8">
          <div className="flex items-center justify-between gap-3 border-b border-danger/25 bg-danger/12 px-3.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="alert" size={15} className="shrink-0 text-danger" />
              <span className="truncate text-[13px] font-semibold text-paper">{lesson.title}</span>
            </div>
            {lesson.line > 0 && (
              <span className="shrink-0 rounded bg-danger/20 px-1.5 py-0.5 font-mono text-[11px] text-danger">
                line {lesson.line}
              </span>
            )}
          </div>

          <div className="space-y-2.5 px-3.5 py-3">
            <p className="text-[13px] leading-relaxed text-paper/90">{lesson.message}</p>

            {lesson.tryThis && (
              <div className="flex items-start gap-2 rounded-lg border border-spark/30 bg-spark/8 px-3 py-2">
                <Icon name="lightbulb" size={15} className="mt-px shrink-0 text-spark" />
                <p className="text-[12.5px] leading-relaxed text-paper/85">{lesson.tryThis}</p>
              </div>
            )}

            {(lesson.why || lesson.mathLink) && (
              <details className="group rounded-lg border border-line bg-surface/50">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[12px] font-medium text-muted transition-colors hover:text-paper">
                  <Icon
                    name="chevronDown"
                    size={14}
                    className="transition-transform group-open:rotate-180"
                  />
                  Why Python does this
                </summary>
                <div className="space-y-2.5 border-t border-line px-3 py-2.5">
                  {lesson.why && (
                    <p className="text-[12.5px] leading-relaxed text-muted">{lesson.why}</p>
                  )}
                  {lesson.mathLink && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-math/25 bg-math/8 px-3 py-2">
                        <div className="eyebrow mb-1 text-math">Maths</div>
                        <div className="math text-[15px] text-paper">{lesson.mathLink.maths}</div>
                      </div>
                      <div className="rounded-md border border-code/25 bg-code/8 px-3 py-2">
                        <div className="eyebrow mb-1 text-code">Python</div>
                        <pre className="code-surface whitespace-pre-wrap text-[12.5px] text-paper">
                          {lesson.mathLink.python}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* ---- Printed output ----------------------------------------------- */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cx(
            'code-surface viz-frame min-h-[88px] flex-1 overflow-auto px-3 py-2.5',
          )}
        >
          {lines.length ? (
            lines.map((line, i) => (
              <div
                key={`${signature}-${i}`}
                className="animate-fade whitespace-pre-wrap opacity-90"
                // Lines arrive in sequence, so output reads as something the
                // program produced rather than a block that was always there.
                style={{ animationDelay: `${Math.min(i * 45, 900)}ms` }}
              >
                {line || ' '}
              </div>
            ))
          ) : (
            <div className="flex h-full items-center gap-2 text-faint">
              <Icon name="code" size={14} />
              <span className="text-[12px] italic">print(…)</span>
            </div>
          )}
        </div>
      </div>

      {/* ---- Shapes the code drew ------------------------------------------ */}
      {showScene && shapes2d > 0 && (
        <div className="animate-fade">
          <ShapeCanvas2D scene={scene} height={graphHeight} revealKey={signature} />
        </div>
      )}
      {showScene && shapes3d > 0 && (
        <FullscreenFrame frameRef={frame3d} className="viz-frame animate-fade overflow-hidden">
          <LazyShapeScene3D scene={scene} height={graphHeight + 60} revealKey={signature} fitKey={signature} />
        </FullscreenFrame>
      )}

      {/* ---- Graphs the code produced --------------------------------------- */}
      {showPlots && plots.length > 0 && (
        <div className="animate-fade">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Icon name="chart" size={13} className="text-viz" />
            <Tooltip label="Every point here is a number your program calculated. The graph is drawn as the values are read.">
              <span className="cursor-help text-[11px] text-faint underline decoration-dotted underline-offset-2">
                code → data → graph
              </span>
            </Tooltip>
          </div>
          <Graph2D
            curves={plots.map<Curve>((p) => ({
              xs: p.xs,
              ys: p.ys,
              color: p.color ?? '#38bdf8',
              label: p.label,
              kind: p.kind,
            }))}
            view={autoView(plots)}
            resetKey={signature}
            revealKey={signature}
            height={graphHeight}
          />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- chips

function Chip({
  icon,
  label,
  tip,
  tone = 'neutral',
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  tip: string;
  tone?: 'neutral' | 'good' | 'bad' | 'viz';
}) {
  const tones = {
    neutral: 'border-line bg-surface-2/70 text-muted',
    good: 'border-code/35 bg-code/10 text-code',
    bad: 'border-danger/35 bg-danger/10 text-danger',
    viz: 'border-viz/35 bg-viz/10 text-viz',
  };
  return (
    <Tooltip label={tip}>
      <span
        className={cx(
          'inline-flex cursor-help items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium tabular-nums',
          tones[tone],
        )}
      >
        <Icon name={icon} size={12} />
        {label}
      </span>
    </Tooltip>
  );
}

// ---------------------------------------------------------------- framing

/** Frame the plotted data with a little breathing room. */
function autoView(plots: PythonResult['plots']) {
  const xs = plots.flatMap((p) => p.xs).filter(Number.isFinite);
  const ys = plots.flatMap((p) => p.ys).filter(Number.isFinite);
  if (!xs.length || !ys.length) return undefined;

  const pad = (lo: number, hi: number) => {
    const span = hi - lo || 2;
    const m = span * 0.12;
    return [lo - m, hi + m] as const;
  };
  const [xMin, xMax] = pad(Math.min(...xs), Math.max(...xs));
  const [yMin, yMax] = pad(Math.min(...ys), Math.max(...ys));
  return { xMin, xMax, yMin, yMax };
}

function plotSignature(plots: PythonResult['plots']) {
  return plots.map((p) => `${p.label}:${p.xs.length}:${p.xs[0]}:${p.ys[0]}`).join('|');
}

function sceneSignature(r: PythonResult) {
  const { scene } = r;
  return `${scene.shapes2d.length}/${scene.shapes3d.length}/${scene.turtles.length}/${r.durationMs}`;
}
