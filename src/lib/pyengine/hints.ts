/**
 * Turning failures into lessons.
 *
 * The engine already speaks in plain language; this layer adds the second half
 * of the teaching move - *why* Python behaves this way, and what to try next -
 * plus, where it exists, the link back to mathematical notation.
 *
 * Deliberately: hints never hand over the finished answer.
 */

import type { RunResult } from './interpreter';

export interface ErrorLesson {
  /** Short label, e.g. "Missing multiplication sign". */
  title: string;
  /** Plain-language description of what went wrong (from the engine). */
  message: string;
  line: number;
  /** Python's own name for the error, for students who will later meet it. */
  errorType: string;
  /** Why Python works this way. */
  why?: string;
  /** A nudge, not the answer. */
  tryThis?: string;
  /** How the same idea is written in mathematics vs Python. */
  mathLink?: { maths: string; python: string };
}

interface Rule {
  title: string;
  test: (message: string, type: string, source: string) => boolean;
  why?: string;
  tryThis?: string;
  mathLink?: { maths: string; python: string };
}

const RULES: Rule[] = [
  {
    title: 'Missing multiplication sign',
    test: (m) => m.includes('times') && m.includes('multiplication sign'),
    why:
      'Mathematics lets you write 2x because a number next to a letter can only mean ' +
      'multiplication. Python allows names like x2 or rate2, so it cannot guess - every ' +
      'multiplication must be written with *.',
    tryThis: 'Find the number that sits directly against a letter, and put a * between them.',
    mathLink: { maths: '2x + 3', python: '2*x + 3' },
  },
  {
    title: 'Powers are written with **',
    test: (m) => m.includes('to the power of'),
    why:
      'Python has no way to type a raised number, so it uses two stars for "to the power of". ' +
      'The ^ symbol means something entirely different in Python.',
    tryThis: 'Replace ^ with ** and run the code again.',
    mathLink: { maths: 'x²', python: 'x**2' },
  },
  {
    title: 'Dividing by zero',
    test: (_m, t) => t === 'ZeroDivisionError',
    why:
      'Division asks "how many times does this fit?". Nothing fits into zero a definite number ' +
      'of times, so the question has no answer in mathematics - and Python stops rather than invent one.',
    tryThis: 'Print the value of the divisor just before this line to see how it became 0.',
    mathLink: { maths: 'a ÷ 0 is undefined', python: 'if b != 0:' },
  },
  {
    title: 'A name Python has never seen',
    test: (_m, t) => t === 'NameError',
    why:
      'Python only knows a name after a line has stored something in it. Reading a name too ' +
      'early - or spelling it differently, since Total and total are two different names - ' +
      'leaves Python with nothing to fetch.',
    tryThis: 'Check the spelling, and make sure the line that creates the variable runs before this one.',
  },
  {
    title: 'Indentation marks the block',
    test: (m) => m.includes('indented') || m.includes('line up'),
    why:
      'Other languages use { } to show which lines belong inside an if or a loop. Python uses ' +
      'the spaces at the start of the line, so indentation is part of the meaning, not just tidiness.',
    tryThis: 'Indent every line that belongs inside the block by the same amount - 4 spaces is standard.',
  },
  {
    title: 'A colon opens the block',
    test: (m) => m.includes('colon'),
    why:
      'The colon is how Python announces "a block follows". Every if, elif, else, for, while ' +
      'and def line ends with one.',
    tryThis: 'Add : to the end of the line, then indent the lines underneath it.',
    mathLink: { maths: 'if x > 0 then …', python: 'if x > 0:' },
  },
  {
    title: 'One = stores, two == compare',
    test: (m) => m.includes('`==` to compare') || m.includes('to check whether two values are equal'),
    why:
      'In mathematics, = states a fact. In Python it performs an action: put this value into ' +
      'that name. Asking a question needs the separate operator ==.',
    tryThis: 'Use = when you are setting a value, and == inside an if when you are testing one.',
    mathLink: { maths: 'x = 3 (a statement)', python: 'x == 3 (a question)' },
  },
  {
    title: 'Text and numbers are different types',
    test: (m) => m.includes('will not add text and a number'),
    why:
      'The + sign means "add" for numbers and "join" for text. With one of each, Python cannot ' +
      'tell which you meant, so it asks you to be explicit.',
    tryThis: 'Wrap the number in str(...), or use an f-string: f"answer: {value}"',
  },
  {
    title: 'The loop never ends',
    test: (_m, t) => t === 'TimeLimit',
    why:
      'A while loop repeats for as long as its condition stays true. If nothing inside the loop ' +
      'ever changes that condition, it stays true forever.',
    tryThis: 'Check that the variable in the condition really changes inside the loop body.',
  },
  {
    title: 'Counting starts at 0',
    test: (_m, t) => t === 'IndexError',
    why:
      'Python numbers list positions from 0, so a list of 5 items has positions 0, 1, 2, 3, 4. ' +
      'Asking for position 5 falls off the end.',
    tryThis: 'Use len(mylist) to check the size, and remember the last position is len(mylist) - 1.',
  },
  {
    title: 'The function did not send a value back',
    test: (m) => m.includes('Check that the function has a `return` line'),
    why:
      'A Python function only produces a value if a return line hands one back. Without it the ' +
      'function does its work and hands back None - so there is nothing to plot or calculate with.',
    tryThis: 'Add a return line as the last step of the function.',
    mathLink: { maths: 'f(x) = x²', python: 'def f(x):\n    return x**2' },
  },
  {
    title: 'Brackets must be closed',
    test: (m) => m.includes('never closed') || m.includes('matching )') || m.includes('matching ]'),
    why:
      'Python reads brackets in pairs. An unclosed bracket makes it keep reading onto the next ' +
      'line, looking for the partner, so the error can appear lower than the real mistake.',
    tryThis: 'Count the ( and ) on the line - and check the line just above it too.',
  },
  {
    title: 'Wrong number of inputs',
    test: (m) => /expects \d+ input/.test(m),
    why:
      'A function defined with def f(x, a) always needs exactly those inputs, in that order - ' +
      'just as f(x) in mathematics is undefined until you supply x.',
    tryThis: 'Compare the def line with the line that calls it, and match them up one by one.',
    mathLink: { maths: 'f(x, a) needs both x and a', python: 'f(3, 2)' },
  },
  {
    title: 'Square roots of negative numbers',
    test: (m) => m.includes('square root of a negative'),
    why:
      'On the real number line no number multiplied by itself gives a negative result, so the ' +
      'square root of a negative number does not exist there.',
    tryThis: 'Check the value inside the square root first - for a quadratic, that is b**2 - 4*a*c.',
    mathLink: { maths: '√(b² − 4ac) needs b² − 4ac ≥ 0', python: 'if b**2 - 4*a*c >= 0:' },
  },
];

export function explainError(error: NonNullable<RunResult['error']>, source: string): ErrorLesson {
  const rule = RULES.find((r) => r.test(error.message, error.type, source));
  return {
    title: rule?.title ?? friendlyTitle(error.type),
    message: error.message,
    line: error.line,
    errorType: error.type,
    why: rule?.why,
    tryThis: rule?.tryThis,
    mathLink: rule?.mathLink,
  };
}

function friendlyTitle(type: string): string {
  switch (type) {
    case 'SyntaxError': return 'Python could not read this line';
    case 'TypeError': return 'These values do not fit together';
    case 'ValueError': return 'That value will not work here';
    case 'AttributeError': return 'That name does not exist here';
    case 'ImportError': return 'That module is not available';
    case 'NotAvailable': return 'Not available in CodeLab';
    default: return 'Something stopped the program';
  }
}
