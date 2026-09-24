# MathXplore v2

**See. Change. Code.**

An interactive mathematics laboratory where students visualise concepts, experiment with
mathematical ideas, build shapes in two and three dimensions, and learn Python through real
mathematical applications.

Built for **PEREKA 2026 / Borneo Festival of Ideas 2026** (education theme).

---

## What is new in v2

**Geometry Lab** (`Explore → Geometry`). A fifth module where the picture is a program. Two
libraries now live inside the Python engine:

```python
from shapes import *          # 2D and 3D primitives with live measurements
import turtle                 # the classic pen-that-walks, as in CPython

c = circle(2, color="cyan")
print(c.area, c.perimeter)    # 12.566..., 12.566...

k = cube(3)
print(k.volume, k.surface_area)

for i in range(6):
    turtle.forward(40)
    turtle.left(60)
```

Every shape is an object whose `area`, `perimeter`, `volume` and `surface_area` are computed from
its *current* state, so `s.move(1, 1).scale(2)` changes the picture and the numbers together. The
Lab's four sliders are injected into the program as the variables `n`, `r`, `h` and `a`, so a
student can write `polygon(n, r)` and then drive it without touching the code. Fourteen preset
programs range from a circle to an orbiting ring of spheres. The same libraries work in CodeLab and the
Python Sandbox - anything drawn appears under the output.

**A new interface.** Frosted-glass panels over a slowly drifting ground, cards that tilt toward the
cursor, a horizon that recedes, and very few words: navigation is icons, progress is rings, the
learning loop is a row of lit dots, and every explanation sits one hover behind an info dot. The
mathematics is the brightest thing on screen. A **light theme** (sun/moon in the header, remembered
between visits) lights the same glass from the front - graphs, shape canvases, 3D views and the
code editor all switch to paper with it. Every graph, canvas and 3D view has a **full-screen**
button, and in full screen the module's sliders appear in an overlay, so an experiment can be
driven at full size (a button hides them when the picture alone is wanted).

**The landing page is a stack of screens.** One idea per screen, centred - the name, the three
modes, the live surface, a What If? with a live slider, a scene of solids, the loop - and the
window snaps from one to the next. Each screen has an arrow to the next, and a button returns to
the top. The live surface's equation is a link to the Surfaces module, where the same surface opens
with its coefficient on a slider.

A note on WebGL: browsers allow only a handful of live WebGL contexts per page (Chrome: 16) and
silently blank the oldest canvas beyond that. The platform therefore probes for WebGL once, releases
the probe, and forces every disposed renderer to give its context back, so navigating around the
site cannot accumulate contexts and leave a 3D view blank.

**What the code returns, drawn.** In Challenges, every run graphs the function the student wrote -
solid - over the goal - dashed - with the points it must hit and the conditions it must meet, and
lists the values it returned at the test inputs. The picture is built from the student's code,
not from the grader, so a wrong answer is shown exactly as wrong as it is.

**Answers, not only hints.** Every code challenge and lesson task now carries a reference
solution. It unlocks after the hints have been read (challenges) or after a first attempt
(lessons), can be loaded into the editor with one click, and viewing it is written to the
learning record as `solution_viewed`, so a researcher can tell an unaided solve from an assisted one.

---

## What this is

Not an online calculator. A calculator answers a question you already knew how to ask. MathXplore
is built around a different loop:

```
LEARN → EXPLORE → PREDICT → CHANGE → VISUALISE → CODE → TEST → UNDERSTAND → CREATE
```

That loop is visible in the interface itself, as a ribbon across the top of every working screen,
so a student can always see which stage they are in — and that there is another one after it.

The educational thesis is one sentence: **mathematics and programming are hard partly because they
are taught apart.** A loop introduced with an arbitrary example teaches syntax; a loop introduced
because a sequence needs generating teaches both subjects at once. So every Python concept in the
platform arrives because a piece of mathematics needed it.

---

## Running it

```bash
npm install
npm run dev        # development server
npm run build      # production build into dist/
npm run preview    # serve the production build
npm test           # all three test suites
```

The built app uses relative asset paths and hash-based routing, so `dist/` can be served from any
static host or subdirectory with no server configuration and no rewrite rules.
**It has no network dependencies at runtime** — once the files are on the machine, it never touches
the internet. That is deliberate: a demonstration that needs working wifi is a demonstration that
can fail.

> **It must be served over http, not opened as a file.** Double-clicking `dist/index.html` gives a
> blank page: browsers block ES module scripts on `file://` for security, so the stylesheet loads
> (dark background) but no JavaScript runs. Use `npm run preview`, or from `dist/` run any static
> server such as `npx serve .` or `python -m http.server`.

