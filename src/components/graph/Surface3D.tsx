/**
 * Surface3D - WebGL rendering of z = f(x, y).
 *
 * 3D is used here because it carries information a 2D graph cannot: a surface
 * shows how a function responds to *two* inputs at once, which is what makes a
 * saddle point comprehensible. The colour ramp encodes height, so the shape can
 * still be read on a projector, and the wireframe shows the grid of (x, y)
 * samples the mathematics is actually evaluated on.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cx } from '../ui/Primitives';

interface Props {
  /** The surface being drawn, already bound to its live coefficient. */
  f: (x: number, y: number) => number;
  /** Half-width of the sampled domain. */
  extent?: number;
  /** Samples per axis. Higher is smoother and slower. */
  resolution?: number;
  height?: number;
  showWireframe?: boolean;
  showAxes?: boolean;
  /** Vertical exaggeration applied before drawing. */
  zScale?: number;
  className?: string;
  autoRotate?: boolean;
  /** Fog and ground grid follow the page theme. */
  theme?: 'dark' | 'light';
}

const GROUND = {
  dark: { fog: 0x05070f, grid: [0x334670, 0x1b263f] as const },
  light: { fog: 0xeef1f8, grid: [0x8fa0c8, 0xcdd5e8] as const },
};

// Cool-to-warm ramp: low ground is deep blue, peaks are amber.
const RAMP: [number, THREE.Color][] = [
  [0.0, new THREE.Color('#1e3a8a')],
  [0.28, new THREE.Color('#0ea5e9')],
  [0.5, new THREE.Color('#22d3ee')],
  [0.72, new THREE.Color('#a78bfa')],
  [1.0, new THREE.Color('#fbbf24')],
];

function rampColor(t: number, out: THREE.Color) {
  const u = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (u <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      out.copy(c0).lerp(c1, (u - t0) / (t1 - t0));
      return out;
    }
  }
  return out.copy(RAMP[RAMP.length - 1][1]);
}

