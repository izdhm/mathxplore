/**
 * Educator view.
 *
 * A decision worth stating plainly: this page shows no invented cohort. Filling
 * a competition demo with convincing fake class data would be the easiest way
 * to make this screen impressive, and it would misrepresent a system that has
 * never been used with a class.
 *
 * Instead it does something real. Students export their learning record as JSON
 * from the Progress page; an educator drops those files here and the page
 * aggregates them - genuinely - into mastery averages, per-item success rates
 * and the error types the class hit most. With no files loaded it reports on the
 * one record it can honestly see: this device.
 *
 * The authoring tools below are clearly marked as designed but not built.
 */

import { useMemo, useRef, useState } from 'react';
import {
  Badge, Button, Meter, Panel, PanelHeader, Stat,
} from '../components/ui/Primitives';
import { InfoDot } from '../components/ui/Tooltip';
import { Icon } from '../components/ui/Icon';
import { CHALLENGES } from '../content/challenges';
import { LESSONS } from '../content/lessons';
import { MATH_TOPICS, PYTHON_TOPICS, useProgress } from '../state/progress';

/** The shape of an exported learning record, as written by the Progress page. */
interface LearningRecord {
  participantId: string;
  mastery: { [topic: string]: number };
  completedLessons: string[];
  solvedChallenges: string[];
  attemptsByChallenge: { [challenge: string]: number };
  predictions: { id: string; correct: boolean }[];
  events: { type: string; id: string; errored?: boolean; errorType?: string; correct?: boolean }[];
}

