/**
 * Test suite for the MathXplore Python Engine.
 *
 * Run with:  npm run test:engine
 *
 * Every case is a program a student could plausibly write, paired with the
 * output CPython 3 would produce - so the engine stays honest about the
 * language it claims to teach.
 */

import { runPython } from '../src/lib/pyengine';

interface Case {
  name: string;
  code: string;
  /** Expected stdout, exactly. */
  out?: string;
  /** Expected fragment of the error message. */
  errorContains?: string;
  /** Expected number of plotted series. */
  plots?: number;
  /** Expected number of shapes drawn (2D + 3D). */
  shapes?: number;
}

const cases: Case[] = [
  // ---- Level 1: variables and arithmetic ---------------------------------
  { name: 'variables and addition', code: 'a = 5\nb = 3\nprint(a + b)', out: '8\n' },
  { name: 'int stays int', code: 'print(4 + 4)', out: '8\n' },
  { name: 'true division makes a float', code: 'print(4 / 2)', out: '2.0\n' },
  { name: 'floor division stays int', code: 'print(7 // 2)', out: '3\n' },
  { name: 'remainder', code: 'print(7 % 3)', out: '1\n' },
  { name: 'negative remainder follows Python', code: 'print(-7 % 3)', out: '2\n' },
  { name: 'float literal prints .0', code: 'x = 2.0\nprint(x)', out: '2.0\n' },
  { name: 'operator precedence', code: 'print(2 + 3 * 4)', out: '14\n' },
  { name: 'brackets change precedence', code: 'print((2 + 3) * 4)', out: '20\n' },

  // ---- Level 2: powers, roots, math module -------------------------------
  { name: 'power operator', code: 'x = 5\nprint(x**2)', out: '25\n' },
  { name: 'power is right associative', code: 'print(2**3**2)', out: '512\n' },
  { name: 'unary minus binds looser than power', code: 'print(-3**2)', out: '-9\n' },
  { name: 'negative exponent gives float', code: 'print(2**-1)', out: '0.5\n' },
  { name: 'math.sqrt', code: 'import math\nprint(math.sqrt(16))', out: '4.0\n' },
  { name: 'from-import', code: 'from math import sqrt\nprint(sqrt(25))', out: '5.0\n' },
  { name: 'math.pi rounded', code: 'import math\nprint(round(math.pi, 2))', out: '3.14\n' },
  { name: 'abs', code: 'print(abs(-7))', out: '7\n' },

  // ---- Level 3: conditions -----------------------------------------------
  {
    name: 'if / elif / else',
    code: 'x = -4\nif x > 0:\n    print("Positive")\nelif x < 0:\n    print("Negative")\nelse:\n    print("Zero")',
    out: 'Negative\n',
  },
  {
    name: 'discriminant branching',
    code:
      'a, b, c = 1, -3, 2\n' +
      'd = b**2 - 4*a*c\n' +
      'if d > 0:\n    print("Two roots")\nelif d == 0:\n    print("One root")\nelse:\n    print("No real roots")',
    out: 'Two roots\n',
  },
  { name: 'boolean operators', code: 'x = 5\nprint(x > 0 and x < 10)', out: 'True\n' },
  { name: 'chained comparison', code: 'x = 5\nprint(0 < x < 10)', out: 'True\n' },
  { name: 'not', code: 'print(not 0)', out: 'True\n' },

  // ---- Level 4: loops -----------------------------------------------------
  { name: 'for over range', code: 'for i in range(3):\n    print(i)', out: '0\n1\n2\n' },
  { name: 'range with start and stop', code: 'for i in range(2, 5):\n    print(i)', out: '2\n3\n4\n' },
  { name: 'range with step', code: 'for i in range(0, 10, 5):\n    print(i)', out: '0\n5\n' },
  {
    name: 'squares table',
    code: 'for x in range(1, 4):\n    print(x, x**2)',
    out: '1 1\n2 4\n3 9\n',
  },
  {
    name: 'summation',
    code: 'total = 0\nfor n in range(1, 101):\n    total += n\nprint(total)',
    out: '5050\n',
  },
  {
    name: 'while loop',
    code: 'n = 1\nwhile n < 5:\n    n = n * 2\nprint(n)',
    out: '8\n',
  },
  {
    name: 'break and continue',
    code: 'for i in range(10):\n    if i == 2:\n        continue\n    if i == 4:\n        break\n    print(i)',
    out: '0\n1\n3\n',
  },
  {
    name: 'nested loops',
    code: 'for i in range(1, 3):\n    for j in range(1, 3):\n        print(i * j)',
    out: '1\n2\n2\n4\n',
  },

  // ---- Level 5: functions -------------------------------------------------
  {
    name: 'function definition and call',
    code: 'def quadratic(x):\n    return x**2\nprint(quadratic(4))',
    out: '16\n',
  },
  {
    name: 'function with several inputs',
    code: 'def f(x, a, b, c):\n    return a*x**2 + b*x + c\nprint(f(2, 1, -3, 2))',
    out: '0\n',
  },
  {
    name: 'default arguments',
    code: 'def line(x, m=2, c=1):\n    return m*x + c\nprint(line(3))',
    out: '7\n',
  },
  {
    name: 'function without return gives None',
    code: 'def f(x):\n    x * 2\nprint(f(3))',
    out: 'None\n',
  },
  {
    name: 'recursion',
    code: 'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\nprint(fact(5))',
    out: '120\n',
  },
  {
    name: 'closures see globals',
    code: 'a = 3\ndef scaled(x):\n    return a * x\nprint(scaled(4))',
    out: '12\n',
  },

  // ---- Lists ---------------------------------------------------------------
  { name: 'list literal and index', code: 'xs = [1, 2, 3]\nprint(xs[0])', out: '1\n' },
  { name: 'negative index', code: 'xs = [1, 2, 3]\nprint(xs[-1])', out: '3\n' },
  { name: 'append', code: 'xs = []\nfor i in range(3):\n    xs.append(i*i)\nprint(xs)', out: '[0, 1, 4]\n' },
  { name: 'len and sum', code: 'xs = [1, 2, 3, 4]\nprint(len(xs), sum(xs))', out: '4 10\n' },
  { name: 'min and max', code: 'xs = [4, 1, 9]\nprint(min(xs), max(xs))', out: '1 9\n' },
  { name: 'slice', code: 'xs = [1, 2, 3, 4, 5]\nprint(xs[1:3])', out: '[2, 3]\n' },
  { name: 'sorted', code: 'print(sorted([3, 1, 2]))', out: '[1, 2, 3]\n' },
  { name: 'item assignment', code: 'xs = [1, 2, 3]\nxs[1] = 9\nprint(xs)', out: '[1, 9, 3]\n' },
  { name: 'enumerate unpacking', code: 'for i, v in enumerate([10, 20]):\n    print(i, v)', out: '0 10\n1 20\n' },
  { name: 'zip', code: 'for a, b in zip([1, 2], [3, 4]):\n    print(a + b)', out: '4\n6\n' },
  { name: 'in operator', code: 'print(3 in [1, 2, 3])', out: 'True\n' },

  // ---- Strings and f-strings ----------------------------------------------
  { name: 'string concat', code: 'print("a" + "b")', out: 'ab\n' },
  { name: 'f-string', code: 'x = 3\nprint(f"x = {x}")', out: 'x = 3\n' },
  { name: 'f-string with expression', code: 'x = 3\nprint(f"{x**2}")', out: '9\n' },
  { name: 'f-string precision', code: 'import math\nprint(f"{math.pi:.3f}")', out: '3.142\n' },
  { name: 'f-string width', code: 'print(f"{5:4}|")', out: '   5|\n' },
  { name: 'print with sep', code: 'print(1, 2, sep="-")', out: '1-2\n' },
  { name: 'print with end', code: 'print("a", end="")\nprint("b")', out: 'ab\n' },
  { name: 'string method', code: 'print("abc".upper())', out: 'ABC\n' },
  { name: 'tuple printing', code: 'print((1, 2))', out: '(1, 2)\n' },
  { name: 'multiple assignment', code: 'a, b = 1, 2\nprint(a + b)', out: '3\n' },
  { name: 'comment ignored', code: '# a comment\nprint(1)  # trailing', out: '1\n' },

  // ---- Plotting -------------------------------------------------------------
  {
    name: 'plot from lists',
    code: 'xs = [1, 2, 3]\nys = [1, 4, 9]\nplot(xs, ys)',
    plots: 1,
  },
  {
    name: 'plot a function directly',
    code: 'def f(x):\n    return x**2\nplot(f, -3, 3)',
    plots: 1,
  },
  {
    name: 'linspace helper',
    code: 'xs = linspace(0, 1, 5)\nprint(len(xs))',
    out: '5\n',
  },
  {
    name: 'two series',
    code: 'xs = linspace(-2, 2, 10)\nplot(xs, xs)\nscatter([0], [0])',
    plots: 2,
  },

  // ---- Educational errors ----------------------------------------------------
  { name: 'missing * flagged', code: 'x = 3\ny = 2x + 1', errorContains: 'multiplication sign' },
  { name: 'caret rejected', code: 'y = 2^3', errorContains: '**' },
  { name: 'undefined name', code: 'print(total)', errorContains: 'has not been given a value' },
  { name: 'typo suggestion', code: 'prnt(3)', errorContains: 'Did you mean' },
  { name: 'divide by zero', code: 'print(1/0)', errorContains: 'Division by zero' },
  { name: 'missing colon', code: 'if 1 > 0\n    print(1)', errorContains: 'colon' },
  { name: 'missing indent', code: 'if 1 > 0:\nprint(1)', errorContains: 'indented' },
  { name: 'text plus number', code: 'print("a" + 1)', errorContains: 'str(' },
  { name: 'index out of range', code: 'xs = [1, 2]\nprint(xs[5])', errorContains: 'valid positions are 0 to 1' },
  { name: 'wrong argument count', code: 'def f(x, y):\n    return x\nprint(f(1))', errorContains: 'expects 2 inputs' },
  { name: 'infinite loop stopped', code: 'while True:\n    x = 1', errorContains: 'too many steps' },
  { name: 'unclosed bracket', code: 'print(1', errorContains: 'closed' },
  { name: 'unclosed string', code: 'print("hi)', errorContains: 'closing' },
  { name: 'sqrt of negative', code: 'import math\nprint(math.sqrt(-1))', errorContains: 'no real answer' },
  { name: 'looping over a number', code: 'for i in 5:\n    print(i)', errorContains: 'range' },
  { name: 'calling a number', code: 'x = 2\nprint(x(3))', errorContains: 'cannot be called' },
  { name: 'no filesystem access', code: 'import os', errorContains: 'not available' },
  { name: 'no keyboard input', code: 'x = input()', errorContains: 'no keyboard input' },

  // ---- Geometry: the shapes library ------------------------------------------
  { name: 'circle area is pi r squared', code: 'from shapes import *\nc = circle(2)\nprint(round(c.area, 2))', out: '12.57\n', shapes: 1 },
  { name: 'circle perimeter', code: 'from shapes import *\nprint(round(circle(1).perimeter, 4))', out: '6.2832\n' },
  { name: 'square area and perimeter', code: 'from shapes import *\ns = square(3)\nprint(s.area, s.perimeter)', out: '9.0 12.0\n' },
  { name: 'rect width and height', code: 'from shapes import *\nr = rect(4, 2)\nprint(r.width, r.height)', out: '4.0 2.0\n' },
  { name: 'triangle area from base and height', code: 'from shapes import *\nprint(triangle(4, 3).area)', out: '6.0\n' },
  { name: 'triangle from three corners', code: 'from shapes import *\nt = triangle((0, 0), (4, 0), (0, 3))\nprint(t.area, t.perimeter)', out: '6.0 12.0\n' },
  { name: 'regular polygon sides and area', code: 'from shapes import *\np = polygon(6, 1)\nprint(p.sides, round(p.area, 3))', out: '6 2.598\n' },
  { name: 'polygon from corners', code: 'from shapes import *\nprint(polygon([(0, 0), (2, 0), (2, 2), (0, 2)]).area)', out: '4.0\n' },
  { name: 'shapes are placed by centre', code: 'from shapes import *\nc = circle(1, at=(3, -2))\nprint(c.x, c.y)', out: '3.0 -2.0\n' },
  { name: 'move and scale change measurements', code: 'from shapes import *\ns = square(2)\ns.move(1, 1).scale(3)\nprint(s.area, s.x, s.y)', out: '36.0 1.0 1.0\n' },
  { name: 'rotation keeps area', code: 'from shapes import *\ns = square(2)\ns.rotate(45)\nprint(round(s.area, 6))', out: '4.0\n' },
  { name: 'star has twice as many corners as points', code: 'from shapes import *\nprint(star(5, 2).sides)', out: '10\n' },
  { name: 'shapes print themselves', code: 'from shapes import *\nprint(circle(2))', out: 'circle(r=2, at=(0, 0))\n' },
  { name: 'shapes count', code: 'from shapes import *\nfor i in range(4):\n    square(1, at=(i, 0))\nprint(count())', out: '4\n', shapes: 4 },
  { name: 'import shapes as a module', code: 'import shapes\nprint(shapes.circle(1).area > 3)', out: 'True\n' },
  { name: 'geometry is an alias for shapes', code: 'from geometry import *\nprint(square(1).area)', out: '1.0\n' },

  // ---- Geometry: solids ------------------------------------------------------
  { name: 'cube volume and surface area', code: 'from shapes import *\nk = cube(2)\nprint(k.volume, k.surface_area)', out: '8.0 24.0\n', shapes: 1 },
  { name: 'box volume', code: 'from shapes import *\nprint(box(1, 2, 3).volume)', out: '6.0\n' },
  { name: 'sphere volume', code: 'from shapes import *\nprint(round(sphere(1).volume, 3))', out: '4.189\n' },
  { name: 'cylinder volume', code: 'from shapes import *\nprint(round(cylinder(1, 2).volume, 3))', out: '6.283\n' },
  { name: 'cone is a third of its cylinder', code: 'from shapes import *\nprint(round(cone(1, 3).volume / cylinder(1, 3).volume, 4))', out: '0.3333\n' },
  { name: 'square pyramid volume', code: 'from shapes import *\nprint(round(pyramid(2, 3).volume, 6))', out: '4.0\n' },
  { name: 'hexagonal prism volume', code: 'from shapes import *\nprint(round(prism(6, 1, 2).volume, 3))', out: '5.196\n' },
  { name: 'torus volume', code: 'from shapes import *\nprint(round(torus(2, 0.5).volume, 2))', out: '9.87\n' },
  { name: 'solids stand on z', code: 'from shapes import *\nb = box(1, 1, 3, at=(0, 0, 2))\nprint(b.z, b.top)', out: '2.0 5.0\n' },
  { name: 'solid scale changes volume', code: 'from shapes import *\nk = cube(1)\nk.scale(2)\nprint(k.volume)', out: '8.0\n' },

  // ---- Geometry: turtle ------------------------------------------------------
  { name: 'turtle square returns home', code: 'import turtle\nfor i in range(4):\n    turtle.forward(50)\n    turtle.left(90)\nprint(turtle.position(), turtle.heading())', out: '(0.0, 0.0) 0.0\n', shapes: 1 },
  { name: 'turtle from-import and short names', code: 'from turtle import *\nfd(30)\nlt(90)\nfd(40)\nprint(round(distance(0, 0), 1))', out: '50.0\n' },
  { name: 'Turtle objects', code: 'import turtle\nt = turtle.Turtle()\nt.forward(10)\nt.right(90)\nt.forward(10)\nprint(t.xcor(), t.ycor())', out: '10.0 -10.0\n' },
  { name: 'penup stops drawing', code: 'import turtle\nturtle.forward(10)\nturtle.penup()\nturtle.forward(10)\nturtle.pendown()\nturtle.forward(10)', shapes: 2 },
  { name: 'begin_fill makes a filled polygon', code: 'import turtle\nturtle.begin_fill()\nfor i in range(3):\n    turtle.forward(10)\n    turtle.left(120)\nturtle.end_fill()', shapes: 2 },

  // ---- Geometry: errors as lessons ------------------------------------------
  { name: 'shape used without import', code: 'circle(2)', errorContains: 'from shapes import *' },
  { name: 'turtle used without import', code: 'forward(10)', errorContains: 'from turtle import *' },
  { name: 'negative radius', code: 'from shapes import *\ncircle(-1)', errorContains: 'greater than 0' },
  { name: 'unknown colour', code: 'from shapes import *\ncircle(1, color="plaid")', errorContains: 'not a colour' },
  { name: '2D shape has no volume', code: 'from shapes import *\nprint(circle(1).volume)', errorContains: 'no `volume`' },
  { name: 'shape attribute did-you-mean', code: 'from shapes import *\nprint(cube(1).volme)', errorContains: '.volume' },
  { name: 'shapes name did-you-mean', code: 'from shapes import cirlce', errorContains: 'circle' },
  { name: 'library did-you-mean', code: 'import shape', errorContains: 'shapes' },
];

