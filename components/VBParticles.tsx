"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

/* deterministic PRNG so the scatter + sampling are identical every load */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

interface Cloud {
  n: number;
  shapes: Float32Array[]; // one normalized target layout per word
  starts: Float32Array;
  disperse: Float32Array; // downward-stream target for the scroll dissolve
  colors: Float32Array;
  phases: Float32Array;
}

const HALF_W = 4.3; // each word is normalized to fit this half-box, centered
const HALF_H = 2.7;

/** Rasterize a word and density-weight-rank its filled pixels. Density
 *  weighting boosts thin serif strokes so they read at the same density. */
function rankWord(ctx: CanvasRenderingContext2D, S: number, word: string, seed: number) {
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fs = 300;
  ctx.font = `700 ${fs}px "Fraunces", Georgia, serif`;
  const measured = ctx.measureText(word).width;
  if (measured > S * 0.86) fs = (fs * (S * 0.86)) / measured;
  fs = Math.min(fs, S * 0.6);
  ctx.font = `700 ${fs}px "Fraunces", Georgia, serif`;
  ctx.fillText(word, S / 2, S / 2);

  const data = ctx.getImageData(0, 0, S, S).data;
  const filled: [number, number][] = [];
  const set = new Set<number>();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (data[(y * S + x) * 4 + 3] > 120) {
        filled.push([x, y]);
        set.add(y * S + x);
      }
    }
  }
  if (filled.length === 0) return null;

  const rnd = seeded(seed);
  const R = 4;
  const keyed = filled.map(([x, y], i) => {
    let cnt = 0;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (set.has((y + dy) * S + (x + dx))) cnt++;
      }
    }
    const weight = 1 / Math.pow(cnt, 0.7);
    return { i, k: Math.pow(rnd() || 1e-9, 1 / weight) };
  });
  keyed.sort((a, b) => b.k - a.k);
  return { filled, keyed };
}

