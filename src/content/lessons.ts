/**
 * The Python × Mathematics pathway.
 *
 * Six levels, and not one of them teaches Python for its own sake. Every
 * concept arrives because a piece of mathematics needed it: variables arrive
 * because a formula has letters in it, loops arrive because a sequence repeats,
 * functions arrive because f(x) already means something to the student.
 *
 * Each lesson ends with a task the platform can actually check, so "I have
 * understood this" is demonstrated rather than asserted.
 */

import type { PythonResult } from '../lib/pyengine';
import { numVal, isNumeric } from '../lib/pyengine';
import type { MathTopicId, PythonTopicId } from '../state/progress';
import type { Pairing, Segment } from '../components/learn/CodeMathMap';

export type Block =
  | { kind: 'text'; body: string }
  | { kind: 'math'; expr: string; caption?: string }
  | { kind: 'code'; code: string; caption?: string }
  | { kind: 'callout'; tone: 'insight' | 'warning'; title: string; body: string }
  | { kind: 'compare'; maths: string; python: string; note: string };

export interface CheckResult {
  ok: boolean;
  message: string;
}

export interface Lesson {
  id: string;
  level: number;
  title: string;
  subtitle: string;
  pythonTopic: PythonTopicId;
  mathTopics: MathTopicId[];
  minutes: number;
  blocks: Block[];
  keyConcepts: string[];
  mistakes: { wrong: string; right: string; why: string }[];
  map?: { maths: Segment[]; python: Segment[]; pairings: Pairing[] };
  starter: string;
  task: string;
  /** A reference answer, shown on request after a first attempt. */
  solution: string;
  check: (r: PythonResult) => CheckResult;
}

// ------------------------------------------------------------- check helpers

const num = (r: PythonResult, name: string): number | null => {
  const v = r.globals.get(name);
  return v !== undefined && isNumeric(v) ? numVal(v) : null;
};


const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

/** Every lesson check starts by refusing to grade a program that crashed. */
function guard(r: PythonResult): CheckResult | null {
  if (r.lesson) {
    return { ok: false, message: 'The program stopped before finishing — read the lesson panel below the output.' };
  }
  return null;
}

// ------------------------------------------------------------------ lessons

