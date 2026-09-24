/**
 * ShapeScene3D - WebGL rendering of the 3D half of a GeometryScene.
 *
 * Solids a program built with the `shapes` library, drawn as lit glass over a
 * ground grid. When a new run arrives the solids grow into place one after
 * another, so the order the program made them in is visible.
 *
 * Axes: the library is mathematical (z up); Three.js is y up. The mapping is
 * (x, y, z) -> (x, z, -y), the same one Surface3D uses, so a shape standing on
 * z = 0 sits on the grid.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GeometryScene, Shape3D } from '../../lib/pyengine';
import { cx } from '../ui/Primitives';

interface Props {
  scene: GeometryScene;
  height?: number;
  autoRotate?: boolean;
  showGrid?: boolean;
  /** Re-fits the camera to the picture when this changes. */
  fitKey?: string | number;
  /** Replays the build-up animation when this changes. */
  revealKey?: string | number;
  className?: string;
  /** Fog and ground grid follow the page theme. */
  theme?: 'dark' | 'light';
}

const rad = (deg: number) => (deg * Math.PI) / 180;

const GROUND = {
  dark: { fog: 0x05070f, grid: [0x2b3c66, 0x17213a] as const },
  light: { fog: 0xeef1f8, grid: [0x8fa0c8, 0xcdd5e8] as const },
};

export function ShapeScene3D({
  scene,
  height = 420,
  autoRotate = true,
  showGrid = true,
  fitKey,
  revealKey,
  className,
  theme = 'dark',
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const autoRotateRef = useRef(autoRotate);
  const userTookOverRef = useRef(false);
  const pendingReveal = useRef(true);
  const lastFitRadius = useRef(0);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    grid: THREE.GridHelper | null;
    reveal: { start: number; count: number } | null;
    frame: number;
  } | null>(null);

  // ---- one-time scene construction -------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const three = new THREE.Scene();
    three.fog = new THREE.Fog(GROUND[theme].fog, 24, 70);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    camera.position.set(8, 6.5, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 120;
    controls.addEventListener('start', () => {
      userTookOverRef.current = true;
    });

    // Lighting for glass: a warm key, a cool rim, and a sky/ground hemisphere
    // so the undersides are never black.
    three.add(new THREE.HemisphereLight(0xbfd8ff, 0x1a1030, 0.75));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.6);
    key.position.set(6, 12, 8);
    three.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    rim.position.set(-8, 5, -6);
    three.add(rim);
    const fill = new THREE.DirectionalLight(0xa78bfa, 0.35);
    fill.position.set(0, -6, 4);
    three.add(fill);

    const group = new THREE.Group();
    three.add(group);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const st = stateRef.current;
      if (st?.reveal) {
        // Each solid grows in over ~450ms, staggered by creation order.
        const elapsed = performance.now() - st.reveal.start;
        const stagger = Math.min(90, 700 / Math.max(1, st.reveal.count));
        let done = true;
        st.group.children.forEach((child, i) => {
          const t = Math.max(0, Math.min(1, (elapsed - i * stagger) / 450));
          const e = 1 - Math.pow(1 - t, 3);
          const k = 0.001 + e * 0.999;
          child.scale.set(k, k, k);
          if (t < 1) done = false;
        });
        if (done) st.reveal = null;
      }
      controls.autoRotate = autoRotateRef.current && !userTookOverRef.current;
      controls.autoRotateSpeed = 0.6;
      controls.update();
      renderer.render(three, camera);
      if (stateRef.current) stateRef.current.frame = frame;
    };

    // Measure the mount rather than trusting the prop: a fullscreen frame
    // stretches it, and the render must follow.
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

    stateRef.current = { renderer, scene: three, camera, controls, group, grid: null, reveal: null, frame };
    lastFitRadius.current = 0;

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      disposeChildren(group);
      renderer.dispose();
      // Give the GPU context back now rather than whenever the canvas is
      // garbage-collected: a page that keeps old contexts alive soon hits the
      // browser's limit, and the newest canvas on screen is the one that pays.
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, [height]);

  // Declared before the build effect so a new run marks itself for animation
  // before the solids are rebuilt.
  useEffect(() => {
    pendingReveal.current = true;
  }, [revealKey]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (autoRotate) userTookOverRef.current = false;
  }, [autoRotate]);

  // ---- rebuild the solids whenever the program's scene changes ----------------
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;

    disposeChildren(st.group);
    for (const s of scene.shapes3d) st.group.add(buildSolid(s));

    // Frame the picture: on a new preset, on the first build, or when the
    // picture has outgrown (or shrunk well inside) the current frame.
    const box = new THREE.Box3().setFromObject(st.group);
    const radius = box.isEmpty() ? 4 : Math.max(1.5, box.getBoundingSphere(new THREE.Sphere()).radius);
    const grew = radius > lastFitRadius.current * 1.35 || radius < lastFitRadius.current * 0.4;
    if (lastFitRadius.current === 0 || grew) fit(st, box, radius);

    if (st.grid) {
      st.scene.remove(st.grid);
      st.grid.dispose();
    }
    const span = Math.max(10, Math.ceil(radius * 1.4) * 2);
    const ground = GROUND[themeRef.current];
    st.grid = new THREE.GridHelper(span, span, ground.grid[0], ground.grid[1]);
    st.grid.position.y = -0.002;
    st.grid.visible = showGrid;
    st.scene.add(st.grid);

    if (pendingReveal.current) {
      pendingReveal.current = false;
      st.group.children.forEach((c) => c.scale.set(0.001, 0.001, 0.001));
      st.reveal = { start: performance.now(), count: st.group.children.length };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // A preset change always re-frames, even when the size is similar.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const box = new THREE.Box3().setFromObject(st.group);
    const radius = box.isEmpty() ? 4 : Math.max(1.5, box.getBoundingSphere(new THREE.Sphere()).radius);
    fit(st, box, radius);
    userTookOverRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    const st = stateRef.current;
    if (st?.grid) st.grid.visible = showGrid;
  }, [showGrid]);

  // Theme: swap the fog, recolour the grid in place.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    (st.scene.fog as THREE.Fog).color.setHex(GROUND[theme].fog);
    if (st.grid) {
      const span = (st.grid.geometry.boundingSphere?.radius ?? 5) * Math.SQRT2;
      const size = Math.max(10, Math.round(span));
      const visible = st.grid.visible;
      st.scene.remove(st.grid);
      st.grid.dispose();
      st.grid = new THREE.GridHelper(size, size, GROUND[theme].grid[0], GROUND[theme].grid[1]);
      st.grid.position.y = -0.002;
      st.grid.visible = visible;
      st.scene.add(st.grid);
    }
  }, [theme]);

  function fit(st: NonNullable<typeof stateRef.current>, box: THREE.Box3, radius: number) {
    const center = box.isEmpty() ? new THREE.Vector3(0, 1, 0) : box.getCenter(new THREE.Vector3());
    lastFitRadius.current = radius;
    st.controls.target.copy(center);
    // Keep the current viewing direction; only the distance changes.
    const dir = st.camera.position.clone().sub(st.controls.target).normalize();
    if (!Number.isFinite(dir.x) || dir.lengthSq() < 0.01) dir.set(0.62, 0.5, 0.6).normalize();
    st.camera.position.copy(center).addScaledVector(dir, radius * 2.6);
    st.controls.update();
  }

  return <div ref={mountRef} className={cx('viz-3d', className)} style={{ height, overflow: 'hidden' }} />;
}

