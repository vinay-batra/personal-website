"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import ShaderToy, { LAVA_FRAG, type ToyArrays, type ToyParams, type ToySim } from "./ShaderToy";

/**
 * Lava — metaballs you push around with a visible circular brush. The blob
 * positions are a real CPU sim (buoyant wander + soft walls). The brush is the
 * bubble that follows your cursor: sweep it through the blobs and they get
 * shoved hard, with momentum carried from how fast you swept. Press right on a
 * blob to GRAB it (it sticks to the cursor so you can pull it), release to fling.
 *
 * Canvas-only engine: the parent supplies the framed box + live params.
 */

type RGB = [number, number, number];
export interface LavaParams {
  count: number; // 3..12 blobs
  size: number; // blob radius multiplier
  flow: number; // how lively the buoyant wander is
  heat: number; // glow / threshold scale
  colA: RGB; // deep
  colB: RGB; // mid
  colC: RGB; // hot
}
export const DEFAULT_LAVA: LavaParams = {
  count: 7,
  size: 1,
  flow: 1,
  heat: 1,
  colA: [0.3, 0.08, 0.5],
  colB: [0.88, 0.2, 0.55],
  colC: [1.0, 0.72, 0.32],
};

const MAX = 12;
export const BRUSH_R = 0.26; // brush + push radius, in y-units (0..1 = canvas height)
const GRAB = 0.2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  br: number; // base radius (scaled by the Size control)
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
  const outerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blobs: Blob[] = [];
    let clock = 0;
    let grabbed = -1;
    let prevDown = 0;

    const spawn = (aspect: number): Blob => {
      const br = 0.08 + Math.random() * 0.06;
      return {
        x: 0.2 + Math.random() * (aspect - 0.4),
        y: 0.2 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        br,
        r: br,
        phase: Math.random() * Math.PI * 2,
      };
    };

    simRef.current = (s) => {
      const ctrl = paramsRef.current;
      const aspect = s.aspect;
      const n = clamp(Math.round(ctrl.count), 3, MAX);
      while (blobs.length < n) blobs.push(spawn(aspect));
      if (blobs.length > n) {
        blobs.length = n;
        if (grabbed >= n) grabbed = -1;
      }

      clock += s.dt;
      const flow = ctrl.flow;
      const sizeMul = clamp(ctrl.size, 0.5, 1.8);
      const damp = Math.pow(0.9, s.dt * 60);
      const cx = s.mx * aspect;
      const cy = s.my;
      const cvx = clamp((s.vx * aspect) / Math.max(s.dt, 1e-3), -10, 10);
      const cvy = clamp(s.vy / Math.max(s.dt, 1e-3), -10, 10);
      const R = BRUSH_R;

      const justPressed = s.down === 1 && prevDown === 0;
      const justReleased = s.down === 0 && prevDown === 1;
      if (justPressed) {
        let best = -1;
        let bd = Infinity;
        for (let i = 0; i < blobs.length; i++) {
          const d = Math.hypot(blobs[i].x - cx, blobs[i].y - cy);
          if (d < GRAB + blobs[i].r && d < bd) {
            bd = d;
            best = i;
          }
        }
        grabbed = best;
      }
      if (justReleased) grabbed = -1;
      prevDown = s.down;

      const data = arrays.current.uBlobs.data;
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        b.r = clamp(b.br * sizeMul, 0.04, 0.22);
        if (i === grabbed) {
          const e = Math.min(1, s.dt * 18);
          b.x += (cx - b.x) * e;
          b.y += (cy - b.y) * e;
          b.vx = cvx;
          b.vy = cvy;
        } else {
          // buoyant wander: ease velocity toward a slowly rotating drift target
          const ang = clock * 0.25 * flow + b.phase;
          const tvx = Math.cos(ang) * 0.07 * flow;
          const tvy = Math.sin(ang * 1.3) * 0.05 * flow;
          const ease = Math.min(1, s.dt * 1.1);
          b.vx += (tvx - b.vx) * ease;
          b.vy += (tvy - b.vy) * ease;
          // brush force field — a real shove, plus strong momentum from a sweep
          const dx = b.x - cx;
          const dy = b.y - cy;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const f = 1 - d / R;
            const nx = d > 1e-4 ? dx / d : Math.cos(b.phase);
            const ny = d > 1e-4 ? dy / d : Math.sin(b.phase);
            const push = (s.down ? 3.2 : 2.2) * f;
            b.vx += nx * push * s.dt + cvx * f * 0.28 * s.dt;
            b.vy += ny * push * s.dt + cvy * f * 0.28 * s.dt;
          }
          b.x += b.vx * s.dt;
          b.y += b.vy * s.dt;
          b.vx *= damp;
          b.vy *= damp;
        }

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
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 2.0) {
          b.vx *= 2.0 / sp;
          b.vy *= 2.0 / sp;
        }

        data[i * 3] = b.x;
        data[i * 3 + 1] = b.y;
        data[i * 3 + 2] = b.r;
      }
      for (let i = blobs.length; i < MAX; i++) data[i * 3 + 2] = 0;

      shaderParams.current.uColA = ctrl.colA;
      shaderParams.current.uColB = ctrl.colB;
      shaderParams.current.uColC = ctrl.colC;
      shaderParams.current.uHeat = ctrl.heat;
    };
  }, [paramsRef]);

  // the visible brush bubble — follows the pointer, sized to the push radius
  useEffect(() => {
    const outer = outerRef.current;
    const cur = cursorRef.current;
    if (!outer || !cur) return;
    const place = (e: PointerEvent) => {
      const r = outer.getBoundingClientRect();
      const dia = BRUSH_R * 2 * r.height;
      cur.style.width = `${dia}px`;
      cur.style.height = `${dia}px`;
      cur.style.transform = `translate(${e.clientX - r.left - dia / 2}px, ${e.clientY - r.top - dia / 2}px)`;
      cur.style.opacity = "1";
    };
    const hide = () => {
      cur.style.opacity = "0";
    };
    outer.addEventListener("pointermove", place);
    outer.addEventListener("pointerdown", place);
    outer.addEventListener("pointerleave", hide);
    return () => {
      outer.removeEventListener("pointermove", place);
      outer.removeEventListener("pointerdown", place);
      outer.removeEventListener("pointerleave", hide);
    };
  }, []);

  return (
    <div ref={outerRef} className="relative h-full w-full cursor-none">
      <ShaderToy frag={LAVA_FRAG} name="lava" paramsRef={shaderParams} arraysRef={arrays} simRef={simRef} />
      <div
        ref={cursorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-full opacity-0 transition-opacity duration-150"
        style={{
          border: "1.5px solid rgba(255,255,255,0.55)",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.12), rgba(255,255,255,0.03) 58%, transparent 72%)",
          boxShadow: "0 0 18px rgba(255,255,255,0.2), inset 0 0 26px rgba(255,255,255,0.07)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
