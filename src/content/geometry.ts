/**
 * Geometry Lab presets.
 *
 * Each is a short program a student can read in one glance, drawn with the
 * `shapes` or `turtle` library. The variables n, r, h and a are not defined in
 * the code: the Lab's sliders inject them, so moving a slider re-runs the
 * program and the picture answers. That is the whole teaching move - the
 * shape is the code, and the code has parameters.
 */

import type { IconName } from '../components/ui/Icon';

export interface GeometryPreset {
  id: string;
  name: string;
  icon: IconName;
  dim: '2d' | '3d';
  /** Which sliders this preset responds to. */
  uses: ('n' | 'r' | 'h' | 'a')[];
  code: string;
}

export const GEOMETRY_PRESETS: GeometryPreset[] = [
  // ------------------------------------------------------------------ 2D
  {
    id: 'circle',
    name: 'Circle',
    icon: 'circle',
    dim: '2d',
    uses: ['r'],
    code:
      'from shapes import *\n\n' +
      'c = circle(r, color="blue")\n\n' +
      'print("area      =", round(c.area, 2))\n' +
      'print("perimeter =", round(c.perimeter, 2))\n' +
      'print("ratio     =", round(c.perimeter / (2*r), 5))   # π\n',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    icon: 'hexagon',
    dim: '2d',
    uses: ['n', 'r', 'a'],
    code:
      'from shapes import *\n' +
      'import math\n\n' +
      'p = polygon(n, r, angle=a, color="violet")\n' +
      'c = circle(r, fill=False, color="grey")\n\n' +
      'print("sides:", p.sides)\n' +
      'print("polygon area:", round(p.area, 3))\n' +
      'print("circle area: ", round(c.area, 3))\n',
  },
  {
    id: 'pi',
    name: 'Squeeze π',
    icon: 'target',
    dim: '2d',
    uses: ['n'],
    code:
      'from shapes import *\n' +
      'import math\n\n' +
      '# A polygon inside the unit circle, and one outside.\n' +
      'inner = polygon(n, 1, color="cyan")\n' +
      'circle(1, fill=False, color="white")\n' +
      'outer = polygon(n, 1 / math.cos(math.pi / n), fill=False, color="amber")\n\n' +
      'print("inside :", round(inner.area, 5))\n' +
      'print("outside:", round(outer.area, 5))\n' +
      'print("pi     :", round(math.pi, 5))\n',
  },
  {
    id: 'star',
    name: 'Star',
    icon: 'star',
    dim: '2d',
    uses: ['n', 'r', 'a'],
    code:
      'from shapes import *\n\n' +
      'for i in range(3):\n' +
      '    s = star(n, r - i*0.5, color=["amber", "pink", "cyan"][i])\n' +
      '    s.rotate(a * i)\n' +
      '    print(s.sides, "points, area", round(s.area, 2))\n',
  },
  {
    id: 'pythagoras',
    name: 'Pythagoras',
    icon: 'triangle',
    dim: '2d',
    uses: [],
    code:
      'from shapes import *\n' +
      'import math\n\n' +
      'a, b = 3, 4\n' +
      'c = math.sqrt(a**2 + b**2)\n\n' +
      'triangle((0, 0), (a, 0), (0, b), color="white")\n' +
      'sa = square(a, at=(a/2, -a/2), color="cyan", label="a²")\n' +
      'sb = square(b, at=(-b/2, b/2), color="violet", label="b²")\n' +
      'sc = square(c, at=(a/2 + b/2, b/2 + a/2), color="amber", label="c²")\n' +
      'sc.rotate(-math.degrees(math.atan2(b, a)))\n\n' +
      'print(sa.area, "+", sb.area, "=", round(sc.area, 2))\n',
  },
  {
    id: 'spiral',
    name: 'Spiral',
    icon: 'spiral',
    dim: '2d',
    uses: ['n', 'a'],
    code:
      'import turtle\n\n' +
      'turtle.color("cyan")\n' +
      'for i in range(n * 12):\n' +
      '    turtle.forward(i * 0.4)\n' +
      '    turtle.left(a)\n\n' +
      'print("steps:", n * 12)\n',
  },
  {
    id: 'flower',
    name: 'Flower',
    icon: 'sparkle',
    dim: '2d',
    uses: ['n', 'r'],
    code:
      'from turtle import *\n\n' +
      'colors = ["pink", "violet", "cyan", "mint"]\n' +
      'for i in range(n):\n' +
      '    color(colors[i % 4])\n' +
      '    circle(r * 10)\n' +
      '    left(360 / n)\n',
  },
  {
    id: 'tiling',
    name: 'Tiling',
    icon: 'grid',
    dim: '2d',
    uses: ['n'],
    code:
      'from shapes import *\n\n' +
      'for row in range(n):\n' +
      '    for col in range(n):\n' +
      '        if (row + col) % 2 == 0:\n' +
      '            square(1, at=(col, row), color="violet")\n' +
      '        else:\n' +
      '            circle(0.5, at=(col, row), color="cyan")\n\n' +
      'print("tiles:", n * n)\n',
  },

  // ------------------------------------------------------------------ 3D
  {
    id: 'cube',
    name: 'Cube',
    icon: 'cube',
    dim: '3d',
    uses: ['h'],
    code:
      'from shapes import *\n\n' +
      'c = cube(h, color="cyan")\n\n' +
      'print("volume  =", round(c.volume, 2))\n' +
      'print("surface =", round(c.surface_area, 2))\n',
  },
  {
    id: 'solids',
    name: 'Solids',
    icon: 'layers',
    dim: '3d',
    uses: ['r', 'h'],
    code:
      'from shapes import *\n\n' +
      'solids = [\n' +
      '    sphere(r, at=(-6, 0, 0), color="cyan"),\n' +
      '    cube(h, at=(-2, 0, 0), color="violet"),\n' +
      '    cylinder(r, h, at=(2, 0, 0), color="mint"),\n' +
      '    cone(r, h, at=(6, 0, 0), color="amber"),\n' +
      '    pyramid(h, h, at=(-4, 5, 0), color="pink"),\n' +
      '    prism(6, r, h, at=(0, 5, 0), color="sky"),\n' +
      '    torus(r, r/3, at=(4, 5, 0), color="coral"),\n' +
      ']\n\n' +
      'for s in solids:\n' +
      '    print(f"{s.name:9} volume {s.volume:8.2f}")\n',
  },
  {
    id: 'cone',
    name: 'Cone ⅓',
    icon: 'triangle',
    dim: '3d',
    uses: ['r', 'h'],
    code:
      'from shapes import *\n\n' +
      'cy = cylinder(r, h, at=(-r - 0.5, 0, 0), color="violet", opacity=0.45)\n' +
      'co = cone(r, h, at=(r + 0.5, 0, 0), color="amber")\n\n' +
      'print("cylinder:", round(cy.volume, 3))\n' +
      'print("cone:    ", round(co.volume, 3))\n' +
      'print("ratio:   ", round(co.volume / cy.volume, 4))\n',
  },
  {
    id: 'sphere',
    name: 'Sphere in cube',
    icon: 'circle',
    dim: '3d',
    uses: ['r'],
    code:
      'from shapes import *\n' +
      'import math\n\n' +
      'box = cube(2*r, at=(0, 0, 0), color="white", opacity=0.18)\n' +
      'ball = sphere(r, at=(0, 0, 0), color="cyan")\n\n' +
      'print("sphere / cube =", round(ball.volume / box.volume, 4))\n' +
      'print("pi / 6        =", round(math.pi / 6, 4))\n',
  },
  {
    id: 'tower',
    name: 'Tower',
    icon: 'layers',
    dim: '3d',
    uses: ['n', 'r', 'a'],
    code:
      'from shapes import *\n\n' +
      'z = 0\n' +
      'total = 0\n' +
      'for i in range(n):\n' +
      '    size = r * (1 - i / (n + 1))\n' +
      '    b = box(size, size, 0.8, at=(0, 0, z), color=["cyan", "violet"][i % 2])\n' +
      '    b.rotate(a * i)\n' +
      '    total += b.volume\n' +
      '    z += 0.8\n\n' +
      'print("floors:", n)\n' +
      'print("volume:", round(total, 2))\n',
  },
  {
    id: 'orbit',
    name: 'Orbit',
    icon: 'orbit',
    dim: '3d',
    uses: ['n', 'r', 'h'],
    code:
      'from shapes import *\n' +
      'import math\n\n' +
      'sphere(1, color="amber")\n\n' +
      'for i in range(n):\n' +
      '    t = 2 * math.pi * i / n\n' +
      '    x = r * math.cos(t)\n' +
      '    y = r * math.sin(t)\n' +
      '    sphere(0.35, at=(x, y, h * i / n), color="cyan")\n\n' +
      'torus(r, 0.03, at=(0, 0, 0), color="grey", opacity=0.6)\n',
  },
];

/** Slider definitions shared by the Lab and the presets above. */
export const GEOMETRY_PARAMS = [
  { id: 'n', label: 'count', min: 3, max: 12, step: 1, initial: 6, domain: 'viz' as const },
  { id: 'r', label: 'radius', min: 0.5, max: 5, step: 0.1, initial: 2, domain: 'math' as const },
  { id: 'h', label: 'height', min: 0.5, max: 8, step: 0.1, initial: 3, domain: 'code' as const },
  { id: 'a', label: 'angle', min: 0, max: 360, step: 1, initial: 30, domain: 'spark' as const },
] as const;

export type GeometryParamId = (typeof GEOMETRY_PARAMS)[number]['id'];
