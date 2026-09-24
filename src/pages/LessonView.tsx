/**
 * A single lesson: explanation on the left, code in the centre, result on the
 * right - the layout the brief specifies, and the one that keeps the concept
 * visible while the student is typing.
 *
 * The lesson is only marked complete when the task actually passes, and the
 * task is graded by running the code rather than by comparing text.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CodeEditor } from '../components/code/CodeEditor';
import { OutputPanel } from '../components/code/OutputPanel';
import { CodeMathMap } from '../components/learn/CodeMathMap';
import { SolutionPanel } from '../components/learn/SolutionPanel';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import { Badge, Button, MathExpr, Panel, PanelHeader, cx } from '../components/ui/Primitives';
import { LESSONS, getLesson, type Block } from '../content/lessons';
import { runPython, type PythonResult } from '../lib/pyengine';
import { useProgress } from '../state/progress';

export function LessonView() {
  const { lessonId } = useParams();
  const lesson = getLesson(lessonId ?? '');
  const { completeLesson, recordRun, recordSolution, state } = useProgress();

  const [code, setCode] = useState(lesson?.starter ?? '');
  const [result, setResult] = useState<PythonResult | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; message: string } | null>(null);

  const index = useMemo(() => LESSONS.findIndex((l) => l.id === lessonId), [lessonId]);
  const next = index >= 0 ? LESSONS[index + 1] : undefined;

  if (!lesson) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted">That lesson does not exist.</p>
        <Link to="/learn" className="mt-4 inline-block">
          <Button variant="primary">Back to the pathway</Button>
        </Link>
      </div>
    );
  }

  const done = state.completedLessons.includes(lesson.id);

  const run = () => {
    const r = runPython(code);
    setResult(r);
    recordRun(`lesson:${lesson.id}`, !!r.error, r.error?.type);
    const v = lesson.check(r);
    setVerdict(v);
    if (v.ok && !done) completeLesson(lesson.id, [lesson.pythonTopic, ...lesson.mathTopics]);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <LoopRibbon active={['learn', 'code', 'test']} className="mb-5" />

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/learn" className="text-[12px] text-faint hover:text-muted">
              Python × Mathematics
            </Link>
            <span className="text-faint">/</span>
            <Badge domain="code">Level {lesson.level}</Badge>
            {done && <Badge domain="code">completed ✓</Badge>}
          </div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[30px]">
            {lesson.title}
          </h1>
          <p className="mt-1 text-[14px] text-muted">{lesson.subtitle}</p>
        </div>
        {next && (
          <Link
            to={`/learn/${next.id}`}
            className="rounded-lg border border-line bg-surface/60 px-3.5 py-2 text-[12.5px] font-medium text-muted transition-colors hover:border-code/40 hover:text-code"
          >
            Next: {next.title} →
          </Link>
        )}
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        {/* ---- LEFT: the lesson ------------------------------------------ */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="Learn" title="The idea" domain="math" />
            <div className="space-y-4 p-5">
              {lesson.blocks.map((block, i) => (
                <BlockView key={i} block={block} />
              ))}
            </div>
          </Panel>

          {lesson.map && (
            <CodeMathMap
              title="Code → Math"
              maths={lesson.map.maths}
              python={lesson.map.python}
              pairings={lesson.map.pairings}
            />
          )}

          <Panel>
            <PanelHeader eyebrow="Watch out" title="Common mistakes" domain="spark" />
            <div className="divide-y divide-line">
              {lesson.mistakes.map((m, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-danger/25 bg-danger/8 px-2.5 py-1.5">
                      <div className="eyebrow mb-1 text-danger">Not this</div>
                      <pre className="code-surface whitespace-pre-wrap text-[12px] text-paper/80">{m.wrong}</pre>
                    </div>
                    <div className="rounded-md border border-code/25 bg-code/8 px-2.5 py-1.5">
                      <div className="eyebrow mb-1 text-code">This</div>
                      <pre className="code-surface whitespace-pre-wrap text-[12px] text-paper/80">{m.right}</pre>
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-faint">{m.why}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Take away" title="Key concepts" domain="viz" />
            <ul className="space-y-2 p-5">
              {lesson.keyConcepts.map((k) => (
                <li key={k} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-viz" />
                  {k}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* ---- CENTRE: the task -------------------------------------------- */}
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="Your turn"
              title="Task"
              domain="code"
              description={lesson.task}
              right={
                <Button variant="code" onClick={run} className="px-5">
                  ▶ Run &amp; check
                </Button>
              }
            />
            <div className="p-3">
              <CodeEditor
                value={code}
                onChange={setCode}
                errorLine={result?.lesson?.line}
                minRows={14}
              />
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <button
                onClick={() => { setCode(lesson.starter); setResult(null); setVerdict(null); }}
                className="text-[11.5px] text-faint transition-colors hover:text-muted"
              >
                Reset to the starting code
              </button>
              <Button variant="code" onClick={run} className="px-4 py-1.5 text-[12.5px]">
                ▶ Run &amp; check
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
                <span className={verdict.ok ? 'text-code' : 'text-spark'}>
                  {verdict.ok ? '✓' : '→'}
                </span>
                <span className="text-[13.5px] font-semibold text-paper">
                  {verdict.ok ? 'Task complete' : 'Not there yet'}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{verdict.message}</p>

              {verdict.ok && next && (
                <Link to={`/learn/${next.id}`} className="mt-3 inline-block">
                  <Button variant="primary" className="px-4 py-1.5 text-[12.5px]">
                    Continue to {next.title} →
                  </Button>
                </Link>
              )}
            </div>
          )}

          <SolutionPanel
            itemId={lesson.id}
            code={lesson.solution}
            unlocked={verdict !== null}
            lockedHint="Run your own attempt first — the answer unlocks after one try."
            onReveal={() => recordSolution(lesson.id)}
            onUse={(c) => { setCode(c); setResult(null); setVerdict(null); }}
          />
        </div>

        {/* ---- RIGHT: the result --------------------------------------------- */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader eyebrow="Output" title="What your program produced" domain="viz" />
          <div className="min-h-[420px] flex-1 p-4">
            <OutputPanel result={result} graphHeight={250} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'text':
      return <p className="text-[14px] leading-relaxed text-muted">{block.body}</p>;

    case 'math':
      return (
        <div className="rounded-lg border border-math/25 bg-math/8 px-4 py-3 text-center">
          <MathExpr className="text-[22px] text-paper">{block.expr}</MathExpr>
          {block.caption && <div className="mt-1.5 text-[11.5px] text-faint">{block.caption}</div>}
        </div>
      );

    case 'code':
      return (
        <div className="overflow-hidden rounded-lg border border-code/25 bg-code/6">
          <pre className="code-surface overflow-x-auto px-4 py-3 text-[12.5px] text-paper/90">
            {block.code}
          </pre>
          {block.caption && (
            <div className="border-t border-code/20 px-4 py-1.5 text-[11.5px] text-faint">
              {block.caption}
            </div>
          )}
        </div>
      );

    case 'callout':
      return (
        <div
          className={cx(
            'rounded-lg border px-4 py-3',
            block.tone === 'insight' ? 'border-viz/30 bg-viz/8' : 'border-spark/35 bg-spark/8',
          )}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className={block.tone === 'insight' ? 'text-viz' : 'text-spark'}>
              {block.tone === 'insight' ? '◆' : '⚠'}
            </span>
            <span className="text-[13px] font-semibold text-paper">{block.title}</span>
          </div>
          <p className="text-[13px] leading-relaxed text-muted">{block.body}</p>
        </div>
      );

    case 'compare':
      return (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="grid gap-px bg-line sm:grid-cols-2">
            <div className="bg-surface px-4 py-3">
              <div className="eyebrow mb-1.5 text-math">Mathematics</div>
              <MathExpr className="text-[18px] text-paper">{block.maths}</MathExpr>
            </div>
            <div className="bg-surface px-4 py-3">
              <div className="eyebrow mb-1.5 text-code">Python</div>
              <pre className="code-surface whitespace-pre-wrap text-[13px] text-paper">
                {block.python}
              </pre>
            </div>
          </div>
          <div className="border-t border-line bg-surface/60 px-4 py-2 text-[12px] leading-relaxed text-faint">
            {block.note}
          </div>
        </div>
      );
  }
}
