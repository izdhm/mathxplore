/**
 * Learning state, and the evidence trail behind it.
 *
 * Two jobs:
 *
 *  1. Drive the student dashboard - mastery per topic, streaks, weak areas,
 *     recommended next steps.
 *  2. Record a genuine, exportable event log so the platform's educational
 *     effect can actually be measured later (see §29 of the brief). Nothing
 *     here invents a result: it records what a learner did, when, and whether
 *     it worked, and it can be exported for a real pre-test/post-test study.
 *
 * Everything is local to the browser. No account, no server, no personal data -
 * only an anonymous participant code that a researcher can match to a consent
 * form offline.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'mathxplore.progress.v1';

// ------------------------------------------------------------------- topics

export const MATH_TOPICS = [
  { id: 'linear', name: 'Linear Functions' },
  { id: 'quadratic', name: 'Quadratic Functions' },
  { id: 'trigonometry', name: 'Trigonometry' },
  { id: 'surfaces', name: '3D Mathematics' },
  { id: 'geometry', name: 'Geometry' },
] as const;

export const PYTHON_TOPICS = [
  { id: 'variables', name: 'Variables' },
  { id: 'operations', name: 'Operations' },
  { id: 'conditions', name: 'Conditions' },
  { id: 'loops', name: 'Loops' },
  { id: 'functions', name: 'Functions' },
  { id: 'visualisation', name: 'Visualisation' },
] as const;

export type MathTopicId = (typeof MATH_TOPICS)[number]['id'];
export type PythonTopicId = (typeof PYTHON_TOPICS)[number]['id'];
export type TopicId = MathTopicId | PythonTopicId;

// ------------------------------------------------------------------- events

export type LearningEvent =
  | { type: 'lesson_completed'; id: string; at: string }
  | { type: 'challenge_attempted'; id: string; correct: boolean; at: string }
  | { type: 'prediction_made'; id: string; predicted: string; correct: boolean; at: string }
  | { type: 'parameter_explored'; id: string; at: string }
  | { type: 'code_run'; id: string; errored: boolean; errorType?: string; at: string }
  | { type: 'experiment_saved'; id: string; at: string }
  | { type: 'solution_viewed'; id: string; at: string };

export interface Experiment {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

interface ProgressState {
  /** Anonymous participant code, for matching to offline consent records. */
  participantId: string;
  startedAt: string;
  mastery: Record<string, number>;
  completedLessons: string[];
  solvedChallenges: string[];
  attemptsByChallenge: Record<string, number>;
  predictions: { id: string; predicted: string; correct: boolean; at: string }[];
  experiments: Experiment[];
  events: LearningEvent[];
  streakDays: number;
  lastActiveDay: string;
}