---

## Interface principle: progressive disclosure

The explanations in this platform are worth keeping. What they should not do is
fill the screen before anyone has asked for them — a student meeting quadratics
should see a curve and three sliders, not four paragraphs about what a curve is.

So the working screens are visual by default and the words sit one hover (or one
tap) away, behind an info dot. Two rules keep that honest rather than merely
tidy:

- Tooltip text is **always present in the DOM** inside a screen-reader-only
  span, so hiding it visually never hides it from assistive technology.
- Tooltips are portalled to `<body>` in viewport coordinates, so they are never
  clipped by the panels they live inside.

In v2 this is taken to its conclusion. The working screens (the five Explore
modules, CodeLab, Sandbox, Learn) carry almost no running text at all:
controls are icons with their names in tooltips and in screen-reader-only
spans, progress is a ring with a number in it, and headings are equations.
Prose remains where prose is the point: lesson content, What If? questions,
error lessons, and the report pages for teachers and researchers.

Output is designed to be **watched**: printed lines arrive in sequence and
graphs draw themselves on, so the chain code → data → graph is visible rather
than asserted. Both animations are skipped entirely under
`prefers-reduced-motion`.

## Architecture

```
src/
  lib/
    pyengine/          The MathXplore Python Engine (see below)
      tokenizer.ts       source → tokens, including INDENT/DEDENT
      parser.ts          tokens → AST, recursive descent
      ast.ts             node definitions
      values.ts          the Python value model (int/float distinction, native objects)
      interpreter.ts     tree-walking evaluator, builtins, math module, plotting
      geometry.ts        the `shapes` and `turtle` libraries → GeometryScene
      errors.ts          the runtime error type
      hints.ts           errors → lessons
      index.ts           runPython, runAndProbe, compileFunction
    math/functions.ts  Analysis: vertex, roots, discriminant, period, surfaces

  components/
    graph/Graph2D.tsx        Canvas 2D plotter: pan, zoom, trace, annotated features
    graph/ShapeCanvas2D.tsx  Canvas renderer for 2D shapes and turtle paths: auto-fit,
                             draw-on, hover measurements
    graph/Surface3D.tsx      WebGL surface renderer (Three.js)
    graph/ShapeScene3D.tsx   WebGL renderer for solids: glass materials, build-up animation
    graph/WebGLGate.tsx      On-demand loading + WebGL capability fallback
    code/CodeEditor.tsx      Beginner-scale editor: colour, line numbers, error line
    code/OutputPanel.tsx     Printed output, graphs, shapes, and error lessons
    learn/WhatIfPanel.tsx    The signature predict-then-reveal interaction
    learn/CodeMathMap.tsx    Linked mathematics ↔ Python notation
    layout/…                 Shell (icon navigation, ambient ground), loop dots, workspace
    ui/…                     Glass panels, icon buttons, rings, sliders, notation renderer

  content/
    lessons.ts         6-level Python × Mathematics pathway, with graded tasks
    challenges.ts      Assessment bank, with executable graders
    whatif.ts          What If? scenarios
    geometry.ts        Geometry Lab presets and slider definitions

  pages/               Landing, Explore (×5 modules), Learn, CodeLab,
                       Challenges, Sandbox, Progress, Teacher
  state/progress.tsx   Mastery model + exportable evaluation record
```

**Stack:** React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · React Router · Three.js.

Only two runtime dependencies beyond React: `react-router-dom` and `three`. The Python engine, the
2D grapher and the mathematical notation renderer are all first-party, because in each case an
off-the-shelf library would have cost more in fit than it saved in effort.

---

## The MathXplore Python Engine

A tokenizer, parser and tree-walking interpreter for a teaching subset of Python, written in
TypeScript. About 2,800 lines, no dependencies.

### Why not Pyodide?

Pyodide is real CPython and would have been less work. It was rejected for three reasons:

1. **It needs the network and several seconds.** A student's first `print` should not wait on a
   multi-megabyte download, and a competition demonstration should not depend on venue wifi.
2. **Its errors teach nothing.** A raw `SyntaxError: invalid syntax` is a dead end for a beginner.
   Owning the parser means owning the message — see below.
3. **Safety is structural rather than configured.** Student code can reach only the builtins the
   interpreter registers. There is no filesystem, no network, no DOM, no `eval`, no host object.

### What the subset covers