// -------------------------------------------------------------- solids

function buildSolid(s: Shape3D): THREE.Object3D {
  const holder = new THREE.Group();
  const [w, d, h] = s.size;
  let geometry: THREE.BufferGeometry;
  let lift: number;
  const inner = new THREE.Group();

  switch (s.kind) {
    case 'box':
      geometry = new THREE.BoxGeometry(w, h, d);
      lift = h / 2;
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(w, 48, 32);
      lift = w;
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(w, w, d, 56);
      lift = d / 2;
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(w, d, 56);
      lift = d / 2;
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(w, d, 24, 72);
      inner.rotation.x = -Math.PI / 2;
      lift = d;
      break;
    case 'prism':
      geometry = new THREE.CylinderGeometry(d, d, h, Math.round(w));
      lift = h / 2;
      break;
    case 'pyramid':
      geometry = new THREE.ConeGeometry(d, h, Math.round(w));
      lift = h / 2;
      break;
  }

  const color = new THREE.Color(s.color);
  const material = s.wireframe
    ? new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.8 })
    : new THREE.MeshPhysicalMaterial({
        color,
        transparent: true,
        opacity: s.opacity,
        roughness: 0.3,
        metalness: 0.08,
        clearcoat: 0.85,
        clearcoatRoughness: 0.25,
        depthWrite: s.opacity >= 0.85,
        emissive: color.clone().multiplyScalar(0.12),
      });
  const mesh = new THREE.Mesh(geometry, material);
  inner.add(mesh);

  // Crisp edges give glass its silhouette. Curved solids have none worth
  // drawing at this threshold, which is exactly right.
  if (!s.wireframe && (s.kind === 'box' || s.kind === 'prism' || s.kind === 'pyramid' || s.kind === 'cone')) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 25),
      new THREE.LineBasicMaterial({ color: color.clone().lerp(new THREE.Color('#ffffff'), 0.45), transparent: true, opacity: 0.6 }),
    );
    inner.add(edges);
  }

  holder.add(inner);
  // Rotation about the shape's own centre, then placement so it stands on z.
  const pivot = new THREE.Group();
  pivot.add(holder);
  holder.position.set(0, lift, 0);
  pivot.rotation.set(rad(s.rotation[0]), rad(s.rotation[2]), rad(-s.rotation[1]));
  pivot.position.set(s.position[0], s.position[2], -s.position[1]);

  if (s.label) {
    const label = makeLabel(s.label, s.color);
    label.position.set(0, lift * 2 + 0.45, 0);
    pivot.add(label);
  }
  return pivot;
}

function disposeChildren(group: THREE.Group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Sprite) {
      obj.geometry?.dispose();
      const m = obj.material as THREE.Material | THREE.Material[];
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    }
  });
  group.clear();
}

function makeLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = '600 28px ui-sans-serif, system-ui, sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + 28;
  canvas.width = w;
  canvas.height = 48;
  ctx.font = '600 28px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(8,12,26,0.8)';
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, 46, 12);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 25);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(w / 48, 1, 1);
  return sprite;
}