const EMPTY: ProgressState = {
  participantId: '',
  startedAt: '',
  mastery: {},
  completedLessons: [],
  solvedChallenges: [],
  attemptsByChallenge: {},
  predictions: [],
  experiments: [],
  events: [],
  streakDays: 0,
  lastActiveDay: '',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeParticipantId(): string {
  const n = Math.floor(Math.random() * 1e8).toString(36).toUpperCase();
  return `MX-${n.padStart(6, '0').slice(0, 6)}`;
}

function load(): ProgressState {
  if (typeof localStorage === 'undefined') return { ...EMPTY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('none');
    const parsed = { ...EMPTY, ...(JSON.parse(raw) as Partial<ProgressState>) };
    return parsed.participantId ? parsed : { ...parsed, participantId: makeParticipantId() };
  } catch {
    return { ...EMPTY, participantId: makeParticipantId(), startedAt: new Date().toISOString() };
  }
}

// ------------------------------------------------------------------ context

interface ProgressApi {
  state: ProgressState;
  /** Raise mastery for a topic, never lowering it. Capped at 100. */
  gain: (topic: TopicId, amount: number) => void;
  mastery: (topic: TopicId) => number;
  completeLesson: (id: string, topics: TopicId[]) => void;
  recordChallenge: (id: string, correct: boolean, topics: TopicId[]) => void;
  recordPrediction: (id: string, predicted: string, correct: boolean, topic: TopicId) => void;
  recordExploration: (id: string, topic: TopicId) => void;
  recordRun: (id: string, errored: boolean, errorType?: string) => void;
  /** The student looked at a reference solution. Recorded, never penalised. */
  recordSolution: (id: string) => void;
  saveExperiment: (name: string, code: string) => Experiment;
  deleteExperiment: (id: string) => void;
  reset: () => void;
  exportJson: () => string;
  exportCsv: () => string;
  overall: { maths: number; python: number };
  weakest: { id: string; name: string; value: number; kind: 'maths' | 'python' } | null;
}

const Ctx = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(load);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private mode - the session still works.
    }
  }, [state]);

  // Maintain the learning streak once per day.
  useEffect(() => {
    setState((s) => {
      const day = today();
      if (s.lastActiveDay === day) return s;
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const streakDays = s.lastActiveDay === yesterday ? s.streakDays + 1 : 1;
      return {
        ...s,
        lastActiveDay: day,
        streakDays,
        startedAt: s.startedAt || new Date().toISOString(),
      };
    });
  }, []);

  const log = useCallback((event: LearningEvent) => {
    setState((s) => ({ ...s, events: [...s.events.slice(-999), event] }));
  }, []);

  const gain = useCallback((topic: TopicId, amount: number) => {
    setState((s) => ({
      ...s,
      mastery: { ...s.mastery, [topic]: Math.min(100, (s.mastery[topic] ?? 0) + amount) },
    }));
  }, []);

  const api = useMemo<ProgressApi>(() => {
    const mastery = (topic: TopicId) => state.mastery[topic] ?? 0;

    const average = (ids: readonly { id: string }[]) =>
      Math.round(ids.reduce((sum, t) => sum + (state.mastery[t.id] ?? 0), 0) / ids.length);

    const allTopics = [
      ...MATH_TOPICS.map((t) => ({ ...t, kind: 'maths' as const })),
      ...PYTHON_TOPICS.map((t) => ({ ...t, kind: 'python' as const })),
    ];
    const started = allTopics.filter((t) => (state.mastery[t.id] ?? 0) > 0);
    const pool = started.length ? started : allTopics;
    const weakest = pool.reduce<ProgressApi['weakest']>((low, t) => {
      const value = state.mastery[t.id] ?? 0;
      return !low || value < low.value ? { id: t.id, name: t.name, value, kind: t.kind } : low;
    }, null);

    return {
      state,
      gain,
      mastery,

      completeLesson(id, topics) {
        setState((s) =>
          s.completedLessons.includes(id)
            ? s
            : { ...s, completedLessons: [...s.completedLessons, id] },
        );
        for (const t of topics) gain(t, 12);
        log({ type: 'lesson_completed', id, at: new Date().toISOString() });
      },

      recordChallenge(id, correct, topics) {
        setState((s) => ({
          ...s,
          attemptsByChallenge: { ...s.attemptsByChallenge, [id]: (s.attemptsByChallenge[id] ?? 0) + 1 },
          solvedChallenges:
            correct && !s.solvedChallenges.includes(id)
              ? [...s.solvedChallenges, id]
              : s.solvedChallenges,
        }));
        if (correct) for (const t of topics) gain(t, 15);
        log({ type: 'challenge_attempted', id, correct, at: new Date().toISOString() });
      },

      recordPrediction(id, predicted, correct, topic) {
        const at = new Date().toISOString();
        setState((s) => ({ ...s, predictions: [...s.predictions.slice(-199), { id, predicted, correct, at }] }));
        gain(topic, correct ? 8 : 4); // predicting at all is worth something
        log({ type: 'prediction_made', id, predicted, correct, at });
      },

      recordExploration(id, topic) {
        gain(topic, 2);
        log({ type: 'parameter_explored', id, at: new Date().toISOString() });
      },

      recordRun(id, errored, errorType) {
        log({ type: 'code_run', id, errored, errorType, at: new Date().toISOString() });
      },

      recordSolution(id) {
        log({ type: 'solution_viewed', id, at: new Date().toISOString() });
      },

      saveExperiment(name, code) {
        const exp: Experiment = {
          id: `exp-${Date.now().toString(36)}`,
          name,
          code,
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, experiments: [exp, ...s.experiments].slice(0, 40) }));
        log({ type: 'experiment_saved', id: exp.id, at: exp.createdAt });
        return exp;
      },

      deleteExperiment(id) {
        setState((s) => ({ ...s, experiments: s.experiments.filter((e) => e.id !== id) }));
      },

      reset() {
        const fresh = { ...EMPTY, participantId: makeParticipantId(), startedAt: new Date().toISOString() };
        setState(fresh);
      },

      exportJson() {
        return JSON.stringify(
          {
            schema: 'mathxplore.learning-record.v1',
            exportedAt: new Date().toISOString(),
            note:
              'Anonymous learning record from one browser. The participant code carries no ' +
              'personal data and is intended to be matched to an offline consent record.',
            participantId: state.participantId,
            startedAt: state.startedAt,
            mastery: state.mastery,
            completedLessons: state.completedLessons,
            solvedChallenges: state.solvedChallenges,
            attemptsByChallenge: state.attemptsByChallenge,
            predictions: state.predictions,
            events: state.events,
          },
          null,
          2,
        );
      },

      exportCsv() {
        const rows = [
          ['participant', 'timestamp', 'event', 'item', 'detail'],
          ...state.events.map((e) => [
            state.participantId,
            e.at,
            e.type,
            e.id,
            e.type === 'challenge_attempted' ? `correct=${e.correct}`
            : e.type === 'prediction_made' ? `predicted=${e.predicted};correct=${e.correct}`
            : e.type === 'code_run' ? `errored=${e.errored}`
            : '',
          ]),
        ];
        return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      },

      overall: { maths: average(MATH_TOPICS), python: average(PYTHON_TOPICS) },
      weakest,
    };
  }, [state, gain, log]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