export const LESSONS: Lesson[] = [
  // =========================================================== LEVEL 1
  {
    id: 'variables',
    level: 1,
    title: 'Variables',
    subtitle: 'A name that holds a number',
    pythonTopic: 'variables',
    mathTopics: ['linear'],
    minutes: 6,
    blocks: [
      {
        kind: 'text',
        body:
          'You have used variables since the first time you wrote "let x = 5". In mathematics, a letter stands for a number so that you can talk about the number before you know it. Python does exactly the same thing, and for the same reason.',
      },
      {
        kind: 'compare',
        maths: 'a = 5,  b = 3',
        python: 'a = 5\nb = 3',
        note:
          'The two are almost identical — and where they differ, the difference is meaningful.',
      },
      {
        kind: 'text',
        body:
          'There is one real difference, and it is worth understanding properly. In mathematics, a = 5 is a *statement*: it says something is true. In Python, a = 5 is an *instruction*: put the value 5 into the box labelled a. That is why this line makes sense in Python and nonsense in algebra:',
      },
      { kind: 'code', code: 'total = 10\ntotal = total + 5\nprint(total)', caption: 'Prints 15' },
      {
        kind: 'callout',
        tone: 'insight',
        title: 'Read = as "becomes", not "equals"',
        body:
          'total = total + 5 is impossible as an equation — no number equals itself plus five. As an instruction it is ordinary: take what is in total, add 5, put the result back. Once you read = as "becomes", Python stops looking strange.',
      },
      {
        kind: 'text',
        body:
          'Names must start with a letter, and Python treats capitals as different letters — total and Total are two separate boxes. That catches almost everyone once.',
      },
    ],
    keyConcepts: [
      'A variable is a name attached to a value',
      'In Python, = is an instruction, not a statement of fact',
      'A variable can be updated using its own current value',
      'Names are case-sensitive: total and Total are different',
    ],
    mistakes: [
      {
        wrong: '5 = a',
        right: 'a = 5',
        why: 'The name being filled always goes on the left of =, and the value on the right.',
      },
      {
        wrong: 'print(Total)',
        right: 'print(total)',
        why: 'Python matches names letter for letter, including capitals.',
      },
    ],
    map: {
      maths: [{ text: 'a' }, { text: ' = ' }, { text: '5', pair: 'v' }],
      python: [{ text: 'a' }, { text: ' = ' }, { text: '5', pair: 'v' }],
      pairings: [
        {
          id: 'v',
          note:
            'The value is written the same way in both. What differs is the meaning of = : a fact in mathematics, an action in Python.',
        },
      ],
    },
    starter:
      '# The perimeter of a rectangle: P = 2(l + w)\n' +
      'length = 7\nwidth = 3\n\n' +
      '# Store the perimeter in a variable called perimeter, then print it.\n',
    task: 'Store the perimeter of the rectangle in a variable called `perimeter`, and print it. It should come to 20.',
    solution:
      'length = 7\nwidth = 3\n\nperimeter = 2 * (length + width)\nprint(perimeter)\n',
    check(r) {
      const g = guard(r);
      if (g) return g;
      const p = num(r, 'perimeter');
      if (p === null) return { ok: false, message: 'No variable called `perimeter` was created.' };
      if (!close(p, 20)) return { ok: false, message: `\`perimeter\` came out as ${p}, but 2(7 + 3) is 20.` };
      if (!r.output.includes('20')) return { ok: false, message: 'The value is right — now print it with print(perimeter).' };
      return { ok: true, message: 'Correct. You stored a mathematical quantity in a named variable and displayed it.' };
    },
  },

  // =========================================================== LEVEL 2
  {
    id: 'operations',
    level: 2,
    title: 'Mathematical Operations',
    subtitle: 'Writing the mathematics you already know',
    pythonTopic: 'operations',
    mathTopics: ['linear', 'quadratic'],
    minutes: 8,
    blocks: [
      {
        kind: 'text',
        body:
          'Most of the arithmetic you know transfers to Python unchanged. Three things do not, and all three trip up beginners — so meet them now rather than in an error message.',
      },
      {
        kind: 'compare',
        maths: 'x²',
        python: 'x**2',
        note:
          'A keyboard cannot type a raised number, so Python uses two stars for "to the power of". Note that ^ means something completely different in Python — it is not powers.',
      },
      {
        kind: 'compare',
        maths: '2x',
        python: '2*x',
        note:
          'In mathematics, a number written against a letter can only mean multiplication. In Python, x2 could be a variable name, so multiplication must always be written out.',
      },
      {
        kind: 'compare',
        maths: '√x',
        python: 'math.sqrt(x)',
        note:
          'Square root lives in the math module, which you switch on with `import math` at the top of the program.',
      },
      {
        kind: 'text',
        body:
          'Python obeys the order of operations you already use — brackets, then powers, then × and ÷, then + and −. So 2 + 3 * 4 is 14, not 20, exactly as in your exercise book.',
      },
      {
        kind: 'callout',
        tone: 'insight',
        title: 'Two kinds of division',
        body:
          '7 / 2 gives 3.5 — ordinary division, always producing a decimal. 7 // 2 gives 3 — division that throws away the remainder. And 7 % 2 gives 1, the remainder itself. That last one is how a program tests whether a number is even.',
      },
      { kind: 'code', code: 'import math\n\nx = 5\nprint(x**2)\nprint(math.sqrt(x))\nprint(2*x + 3)' },
    ],
    keyConcepts: [
      'x² is written x**2',
      'Multiplication always needs an explicit *',
      'Roots and trigonometry come from the math module',
      'Python follows the standard order of operations',
      '/ divides exactly, // divides and discards the remainder, % gives the remainder',
    ],
    mistakes: [
      { wrong: 'y = 2x + 3', right: 'y = 2*x + 3', why: 'Python cannot tell 2x apart from a variable name without the *.' },
      { wrong: 'y = x^2', right: 'y = x**2', why: 'In Python, ^ is not "to the power of".' },
      { wrong: 'y = sqrt(x)', right: 'import math\ny = math.sqrt(x)', why: 'sqrt only exists once the math module is imported.' },
    ],
    map: {
      maths: [
        { text: 'f(x) = ' },
        { text: 'x^2', pair: 'sq' },
        { text: ' + ' },
        { text: '2x', pair: 'mul' },
        { text: ' + 1' },
      ],
      python: [
        { text: 'def f(x):\n    return ' },
        { text: 'x**2', pair: 'sq' },
        { text: ' + ' },
        { text: '2*x', pair: 'mul' },
        { text: ' + 1' },
      ],
      pairings: [
        { id: 'sq', note: 'x² becomes x**2 — the two stars are Python\'s way of writing a raised power.' },
        { id: 'mul', note: '2x becomes 2*x — the multiplication that mathematics leaves invisible must be written down.' },
      ],
    },
    starter:
      'import math\n\n' +
      '# The quadratic formula needs the discriminant:  D = b² - 4ac\n' +
      'a = 1\nb = -5\nc = 6\n\n' +
      '# Work out D, store it in a variable called D, and print it.\n',
    task: 'Calculate the discriminant b² − 4ac for a = 1, b = −5, c = 6. Store it as `D` and print it. The answer is 1.',
    solution:
      'import math\n\na = 1\nb = -5\nc = 6\n\nD = b**2 - 4*a*c\nprint(D)\n',
    check(r) {
      const g = guard(r);
      if (g) return g;
      const d = num(r, 'D');
      if (d === null) return { ok: false, message: 'No variable called `D` was created.' };
      if (!close(d, 1)) {
        return {
          ok: false,
          message: `\`D\` came out as ${d}. Check the powers: b² is b**2, and 4ac is 4*a*c.`,
        };
      }
      if (!r.output.trim()) return { ok: false, message: 'The value is right — now print it.' };
      return {
        ok: true,
        message: 'Correct. A positive discriminant means this quadratic crosses the x-axis twice.',
      };
    },
  },

  // =========================================================== LEVEL 3
  {
    id: 'conditions',
    level: 3,
    title: 'Conditions',
    subtitle: 'Mathematics that asks a question',
    pythonTopic: 'conditions',
    mathTopics: ['quadratic'],
    minutes: 8,
    blocks: [
      {
        kind: 'text',
        body:
          'Mathematics is full of conditions, even when they are not written as code. "If the discriminant is positive, there are two roots." "If the gradient is negative, the line falls." Python writes those sentences almost word for word.',
      },
      { kind: 'code', code: 'if x > 0:\n    print("Positive")\nelif x < 0:\n    print("Negative")\nelse:\n    print("Zero")' },
      {
        kind: 'text',
        body:
          'Two pieces of punctuation carry the structure. The colon at the end of the line announces "a block follows", and the indentation underneath shows which lines belong to it. In Python, indentation is not decoration — it is the grammar.',
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'One = stores, two == ask',
        body:
          'if x = 3 is not a question; it is an instruction to change x. To ask whether x is 3, write if x == 3. This is the single most common beginner error, and now you know why it exists: Python needed two different symbols for two different jobs that mathematics writes with one.',
      },
      {
        kind: 'text',
        body:
          'elif means "otherwise, if" — it is only tested when everything above it was false. That matters: it is what makes the three cases above exhaustive and non-overlapping, exactly as a well-written mathematical case analysis should be.',
      },
      {
        kind: 'compare',
        maths: 'D > 0 ⟹ two real roots',
        python: 'if D > 0:\n    print("two real roots")',
        note: 'The mathematical implication arrow and the Python if do the same work: state a condition, then state what follows from it.',
      },
    ],
    keyConcepts: [
      'if / elif / else expresses a mathematical case analysis',
      'A colon opens a block; indentation shows what is inside it',
      '== asks a question, = gives an instruction',
      'Conditions can be joined with and, or, not',
    ],
    mistakes: [
      { wrong: 'if x = 3:', right: 'if x == 3:', why: 'A single = tries to assign a value rather than compare one.' },
      { wrong: 'if x > 0\n    print(x)', right: 'if x > 0:\n    print(x)', why: 'The colon is what tells Python a block is coming.' },
      { wrong: 'if x > 0:\nprint(x)', right: 'if x > 0:\n    print(x)', why: 'Without indentation the line is outside the if, so it always runs.' },
    ],
    starter:
      '# Classify a quadratic by its discriminant.\n' +
      'a = 1\nb = 2\nc = 1\n' +
      'D = b**2 - 4*a*c\n\n' +
      '# Print "Two roots" if D > 0, "One root" if D == 0, "No real roots" if D < 0.\n',
    task: 'Print exactly "Two roots", "One root" or "No real roots" depending on D. With a = 1, b = 2, c = 1 the answer is "One root".',
    solution:
      'a = 1\nb = 2\nc = 1\nD = b**2 - 4*a*c\n\nif D > 0:\n    print("Two roots")\nelif D == 0:\n    print("One root")\nelse:\n    print("No real roots")\n',
    check(r) {
      const g = guard(r);
      if (g) return g;
      const printed = r.output.trim();
      if (!printed) return { ok: false, message: 'Nothing was printed. Each branch needs its own print(...).' };
      if (printed === 'One root') {
        return {
          ok: true,
          message: 'Correct. D = 0 means the parabola touches the x-axis at exactly one point — its vertex sits on the axis.',
        };
      }
      if (['Two roots', 'No real roots'].includes(printed)) {
        return { ok: false, message: `You printed "${printed}", but here D = 4 − 4 = 0. Check which comparison catches that case.` };
      }
      return { ok: false, message: `You printed "${printed}". The task asks for one of the three exact phrases.` };
    },
  },

  // =========================================================== LEVEL 4
  {
    id: 'loops',
    level: 4,
    title: 'Loops',
    subtitle: 'Where sequences and patterns live',
    pythonTopic: 'loops',
    mathTopics: ['linear', 'quadratic'],
    minutes: 9,
    blocks: [
      {
        kind: 'text',
        body:
          'Every table you have ever filled in by hand is a loop. Squares, multiples, terms of a sequence, values of a function at x = 1, 2, 3 — the pattern is the same each time: do this, for each of these.',
      },
      { kind: 'code', code: 'for x in range(1, 11):\n    print(x, x**2)', caption: 'The first ten square numbers' },
      {
        kind: 'callout',
        tone: 'insight',
        title: 'range stops before it arrives',
        body:
          'range(1, 11) gives 1 up to 10, not 11. This looks like a trap until you see the reason: range(0, n) then produces exactly n values, starting at 0 — which is where Python counts from everywhere else too. One convention, consistently applied.',
      },
      {
        kind: 'text',
        body:
          'A loop can also accumulate. Set a total to zero before the loop, and add to it inside — which is precisely what the summation sign means.',
      },
      {
        kind: 'compare',
        maths: '∑ n  for n = 1 to 100',
        python: 'total = 0\nfor n in range(1, 101):\n    total += n',
        note:
          'The Σ notation and the loop describe the same process. Σ writes the whole calculation at once; the loop performs it one term at a time.',
      },
      {
        kind: 'text',
        body:
          'Loops are also how a graph gets built. To draw a curve, a computer works out y for many closely spaced values of x, then joins the points. There is no curve-drawing magic — only a loop and a lot of arithmetic.',
      },
    ],
    keyConcepts: [
      'A loop is a table being filled in, one row at a time',
      'range(a, b) runs from a up to b − 1',
      'A running total set up before the loop expresses a summation',
      'Graph plotting is a loop over x values',
    ],
    mistakes: [
      { wrong: 'for i in 10:', right: 'for i in range(10):', why: 'A loop steps through a collection of values, and range makes one from a number.' },
      { wrong: 'total = 0\nfor n in range(5):\n    total = n', right: 'total = 0\nfor n in range(5):\n    total += n', why: 'Using = replaces the total each time; += adds to what is already there.' },
      { wrong: 'for x in range(1, 10):', right: 'for x in range(1, 11):', why: 'range stops one short, so counting to 10 needs 11.' },
    ],
    starter:
      '# The sum of the first 50 whole numbers.\n' +
      'total = 0\n\n' +
      '# Loop from 1 to 50, adding each number to total. Then print total.\n',
    task: 'Use a loop to add up every whole number from 1 to 50. Store the result in `total` and print it. The answer is 1275.',
    solution:
      'total = 0\n\nfor n in range(1, 51):\n    total += n\n\nprint(total)\n',
    check(r) {
      const g = guard(r);
      if (g) return g;
      const t = num(r, 'total');
      if (t === null) return { ok: false, message: 'No variable called `total` was created.' };
      if (close(t, 1225)) {
        return { ok: false, message: 'Very close — 1225 is the sum from 1 to 49. Remember that range stops one short.' };
      }
      if (!close(t, 1275)) return { ok: false, message: `\`total\` came out as ${t}, but 1 + 2 + … + 50 is 1275.` };
      if (!r.output.includes('1275')) return { ok: false, message: 'The total is right — now print it.' };
      return {
        ok: true,
        message: 'Correct. Gauss found this by pairing 1 + 50, 2 + 49, … — 25 pairs of 51. Your loop got there the long way, in about a millisecond.',
      };
    },
  },

  // =========================================================== LEVEL 5
  {
    id: 'functions',
    level: 5,
    title: 'Functions',
    subtitle: 'f(x) becomes def f(x)',
    pythonTopic: 'functions',
    mathTopics: ['quadratic', 'linear'],
    minutes: 10,
    blocks: [
      {
        kind: 'text',
        body:
          'This is the moment the two subjects turn out to be the same subject. A mathematical function is a rule: give it an input, it gives back exactly one output. A Python function is a rule: give it an input, it gives back exactly one output. Not an analogy — the same definition.',
      },
      {
        kind: 'compare',
        maths: 'f(x) = x²',
        python: 'def f(x):\n    return x**2',
        note:
          'Line for line: def introduces the rule, f names it, (x) declares the input, and return hands back the output.',
      },
      {
        kind: 'text',
        body:
          'Calling it looks identical in both. f(3) in mathematics means "apply the rule to 3", and f(3) in Python means exactly that too — it produces 9.',
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'No return, no value',
        body:
          'A function without a return line still runs — it just hands nothing back. That is why a "working" function can produce None: it did the arithmetic and then threw the answer away. If a graph comes out blank, this is usually why.',
      },
      {
        kind: 'text',
        body:
          'Functions can take more than one input, which is how a whole family of curves fits into a single definition. Writing quadratic(x, a, b, c) gives you every parabola at once — the same idea as a general form y = ax² + bx + c.',
      },
      { kind: 'code', code: 'def quadratic(x, a, b, c):\n    return a*x**2 + b*x + c\n\nprint(quadratic(2, 1, -3, 2))', caption: 'Evaluates 1(4) − 3(2) + 2 = 0' },
      {
        kind: 'text',
        body:
          'The input name is private to the function. The x inside def f(x) has nothing to do with any x outside it — it is a placeholder, exactly as the x in f(x) = x² is a placeholder rather than a particular number.',
      },
    ],
    keyConcepts: [
      'def defines a rule; return sends the answer back',
      'A function with no return produces None',
      'Extra inputs turn one definition into a family of curves',
      'The input name is local to the function',
    ],
    mistakes: [
      { wrong: 'def f(x):\n    x**2', right: 'def f(x):\n    return x**2', why: 'Without return the function calculates the value and discards it.' },
      { wrong: 'def f(x)\n    return x', right: 'def f(x):\n    return x', why: 'The def line needs a colon, like every other block opener.' },
      { wrong: 'print(f)', right: 'print(f(3))', why: 'f is the rule itself; f(3) is the rule applied to a number.' },
    ],
    map: {
      maths: [
        { text: 'f', pair: 'name' },
        { text: '(' },
        { text: 'x', pair: 'arg' },
        { text: ') = ' },
        { text: 'x^2 + 2x + 1', pair: 'body' },
      ],
      python: [
        { text: 'def ' },
        { text: 'f', pair: 'name' },
        { text: '(' },
        { text: 'x', pair: 'arg' },
        { text: '):\n    return ' },
        { text: 'x**2 + 2*x + 1', pair: 'body' },
      ],
      pairings: [
        { id: 'name', note: 'The name of the rule. Identical in both notations.' },
        { id: 'arg', note: 'The input. In both notations it is a placeholder, not a particular number.' },
        { id: 'body', note: 'The rule itself. Python needs return to say "this is the answer", and * and ** to write the operations explicitly.' },
      ],
    },
    starter:
      '# Define the quadratic family:  f(x) = ax² + bx + c\n\n' +
      'def quadratic(x, a, b, c):\n    # Return the value of the quadratic here.\n    return 0\n\n' +
      'print(quadratic(3, 2, -1, 5))\n',
    task: 'Complete `quadratic` so that it returns ax² + bx + c. With x = 3, a = 2, b = −1, c = 5 the answer is 20.',
    solution:
      'def quadratic(x, a, b, c):\n    return a*x**2 + b*x + c\n\nprint(quadratic(3, 2, -1, 5))\n',
    check(r) {
      const g = guard(r);
      if (g) return g;
      const fn = r.globals.get('quadratic');
      if (!fn) return { ok: false, message: 'No function called `quadratic` was defined.' };
      const printed = r.output.trim();
      if (printed === 'None') {
        return { ok: false, message: 'The function ran but handed nothing back — it needs a `return` line.' };
      }
      if (printed === '0') {
        return { ok: false, message: 'It still returns 0. Replace that with the expression for ax² + bx + c.' };
      }
      if (printed !== '20') {
        return { ok: false, message: `It produced ${printed}, but 2(3²) − 1(3) + 5 = 20. Check the ** and the * signs.` };
      }
      return {
        ok: true,
        message: 'Correct — and notice what you have built: not one parabola, but every parabola. Change a, b, c and the same four lines describe a different curve.',
      };
    },
  },

  // =========================================================== LEVEL 6
  {
    id: 'visualisation',
    level: 6,
    title: 'Visualisation',
    subtitle: 'Code → data → graph',
    pythonTopic: 'visualisation',
    mathTopics: ['quadratic', 'trigonometry'],
    minutes: 10,
    blocks: [
      {
        kind: 'text',
        body:
          'A graph is not drawn. It is calculated. The computer chooses many closely spaced x values, works out y for each one, and joins the points — which means everything you need to make one, you already have: a loop, a function, and a list.',
      },
      { kind: 'code', code: 'xs = []\nys = []\nfor i in range(-50, 51):\n    x = i / 10\n    xs.append(x)\n    ys.append(x**2)\n\nplot(xs, ys)', caption: '101 points from x = −5 to 5' },
      {
        kind: 'text',
        body:
          'Read the three stages in that program. The loop makes the numbers. The lists hold them. plot turns them into a picture. Nothing else happens — and once you have seen it, no graph on a screen is mysterious again.',
      },
      {
        kind: 'callout',
        tone: 'insight',
        title: 'Fewer points, visible corners',
        body:
          'Try the same program with range(-5, 6) instead. The parabola becomes a chain of straight segments, because the computer is joining the dots and there are now only eleven of them. The smoothness of a curve on screen is a resolution, not a property of the mathematics.',
      },
      {
        kind: 'text',
        body:
          'Because the loop and the function are separate, one set of x values can be reused for any rule you like — that is what makes plotting two curves for comparison so easy.',
      },
      { kind: 'code', code: 'xs = linspace(-5, 5, 200)\n\ndef f(x):\n    return x**2\n\nplot(f, -5, 5, label="y = x²")' },
    ],
    keyConcepts: [
      'A graph is a list of calculated points, joined up',
      'Lists collect the values a loop produces',
      'append adds one item to the end of a list',
      'More points means a smoother curve',
    ],
    mistakes: [
      { wrong: 'plot(ys, xs)', right: 'plot(xs, ys)', why: 'x values come first — swapping them reflects the graph in the line y = x.' },
      { wrong: 'xs.append', right: 'xs.append(x)', why: 'Without the brackets you name the action instead of performing it.' },
      { wrong: 'ys = x**2', right: 'ys.append(x**2)', why: 'A graph needs a list of values, not a single one.' },
    ],
    starter:
      '# Build a parabola from scratch, then plot it.\n' +
      'xs = []\nys = []\n\n' +
      'for i in range(-50, 51):\n' +
      '    x = i / 10\n' +
      '    # Add x to xs, and x² to ys.\n\n' +
      '# Then plot them.\n',
    task: 'Fill both lists and plot them, so a parabola appears. You should end up with 101 points.',
    solution:
      'xs = []\nys = []\n\nfor i in range(-50, 51):\n    x = i / 10\n    xs.append(x)\n    ys.append(x**2)\n\nplot(xs, ys, label="y = x²")\n',
    check(r) {
      const g = guard(r);
      if (g) return g;
      if (r.plots.length === 0) {
        return { ok: false, message: 'No graph was produced yet. Finish with plot(xs, ys).' };
      }
      const series = r.plots[0];
      if (series.xs.length < 20) {
        return { ok: false, message: `Only ${series.xs.length} points were plotted — check that append is inside the loop.` };
      }
      const wrong = series.xs.findIndex((x, i) => !close(series.ys[i], x * x, 1e-6));
      if (wrong >= 0) {
        return {
          ok: false,
          message: `At x = ${series.xs[wrong].toFixed(1)} the y value is ${series.ys[wrong].toFixed(2)}, but x² would be ${(series.xs[wrong] ** 2).toFixed(2)}.`,
        };
      }
      return {
        ok: true,
        message: 'Correct. You have now built a graph the way every graphing tool builds one — a loop, two lists, and a lot of arithmetic.',
      };
    },
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
