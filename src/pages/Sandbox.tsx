/**
 * Sandbox - the free exploration area, in two halves.
 *
 * MathSandbox lets a student type functions and drive them with sliders. It is
 * deliberately built on the same Python engine as everything else: the
 * expression you type is Python, so experimenting with a curve is already
 * practice at writing code. There is no separate "maths syntax" to unlearn.
 *
 * PythonSandbox is the open editor, with saved experiments alongside it.
 */

import { useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '../components/code/CodeEditor';
import { OutputPanel } from '../components/code/OutputPanel';
import { Graph2D, type Curve } from '../components/graph/Graph2D';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import { ParameterSlider } from '../components/ui/Slider';
import {
  Badge, EmptyState, IconButton, Panel, PanelHeader, cx,
} from '../components/ui/Primitives';
import { Icon } from '../components/ui/Icon';
import { InfoDot, Tooltip } from '../components/ui/Tooltip';
import { compileFunction, runPython, type PythonResult } from '../lib/pyengine';
import { fmtCode } from '../lib/math/functions';
import { useProgress } from '../state/progress';

type Tab = 'maths' | 'python';

const CURVE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24'];

interface Expression {
  id: number;
  text: string;
  visible: boolean;
}

const DEFAULT_EXPRESSIONS: Expression[] = [
  { id: 1, text: 'a*x**2 + b*x + c', visible: true },
  { id: 2, text: 'a*math.sin(b*x) + c', visible: false },
  { id: 3, text: 'a*x + c', visible: true },
];

export function Sandbox() {
  const [tab, setTab] = useState<Tab>('maths');

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LoopRibbon active={['create', 'visualise']} />
          <h1 className="sr-only">Sandbox</h1>
          <InfoDot label="Sandbox. Nothing to complete and nothing being marked. Type a function, drive it with sliders, or write a program from a blank page - and keep whatever you make." />
        </div>
        <div className="flex items-center gap-1.5" role="tablist">
          <IconButton icon="function" label="MathSandbox" tone="math" on={tab === 'maths'} onClick={() => setTab('maths')} role="tab" aria-selected={tab === 'maths'} />
          <IconButton icon="code" label="Python Sandbox" tone="code" on={tab === 'python'} onClick={() => setTab('python')} role="tab" aria-selected={tab === 'python'} />
        </div>
      </header>

      {tab === 'maths' ? <MathSandbox /> : <PythonSandbox />}
    </div>
  );
}

// ---------------------------------------------------------------- maths