Variables and assignment (including augmented and tuple assignment) · arithmetic with a faithful
`int`/`float` distinction · strings and f-strings with format specs · comparisons and chained
comparisons · boolean logic · `if`/`elif`/`else` · `while` · `for`/`in` · `range` · `break`,
`continue`, `pass` · lists with indexing, slicing and methods · `def`/`return` with default
arguments and recursion · closures · the `math` module · the plotting builtins `plot`,
`scatter` and `linspace` · and, new in v2, the `shapes` and `turtle` libraries with attribute
access and method calls on the objects they return.

### The `shapes` library

```python
from shapes import *
```

| 2D (placed by centre, `at=(x, y)`) | 3D (stand on `at=(x, y, z)`, z up) |
|---|---|
| `circle(r)` · `ellipse(rx, ry)` | `cube(s)` · `box(w, d, h)` |
| `square(s)` · `rect(w, h)` | `sphere(r)` |
| `triangle(base, h)` or `triangle(p1, p2, p3)` | `cylinder(r, h)` · `cone(r, h)` |
| `polygon(n, r)` or `polygon([points])` | `pyramid(base, h, sides=4)` · `prism(n, r, h)` |
| `star(n, outer, inner)` | `torus(R, r)` |
| `line(p1, p2)` · `path([points])` · `point(x, y)` | |

Keyword arguments: `color=` (a named colour or hex), `fill=`, `angle=`, `label=`, `width=`; 3D
also `opacity=`, `wireframe=`, `rotate=(rx, ry, rz)`.

Every call returns a shape with live attributes - `area`, `perimeter`, `x`, `y`, `sides`,
`vertices`, `radius`, `width`, `height` in 2D; `volume`, `surface_area`, `z`, `top`, `height` in
3D - and chainable methods `move(dx, dy[, dz])`, `rotate(deg)`, `scale(k)`, `color(c)`, `fill()`,
`label(text)`. `print(shape)` describes it. `clear()` empties the scene; `count()` says how many
shapes there are. `import geometry` is an alias for `import shapes`.

### The `turtle` library

The CPython turtle API, as far as a first course uses it: `forward`/`fd`, `backward`/`bk`,
`left`/`lt`, `right`/`rt`, `goto`, `setheading`, `home`, `penup`/`pu`, `pendown`/`pd`,
`pensize`, `color`, `pencolor`, `fillcolor`, `begin_fill`/`end_fill`, `circle(r, extent)`,
`dot`, `write`, `hideturtle`/`showturtle`, `position`, `xcor`, `ycor`, `heading`, `distance`,
`reset`, and `Turtle()` objects. `speed`, `done`, `Screen()` and friends are accepted and ignored
so that programs copied from a textbook run unchanged. The picture is drawn when the run ends,
with the turtle shown at its final position and heading.

Runaway drawing is bounded like everything else: a program can make at most 4,000 shapes.

Faithfulness is tested against CPython semantics, including the cases that matter pedagogically:
`4 / 2` is `2.0` but `7 // 2` is `3`; `-3**2` is `-9`; `2**3**2` is `512`; `-7 % 3` is `2`;
`round(0.5)` is `0`.

### Errors as lessons

Every failure produces a plain-language description, an explanation of *why* Python behaves that
way, the corresponding mathematical notation where one exists, and a hint that stops short of the
answer. For example, `y = 2x + 3` produces:

> **Missing multiplication sign** — Python cannot read "2x". In maths, 2x means 2 times x — but
> Python always needs the multiplication sign written out: `2*x`
>
> **Why Python does this:** Mathematics lets you write 2x because a number next to a letter can only
> mean multiplication. Python allows names like `x2` or `rate2`, so it cannot guess.
>
> **Try this:** Find the number that sits directly against a letter, and put a `*` between them.

Runaway loops are stopped by a step budget rather than freezing the tab, and the resulting message
explains what an infinite loop is.

### Safety model

| Concern | Handling |
|---|---|
| Arbitrary code execution | No `eval`, no `Function` constructor. The interpreter walks an AST it built itself. |
| Host access | Student code sees only registered builtins — no DOM, network, storage or filesystem. |
| Infinite loops | Hard step budget (2,000,000 steps), then a friendly stop. |
| Runaway output | Output capped at 60,000 characters. |
| Memory | List construction, `linspace` and the number of shapes drawn are bounded. |
| Server risk | None. Nothing is ever sent anywhere; no user code reaches a server. |

---

## Assessment

Code answers are graded by **running** them, not by matching text — so any correct solution passes,
including one the author did not anticipate. `runAndProbe` executes the student's program and then
calls the functions they defined at chosen test points.

Three kinds of question, matching three kinds of understanding:

