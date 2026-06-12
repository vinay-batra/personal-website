"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScroll, type MotionValue } from "framer-motion";
import * as THREE from "three";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

/**
 * One persistent particle cloud for the whole page. It condenses into "VB" in
 * the hero, then morphs through a chart, strings, a network, and a
 * constellation as you scroll — the section visuals rendered as living
 * particles. Driven by global scroll progress; click to shatter.
 */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const HALF_W = 4.6;
const HALF_H = 2.9;

// ---- shape generators: each returns a normalized Float32Array(n*3) ----

function rankWord(ctx: CanvasRenderingContext2D, S: number, word: string, seed: number) {
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fs = 300;
  ctx.font = `700 ${fs}px "Fraunces", Georgia, serif`;
  const m = ctx.measureText(word).width;
  if (m > S * 0.86) fs = (fs * (S * 0.86)) / m;
  fs = Math.min(fs, S * 0.6);
  ctx.font = `700 ${fs}px "Fraunces", Georgia, serif`;
  ctx.fillText(word, S / 2, S / 2);
  const data = ctx.getImageData(0, 0, S, S).data;
  const filled: [number, number][] = [];
  const set = new Set<number>();
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (data[(y * S + x) * 4 + 3] > 120) {
        filled.push([x, y]);
        set.add(y * S + x);
      }
  if (!filled.length) return null;
  const rnd = seeded(seed);
  const R = 4;
  const keyed = filled.map(([x, y], i) => {
    let c = 0;
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) if (set.has((y + dy) * S + (x + dx))) c++;
    return { i, k: Math.pow(rnd() || 1e-9, Math.pow(c, 0.7)) };
  });
  keyed.sort((a, b) => b.k - a.k);
  return { filled, keyed };
}

function normalize(arr: Float32Array, n: number) {
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = arr[i * 3], y = arr[i * 3 + 1];
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
  }
  const sc = Math.min((2 * HALF_W) / ((maxx - minx) || 1), (2 * HALF_H) / ((maxy - miny) || 1));
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  for (let i = 0; i < n; i++) {
    arr[i * 3] = (arr[i * 3] - cx) * sc;
    arr[i * 3 + 1] = (arr[i * 3 + 1] - cy) * sc;
  }
  return arr;
}

function wordShape(word: string, n: number, ctx: CanvasRenderingContext2D, S: number, seed: number) {
  const r = rankWord(ctx, S, word, seed);
  if (!r) return null;
  const pick = r.keyed.slice(0, n).map((o) => r.filled[o.i]);
  const arr = new Float32Array(n * 3);
  const z = seeded(seed + 7);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = pick[i % pick.length][0];
    arr[i * 3 + 1] = -pick[i % pick.length][1];
    arr[i * 3 + 2] = (z() - 0.5) * 0.7;
  }
  return normalize(arr, n);
}

// rising Monte-Carlo fan of paths (Corvo)
function chartShape(n: number, seed: number) {
  const rnd = seeded(seed);
  const arr = new Float32Array(n * 3);
  const paths = 7;
  const per = Math.ceil(n / paths);
  let idx = 0;
  for (let p = 0; p < paths && idx < n; p++) {
    let y = -HALF_H * 0.7 + (rnd() - 0.5) * 0.4;
    const drift = (HALF_H * 1.5) / per + (rnd() - 0.5) * 0.01;
    for (let i = 0; i < per && idx < n; i++) {
      const x = -HALF_W + (i / per) * 2 * HALF_W;
      y += drift + (rnd() - 0.5) * 0.32;
      arr[idx * 3] = x;
      arr[idx * 3 + 1] = Math.max(-HALF_H, Math.min(HALF_H, y));
      arr[idx * 3 + 2] = (rnd() - 0.5) * 0.6;
      idx++;
    }
  }
  return normalize(arr, n);
}