export function Teacher() {
  const { state, exportJson } = useProgress();
  const [imported, setImported] = useState<LearningRecord[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // With nothing imported, report honestly on the only record available.
  const thisDevice = useMemo<LearningRecord>(
    () => JSON.parse(exportJson()) as LearningRecord,
    [exportJson],
  );
  const cohort = imported.length ? imported : [thisDevice];
  const isSample = imported.length === 0;

  const load = async (files: FileList | null) => {
    if (!files) return;
    const good: LearningRecord[] = [];
    const bad: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed?.schema !== 'mathxplore.learning-record.v1') {
          bad.push(`${file.name} — not a MathXplore learning record`);
          continue;
        }
        good.push(parsed as LearningRecord);
      } catch {
        bad.push(`${file.name} — could not be read as JSON`);
      }
    }
    setImported((prev) => {
      const merged = [...prev];
      for (const rec of good) {
        const at = merged.findIndex((m) => m.participantId === rec.participantId);
        if (at >= 0) merged[at] = rec;
        else merged.push(rec);
      }
      return merged;
    });
    setRejected(bad);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ---- genuine aggregation ------------------------------------------------
  const stats = useMemo(() => {
    const n = cohort.length;
    const meanMastery = (topic: string) =>
      Math.round(cohort.reduce((sum, r) => sum + (r.mastery?.[topic] ?? 0), 0) / n);

    const challengeRows = CHALLENGES.map((c) => {
      const attempted = cohort.filter((r) => (r.attemptsByChallenge?.[c.id] ?? 0) > 0);
      const solved = cohort.filter((r) => r.solvedChallenges?.includes(c.id));
      const totalAttempts = cohort.reduce((s, r) => s + (r.attemptsByChallenge?.[c.id] ?? 0), 0);
      return {
        id: c.id,
        title: c.title,
        difficulty: c.difficulty,
        attempted: attempted.length,
        solved: solved.length,
        avgAttempts: attempted.length ? totalAttempts / attempted.length : 0,
        successRate: attempted.length ? (solved.length / attempted.length) * 100 : null,
      };
    }).filter((row) => row.attempted > 0);

    const errorCounts = new Map<string, number>();
    for (const r of cohort) {
      for (const e of r.events ?? []) {
        if (e.type === 'code_run' && e.errored && e.errorType) {
          errorCounts.set(e.errorType, (errorCounts.get(e.errorType) ?? 0) + 1);
        }
      }
    }
    const errors = [...errorCounts.entries()].sort((a, b) => b[1] - a[1]);

    const allPredictions = cohort.flatMap((r) => r.predictions ?? []);
    const predictionAccuracy = allPredictions.length
      ? Math.round((allPredictions.filter((p) => p.correct).length / allPredictions.length) * 100)
      : null;

    const lessonRows = LESSONS.map((l) => ({
      id: l.id,
      title: l.title,
      level: l.level,
      completed: cohort.filter((r) => r.completedLessons?.includes(l.id)).length,
    }));

    return { n, meanMastery, challengeRows, errors, predictionAccuracy, allPredictions, lessonRows };
  }, [cohort]);

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="glass-chip flex h-9 w-9 items-center justify-center text-math"><Icon name="users" size={16} /></span>
          <h1 className="text-[16px] font-semibold text-paper">Class insight</h1>
          <InfoDot label="Students export their learning record from the Progress page; drop those files here and this view aggregates them. Every figure below is computed from records actually loaded - nothing on this page is simulated." />
        </div>
        <Badge domain="viz">{stats.n} record{stats.n === 1 ? '' : 's'}</Badge>
      </header>

      {/* ---- Import ---------------------------------------------------- */}
      <Panel className="mb-4">
        <PanelHeader
          eyebrow="Data source"
          title={isSample ? 'Reporting on this device only' : `${imported.length} student records`}
          domain="math"
          right={
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                multiple
                onChange={(e) => load(e.target.files)}
                className="hidden"
                id="record-upload"
              />
              <Button onClick={() => fileRef.current?.click()} variant="primary" className="px-4 py-1.5 text-[12.5px]">
                Load learning records
              </Button>
              {imported.length > 0 && (
                <Button onClick={() => { setImported([]); setRejected([]); }} className="px-3 py-1.5 text-[12.5px]">
                  Clear
                </Button>
              )}
            </div>
          }
        />
        <div className="px-5 py-3">
          {isSample ? (
            <p className="text-[12.5px] leading-relaxed text-muted">
              No student files have been loaded, so this page is showing the single record stored in
              this browser — treat every figure below as a sample of one. Load exported records to
              see a real class picture.
            </p>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-muted">
              Aggregating {imported.length} record{imported.length === 1 ? '' : 's'}. Files are read
              in the browser and never uploaded anywhere.
            </p>
          )}
          {rejected.length > 0 && (
            <ul className="mt-2 space-y-1">
              {rejected.map((r) => (
                <li key={r} className="text-[12px] text-danger/85">
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {/* ---- Topic mastery ---------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="Mathematics" title="Mean mastery across the cohort" domain="math" />
          <div className="space-y-3.5 p-4">
            {MATH_TOPICS.map((t) => (
              <div key={t.id}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13px] text-muted">{t.name}</span>
                  <span className="text-[12.5px] tabular-nums text-math">{stats.meanMastery(t.id)}%</span>
                </div>
                <Meter value={stats.meanMastery(t.id)} domain="math" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Python" title="Mean mastery across the cohort" domain="code" />
          <div className="space-y-3.5 p-4">
            {PYTHON_TOPICS.map((t) => (
              <div key={t.id}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13px] text-muted">{t.name}</span>
                  <span className="text-[12.5px] tabular-nums text-code">{stats.meanMastery(t.id)}%</span>
                </div>
                <Meter value={stats.meanMastery(t.id)} domain="code" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ---- Item analysis ------------------------------------------------ */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            eyebrow="Item analysis"
            title="Which challenges are hard"
            domain="spark"
            description="Success rate is out of the students who attempted each item, so an item nobody has reached is simply absent rather than shown as 0%."
          />
          {stats.challengeRows.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12.5px] text-faint">
              No challenge attempts in the loaded records yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-faint">
                    <th className="px-5 py-2 font-medium">Challenge</th>
                    <th className="px-3 py-2 font-medium">Attempted</th>
                    <th className="px-3 py-2 font-medium">Solved</th>
                    <th className="px-3 py-2 font-medium">Avg tries</th>
                    <th className="px-5 py-2 font-medium">Success</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stats.challengeRows
                    .slice()
                    .sort((a, b) => (a.successRate ?? 100) - (b.successRate ?? 100))
                    .map((row) => (
                      <tr key={row.id} className="text-muted">
                        <td className="px-5 py-2">
                          <div className="text-paper">{row.title}</div>
                          <div className="text-[10.5px] capitalize text-faint">{row.difficulty}</div>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.attempted}</td>
                        <td className="px-3 py-2 tabular-nums">{row.solved}</td>
                        <td className="px-3 py-2 tabular-nums">{row.avgAttempts.toFixed(1)}</td>
                        <td className="px-5 py-2">
                          <div className="flex items-center gap-2">
                            <Meter
                              value={row.successRate ?? 0}
                              domain={(row.successRate ?? 0) < 50 ? 'spark' : 'code'}
                              className="w-16"
                            />
                            <span className="tabular-nums">{Math.round(row.successRate ?? 0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader
              eyebrow="Misconceptions"
              title="Most common errors"
              domain="spark"
              description="Taken from the error type recorded each time a program stopped."
            />
            <div className="space-y-2 p-4">
              {stats.errors.length === 0 ? (
                <p className="py-4 text-center text-[12.5px] text-faint">
                  No errors recorded in the loaded records.
                </p>
              ) : (
                stats.errors.slice(0, 6).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[12px] text-muted">{type}</span>
                    <div className="flex items-center gap-2">
                      <Meter
                        value={(count / stats.errors[0][1]) * 100}
                        domain="spark"
                        className="w-24"
                      />
                      <span className="w-6 text-right text-[12px] tabular-nums text-faint">{count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="What If?" title="Prediction accuracy" domain="viz" />
            <div className="p-4">
              {stats.predictionAccuracy === null ? (
                <p className="text-[12.5px] text-faint">No predictions recorded yet.</p>
              ) : (
                <>
                  <div className="mb-2 font-math text-[28px] leading-none text-viz">
                    {stats.predictionAccuracy}%
                  </div>
                  <Meter value={stats.predictionAccuracy} domain="viz" className="mb-2" />
                  <p className="text-[11.5px] leading-relaxed text-faint">
                    Across {stats.allPredictions.length} prediction
                    {stats.allPredictions.length === 1 ? '' : 's'}. Tracking this over a term is the
                    clearest single indicator of whether conceptual intuition is improving.
                  </p>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ---- Lesson coverage ------------------------------------------------- */}
      <Panel className="mt-4">
        <PanelHeader eyebrow="Coverage" title="How far the cohort has come" domain="viz" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.lessonRows.map((l) => (
            <div key={l.id} className="rounded-lg border border-line bg-surface/40 px-3 py-2.5">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[12.5px] text-muted">
                  <span className="text-faint">L{l.level}</span> {l.title}
                </span>
                <span className="text-[11.5px] tabular-nums text-faint">
                  {l.completed}/{stats.n}
                </span>
              </div>
              <Meter value={(l.completed / stats.n) * 100} domain="viz" />
            </div>
          ))}
        </div>
      </Panel>

      {/* ---- Designed, not built --------------------------------------------- */}
      <Panel className="mt-4 border-dashed">
        <PanelHeader
          eyebrow="Designed, not built"
          title="Authoring and class management"
          domain="neutral"
          description="These are the next components in the architecture. They are shown here as a specification, not a working feature — nothing below is functional."
          right={<Badge domain="spark">not implemented</Badge>}
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'Activity authoring',
              body: 'Compose a lesson from the same block types the built-in lessons use: text, notation, code, callout, comparison.',
              needs: 'Content schema exists; needs an editor and storage.',
            },
            {
              name: 'Challenge authoring',
              body: 'Define a target function and test points; the existing grader runs student code against them automatically.',
              needs: 'Grading engine already works; needs an authoring form.',
            },
            {
              name: 'Class roster',
              body: 'Group participant codes into a class so records aggregate without manual file handling.',
              needs: 'Requires a backend and a consent workflow.',
            },
            {
              name: 'Report generation',
              body: 'Export the tables above as a printable report for a department or a study.',
              needs: 'Aggregation is live; needs a report template.',
            },
          ].map((item) => (
            <div key={item.name} className="rounded-lg border border-dashed border-line bg-surface/30 px-3.5 py-3">
              <div className="mb-1.5 text-[13px] font-semibold text-paper/80">{item.name}</div>
              <p className="text-[12px] leading-relaxed text-muted">{item.body}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-faint">{item.needs}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* ---- Deployment note --------------------------------------------------- */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Storage" value="Local only" hint="No server, no account, no personal data leaves the device." />
        <Stat
          label="Consent"
          value="Offline"
          hint="Participant codes are random; matching to identity happens on paper, outside the platform."
          domain="math"
        />
        <Stat
          label="Records loaded"
          value={`${state.events.length} events on this device`}
          hint="Visible in full on the Progress page."
          domain="viz"
        />
      </div>
    </div>
  );
}
