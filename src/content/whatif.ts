/**
 * What If? scenarios.
 *
 * Each one targets a specific misconception, and the wrong options are the
 * mistakes students actually make - not filler. A distractor that nobody would
 * pick teaches nothing; a distractor that half the room picks is where the
 * lesson is.
 */

import type { WhatIfScenario } from '../components/learn/WhatIfPanel';

export const LINEAR_SCENARIOS: WhatIfScenario[] = [
  {
    id: 'wi-linear-gradient',
    topic: 'linear',
    parameter: 'm',
    question: 'The gradient m changes from 2 to 5. What happens to the line?',
    from: 2,
    to: 5,
    options: [
      { id: 'a', label: 'It becomes steeper, still crossing the y-axis at the same place', correct: true },
      { id: 'b', label: 'It moves upward without changing its slope', correct: false },
      { id: 'c', label: 'It becomes steeper and crosses the y-axis higher up', correct: false },
      { id: 'd', label: 'It turns to face the other way', correct: false },
    ],
    explanation:
      'The line pivots about the point (0, c). Every line in the family y = mx + c with the same c passes through that one fixed point, so changing m rotates the line around it rather than moving it.',
    concept:
      'The gradient measures how much y changes for each step of 1 in x. Raising it from 2 to 5 means each step to the right now lifts the line five units instead of two. The y-intercept is a separate control and stays put.',
    python: 'def line(x):\n    return 5*x + 3   # was 2*x + 3',
  },
  {
    id: 'wi-linear-negative',
    topic: 'linear',
    parameter: 'm',
    question: 'The gradient changes from 2 to −2. What happens?',
    from: 2,
    to: -2,
    options: [
      { id: 'a', label: 'The line falls instead of rising, at the same steepness', correct: true },
      { id: 'b', label: 'The line becomes flat', correct: false },
      { id: 'c', label: 'The line moves below the x-axis entirely', correct: false },
      { id: 'd', label: 'Nothing changes — the size of the gradient is the same', correct: false },
    ],
    explanation:
      'The size of the gradient did not change, so the line is exactly as steep as before. Only its sign changed, which reverses the direction of travel: now each step to the right takes the line down instead of up.',
    concept:
      'A gradient carries two separate pieces of information. Its size sets the steepness; its sign sets the direction. Students often merge these into one idea and expect a negative gradient to look flatter — it does not.',
    python: 'def line(x):\n    return -2*x + 3   # the sign flips the direction',
  },
  {
    id: 'wi-linear-intercept',
    topic: 'linear',
    parameter: 'c',
    question: 'c changes from 3 to −4, with the gradient untouched. What happens?',
    from: 3,
    to: -4,
    options: [
      { id: 'a', label: 'The whole line slides down, staying parallel to where it was', correct: true },
      { id: 'b', label: 'The line becomes less steep', correct: false },
      { id: 'c', label: 'The line rotates about the origin', correct: false },
      { id: 'd', label: 'Only the part below the x-axis moves', correct: false },
    ],
    explanation:
      'Every point on the line dropped by exactly 7. Because they all moved by the same amount, the steepness is unchanged and the new line is parallel to the old one.',
    concept:
      'c is a vertical translation. Two lines with equal gradients are always parallel, no matter what c is — which is why parallel lines can be recognised from their equations alone, without drawing anything.',
    python: 'def line(x):\n    return 2*x - 4   # was 2*x + 3',
  },
];

