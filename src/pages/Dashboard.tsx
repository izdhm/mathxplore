/**
 * The student dashboard - and the evaluation record behind it.
 *
 * The top half is for the learner: where they are strong, where they are thin,
 * what to do next. The bottom half is for research: an honest, exportable log
 * of what actually happened, with no invented findings and no claims about
 * effectiveness that have not been measured.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import {
  Badge, Button, Meter, Panel, PanelHeader, Stat, cx,
} from '../components/ui/Primitives';
import { InfoDot } from '../components/ui/Tooltip';
import { CHALLENGES, challengeStats } from '../content/challenges';
import { LESSONS } from '../content/lessons';
import { MATH_TOPICS, PYTHON_TOPICS, useProgress } from '../state/progress';

export function Dashboard() {
  const { state, mastery, overall, weakest, exportJson, exportCsv, reset } = useProgress();

  const stats = useMemo(() => challengeStats(state.solvedChallenges), [state.solvedChallenges]);

  const predictions = state.predictions;
  const predictionAccuracy = predictions.length
    ? Math.round((predictions.filter((p) => p.correct).length / predictions.length) * 100)
    : null;

  const runs = state.events.filter((e) => e.type === 'code_run');
  const errorRate = runs.length
    ? Math.round((runs.filter((e) => e.type === 'code_run' && e.errored).length / runs.length) * 100)
    : null;

  // Recommend the lesson that teaches the weakest topic, or the next unfinished one.
  const recommended = useMemo(() => {
    const byTopic = LESSONS.find(
      (l) => weakest && (l.pythonTopic === weakest.id || l.mathTopics.includes(weakest.id as never)),
    );
    const nextUnfinished = LESSONS.find((l) => !state.completedLessons.includes(l.id));
    return byTopic && !state.completedLessons.includes(byTopic.id) ? byTopic : nextUnfinished;
  }, [weakest, state.completedLessons]);

  const download = (contents: string, filename: string, type: string) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LoopRibbon active="understand" />
          <h1 className="sr-only">Progress</h1>
          <InfoDot label="Your learning record. Everything here is stored in this browser only. There is no account and no server - the participant code carries no personal information." />
        </div>
        <div className="flex items-center gap-2">
          <Stat label="Streak" value={`${state.streakDays}`} hint="days in a row" domain="spark" />
          <Stat label="ID" value={state.participantId || '—'} hint="Anonymous participant code" domain="neutral" />
        </div>
      </header>

      {/* ---- Headline figures ---------------------------------------------- */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <div className="eyebrow mb-2 text-math">Mathematics</div>
          <div className="mb-2 font-math text-[28px] leading-none text-math">{overall.maths}%</div>
          <Meter value={overall.maths} domain="math" />
        </Panel>
        <Panel className="p-4">
          <div className="eyebrow mb-2 text-code">Python</div>
          <div className="mb-2 font-math text-[28px] leading-none text-code">{overall.python}%</div>
          <Meter value={overall.python} domain="code" />
        </Panel>
        <Panel className="p-4">
          <div className="eyebrow mb-2 text-spark">Challenges solved</div>
          <div className="mb-2 font-math text-[28px] leading-none text-spark">
            {stats.solved}
            <span className="text-[16px] text-faint">/{stats.total}</span>
          </div>
          <Meter value={(stats.solved / stats.total) * 100} domain="spark" />
        </Panel>
        <Panel className="p-4">
          <div className="eyebrow mb-2 text-viz">Lessons completed</div>
          <div className="mb-2 font-math text-[28px] leading-none text-viz">
            {state.completedLessons.length}
            <span className="text-[16px] text-faint">/{LESSONS.length}</span>
          </div>
          <Meter value={(state.completedLessons.length / LESSONS.length) * 100} domain="viz" />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---- Topic breakdown ------------------------------------------ */}
        <Panel>
          <PanelHeader eyebrow="Mathematics" title="Topic mastery" domain="math" />
          <div className="space-y-3.5 p-4">
            {MATH_TOPICS.map((t) => (
              <TopicRow key={t.id} name={t.name} value={mastery(t.id)} domain="math" to={`/explore/${t.id}`} />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Python" title="Topic mastery" domain="code" />
          <div className="space-y-3.5 p-4">
            {PYTHON_TOPICS.map((t) => {
              const lesson = LESSONS.find((l) => l.pythonTopic === t.id);
              return (
                <TopicRow
                  key={t.id}
                  name={t.name}
                  value={mastery(t.id)}
                  domain="code"
                  to={lesson ? `/learn/${lesson.id}` : '/learn'}
                />
              );
            })}
          </div>
        </Panel>
      </div>

      {/* ---- Guidance ------------------------------------------------------ */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader eyebrow="Focus here next" title="Weakest area" domain="spark" />
          <div className="p-4">
            {weakest ? (
              <>
                <div className="mb-1 text-[16px] font-semibold text-paper">{weakest.name}</div>
                <div className="mb-3 text-[12px] text-faint">
                  {weakest.value}% · {weakest.kind === 'maths' ? 'mathematics' : 'Python'}
                </div>
                <Meter value={weakest.value} domain="spark" className="mb-4" />
                {recommended && (
                  <Link to={`/learn/${recommended.id}`}>
                    <Button variant="primary" className="w-full py-2 text-[12.5px]">
                      Start: {recommended.title}
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <p className="text-[12.5px] text-faint">Explore a module to start building a record.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="What If?" title="Prediction accuracy" domain="viz" />
          <div className="p-4">
            {predictionAccuracy === null ? (
              <p className="text-[12.5px] leading-relaxed text-faint">
                No predictions yet. Open any Explore module and commit to an answer before the graph
                moves.
              </p>
            ) : (
              <>
                <div className="mb-2 font-math text-[28px] leading-none text-viz">
                  {predictionAccuracy}%
                </div>
                <Meter value={predictionAccuracy} domain="viz" className="mb-3" />
                <p className="text-[12px] leading-relaxed text-faint">
                  {predictions.length} prediction{predictions.length === 1 ? '' : 's'} made. A low
                  score early on is expected and useful — wrong predictions are where the concepts
                  are learned.
                </p>
              </>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="CodeLab" title="Programs run" domain="code" />
          <div className="p-4">
            <div className="mb-2 font-math text-[28px] leading-none text-code">{runs.length}</div>
            {errorRate === null ? (
              <p className="text-[12.5px] text-faint">Nothing run yet.</p>
            ) : (
              <p className="text-[12px] leading-relaxed text-faint">
                {errorRate}% stopped with an error. Errors are part of programming — what matters is
                whether the next attempt fixes them.
              </p>
            )}
            <Link to="/codelab" className="mt-3 inline-block">
              <Button className="px-3 py-1.5 text-[12px]">Open CodeLab</Button>
            </Link>
          </div>
        </Panel>
      </div>

      {/* ---- Activity ------------------------------------------------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader eyebrow="Activity" title="Recent events" domain="viz" />
          <div className="max-h-[320px] overflow-y-auto">
            {state.events.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-faint">
                Nothing recorded yet.
              </p>
            ) : (
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-surface-2/95 backdrop-blur">
                  <tr className="text-faint">
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-4 py-2 font-medium">Event</th>
                    <th className="px-4 py-2 font-medium">Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...state.events].reverse().slice(0, 40).map((e, i) => (
                    <tr key={i} className="text-muted">
                      <td className="whitespace-nowrap px-4 py-1.5 text-faint">
                        {new Date(e.at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-1.5">
                        <span
                          className={cx(
                            'rounded px-1.5 py-0.5 text-[10.5px]',
                            e.type === 'challenge_attempted' && (e.correct ? 'bg-code/12 text-code' : 'bg-spark/12 text-spark'),
                            e.type === 'prediction_made' && (e.correct ? 'bg-code/12 text-code' : 'bg-math/12 text-math'),
                            e.type === 'lesson_completed' && 'bg-viz/12 text-viz',
                            e.type === 'code_run' && (e.errored ? 'bg-danger/12 text-danger' : 'bg-surface-3 text-muted'),
                            (e.type === 'parameter_explored' || e.type === 'experiment_saved') && 'bg-surface-3 text-muted',
                          )}
                        >
                          {e.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="truncate px-4 py-1.5 font-mono text-[11px] text-faint">{e.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="Challenges" title="Attempts by item" domain="spark" />
            <div className="max-h-[180px] space-y-1.5 overflow-y-auto p-3">
              {CHALLENGES.filter((c) => state.attemptsByChallenge[c.id]).length === 0 ? (
                <p className="px-1 py-4 text-center text-[12px] text-faint">
                  No challenges attempted yet.
                </p>
              ) : (
                CHALLENGES.filter((c) => state.attemptsByChallenge[c.id]).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface/40 px-2.5 py-1.5"
                  >
                    <span className="truncate text-[12px] text-muted">{c.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] text-faint">
                        {state.attemptsByChallenge[c.id]} tries
                      </span>
                      {state.solvedChallenges.includes(c.id) && <Badge domain="code">solved</Badge>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Saved" title="Recent experiments" domain="math" />
            <div className="max-h-[180px] space-y-1.5 overflow-y-auto p-3">
              {state.experiments.length === 0 ? (
                <p className="px-1 py-4 text-center text-[12px] text-faint">
                  Nothing saved yet — the Sandbox keeps whatever you build.
                </p>
              ) : (
                state.experiments.slice(0, 8).map((e) => (
                  <div key={e.id} className="rounded-md border border-line bg-surface/40 px-2.5 py-1.5">
                    <div className="truncate text-[12px] text-muted">{e.name}</div>
                    <div className="text-[10.5px] text-faint">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ---- Research export ------------------------------------------------ */}
      <Panel className="mt-4">
        <PanelHeader
          eyebrow="Research"
          title="Evaluation data"
          domain="neutral"
          description="MathXplore records what a learner did, when, and whether it worked — nothing more. No effectiveness claim is made anywhere in this platform, because none has been measured yet. This export exists so that a genuine pre-test/post-test study can be run later."
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-2.5 text-[12.5px] leading-relaxed text-muted">
            <p>
              The record holds mastery estimates per topic, completed lessons, challenge attempts and
              outcomes, What If? predictions with whether each was correct, and a timestamped event
              log. Together these support measurement of conceptual understanding, engagement,
              prediction accuracy over time, and error-recovery behaviour.
            </p>
            <p className="text-faint">
              The participant code is generated at random in this browser and is not linked to any
              identity. A researcher would match it to a consent record held separately, offline.
            </p>
          </div>

          <div className="space-y-2">
            <div className="rounded-lg border border-line bg-surface/50 p-3">
              <div className="eyebrow mb-1">Record summary</div>
              <div className="space-y-1 text-[12px] text-muted">
                <div className="flex justify-between">
                  <span>Events logged</span>
                  <span className="tabular-nums text-paper">{state.events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Predictions</span>
                  <span className="tabular-nums text-paper">{predictions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Started</span>
                  <span className="tabular-nums text-paper">
                    {state.startedAt ? new Date(state.startedAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  download(exportJson(), `mathxplore-${state.participantId}.json`, 'application/json')
                }
                className="flex-1 py-1.5 text-[12px]"
              >
                Export JSON
              </Button>
              <Button
                onClick={() => download(exportCsv(), `mathxplore-${state.participantId}.csv`, 'text/csv')}
                className="flex-1 py-1.5 text-[12px]"
              >
                Export CSV
              </Button>
            </div>

            <button
              onClick={() => {
                if (confirm('This clears all progress in this browser and issues a new participant code. Continue?')) {
                  reset();
                }
              }}
              className="w-full rounded-lg border border-danger/30 px-3 py-1.5 text-[11.5px] text-danger/80 transition-colors hover:bg-danger/10"
            >
              Clear this record
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TopicRow({
  name,
  value,
  domain,
  to,
}: {
  name: string;
  value: number;
  domain: 'math' | 'code';
  to: string;
}) {
  return (
    <Link to={to} className="group block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] text-muted transition-colors group-hover:text-paper">{name}</span>
        <span
          className={cx(
            'text-[12.5px] tabular-nums',
            value === 0 ? 'text-faint' : domain === 'math' ? 'text-math' : 'text-code',
          )}
        >
          {value}%
        </span>
      </div>
      <Meter value={value} domain={domain} />
    </Link>
  );
}
