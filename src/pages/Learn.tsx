/**
 * Learn hub - the Python × Mathematics pathway as a route, not a menu.
 *
 * The levels are shown in order, with what each one unlocks mathematically,
 * because the sequence itself is part of the teaching: powers are needed before
 * quadratics, loops before graphs, functions before anything can be plotted.
 */

import { Link } from 'react-router-dom';
import { LESSONS } from '../content/lessons';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import { Badge, Meter, Panel, Ring, cx } from '../components/ui/Primitives';
import { InfoDot } from '../components/ui/Tooltip';
import { PYTHON_TOPICS, useProgress } from '../state/progress';

export function LearnHub() {
  const { state, mastery, overall } = useProgress();

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LoopRibbon active={['learn', 'code']} />
          <h1 className="sr-only">Learn Python × Mathematics: six levels</h1>
          <InfoDot label="Six levels of Python × Mathematics. Not one of them teaches Python for its own sake. Every concept arrives because a piece of mathematics needed it: variables because formulas have letters in them, loops because sequences repeat, functions because f(x) already means something to you." />
        </div>
        <Ring value={overall.python} domain="code" size={44} label="Python overall" />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {LESSONS.map((lesson) => {
          const done = state.completedLessons.includes(lesson.id);
          const progress = mastery(lesson.pythonTopic);

          return (
            <Link key={lesson.id} to={`/learn/${lesson.id}`} className="group">
              <Panel tilt glow="code" className={cx('h-full overflow-hidden', done && 'border-code/35')}>
                <div className="flex items-start gap-4 p-5">
                  <div
                    className={cx(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-[15px] font-semibold',
                      done
                        ? 'border-code/50 bg-code/15 text-code'
                        : 'border-line bg-surface-2 text-muted',
                    )}
                  >
                    {done ? '✓' : lesson.level}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-paper">{lesson.title}</h3>
                      <Badge domain={done ? 'code' : 'neutral'}>
                        Level {lesson.level}
                      </Badge>
                      <span className="text-[11px] text-faint">{lesson.minutes} min</span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">{lesson.subtitle}</p>


                    <div className="mt-4 flex items-center gap-3">
                      <Meter value={progress} domain="code" className="flex-1" />
                      <span className="text-[11px] tabular-nums text-faint">{progress}%</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </Link>
          );
        })}
      </div>

      <div className="glass-chip mt-8 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PYTHON_TOPICS.map((topic) => (
            <div key={topic.id}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[12.5px] text-muted">{topic.name}</span>
                <span className={cx('text-[12px] tabular-nums', mastery(topic.id) > 0 ? 'text-code' : 'text-faint')}>
                  {mastery(topic.id)}%
                </span>
              </div>
              <Meter value={mastery(topic.id)} domain="code" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
