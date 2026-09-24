/**
 * Interactive assessment.
 *
 * Three kinds of question, because there are three kinds of understanding worth
 * testing: can you translate mathematics into Python, can you steer a graph by
 * changing code, and can you say what Python will do before you run it.
 *
 * Hints are progressive and never finish the job - the last hint still leaves
 * the final step to the student.
 */

import { useMemo, useState } from 'react';
import { CodeEditor } from '../components/code/CodeEditor';
import { OutputPanel } from '../components/code/OutputPanel';
import { SolutionPanel } from '../components/learn/SolutionPanel';
import { ReturnVisual } from '../components/learn/ReturnVisual';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import {
  Badge, Button, MathExpr, Meter, Panel, PanelHeader, Ring, cx,
} from '../components/ui/Primitives';
import { CHALLENGES, challengeStats, type Challenge } from '../content/challenges';
import { Icon } from '../components/ui/Icon';
import { InfoDot } from '../components/ui/Tooltip';
import type { PythonResult } from '../lib/pyengine';
import { useProgress } from '../state/progress';

const KIND_LABEL: Record<Challenge['kind'], string> = {
  translate: 'Maths → Code',
  target: 'Code → Graph',
  predict: 'Predict the output',
};

const DIFFICULTY_DOMAIN = {
  starter: 'code',
  core: 'viz',
  stretch: 'spark',
} as const;