export const QUADRATIC_SCENARIOS: WhatIfScenario[] = [
  {
    id: 'wi-quad-sign',
    topic: 'quadratic',
    parameter: 'a',
    question: 'a changes from 1 to −1. What happens to the parabola?',
    from: 1,
    to: -1,
    options: [
      { id: 'a', label: 'It flips to open downward; the vertex becomes a maximum', correct: true },
      { id: 'b', label: 'It slides below the x-axis, still opening upward', correct: false },
      { id: 'c', label: 'It becomes narrower', correct: false },
      { id: 'd', label: 'It turns into a straight line', correct: false },
    ],
    explanation:
      'The curve reflected in the horizontal line through its vertex. What was the lowest point of the curve is now the highest point — the same location, the opposite role.',
    concept:
      'The sign of a decides the direction the parabola opens, and therefore whether its vertex is a minimum or a maximum. This is what turns a quadratic into an optimisation tool: a negative a means there is a greatest possible value, which is exactly the question "what is the maximum profit?" asks.',
    python: 'def quadratic(x):\n    return -1*x**2 + 0*x + 0   # a is now negative',
  },
  {
    id: 'wi-quad-width',
    topic: 'quadratic',
    parameter: 'a',
    question: 'a changes from 1 to 0.25. What happens?',
    from: 1,
    to: 0.25,
    options: [
      { id: 'a', label: 'The parabola becomes wider, keeping the same vertex', correct: true },
      { id: 'b', label: 'The parabola becomes narrower', correct: false },
      { id: 'c', label: 'The vertex moves upward', correct: false },
      { id: 'd', label: 'The parabola flips to open downward', correct: false },
    ],
    explanation:
      'Every height was multiplied by a quarter, so the curve rises far more slowly as it leaves the vertex. The vertex itself sits at height 0 and a quarter of 0 is still 0, so it does not move.',
    concept:
      'A smaller size of a makes a wider curve — which feels backwards until you see why. a multiplies the height, so shrinking it flattens the climb. The vertex stays because it is the one point the multiplication cannot move.',
    python: 'def quadratic(x):\n    return 0.25*x**2   # a smaller a gives a wider curve',
  },
  {
    id: 'wi-quad-shift',
    topic: 'quadratic',
    parameter: 'b',
    question: 'b changes from 0 to 4, with a = 1 and c = 0. Where does the vertex go?',
    from: 0,
    to: 4,
    options: [
      { id: 'a', label: 'Left and down, to (−2, −4)', correct: true },
      { id: 'b', label: 'Straight up, staying on the y-axis', correct: false },
      { id: 'c', label: 'Right and up, to (2, 4)', correct: false },
      { id: 'd', label: 'It stays at the origin', correct: false },
    ],
    explanation:
      'The vertex sits at x = −b/(2a), so raising b to 4 moves it to x = −2, and the curve there has dropped to y = −4. Increasing b moved the vertex in the negative direction — the opposite of what most people expect.',
    concept:
      'b does not translate the curve vertically or horizontally on its own; it does both at once, sliding the vertex along a path of its own. This is why the vertex formula x = −b/(2a) is worth knowing: b alone does not tell you where the curve sits.',
    python: 'def quadratic(x):\n    return x**2 + 4*x\n\n# vertex at x = -b / (2*a)\nprint(-4 / (2 * 1))   # -2.0',
  },
  {
    id: 'wi-quad-discriminant',
    topic: 'quadratic',
    parameter: 'c',
    question: 'With a = 1 and b = 0, c rises from −4 to 4. What happens to the roots?',
    from: -4,
    to: 4,
    options: [
      { id: 'a', label: 'The two roots move together, meet, then disappear', correct: true },
      { id: 'b', label: 'The two roots move further apart', correct: false },
      { id: 'c', label: 'The roots stay where they are', correct: false },
      { id: 'd', label: 'One root disappears and the other stays', correct: false },
    ],
    explanation:
      'Raising c lifts the whole curve. The two crossing points slide towards each other, meet at the moment the vertex touches the x-axis, and once the curve has lifted clear there are no crossings left at all.',
    concept:
      'This is what the discriminant measures. b² − 4ac counts the crossings before you draw anything: positive means two, zero means the single touching point you just saw, negative means the curve has lifted clear of the axis. "No real roots" is not a failure — it is a curve that never reaches zero.',
    python: 'a, b, c = 1, 0, 4\nD = b**2 - 4*a*c\nprint(D)          # -16\nprint(D >= 0)     # False - no real roots',
  },
];