function MathSandbox() {
  const [expressions, setExpressions] = useState<Expression[]>(DEFAULT_EXPRESSIONS);
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [d, setD] = useState(1);
  const [history, setHistory] = useState<Expression[][]>([]);

  const update = (id: number, text: string) => {
    setHistory((h) => [...h.slice(-19), expressions]);
    setExpressions((xs) => xs.map((e) => (e.id === id ? { ...e, text } : e)));
  };

  const toggle = (id: number) =>
    setExpressions((xs) => xs.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)));

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setExpressions(prev);
    setHistory((h) => h.slice(0, -1));
  };

  // Each expression is compiled through the real Python engine, so what a
  // student types here is genuine Python - the same syntax as everywhere else.
  const compiled = useMemo(
    () =>
      expressions.map((e) => {
        if (!e.visible || !e.text.trim()) return { expr: e, f: null, error: null as string | null };
        const source =
          `import math\n` +
          `a = ${fmtCode(a, 4)}\nb = ${fmtCode(b, 4)}\nc = ${fmtCode(c, 4)}\nd = ${fmtCode(d, 4)}\n` +
          `def __f(x):\n    return ${e.text}\n`;
        const probe = runPython(`${source}\n__check = __f(1.0)`);
        if (probe.error) {
          return { expr: e, f: null, error: probe.lesson?.message ?? probe.error.message };
        }
        return { expr: e, f: compileFunction(source, '__f'), error: null };
      }),
    [expressions, a, b, c, d],
  );

  const sliders = (
    <div className="space-y-2.5 p-3">
      <ParameterSlider symbol="a" label="parameter" value={a} onChange={setA} min={-5} max={5} step={0.05} domain="viz" />
      <ParameterSlider symbol="b" label="parameter" value={b} onChange={setB} min={-5} max={5} step={0.05} domain="math" />
      <ParameterSlider symbol="c" label="parameter" value={c} onChange={setC} min={-8} max={8} step={0.05} domain="code" />
      <ParameterSlider symbol="d" label="parameter" value={d} onChange={setD} min={-5} max={5} step={0.05} domain="spark" />
    </div>
  );

  const curves = useMemo<Curve[]>(
    () =>
      compiled.flatMap((item, i): Curve[] =>
        item.f
          ? [{
              f: item.f,
              color: CURVE_COLORS[i % CURVE_COLORS.length],
              width: 2.4,
              label: item.expr.text,
            }]
          : [],
      ),
    [compiled],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            title="Functions of x"
            icon="function"
            domain="math"
            right={<IconButton icon="arrowLeft" label="Undo" tone="neutral" size={14} className="h-8 w-8" disabled={!history.length} onClick={undo} />}
          />
          <div className="space-y-2.5 p-3">
            {compiled.map((item, i) => (
              <div key={item.expr.id}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(item.expr.id)}
                    className="h-3 w-3 shrink-0 rounded-full border transition-colors"
                    style={{
                      background: item.expr.visible ? CURVE_COLORS[i % CURVE_COLORS.length] : 'transparent',
                      borderColor: CURVE_COLORS[i % CURVE_COLORS.length],
                    }}
                    aria-label={`Toggle curve ${i + 1}`}
                  />
                  <span className="font-math text-[14px] italic text-muted">y =</span>
                  <input
                    value={item.expr.text}
                    onChange={(e) => update(item.expr.id, e.target.value)}
                    spellCheck={false}
                    className={cx(
                      'code-surface min-w-0 flex-1 rounded-md border bg-ink/60 px-2 py-1.5 text-[12.5px] text-paper outline-none transition-colors',
                      item.error ? 'border-danger/50' : 'border-line focus:border-viz/50',
                    )}
                  />
                </div>
                {item.error && item.expr.visible && (
                  <p className="ml-5 mt-1 text-[11px] leading-snug text-danger/90">{item.error}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-line px-3 py-2 text-[11px] text-faint">
            <Icon name="code" size={12} className="text-code" />
            real Python
            <code className="rounded bg-surface-2 px-1 text-code">**</code>
            <code className="rounded bg-surface-2 px-1 text-code">*</code>
            <code className="rounded bg-surface-2 px-1 text-code">math.sin</code>
            <InfoDot label="What you type here is genuine Python: ** for powers, * for multiplication, and the whole math module." />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Parameters" icon="sliders" domain="viz" />
          {sliders}
          <div className="flex justify-end border-t border-line px-3 py-2">
            <IconButton
              icon="reset"
              label="Reset everything"
              tone="neutral"
              onClick={() => { setA(1); setB(0); setC(0); setD(1); setExpressions(DEFAULT_EXPRESSIONS); setHistory([]); }}
            />
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="glass-chip flex h-7 w-7 items-center justify-center text-viz"><Icon name="chart" size={14} /></span>
          <div className="flex flex-wrap gap-2">
            {curves.map((curve, i) => (
              <Badge key={i} domain="neutral" className="font-mono">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: curve.color }} />
                {curve.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="p-3">
          {curves.length ? (
            <Graph2D
              curves={curves}
              view={{ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }}
              height={520}
              fullscreenOverlay={sliders}
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center">
              <EmptyState
                icon="function"
                title="No visible functions"
                hint="Switch a curve back on with the coloured dot, or type an expression."
              />
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

// --------------------------------------------------------------- python

const SANDBOX_START = `# A blank page. Try something.\n\nfor x in range(-5, 6):\n    y = x**2\n    print(x, y)\n\n# or draw:\n# from shapes import *\n# polygon(6, 2)\n`;

function PythonSandbox() {
  const { state, saveExperiment, deleteExperiment, recordRun } = useProgress();
  const [code, setCode] = useState(SANDBOX_START);
  const [result, setResult] = useState<PythonResult | null>(null);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  const run = () => {
    const r = runPython(code);
    setResult(r);
    recordRun('sandbox', !!r.error, r.error?.type);
  };

  const save = () => {
    saveExperiment(name.trim() || `Experiment ${state.experiments.length + 1}`, code);
    setName('');
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/codelab?code=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_270px]">
      <div className="space-y-3">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="glass-chip flex h-7 w-7 items-center justify-center text-code"><Icon name="flask" size={14} /></span>
            <Tooltip label="Run  (Ctrl + Enter)">
              <button onClick={run} className="btn btn-code h-[38px] px-5" aria-label="Run">
                <Icon name="play" size={13} />
              </button>
            </Tooltip>
          </div>
          <div
            className="px-3 pb-3"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                run();
              }
            }}
          >
            <CodeEditor value={code} onChange={setCode} errorLine={result?.lesson?.line} minRows={20} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="name"
              aria-label="Experiment name"
              className="glass-chip min-w-0 flex-1 px-3 py-2 text-[12.5px] text-paper outline-none focus:border-code/50"
            />
            <IconButton icon="save" label="Save" tone="code" onClick={save} />
            <IconButton icon={copied ? 'check' : 'link'} label={copied ? 'Link copied' : 'Copy link'} tone="viz" on={copied} onClick={share} />
            <IconButton icon="reset" label="Reset" tone="neutral" onClick={() => { setCode(SANDBOX_START); setResult(null); }} />
            <IconButton icon="trash" label="Clear" tone="neutral" onClick={() => { setCode(''); setResult(null); }} />
          </div>
        </Panel>
      </div>

      <Panel className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-3">
          <span className="glass-chip flex h-7 w-7 items-center justify-center text-viz"><Icon name="chart" size={14} /></span>
        </div>
        <div className="min-h-[480px] flex-1 p-3">
          <OutputPanel result={result} graphHeight={300} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={<span className="tabular-nums">{state.experiments.length}</span>}
          icon="save"
          domain="math"
          info="Saved experiments. Click one to load it."
        />
        <div className="max-h-[560px] space-y-1.5 overflow-y-auto p-2.5">
          {state.experiments.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-faint">—</p>
          ) : (
            state.experiments.map((exp) => (
              <div key={exp.id} className="rounded-lg border border-line bg-surface/40 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => { setCode(exp.code); setResult(null); }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-[12.5px] font-medium text-paper">{exp.name}</div>
                    <div className="mt-0.5 text-[10.5px] text-faint">
                      {new Date(exp.createdAt).toLocaleString()}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteExperiment(exp.id)}
                    className="shrink-0 text-[13px] leading-none text-faint transition-colors hover:text-danger"
                    aria-label={`Delete ${exp.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