// plucked vertical strings (Lark)
function stringsShape(n: number, seed: number) {
  const rnd = seeded(seed);
  const arr = new Float32Array(n * 3);
  const cols = 16;
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const x = -HALF_W + (c / (cols - 1)) * 2 * HALF_W;
    const ty = (rnd() * 2 - 1) * HALF_H;
    const wave = Math.sin(ty * 1.4 + c) * (0.18 - Math.abs(ty) / HALF_H * 0.16);
    arr[i * 3] = x + wave;
    arr[i * 3 + 1] = ty;
    arr[i * 3 + 2] = (rnd() - 0.5) * 0.5;
  }
  return normalize(arr, n);
}

// node + edge network (FBLA)
function networkShape(n: number, seed: number) {
  const rnd = seeded(seed);
  const K = 34;
  const nodes: [number, number][] = [];
  for (let i = 0; i < K; i++) nodes.push([(rnd() * 2 - 1) * HALF_W, (rnd() * 2 - 1) * HALF_H]);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (i % 5 === 0) {
      const a = nodes[i % K];
      arr[i * 3] = a[0] + (rnd() - 0.5) * 0.1;
      arr[i * 3 + 1] = a[1] + (rnd() - 0.5) * 0.1;
    } else {
      // a point along an edge between two nearby nodes
      const a = nodes[Math.floor(rnd() * K)];
      let b = a, best = 1e9;
      for (let j = 0; j < 6; j++) {
        const cand = nodes[Math.floor(rnd() * K)];
        const d = (cand[0] - a[0]) ** 2 + (cand[1] - a[1]) ** 2;
        if (d > 0.01 && d < best) {
          best = d;
          b = cand;
        }
      }
      const t = rnd();
      arr[i * 3] = a[0] + (b[0] - a[0]) * t;
      arr[i * 3 + 1] = a[1] + (b[1] - a[1]) * t;
    }
    arr[i * 3 + 2] = (rnd() - 0.5) * 0.7;
  }
  return normalize(arr, n);
}

// sparse constellation with a few bright anchors (Philadelphia)
function constellationShape(n: number, seed: number) {
  const rnd = seeded(seed);
  const anchors: [number, number][] = [
    [-3.2, 1.4], [-1.4, 0.4], [0.2, 1.6], [1.8, 0.6], [3.2, 1.3], [0.6, -1.2], [-1.8, -1.6],
  ];
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (i % 7 === 0) {
      // dense cluster on an anchor "star"
      const a = anchors[i % anchors.length];
      arr[i * 3] = a[0] + (rnd() - 0.5) * 0.16;
      arr[i * 3 + 1] = a[1] + (rnd() - 0.5) * 0.16;
    } else if (i % 7 < 4) {
      // along the lines that connect consecutive anchors
      const ai = i % anchors.length;
      const a = anchors[ai], b = anchors[(ai + 1) % anchors.length];
      const t = rnd();
      arr[i * 3] = a[0] + (b[0] - a[0]) * t;
      arr[i * 3 + 1] = a[1] + (b[1] - a[1]) * t;
    } else {
      // faint scattered background stars
      arr[i * 3] = (rnd() * 2 - 1) * HALF_W;
      arr[i * 3 + 1] = (rnd() * 2 - 1) * HALF_H;
    }
    arr[i * 3 + 2] = (rnd() - 0.5) * 0.8;
  }
  return normalize(arr, n);
}

interface Cloud {
  n: number;
  shapes: Float32Array[];
  starts: Float32Array;
  colors: Float32Array;
  phases: Float32Array;
}

