/**
 * CodeLab - write Python, run it, see the mathematics come back.
 *
 * Layout follows the brief: guidance on the left, the editor in the centre,
 * live output and graphs on the right. Everything runs in the MathXplore Python
 * Engine, so there is no waiting for a runtime to download and no way for
 * student code to reach anything outside this panel.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CodeEditor } from '../components/code/CodeEditor';
import { OutputPanel } from '../components/code/OutputPanel';
import { LoopRibbon } from '../components/layout/LoopRibbon';
import { Badge, IconButton, MathExpr, Panel, cx } from '../components/ui/Primitives';
import { Icon } from '../components/ui/Icon';
import { InfoDot, Tooltip } from '../components/ui/Tooltip';
import { runPython, type PythonResult } from '../lib/pyengine';
import { useProgress } from '../state/progress';

interface Starter {
  id: string;
  name: string;
  level: string;
  note: string;
  code: string;
}

const STARTERS: Starter[] = [
  {
    id: 'hello',
    name: 'Variables',
    level: 'Level 1',
    note: 'A value stored in a name, then used in a calculation.',
    code: 'a = 5\nb = 3\n\nresult = a + b\nprint(result)\n',
  },
  {
    id: 'powers',
    name: 'Powers and roots',
    level: 'Level 2',
    note: 'How x², √x and 2x are written in Python.',
    code: 'import math\n\nx = 5\n\nprint(x**2)          # x squared\nprint(math.sqrt(x))  # the square root of x\nprint(2*x + 3)       # note the * — Python needs it\n',
  },
  {
    id: 'discriminant',
    name: 'Classify a quadratic',
    level: 'Level 3',
    note: 'if / elif / else applied to the discriminant.',
    code: 'a = 1\nb = -5\nc = 6\n\nD = b**2 - 4*a*c\nprint("discriminant:", D)\n\nif D > 0:\n    print("Two real roots")\nelif D == 0:\n    print("One repeated root")\nelse:\n    print("No real roots")\n',
  },
  {
    id: 'table',
    name: 'A table of squares',
    level: 'Level 4',
    note: 'A loop building the table you would otherwise write by hand.',
    code: 'for x in range(1, 11):\n    print(x, x**2)\n',
  },
  {
    id: 'sum',
    name: 'Summation',
    level: 'Level 4',
    note: 'A running total — the Σ sign, one term at a time.',
    code: 'total = 0\n\nfor n in range(1, 101):\n    total += n\n\nprint("1 + 2 + ... + 100 =", total)\n',
  },
  {
    id: 'function',
    name: 'f(x) as a function',
    level: 'Level 5',
    note: 'The moment mathematical notation becomes runnable code.',
    code: 'def quadratic(x, a, b, c):\n    return a*x**2 + b*x + c\n\nprint(quadratic(2, 1, -3, 2))\nprint(quadratic(0, 1, -3, 2))\n',
  },
  {
    id: 'plot',
    name: 'Code → graph',
    level: 'Level 6',
    note: 'A loop makes the numbers; plot turns them into a picture.',
    code: 'xs = []\nys = []\n\nfor i in range(-50, 51):\n    x = i / 10\n    xs.append(x)\n    ys.append(x**2)\n\nplot(xs, ys, label="y = x²")\n',
  },
  {
    id: 'compare',
    name: 'Two curves at once',
    level: 'Level 6',
    note: 'Plot a function directly, then compare it with another.',
    code: 'def f(x):\n    return x**2\n\ndef g(x):\n    return -0.5*x**2 + 4\n\nplot(f, -5, 5, label="y = x²")\nplot(g, -5, 5, label="y = −0.5x² + 4")\n',
  },
  {
    id: 'wave',
    name: 'A wave',
    level: 'Level 6',
    note: 'Trigonometry from the math module, sampled and drawn.',
    code: 'import math\n\nxs = linspace(-2*math.pi, 2*math.pi, 300)\nys = []\n\nfor x in xs:\n    ys.append(2 * math.sin(x))\n\nplot(xs, ys, label="y = 2 sin(x)")\nprint("period:", 2*math.pi)\n',
  },
  {
    id: 'projectile',
    name: 'Model a throw',
    level: 'Application',
    note: 'A quadratic model of projectile motion, with its landing time.',
    code: 'v = 20        # launch speed, metres per second\ng = 9.8\n\ndef height(t):\n    return v*t - 0.5*g*t**2\n\nts = linspace(0, 2*v/g, 200)\nhs = []\nfor t in ts:\n    hs.append(height(t))\n\nplot(ts, hs, label="height against time")\n\nprint("highest point:", height(v/g), "m")\nprint("lands after:", 2*v/g, "s")\n',
  },
  {
    id: 'shapes',
    name: 'Shapes',
    level: 'Geometry',
    note: 'The shapes library: draw a shape, then ask it for its own measurements.',
    code: 'from shapes import *\n\nc = circle(2, color="cyan")\ns = square(3, at=(5, 0), color="violet")\n\nprint("circle area:", round(c.area, 2))\nprint("square area:", s.area)\n\ns.rotate(45)\n',
  },
  {
    id: 'turtle',
    name: 'Turtle',
    level: 'Geometry',
    note: 'The classic turtle: a pen that walks. A loop draws a polygon.',
    code: 'import turtle\n\nsides = 7\nfor i in range(sides):\n    turtle.forward(60)\n    turtle.left(360 / sides)\n\nprint("turned", 360, "degrees in total")\n',
  },
  {
    id: 'solids',
    name: 'Solids',
    level: 'Geometry',
    note: 'Three-dimensional shapes stand on the ground at z = 0 and report their volume.',
    code: 'from shapes import *\n\nb = cube(2, color="violet")\ns = sphere(1, at=(3.5, 0, 0), color="cyan")\nk = cone(1, 2.5, at=(-3.5, 0, 0), color="amber")\n\nfor shape in [b, s, k]:\n    print(shape.name, round(shape.volume, 2))\n',
  },
];

const REFERENCE = [
  { maths: 'x^2', python: 'x**2', note: 'two stars, not ^' },
  { maths: '2x', python: '2*x', note: 'multiplication is never implied' },
  { maths: '√x', python: 'math.sqrt(x)', note: 'needs import math' },
  { maths: 'x ÷ y', python: 'x / y', note: 'always gives a decimal' },
  { maths: 'sin x', python: 'math.sin(x)', note: 'works in radians' },
  { maths: 'π', python: 'math.pi', note: '3.14159…' },
  { maths: 'f(x) = x^2', python: 'def f(x):\n    return x**2', note: 'the same definition' },
  { maths: '|x|', python: 'abs(x)', note: 'no import needed' },
  { maths: 'A = πr^2', python: 'circle(r).area', note: 'from shapes import *' },
  { maths: 'V = s^3', python: 'cube(s).volume', note: 'from shapes import *' },
];

export function CodeLab() {
  const [params, setParams] = useSearchParams();
  const { recordRun, saveExperiment } = useProgress();

  const initial = params.get('code') ?? STARTERS[6].code;
  const [code, setCode] = useState(initial);
  const [result, setResult] = useState<PythonResult | null>(null);
  const [activeStarter, setActiveStarter] = useState<string | null>(params.get('code') ? null : 'plot');
  const [saved, setSaved] = useState<string | null>(null);

  // Code handed over from an Explore module arrives in the URL.
  useEffect(() => {
    const incoming = params.get('code');
    if (incoming) {
      setCode(incoming);
      setResult(null);
      setActiveStarter(null);
      params.delete('code');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    const r = runPython(code);
    setResult(r);
    recordRun('codelab', !!r.error, r.error?.type);
  };

  const load = (starter: Starter) => {
    setCode(starter.code);
    setActiveStarter(starter.id);
    setResult(null);
  };

  const save = () => {
    const first = code.split('\n').find((l) => l.trim() && !l.trim().startsWith('#'));
    const name = (first ?? 'experiment').trim().slice(0, 40);
    saveExperiment(name, code);
    setSaved(name);
    setTimeout(() => setSaved(null), 2600);
  };

  const starter = useMemo(() => STARTERS.find((s) => s.id === activeStarter), [activeStarter]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LoopRibbon active={['code', 'test']} />
          <h1 className="sr-only">CodeLab</h1>
          <InfoDot label="CodeLab. Write Python, get mathematics back. Everything runs in the browser using the MathXplore Python Engine - no installation, no download, and no way for your program to reach outside this page." />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <IconButton icon={saved ? 'check' : 'save'} label={saved ? 'Saved' : 'Save'} tone="code" on={!!saved} onClick={save} />
          <IconButton icon="trash" label="Clear" tone="neutral" onClick={() => { setCode(''); setResult(null); setActiveStarter(null); }} />
          <IconButton icon="reset" label="Reset example" tone="neutral" disabled={!starter} onClick={() => { if (starter) load(starter); }} />
          <Tooltip label="Run  (Ctrl + Enter)">
            <button onClick={run} className="btn btn-code h-[38px] px-5" aria-label="Run">
              <Icon name="play" size={13} />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ---- LEFT: guidance ------------------------------------------- */}
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center gap-2 px-3 pt-3">
              <span className="glass-chip flex h-7 w-7 items-center justify-center text-math"><Icon name="book" size={14} /></span>
            </div>
            <div className="max-h-[380px] space-y-1 overflow-y-auto p-2.5">
              {STARTERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => load(s)}
                  className={cx(
                    'w-full rounded-xl border px-3 py-2 text-left transition-all',
                    s.id === activeStarter
                      ? 'border-code/50 bg-code/10 shadow-[0_0_20px_-8px_rgba(62,230,168,0.8)]'
                      : 'border-transparent hover:border-line hover:bg-surface-2',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cx('text-[12.5px] font-medium', s.id === activeStarter ? 'text-paper' : 'text-muted')}>
                      {s.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-faint">{s.level}</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 px-3 pt-3 pb-1">
              <span className="glass-chip flex h-7 w-7 items-center justify-center text-code"><Icon name="function" size={14} /></span>
              <InfoDot label="Where Python notation differs from mathematical notation, plus the ones that catch people out. Hover a row for the note." />
            </div>
            <div className="divide-y divide-line">
              {REFERENCE.map((r) => (
                <Tooltip key={r.python} label={r.note} className="block w-full">
                  <span className="flex w-full cursor-help items-center gap-3 px-3 py-1.5 transition-colors hover:bg-surface-2/50">
                    <MathExpr className="w-14 shrink-0 text-[14px] text-math">{r.maths}</MathExpr>
                    <Icon name="arrowRight" size={11} className="shrink-0 text-faint" />
                    <pre className="code-surface min-w-0 flex-1 whitespace-pre-wrap text-left text-[12px] text-code">
                      {r.python}
                    </pre>
                  </span>
                </Tooltip>
              ))}
            </div>
          </Panel>
        </div>

        {/* ---- CENTRE: the editor ---------------------------------------- */}
        <div className="space-y-3">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="glass-chip flex h-7 w-7 items-center justify-center text-code"><Icon name="code" size={14} /></span>
                {starter && (
                  <Tooltip label={starter.note}>
                    <Badge domain="code" className="cursor-help">{starter.name}</Badge>
                  </Tooltip>
                )}
              </div>
              <span className="font-mono text-[10.5px] text-faint">{code.split('\n').length}</span>
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
              <CodeEditor
                value={code}
                onChange={setCode}
                errorLine={result?.lesson?.line}
                minRows={18}
              />
            </div>
          </Panel>
        </div>

        {/* ---- RIGHT: results --------------------------------------------- */}
        <Panel className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3">
            <span className="glass-chip flex h-7 w-7 items-center justify-center text-viz"><Icon name="chart" size={14} /></span>
          </div>
          <div className="min-h-[460px] flex-1 p-3">
            <OutputPanel result={result} graphHeight={280} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