export function Surface3D({
  f,
  extent = 5,
  resolution = 72,
  height = 420,
  showWireframe = true,
  showAxes = true,
  zScale = 1,
  className,
  autoRotate = false,
  theme = 'dark',
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Read inside the render loop rather than captured by it, so toggling
  // auto-rotate takes effect without rebuilding the whole scene.
  const autoRotateRef = useRef(autoRotate);
  // Set the moment the student grabs the surface. Auto-rotation is a hint that
  // the view can be moved; once they have taken the hint, it should get out of
  // the way rather than fight them for control.
  const userTookOverRef = useRef(false);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    geometry: THREE.PlaneGeometry;
    wire: THREE.Mesh;
    frame: number;
  } | null>(null);

  // ---- one-time scene construction ---------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(GROUND[theme].fog, 18, 42);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(9, 7.5, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, height);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.target.set(0, 0, 0);
    controls.addEventListener('start', () => {
      userTookOverRef.current = true;
    });

    // Lighting: one key light for form, one rim light for the silhouette.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(8, 14, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.5);
    rim.position.set(-9, 4, -7);
    scene.add(rim);

    // Surface mesh - a plane deformed each time the function changes.
    const geometry = new THREE.PlaneGeometry(
      extent * 2, extent * 2, resolution, resolution,
    );
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.52,
      metalness: 0.12,
      flatShading: false,
      transparent: true,
      opacity: 0.97,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // put the plane in the x-z ground plane
    scene.add(mesh);

    // The wireframe shares the surface's geometry rather than deriving its own.
    // Rebuilding a WireframeGeometry on every frame of an animated surface is
    // the single most expensive thing this component could do; sharing means the
    // grid follows the shape for free.
    const wire = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        wireframe: true,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
    );
    wire.rotation.x = -Math.PI / 2;
    scene.add(wire);

    // Ground grid and axes give the surface a frame of reference.
    const grid = new THREE.GridHelper(extent * 2, 10, GROUND[theme].grid[0], GROUND[theme].grid[1]);
    grid.position.y = -0.001;
    scene.add(grid);

    const axes = new THREE.Group();
    const axisMat = (c: number) => new THREE.LineBasicMaterial({ color: c });
    const axis = (from: THREE.Vector3, to: THREE.Vector3, c: number) =>
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), axisMat(c));
    const L = extent + 0.8;
    axes.add(axis(new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0), 0xf87171)); // x
    axes.add(axis(new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L), 0x4ade80)); // y
    axes.add(axis(new THREE.Vector3(0, -L * 0.5, 0), new THREE.Vector3(0, L, 0), 0x60a5fa)); // z
    axes.add(makeLabel('x', new THREE.Vector3(L + 0.4, 0.2, 0), '#f87171'));
    axes.add(makeLabel('y', new THREE.Vector3(0, 0.2, L + 0.4), '#4ade80'));
    axes.add(makeLabel('z', new THREE.Vector3(0, L + 0.5, 0), '#60a5fa'));
    scene.add(axes);
    axes.visible = showAxes;
    axes.name = 'axes';
    grid.name = 'grid';

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.autoRotate = autoRotateRef.current && !userTookOverRef.current;
      controls.autoRotateSpeed = 0.7;
      controls.update();
      renderer.render(scene, camera);
      if (stateRef.current) stateRef.current.frame = frame;
    };

    // The mount's own height is measured rather than the prop used, so that a
    // fullscreen frame (which stretches the mount) gets a full-size render.
    const resize = () => {
      if (!mount.clientWidth) return;
      const h = mount.clientHeight || height;
      camera.aspect = mount.clientWidth / h;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();
    animate();

    stateRef.current = { renderer, scene, camera, controls, geometry, wire, frame };

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      (wire.material as THREE.Material).dispose();
      renderer.dispose();
      // Give the GPU context back now rather than whenever the canvas is
      // garbage-collected: a page that keeps old contexts alive soon hits the
      // browser's limit, and the newest canvas on screen is the one that pays.
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
    // The scene is built once; the effects below keep it in step with props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extent, resolution, height]);

  // ---- re-shape the surface whenever the function changes -------------------
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;

    const geo = st.geometry;
    const pos = geo.attributes.position;
    const count = pos.count;
    const heights = new Float32Array(count);
    let lo = Infinity;
    let hi = -Infinity;

    for (let i = 0; i < count; i++) {
      // Plane is built in x-y then rotated, so its local y is the world -z.
      const x = pos.getX(i);
      const y = pos.getY(i);
      let z = f(x, -y);
      if (!Number.isFinite(z)) z = 0;
      z = Math.max(-40, Math.min(40, z)) * zScale;
      heights[i] = z;
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }

    const span = hi - lo || 1;
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      pos.setZ(i, heights[i]);
      rampColor((heights[i] - lo) / span, c);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    // The wireframe shares this geometry, so it is already up to date.
  }, [f, zScale]);

  // Switching auto-rotate back on is an explicit request to resume, so it also
  // clears the "the student is driving" flag.
  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (autoRotate) userTookOverRef.current = false;
  }, [autoRotate]);

  // ---- theme: swap the fog and rebuild the ground grid ------------------------
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    (st.scene.fog as THREE.Fog).color.setHex(GROUND[theme].fog);
    const old = st.scene.getObjectByName('grid') as THREE.GridHelper | undefined;
    const visible = old?.visible ?? showAxes;
    if (old) {
      st.scene.remove(old);
      old.dispose();
    }
    const grid = new THREE.GridHelper(extent * 2, 10, GROUND[theme].grid[0], GROUND[theme].grid[1]);
    grid.position.y = -0.001;
    grid.name = 'grid';
    grid.visible = visible;
    st.scene.add(grid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, extent]);

  // ---- toggles ---------------------------------------------------------------
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    st.wire.visible = showWireframe;
    const axes = st.scene.getObjectByName('axes');
    const grid = st.scene.getObjectByName('grid');
    if (axes) axes.visible = showAxes;
    if (grid) grid.visible = showAxes;
  }, [showWireframe, showAxes]);

  return (
    <div
      ref={mountRef}
      className={cx('viz-3d', className)}
      style={{ height, borderRadius: 10, overflow: 'hidden' }}
    />
  );
}

/** Axis letter drawn to a canvas and hung in the scene as a sprite. */
function makeLabel(text: string, position: THREE.Vector3, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'italic 44px Cambria, Georgia, serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.position.copy(position);
  sprite.scale.set(0.9, 0.9, 0.9);
  return sprite;
}