/** Sample several words into matched point clouds that morph into each other. */
function sampleShapes(words: string[], maxCount: number): Cloud | null {
  const S = 500;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;

  const ranked = words.map((w, wi) => rankWord(ctx, S, w, 1907 + wi * 101));
  if (ranked.some((r) => !r)) return null;
  const ok = ranked as { filled: [number, number][]; keyed: { i: number; k: number }[] }[];

  const n = Math.min(maxCount, ...ok.map((r) => r.keyed.length));

  // normalize each word to the same centered box so VB and INVEST share a footprint
  const zrnd = seeded(9001);
  const shapes = ok.map((r) => {
    const pick = r.keyed.slice(0, n).map((o) => r.filled[o.i]);
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const [x, y] of pick) {
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
    }
    const sc = Math.min((2 * HALF_W) / ((maxx - minx) || 1), (2 * HALF_H) / ((maxy - miny) || 1));
    const cx = (minx + maxx) / 2;
    const cy = (miny + maxy) / 2;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [px, py] = pick[i];
      arr[i * 3] = (px - cx) * sc;
      arr[i * 3 + 1] = -(py - cy) * sc;
      arr[i * 3 + 2] = (zrnd() - 0.5) * 0.7;
    }
    return arr;
  });

  const rnd = seeded(2024);
  const starts = new Float32Array(n * 3);
  const disperse = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const white = new THREE.Color("#ffffff");
  const home = shapes[0]; // dissolve streams from the VB layout

  for (let i = 0; i < n; i++) {
    const r = 9 + rnd() * 9;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    starts[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    starts[i * 3 + 1] = Math.cos(ph) * r;
    starts[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r - 3;

    disperse[i * 3] = home[i * 3] + (rnd() - 0.5) * 6;
    disperse[i * 3 + 1] = home[i * 3 + 1] - (12 + rnd() * 30);
    disperse[i * 3 + 2] = (rnd() - 0.5) * 4;

    colors[i * 3] = white.r;
    colors[i * 3 + 1] = white.g;
    colors[i * 3 + 2] = white.b;
    phases[i] = rnd() * Math.PI * 2;
  }
  return { n, shapes, starts, disperse, colors, phases };
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

// word display rhythm: hold a word, then morph to the next
const HOLD = 3.0;
const MORPH = 1.7;
const CYCLE = HOLD + MORPH;

function Monogram({
  cloud,
  reduced,
  scroll,
  groupX,
  groupY,
}: {
  cloud: Cloud;
  reduced: boolean;
  scroll?: MotionValue<number>;
  groupX: number;
  groupY: number;
}) {
  const ref = useRef<THREE.Points>(null!);
  const group = useRef<THREE.Group>(null!);
  const prog = useRef(reduced ? 1 : 0);
  const morphClock = useRef(0); // advances only while the hero is in view
  const pointer = useRef({ x: 0, y: 0, inside: false });
  const burstStart = useRef(-100); // clock time of the last shatter click
  const burstQueued = useRef(false);

  const { geom, material } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(cloud.starts); // start scattered
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
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
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.current.inside = true;
    };
    // click near the monogram shatters it; the frame loop validates the region
    const onDown = () => {
      burstQueued.current = true;
    };
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
    const { starts, shapes, disperse, phases, n } = cloud;
    const wob = reduced ? 0 : e * 0.045;

    // scroll dissolve: 0 while the hero is in view, → 1 as it scrolls away
    const sp = scroll ? scroll.get() : 0;
    const dissolve = Math.min(1, Math.max(0, (sp - 0.12) / 0.85));
    const de = dissolve * dissolve;

    // word re-spell: cycle VB → BUILD → INVEST while the hero is on screen
    if (!reduced && de < 0.15) morphClock.current += dt;
    const NW = shapes.length;
    const tc = morphClock.current;
    const idx = Math.floor(tc / CYCLE) % NW;
    const nxt = (idx + 1) % NW;
    const local = tc % CYCLE;
    const me = local <= HOLD ? 0 : smooth((local - HOLD) / MORPH);
    const A = shapes[idx];
    const B = shapes[nxt];

    // cursor position in the group's local XY (for the shatter region test)
    const vp = state.viewport;
    const clx = pointer.current.x * (vp.width / 2) - groupX;
    const cly = pointer.current.y * (vp.height / 2) - groupY;

    if (burstQueued.current) {
      burstQueued.current = false;
      if (Math.abs(clx) < 5.5 && Math.abs(cly) < 4.5 && de < 0.3) burstStart.current = t;
    }
    const tau = (t - burstStart.current) / 1.5;
    const burst = tau >= 0 && tau <= 1 ? Math.sin(Math.PI * tau) : 0;

    for (let i = 0; i < n; i++) {
      const k = i * 3;
      // current formed target = morph between the two active words
      const tx = A[k] + (B[k] - A[k]) * me;
      const ty = A[k + 1] + (B[k + 1] - A[k + 1]) * me;
      const tz = A[k + 2] + (B[k + 2] - A[k + 2]) * me;

      let x = starts[k] + (tx - starts[k]) * e;
      let y = starts[k + 1] + (ty - starts[k + 1]) * e;
      let z = starts[k + 2] + (tz - starts[k + 2]) * e;

      // dissolve: break apart and stream downward
      if (de > 0) {
        x += (disperse[k] - x) * de;
        y += (disperse[k + 1] - y) * de + Math.sin(t * 1.4 + phases[i]) * de * 0.3;
        z += (disperse[k + 2] - z) * de;
      }

      // shatter: blend out toward the scatter sphere, then reform
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
    material.opacity = 1 - de;

    if (group.current && !reduced) {
      const relX = pointer.current.x - groupX / (vp.width / 2);
      const relY = pointer.current.y - groupY / (vp.height / 2);
      group.current.rotation.y += (relX * 0.32 - group.current.rotation.y) * 0.05;
      group.current.rotation.x += (-relY * 0.24 - group.current.rotation.x) * 0.05;
      const s = 1 + Math.sin(t * 0.5) * 0.012;
      group.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={group} position={[groupX, groupY, 0]}>
      <points ref={ref} geometry={geom} material={material} frustumCulled={false} />
    </group>
  );
}

export default function VBParticles({
  reduced,
  scroll,
  active = true,
  groupX = 4.1,
  groupY = 0.5,
}: {
  reduced: boolean;
  scroll?: MotionValue<number>;
  active?: boolean;
  groupX?: number;
  groupY?: number;
}) {
  const [cloud, setCloud] = useState<Cloud | null>(null);

  useEffect(() => {
    let alive = true;
    const build = () => {
      if (!alive) return;
      const c = sampleShapes(["VB", "BUILD", "INVEST"], 4200);
      if (c) setCloud(c);
    };
    // sample once Fraunces is ready so the glyph shapes are correct
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="h-full w-full">
      {cloud && (
        <Canvas
          camera={{ position: [0, 0, 14], fov: 45 }}
          dpr={[1, 1.5]}
          frameloop={active ? "always" : "never"}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <Monogram
            cloud={cloud}
            reduced={reduced}
            scroll={scroll}
            groupX={groupX}
            groupY={groupY}
          />
          {/* glow: let the white particles bleed light against the dark bg */}
          <EffectComposer enableNormalPass={false} multisampling={0}>
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.5}
              mipmapBlur
              radius={0.7}
            />
          </EffectComposer>
        </Canvas>
      )}
    </div>
  );
}
