/**
 * ReturnVisual - what the student's code *returns*, drawn.
 *
 * A code challenge asks for a function. Printing tells a student what one
 * value is; this shows them the whole function - their curve, solid, over the
 * goal, dashed, with the points it must hit and the lines it must respect -
 * and lists the values it returned at the test inputs. Wrong answers are
 * drawn exactly as wrong as they are, because the picture comes from the
 * student's code and not from the grader.
 */

import { useMemo } from 'react';
import { Graph2D, type Curve, type Guide, type Marker } from '../graph/Graph2D';
import { compileFunction, runAndProbe } from '../../lib/pyengine';
import { fmt } from '../../lib/math/functions';
import type { ChallengeVisual } from '../../content/challenges';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';
import { EmptyState, MathExpr } from '../ui/Primitives';

interface Props {
  visual: ChallengeVisual;
  /** The code as it was when Run was pressed; null before the first run. */
  source: string | null;
  height?: number;
}

export function ReturnVisual({ visual, source, height = 260 }: Props) {
  const data = useMemo(() => {
    if (source === null) return null;
    const f = visual.points ? null : compileFunction(source, visual.fn, visual.extraArgs);
    const probed = runAndProbe(
      source,
      visual.probes.map((args) => ({ name: visual.fn, args })),
    );
    return { f, values: probed.values, defined: probed.missing.length === 0 && !probed.result.error };
  }, [visual, source]);

  if (!data) {
    return (
      <div className="viz-frame" style={{ height }}>
        <EmptyState icon="chart" title={visual.fn + '(…)'} />
      </div>
    );
  }

  const curves: Curve[] = [];
  if (visual.reference) {
    curves.push({ f: visual.reference, color: '#4cc9ff', dashed: true, opacity: 0.55, width: 1.8, label: visual.referenceLabel ?? 'goal' });
  }
  if (data.f) {
    curves.push({ f: data.f, color: '#ffc83d', width: 2.6, label: `${visual.fn}(x)` });
  }
  if (visual.points) {
    // A function of several inputs: draw the points it is asked about, joined.
    curves.push({
      xs: visual.points.map((p) => p.x),
      ys: visual.points.map((p) => p.y),
      color: '#ffc83d',
      width: 2.2,
      label: data.values[0] !== null ? `${visual.fn} = ${fmt(data.values[0]!, 3)}` : visual.fn,
    });
  }

  const markers: Marker[] = [
    ...(visual.targets ?? []).map<Marker>((t) => ({ x: t.x, y: t.y, label: t.label, color: '#b39cff', kind: 'ring' })),
    ...(visual.points ?? []).map<Marker>((p) => ({ x: p.x, y: p.y, label: p.label, color: '#b39cff' })),
  ];
  // Where the student's curve actually is at each probed input.
  if (data.f) {
    visual.probes.forEach((args, i) => {
      const v = data.values[i];
      if (v !== null && Number.isFinite(v)) markers.push({ x: args[0], y: v, color: '#ffc83d', kind: 'dot' });
    });
  }

  const guides: Guide[] = (visual.guides ?? []).map((g) => ({ ...g, color: 'rgba(62,230,168,0.55)' }));

  return (
    <div className="space-y-2">
      <Graph2D
        curves={curves}
        markers={markers}
        guides={guides}
        view={visual.view}
        xLabel={visual.xLabel}
        yLabel={visual.yLabel}
        height={height}
        revealKey={source ?? undefined}
        trace={!!data.f}
      />

      {/* Returned values at the test inputs - the numbers behind the picture. */}
      <div className="flex flex-wrap gap-1.5">
        {!data.defined ? (
          <span className="glass-chip flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] text-danger">
            <Icon name="alert" size={12} />
            <span className="font-mono">{visual.fn}</span> returned nothing
          </span>
        ) : (
          visual.probes.map((args, i) => {
            const v = data.values[i];
            return (
              <Tooltip key={i} label={`${visual.fn}(${args.map((a) => fmt(a, 2)).join(', ')}) returned ${v === null ? 'nothing' : fmt(v, 4)}`}>
                <span className="glass-chip flex cursor-help items-center gap-1.5 px-2.5 py-1 text-[12px] tabular-nums">
                  <MathExpr className="text-paper/85">{`${visual.fn}(${args.map((a) => fmt(a, 2)).join(', ')})`}</MathExpr>
                  <span className="text-faint">=</span>
                  <span className={v === null ? 'text-danger' : 'text-spark'}>{v === null ? '—' : fmt(v, 3)}</span>
                </span>
              </Tooltip>
            );
          })
        )}
      </div>
    </div>
  );
}
