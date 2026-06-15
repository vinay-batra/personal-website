"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import ShaderToy, { LAVA_FRAG, type ToyArrays, type ToyParams, type ToySim } from "./ShaderToy";

/**
 * Lava — metaballs you can actually shove around. The blob positions are a real
 * CPU sim (buoyant wander + soft walls); the cursor is a force field, not a
 * blob, so moving through them plows them aside and a fast swipe flings them.
 * The field itself is rendered on the GPU from the blob array (see LAVA_FRAG).
 *
 * Canvas-only engine: the parent supplies the framed box + live params.
 */

type RGB = [number, number, number];
export interface LavaParams {
  count: number; // 3..12 blobs
  flow: number; // how lively the buoyant wander is
  heat: number; // glow / threshold scale
  colA: RGB; // deep
  colB: RGB; // mid
  colC: RGB; // hot
}
export const DEFAULT_LAVA: LavaParams = {
  count: 7,
  flow: 1,
  heat: 1,
  colA: [0.3, 0.08, 0.5],
  colB: [0.88, 0.2, 0.55],
  colC: [1.0, 0.72, 0.32],
};

const MAX = 12;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

export default function Lava({ paramsRef }: { paramsRef: MutableRefObject<LavaParams> }) {
  const shaderParams = useRef<ToyParams>({
    uColA: DEFAULT_LAVA.colA,
    uColB: DEFAULT_LAVA.colB,
    uColC: DEFAULT_LAVA.colC,
    uHeat: DEFAULT_LAVA.heat,
  });
  const arrays = useRef<ToyArrays>({ uBlobs: { data: new Float32Array(MAX * 3), size: 3 } });
  const simRef = useRef<ToySim | null>(null);

  useEffect(() => {
    const blobs: Blob[] = [];
    let clock = 0;

    const spawn = (aspect: number): Blob => ({
      x: 0.2 + Math.random() * (aspect - 0.4),
      y: 0.2 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      r: 0.075 + Math.random() * 0.06,
      phase: Math.random() * Math.PI * 2,
    });

    simRef.current = (s) => {
      const ctrl = paramsRef.current;
      const aspect = s.aspect;
      const n = clamp(Math.round(ctrl.count), 3, MAX);
      while (blobs.length < n) blobs.push(spawn(aspect));
      if (blobs.length > n) blobs.length = n;

      clock += s.dt;
      const flow = ctrl.flow;
      const damp = Math.pow(0.9, s.dt * 60);
      const cx = s.mx * aspect;
      const cy = s.my;
      const cvx = clamp((s.vx * aspect) / Math.max(s.dt, 1e-3), -6, 6);
      const cvy = clamp(s.vy / Math.max(s.dt, 1e-3), -6, 6);
      const R = 0.34;

      const data = arrays.current.uBlobs.data;
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        // buoyant wander: ease velocity toward a slowly rotating drift target
        const ang = clock * 0.25 * flow + b.phase;
        const tvx = Math.cos(ang) * 0.07 * flow;
        const tvy = Math.sin(ang * 1.3) * 0.05 * flow;
        const ease = Math.min(1, s.dt * 1.1);
        b.vx += (tvx - b.vx) * ease;
        b.vy += (tvy - b.vy) * ease;

        // cursor force field — push the blob away, plus momentum from a swipe
        const dx = b.x - cx;
        const dy = b.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < R) {
          const f = 1 - d / R;
          const nx = d > 1e-4 ? dx / d : Math.cos(b.phase);
          const ny = d > 1e-4 ? dy / d : Math.sin(b.phase);
          const push = 2.0 * f * (1 + 0.8 * s.down);
          b.vx += nx * push * s.dt;
          b.vy += ny * push * s.dt;
          b.vx += cvx * f * 0.14 * s.dt;
          b.vy += cvy * f * 0.14 * s.dt;
        }

        b.x += b.vx * s.dt;
        b.y += b.vy * s.dt;
        b.vx *= damp;
        b.vy *= damp;

        // soft walls
        if (b.x < b.r) {
          b.x = b.r;
          b.vx = Math.abs(b.vx) * 0.5;
        } else if (b.x > aspect - b.r) {
          b.x = aspect - b.r;
          b.vx = -Math.abs(b.vx) * 0.5;
        }
        if (b.y < b.r) {
          b.y = b.r;
          b.vy = Math.abs(b.vy) * 0.5;
        } else if (b.y > 1 - b.r) {
          b.y = 1 - b.r;
          b.vy = -Math.abs(b.vy) * 0.5;
        }
        // speed cap keeps the sim stable on a big swipe
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 1.4) {
          b.vx *= 1.4 / sp;
          b.vy *= 1.4 / sp;
        }

        data[i * 3] = b.x;
        data[i * 3 + 1] = b.y;
        data[i * 3 + 2] = b.r;
      }
      for (let i = blobs.length; i < MAX; i++) data[i * 3 + 2] = 0; // inactive → no field

      shaderParams.current.uColA = ctrl.colA;
      shaderParams.current.uColB = ctrl.colB;
      shaderParams.current.uColC = ctrl.colC;
      shaderParams.current.uHeat = ctrl.heat;
    };
  }, [paramsRef]);

  return <ShaderToy frag={LAVA_FRAG} name="lava" paramsRef={shaderParams} arraysRef={arrays} simRef={simRef} />;
}
