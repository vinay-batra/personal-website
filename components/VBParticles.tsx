"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

/* deterministic PRNG so the scatter + amber picks are identical every load */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

interface Cloud {
  n: number;
  targets: Float32Array;
  starts: Float32Array;
  disperse: Float32Array; // downward-stream target for the scroll dissolve
  colors: Float32Array;
  phases: Float32Array;
}

/** Rasterize "VB" and sample its filled pixels into a 3D point cloud. */
function sampleVB(maxCount: number): Cloud | null {
  const S = 500;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.font = '700 280px "Fraunces", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VB", S / 2, S / 2 + 8);

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

  // Density-weighted sampling: a serif "V" has one thick and one thin
  // diagonal, so uniform sampling leaves the thin right stroke faint. Weight
  // each pixel inversely to how many neighbors it has, so thin strokes and
  // edges get boosted to roughly the same particle density as thick strokes.
  const rnd = seeded(1907);
  const R = 4;
  const keyed = filled.map(([x, y], i) => {
    let cnt = 0;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (set.has((y + dy) * S + (x + dx))) cnt++;
      }
    }
    const weight = 1 / Math.pow(cnt, 0.7);
    // Efraimidis–Spirakis weighted sampling without replacement
    return { i, k: Math.pow(rnd() || 1e-9, 1 / weight) };
  });
  keyed.sort((a, b) => b.k - a.k);
  const n = Math.min(maxCount, keyed.length);
  const pick = keyed.slice(0, n).map((o) => filled[o.i]);
  const targets = new Float32Array(n * 3);
  const starts = new Float32Array(n * 3);
  const disperse = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  // pure white monogram — black & white, bright and crisp against the dark bg
  const white = new THREE.Color("#ffffff");
  const scale = 8.5 / S;

  for (let i = 0; i < n; i++) {
    const [px, py] = pick[i];
    const tx = (px - S / 2) * scale;
    const ty = -(py - S / 2) * scale;
    targets[i * 3] = tx;
    targets[i * 3 + 1] = ty;
    targets[i * 3 + 2] = (rnd() - 0.5) * 0.7;

    // scattered start — a loose sphere the glyph condenses out of
    const r = 9 + rnd() * 9;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    starts[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    starts[i * 3 + 1] = Math.cos(ph) * r;
    starts[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r - 3;

    // dissolve target — the letters break apart and stream well below the fold
    disperse[i * 3] = tx + (rnd() - 0.5) * 6;
    disperse[i * 3 + 1] = ty - (12 + rnd() * 30);
    disperse[i * 3 + 2] = (rnd() - 0.5) * 4;

    // every particle is pure white
    colors[i * 3] = white.r;
    colors[i * 3 + 1] = white.g;
    colors[i * 3 + 2] = white.b;
    phases[i] = rnd() * Math.PI * 2;
  }
  return { n, targets, starts, disperse, colors, phases };
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
  const pointer = useRef({ x: 0, y: 0 });

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
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    if (!reduced) prog.current = Math.min(1, prog.current + dt / 1.7);
    const e = easeOut(prog.current);
    const t = state.clock.elapsedTime;
    const arr = geom.attributes.position.array as Float32Array;
    const { starts, targets, disperse, phases, n } = cloud;
    const wob = reduced ? 0 : e * 0.045;

    // scroll dissolve: 0 while the hero is in view, → 1 as it scrolls away.
    // stretched across most of the hero exit so it fades out gradually
    const sp = scroll ? scroll.get() : 0;
    const dissolve = Math.min(1, Math.max(0, (sp - 0.12) / 0.85));
    const de = dissolve * dissolve; // ease-in: hold the letters, then break

    for (let i = 0; i < n; i++) {
      const k = i * 3;
      let x = starts[k] + (targets[k] - starts[k]) * e;
      let y = starts[k + 1] + (targets[k + 1] - starts[k + 1]) * e;
      let z = starts[k + 2] + (targets[k + 2] - starts[k + 2]) * e;

      // dissolve: break apart and stream downward
      if (de > 0) {
        x += (disperse[k] - x) * de;
        y += (disperse[k + 1] - y) * de + Math.sin(t * 1.4 + phases[i]) * de * 0.3;
        z += (disperse[k + 2] - z) * de;
      }

      arr[k] = x + Math.sin(t * 0.6 + phases[i]) * wob;
      arr[k + 1] = y + Math.cos(t * 0.7 + phases[i]) * wob;
      arr[k + 2] = z;
    }
    geom.attributes.position.needsUpdate = true;
    material.opacity = 1 - de;

    if (group.current && !reduced) {
      // tilt is centered on the monogram itself (not screen center), so it
      // leans evenly whether the cursor is to its left or right
      const vp = state.viewport;
      const relX = pointer.current.x - groupX / (vp.width / 2);
      const relY = pointer.current.y - groupY / (vp.height / 2);
      group.current.rotation.y += (relX * 0.32 - group.current.rotation.y) * 0.05;
      group.current.rotation.x += (-relY * 0.24 - group.current.rotation.x) * 0.05;
      // gentle breathing
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
      const c = sampleVB(4200);
      if (c) setCloud(c);
    };
    // sample once Fraunces is ready so the glyph shape is correct
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