- **Maths → Code** — translate notation into Python.
- **Code → Graph** — steer a curve to a target by changing code.
- **Predict the output** — say what Python will do before running it.

Hints are progressive and never finish the job; the answer itself sits behind them, in a separate
panel that unlocks only once the last hint has been read - and looking at it is recorded.

---

## Research and evaluation

**No effectiveness claim is made anywhere in this platform, because none has been measured.** What
exists instead is the apparatus to measure one honestly later:

- A timestamped event log — lessons completed, challenge attempts and outcomes, What If? predictions
  with correctness, code runs with error types, parameter exploration, solutions viewed.
- Export to JSON and CSV from the Progress page.
- A random participant code carrying no personal data, intended to be matched to a consent record
  held separately and offline.
- Everything is local to the browser: no account, no server, no transmission.

This supports a genuine pre-test/post-test study of conceptual understanding, engagement,
prediction accuracy over time, and error-recovery behaviour.

The **educator view** follows the same principle. It contains no simulated cohort. Students export
their records; an educator loads those files and the page aggregates them for real — mean mastery,
per-item success rates, most common error types. With nothing loaded it says so, and reports on the
single record it can honestly see.

---

## Demonstration route (2–3 minutes)

1. **Landing** — the hero is a live animated surface, not a screenshot. Rotate it.
2. **Explore → Quadratic Functions** — move the `a` slider. Vertex, roots, axis of symmetry and
   discriminant all update as it moves.
3. **What If?** — ask the judge to predict what happens when `a` changes from 1 to −1. They must
   commit before the reveal. Then the graph animates against a ghost of the previous curve, and the
   explanation appears.
4. **Python connection** — the panel below shows the same curve as code. Press *Open in CodeLab*.
5. **CodeLab** — change a coefficient, press Run, and the graph comes back changed.
6. Type `y = 2x + 3` deliberately. Show the error lesson.
7. **Explore → 3D Mathematics** — switch to the saddle. Rotate it, then show the cross-section
   panel: slicing the surface gives back ordinary 2D curves.
8. **Explore → Geometry** — open *Polygon* and drag the `n` slider: the polygon grows sides and
   its area closes in on the circle's. Open *Solids* and rotate the scene. Point at a shape for
   its measurements. Change a number in the code and press Run.
9. **Challenges → Hit the target points** — hand the judge the keyboard.
10. **Progress** — the record, and the CSV export behind it.

---

## Status

**Built and working:** landing page · five Explore modules (linear, quadratic, trigonometric, 3D
surfaces, geometry) · the `shapes` and `turtle` libraries with 2D canvas and 3D WebGL rendering ·
What If? with 11 scenarios · six-level Python × Mathematics pathway with graded tasks · CodeLab ·
Code→Math correspondence · 12 challenges with executable grading · MathSandbox and Python Sandbox
with saved experiments · student dashboard · educator aggregation view · research export.

**Designed, not built** (clearly labelled as such in the interface): activity and challenge
authoring, class rosters, report generation. Each requires a backend and a consent workflow;
the content schema and grading engine they would build on already exist.

**Known limitations:**
- The Python subset excludes classes, dictionaries, comprehensions, exceptions and imports beyond
  `math`. This is a deliberate scope choice for a first-course platform, not an oversight.
- Mastery percentages are a simple accumulation model, not a psychometric estimate. They are
  intended to guide a student's next step, not to grade them.
- MathSandbox supports undo and reset but not save/share; the Python Sandbox supports both.
- The 3D views require WebGL. Where it is unavailable the panel says so and the rest of the page
  keeps working; 2D shapes and cross-section graphs never depend on it.
- Frosted glass uses `backdrop-filter`, which every current browser supports. On a very old browser
  the panels degrade to plain translucent panels.

---

## Tests

```bash
npm test
```

| Suite | Checks | What it protects |
|---|---|---|
| `test:engine` | 119 | Python semantics against CPython behaviour, every educational error message, and the geometry libraries: areas, volumes, turtle walks, and the errors they teach |
| `test:graders` | 38 | Every lesson and challenge grader accepts the reference solution the interface can reveal, rejects a plausible wrong one, and does not already pass on its own starter code |
| `test:pages` | 24 | Every page renders with real providers and routing; content integrity (unique ids, exactly one correct option per scenario, answers in range, a solution for every code task) |
| `test:mount` | 1 | The whole app mounts in a DOM with no console errors and no canvas layout feedback loop |

The test runner bundles TypeScript with the bundler that already ships inside Vite, so there is no
test framework to install.