export const TRIG_SCENARIOS: WhatIfScenario[] = [
  {
    id: 'wi-trig-amplitude',
    topic: 'trigonometry',
    parameter: 'a',
    question: 'The amplitude a rises from 1 to 3. What happens to the wave?',
    from: 1,
    to: 3,
    options: [
      { id: 'a', label: 'It becomes taller, and one cycle still takes the same distance', correct: true },
      { id: 'b', label: 'It becomes taller and the cycles get closer together', correct: false },
      { id: 'c', label: 'The whole wave lifts above the x-axis', correct: false },
      { id: 'd', label: 'The cycles get longer', correct: false },
    ],
    explanation:
      'The peaks reached 3 and the troughs reached −3, but the wave still crosses zero in exactly the same places. Height and horizontal spacing are controlled independently.',
    concept:
      'Amplitude is a vertical stretch, so it cannot change anything horizontal. In sound this is volume: a louder note is the same note. Pitch is controlled by a different number entirely.',
    python: 'import math\n\ndef wave(x):\n    return 3 * math.sin(x)   # amplitude 3',
  },
  {
    id: 'wi-trig-frequency',
    topic: 'trigonometry',
    parameter: 'b',
    question: 'b rises from 1 to 2. What happens to the period?',
    from: 1,
    to: 2,
    options: [
      { id: 'a', label: 'The period halves to π, so twice as many cycles fit', correct: true },
      { id: 'b', label: 'The period doubles to 4π', correct: false },
      { id: 'c', label: 'The wave gets taller', correct: false },
      { id: 'd', label: 'The wave shifts sideways', correct: false },
    ],
    explanation:
      'Doubling b squeezed the wave horizontally. Because period = 2π ÷ b, doubling b halves the period — so twice as many complete cycles now fit across the same width.',
    concept:
      'b and the period pull in opposite directions, which is why the relationship needs care: a bigger b makes a shorter cycle. This is pitch — doubling the frequency raises a musical note by exactly one octave.',
    python: 'import math\n\ndef wave(x):\n    return math.sin(2 * x)\n\nprint(2 * math.pi / 2)   # period = 3.14159...',
  },
  {
    id: 'wi-trig-shift',
    topic: 'trigonometry',
    parameter: 'd',
    question: 'The vertical shift d moves from 0 to 2. What happens?',
    from: 0,
    to: 2,
    options: [
      { id: 'a', label: 'The whole wave lifts by 2 and stops crossing the x-axis', correct: true },
      { id: 'b', label: 'The wave becomes taller but still crosses zero', correct: false },
      { id: 'c', label: 'Only the peaks rise', correct: false },
      { id: 'd', label: 'The wave shifts to the right', correct: false },
    ],
    explanation:
      'Every point rose by 2, so the wave now oscillates between 1 and 3. Its shape and size are untouched — but with the lowest point above zero, it no longer crosses the axis at all.',
    concept:
      'd sets the centre line the wave oscillates about. Real measured waves almost always need it: daily temperature swings around an average, tides around mean sea level, an audio signal around a resting voltage.',
    python: 'import math\n\ndef wave(x):\n    return math.sin(x) + 2   # centred on y = 2',
  },
];

export const SURFACE_SCENARIOS: WhatIfScenario[] = [
  {
    id: 'wi-surface-coefficient',
    topic: 'surfaces',
    parameter: 'a',
    question: 'For z = a(x² + y²), a changes from 0.3 to −0.3. What happens to the surface?',
    from: 0.3,
    to: -0.3,
    options: [
      { id: 'a', label: 'The bowl turns into a dome — the minimum becomes a maximum', correct: true },
      { id: 'b', label: 'The bowl becomes deeper', correct: false },
      { id: 'c', label: 'The bowl tips to one side', correct: false },
      { id: 'd', label: 'The surface becomes flat', correct: false },
    ],
    explanation:
      'Exactly what happens to a parabola when a changes sign — except now it happens in every direction at once, so the whole bowl inverts into a dome.',
    concept:
      'The 2D rule carries into 3D unchanged. A parabola swept around its axis is a paraboloid, and the sign of a governs the direction in both cases. This is why 2D understanding is worth building properly first: 3D usually extends it rather than replacing it.',
    python: 'def surface(x, y):\n    return -0.3 * (x**2 + y**2)   # a is now negative',
  },
  {
    id: 'wi-surface-saddle',
    topic: 'surfaces',
    parameter: 'a',
    question: 'For the saddle z = a(x² − y²), what is true at the centre point (0, 0)?',
    from: 0.3,
    to: 0.6,
    options: [
      { id: 'a', label: 'It is a minimum along one direction and a maximum along the other', correct: true },
      { id: 'b', label: 'It is the lowest point of the whole surface', correct: false },
      { id: 'c', label: 'It is the highest point of the whole surface', correct: false },
      { id: 'd', label: 'The surface is flat everywhere near it', correct: false },
    ],
    explanation:
      'Walk along the x-axis and the centre is the bottom of a valley. Walk along the y-axis and the same point is the top of a ridge. Increasing a exaggerates both at once.',
    concept:
      'A saddle point is something no 2D graph can show you, because a point on a curve is either a maximum or a minimum — never both. With two input directions, both can be true at once, which is exactly why this is worth seeing in 3D rather than reading about.',
    python: 'def surface(x, y):\n    return 0.6 * (x**2 - y**2)\n\n# along y = 0:  z = 0.6x²   (a valley)\n# along x = 0:  z = -0.6y²  (a ridge)',
  },
];

export const ALL_SCENARIOS = [
  ...LINEAR_SCENARIOS,
  ...QUADRATIC_SCENARIOS,
  ...TRIG_SCENARIOS,
  ...SURFACE_SCENARIOS,
];