export function Challenges() {
  const { state, recordChallenge } = useProgress();
  const [activeId, setActiveId] = useState(CHALLENGES[0].id);

  const challenge = CHALLENGES.find((c) => c.id === activeId) ?? CHALLENGES[0];
  const stats = useMemo(() => challengeStats(state.solvedChallenges), [state.solvedChallenges]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LoopRibbon active={['test', 'understand']} />
          <h1 className="sr-only">Challenges</h1>
          <InfoDot label="Challenges. Code answers are graded by running them, not by matching text - so any correct solution passes, including one nobody anticipated." />
        </div>
        <Ring value={(stats.solved / stats.total) * 100} domain="spark" size={44} label={`${stats.solved} of ${stats.total} solved`} />
      </header>

      <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
        {/* ---- Challenge list ------------------------------------------- */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title={`${CHALLENGES.length} challenges`} icon="target" domain="spark" />
            <div className="max-h-[620px] space-y-1 overflow-y-auto p-2.5">
              {CHALLENGES.map((c) => {
                const solved = state.solvedChallenges.includes(c.id);
                const attempts = state.attemptsByChallenge[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cx(
                      'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                      c.id === activeId
                        ? 'border-spark/50 bg-spark/10'
                        : 'border-line bg-surface/40 hover:border-spark/30',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cx('truncate text-[12.5px] font-medium', c.id === activeId ? 'text-paper' : 'text-muted')}>
                        {solved && <span className="mr-1 text-code">✓</span>}
                        {c.title}
                      </span>
                      <span
                        className={cx(
                          'shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide',
                          c.difficulty === 'starter' && 'bg-code/12 text-code',
                          c.difficulty === 'core' && 'bg-viz/12 text-viz',
                          c.difficulty === 'stretch' && 'bg-spark/12 text-spark',
                        )}
                      >
                        {c.difficulty}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-faint">
                      <span>{KIND_LABEL[c.kind]}</span>
                      {attempts > 0 && <span>· {attempts} attempt{attempts === 1 ? '' : 's'}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="By difficulty" icon="chart" domain="viz" />
            <div className="space-y-3 p-4">
              {stats.levels.map((l) => (
                <div key={l.difficulty}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[12px] capitalize text-muted">{l.difficulty}</span>
                    <span className="text-[11.5px] tabular-nums text-faint">
                      {l.solved}/{l.total}
                    </span>
                  </div>
                  <Meter
                    value={(l.solved / l.total) * 100}
                    domain={DIFFICULTY_DOMAIN[l.difficulty]}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ---- Active challenge ------------------------------------------- */}
        {challenge.kind === 'predict' ? (
          <PredictView
            key={challenge.id}
            challenge={challenge}
            solved={state.solvedChallenges.includes(challenge.id)}
            onAnswer={(correct) => recordChallenge(challenge.id, correct, challenge.topics)}
          />
        ) : (
          <CodeView
            key={challenge.id}
            challenge={challenge}
            solved={state.solvedChallenges.includes(challenge.id)}
            onAnswer={(correct) => recordChallenge(challenge.id, correct, challenge.topics)}
          />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- code answers

function CodeView({
  challenge,
  solved,
  onAnswer,
}: {
  challenge: Extract<Challenge, { kind: 'translate' | 'target' }>;
  solved: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const { recordSolution } = useProgress();
  const [code, setCode] = useState(challenge.starter);
  const [result, setResult] = useState<PythonResult | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; message: string } | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  // The code as it was at the last run - what the picture on the right shows.
  const [ranSource, setRanSource] = useState<string | null>(null);

  const submit = () => {
    const graded = challenge.grade(code);
    setResult(graded.result);
    setVerdict({ ok: graded.ok, message: graded.message });
    setRanSource(code);
    onAnswer(graded.ok);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="space-y-4">
        <Panel className="overflow-hidden">
          <PanelHeader
            eyebrow={KIND_LABEL[challenge.kind]}
            title={challenge.title}
            domain="spark"
            description={challenge.prompt}
            right={solved ? <Badge domain="code">solved ✓</Badge> : null}
          />

          <div className="border-b border-line bg-math/6 px-5 py-3">
            <div className="eyebrow mb-1 text-math">Target</div>
            <MathExpr className="text-[19px] text-paper">{challenge.goal}</MathExpr>
          </div>

          <div className="p-3">
            <CodeEditor
              value={code}
              onChange={setCode}
              errorLine={result?.lesson?.line}
              minRows={11}
            />
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <button
              onClick={() => { setCode(challenge.starter); setResult(null); setVerdict(null); }}
              className="text-[11.5px] text-faint transition-colors hover:text-muted"
            >
              Reset
            </button>
            <Button variant="code" onClick={submit} className="px-5">
              <Icon name="play" size={12} />
              Run &amp; check
            </Button>
          </div>
        </Panel>

        {verdict && (
          <div
            className={cx(
              'animate-rise rounded-lg border px-4 py-3.5',
              verdict.ok ? 'border-code/45 bg-code/10' : 'border-spark/40 bg-spark/8',
            )}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className={verdict.ok ? 'text-code' : 'text-spark'}>{verdict.ok ? '✓' : '→'}</span>
              <span className="text-[13.5px] font-semibold text-paper">
                {verdict.ok ? 'Correct' : 'Not yet'}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">{verdict.message}</p>
          </div>
        )}

        <Panel>
          <PanelHeader
            eyebrow="Stuck?"
            title="Hints"
            domain="viz"
            right={
              hintsShown < challenge.hints.length ? (
                <Button
                  onClick={() => setHintsShown((n) => n + 1)}
                  className="px-3 py-1.5 text-[12px]"
                >
                  Show a hint ({challenge.hints.length - hintsShown} left)
                </Button>
              ) : (
                <span className="text-[11.5px] text-faint">all hints shown</span>
              )
            }
          />
          <div className="space-y-2 p-4">
            {hintsShown === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-faint">
                Try it first — the last step is always yours.
              </p>
            ) : (
              challenge.hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-md border border-line bg-surface/50 px-3 py-2">
                  <span className="mt-0.5 text-[11px] font-semibold text-viz">{i + 1}</span>
                  <p className="text-[12.5px] leading-relaxed text-muted">{h}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <SolutionPanel
          itemId={challenge.id}
          code={challenge.solution}
          unlocked={hintsShown >= challenge.hints.length}
          lockedHint="Read all the hints first — the answer unlocks after the last one."
          onReveal={() => recordSolution(challenge.id)}
          onUse={(c) => { setCode(c); setResult(null); setVerdict(null); setRanSource(null); }}
        />
      </div>

      <div className="space-y-4">
        {/* ---- What the code returns, drawn ------------------------------- */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title={<MathExpr>{`${challenge.visual.fn}(x)`}</MathExpr>}
            icon="chart"
            domain="spark"
            info="Your function, drawn from your code after each run: solid is yours, dashed is the goal, rings are points to hit, green lines are conditions. The chips are the values it returned at the test inputs."
            right={
              verdict ? (
                <Badge domain={verdict.ok ? 'code' : 'spark'}>{verdict.ok ? 'matches' : 'not yet'}</Badge>
              ) : null
            }
          />
          <div className="p-3">
            <ReturnVisual visual={challenge.visual} source={ranSource} height={280} />
          </div>
        </Panel>

        {/* ---- What it printed ------------------------------------------- */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader title="Output" icon="code" domain="viz" />
          <div className="min-h-[200px] flex-1 p-4">
            <OutputPanel result={result} graphHeight={220} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- predict answers

function PredictView({
  challenge,
  solved,
  onAnswer,
}: {
  challenge: Extract<Challenge, { kind: 'predict' }>;
  solved: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const submit = () => {
    if (picked === null) return;
    setRevealed(true);
    onAnswer(picked === challenge.answer);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={KIND_LABEL.predict}
          title={challenge.title}
          domain="spark"
          description={challenge.prompt}
          right={solved ? <Badge domain="code">solved ✓</Badge> : null}
        />

        <div className="border-b border-line bg-ink/60 px-5 py-4">
          <pre className="code-surface overflow-x-auto text-[13.5px] text-paper/90">
            {challenge.code}
          </pre>
        </div>

        <div className="space-y-1.5 p-4">
          {challenge.options.map((option, i) => {
            const isPicked = picked === i;
            const isAnswer = i === challenge.answer;
            return (
              <button
                key={i}
                disabled={revealed}
                onClick={() => setPicked(i)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-all',
                  revealed && isAnswer && 'border-code/60 bg-code/12 text-paper',
                  revealed && isPicked && !isAnswer && 'border-danger/60 bg-danger/12 text-paper',
                  revealed && !isPicked && !isAnswer && 'border-line text-faint opacity-55',
                  !revealed && isPicked && 'border-spark/70 bg-spark/10 text-paper',
                  !revealed && !isPicked && 'border-line bg-surface/50 text-muted hover:border-spark/40 hover:text-paper',
                )}
              >
                <span
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-semibold',
                    isPicked ? 'border-spark bg-spark/20 text-spark' : 'border-faint text-faint',
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="code-surface text-[13px]">{option}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-line px-4 py-3">
          {revealed ? (
            <button
              onClick={() => { setRevealed(false); setPicked(null); }}
              className="text-[12px] text-faint transition-colors hover:text-muted"
            >
              Try again
            </button>
          ) : (
            <Button variant="primary" onClick={submit} disabled={picked === null} className="w-full">
              {picked === null ? 'Choose an answer' : 'Check my answer'}
            </Button>
          )}
        </div>
      </Panel>

      <div className="space-y-4">
        {revealed ? (
          <div
            className={cx(
              'animate-rise rounded-lg border px-4 py-3.5',
              picked === challenge.answer ? 'border-code/45 bg-code/10' : 'border-math/45 bg-math/10',
            )}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className={picked === challenge.answer ? 'text-code' : 'text-math'}>
                {picked === challenge.answer ? '✓' : '↻'}
              </span>
              <span className="text-[13.5px] font-semibold text-paper">
                {picked === challenge.answer ? 'Correct' : 'Worth a closer look'}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">{challenge.explanation}</p>
          </div>
        ) : (
          <Panel>
            <PanelHeader eyebrow="Hints" title="Before you run it" domain="viz" />
            <div className="p-4">
              {challenge.hints.map((h, i) => (
                <p key={i} className="text-[12.5px] leading-relaxed text-muted">
                  {h}
                </p>
              ))}
            </div>
          </Panel>
        )}

        <Panel>
          <PanelHeader
            title="Reading before running"
            icon="eye"
            domain="math"
            info="Predicting output is how you find out whether you understand a program or merely recognise it. A programmer who can say what code will do before running it can debug; one who cannot is guessing."
          />
        </Panel>
      </div>
    </div>
  );
}