let passed = 0;
const failures: string[] = [];

for (const c of cases) {
  const result = runPython(c.code);
  const problems: string[] = [];

  if (c.out !== undefined) {
    if (result.error) problems.push(`unexpected error: ${result.error.message}`);
    else if (result.output !== c.out) {
      problems.push(`output was ${JSON.stringify(result.output)}, expected ${JSON.stringify(c.out)}`);
    }
  }

  if (c.errorContains !== undefined) {
    if (!result.error) problems.push('expected an error, but the program ran cleanly');
    else if (!result.error.message.includes(c.errorContains)) {
      problems.push(`error was "${result.error.message}", expected it to mention "${c.errorContains}"`);
    }
  }

  if (c.shapes !== undefined) {
    const n = result.scene.shapes2d.length + result.scene.shapes3d.length;
    if (result.error) problems.push(`unexpected error: ${result.error.message}`);
    else if (n !== c.shapes) problems.push(`drew ${n} shape(s), expected ${c.shapes}`);
  }

  if (c.plots !== undefined) {
    if (result.error) problems.push(`unexpected error: ${result.error.message}`);
    else if (result.plots.length !== c.plots) {
      problems.push(`produced ${result.plots.length} graph(s), expected ${c.plots}`);
    }
  }

  if (problems.length === 0) passed++;
  else failures.push(`  ${c.name}\n    ${problems.join('\n    ')}`);
}

console.log(`\nMathXplore Python Engine - ${passed}/${cases.length} tests passed`);
if (failures.length) {
  console.log('\nFailures:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('All good.\n');