function buildCloud(n: number): Cloud | null {
  const S = 500;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;

  const vb = wordShape("VB", n, ctx, S, 1907);
  if (!vb) return null;
  const shapes = [
    vb,
    chartShape(n, 11),
    stringsShape(n, 23),
    networkShape(n, 41),
    constellationShape(n, 59),
  ];

  const rnd = seeded(2024);
  const starts = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const white = new THREE.Color("#ffffff");
  for (let i = 0; i < n; i++) {
    const r = 9 + rnd() * 9;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    starts[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    starts[i * 3 + 1] = Math.cos(ph) * r;
    starts[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r - 3;
    colors[i * 3] = white.r;
    colors[i * 3 + 1] = white.g;
    colors[i * 3 + 2] = white.b;
    phases[i] = rnd() * Math.PI * 2;
  }
  return { n, shapes, starts, colors, phases };
}

function discTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.7, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(32, 32, 32, 0, Math.PI * 2);
  x.fill();
  return new THREE.CanvasTexture(c);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// scroll fraction → shape index keyframes (tunable on the live deploy)
const KEYS = [0.0, 0.2, 0.4, 0.58, 0.8, 1.0];

function SpineCloud({
  cloud,
  reduced,
  scroll,
  groupX,
}: {
  cloud: Cloud;
  reduced: boolean;
  scroll: MotionValue<number>;
  groupX: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const prog = useRef(reduced ? 1 : 0);
  const pointer = useRef({ x: 0, y: 0 });
  const burstStart = useRef(-100);
  const burstQueued = useRef(false);

  const { geom, material } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cloud.starts), 3));
    geom.setAttribute("color", new THREE.BufferAttribute(cloud.colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: discTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return { geom, material };
  }, [cloud]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onDown = () => (burstQueued.current = true);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useFrame((state, dt) => {
    if (!reduced) prog.current = Math.min(1, prog.current + dt / 1.7);
    const e = easeOut(prog.current);
    const t = state.clock.elapsedTime;
    const arr = geom.attributes.position.array as Float32Array;
    const { starts, shapes, phases, n } = cloud;
    const wob = reduced ? 0 : e * 0.04;

    // map scroll → a position in the shape sequence
    const sp = Math.min(1, Math.max(0, scroll.get()));
    let seg = 0;
    while (seg < KEYS.length - 2 && sp > KEYS[seg + 1]) seg++;
    const span = KEYS[seg + 1] - KEYS[seg] || 1;
    const localT = smooth((sp - KEYS[seg]) / span);
    const A = shapes[seg % shapes.length];
    const B = shapes[(seg + 1) % shapes.length];

    const vp = state.viewport;
    const clx = pointer.current.x * (vp.width / 2) - groupX;
    const cly = pointer.current.y * (vp.height / 2);
    if (burstQueued.current) {
      burstQueued.current = false;
      if (Math.abs(clx) < 6 && Math.abs(cly) < 5) burstStart.current = t;
    }
    const tau = (t - burstStart.current) / 1.5;
    const burst = tau >= 0 && tau <= 1 ? Math.sin(Math.PI * tau) : 0;

    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const tx = A[k] + (B[k] - A[k]) * localT;
      const ty = A[k + 1] + (B[k + 1] - A[k + 1]) * localT;
      const tz = A[k + 2] + (B[k + 2] - A[k + 2]) * localT;
      let x = starts[k] + (tx - starts[k]) * e;
      let y = starts[k + 1] + (ty - starts[k + 1]) * e;
      let z = starts[k + 2] + (tz - starts[k + 2]) * e;
      if (burst > 0.0001) {
        x += (starts[k] - x) * burst;
        y += (starts[k + 1] - y) * burst;
        z += (starts[k + 2] - z) * burst;
      }
      x += Math.sin(t * 0.6 + phases[i]) * wob;
      y += Math.cos(t * 0.7 + phases[i]) * wob;
      arr[k] = x;
      arr[k + 1] = y;
      arr[k + 2] = z;
    }
    geom.attributes.position.needsUpdate = true;

    if (group.current && !reduced) {
      const relX = pointer.current.x - groupX / (vp.width / 2);
      group.current.rotation.y += (relX * 0.3 - group.current.rotation.y) * 0.05;
      group.current.rotation.x += (-pointer.current.y * 0.2 - group.current.rotation.x) * 0.05;
      const s = 1 + Math.sin(t * 0.5) * 0.01;
      group.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={group} position={[groupX, 0.3, 0]}>
      <points geometry={geom} material={material} frustumCulled={false} />
    </group>
  );
}

export default function ParticleSpine() {
  const reduced = useReducedMotionSafe();
  const [cloud, setCloud] = useState<Cloud | null>(null);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    let alive = true;
    const build = () => {
      if (!alive) return;
      const c = buildCloud(4200);
      if (c) setCloud(c);
    };
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
    return () => {
      alive = false;
    };
  }, []);

  if (!cloud) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden md:block" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 14], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <SpineCloud cloud={cloud} reduced={reduced} scroll={scrollYProgress} groupX={4.0} />
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
