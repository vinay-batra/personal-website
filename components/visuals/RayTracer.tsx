"use client";

import { useEffect, useRef } from "react";

/**
 * A ray tracer written from scratch, no library does the rendering. Every pixel
 * casts a ray that intersects spheres + a checkered floor and is shaded with
 * hemisphere ambient, diffuse + specular lighting, hard shadows and recursive
 * reflections. Renders on demand (a quick low-res pass while you drag, a sharp
 * high-res pass when you settle) so it stays crisp and responsive.
 */

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V) => Math.sqrt(dot(a, a));
const norm = (a: V): V => mul(a, 1 / (len(a) || 1));
const reflect = (d: V, n: V): V => sub(d, mul(n, 2 * dot(d, n)));
const mix = (a: V, b: V, t: number): V => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

interface Sphere {
  c: V;
  r: number;
  col: V;
  refl: number;
  spec: number;
}

const SPHERES: Sphere[] = [
  { c: [0, 0, 0], r: 1, col: [0.92, 0.92, 0.96], refl: 0.72, spec: 90 }, // mirror
  { c: [-2.1, -0.35, -0.4], r: 0.65, col: [0.52, 0.42, 0.95], refl: 0.22, spec: 50 }, // purple
  { c: [1.9, -0.25, 0.5], r: 0.75, col: [0.3, 0.72, 0.72], refl: 0.28, spec: 60 }, // teal
  { c: [0.5, -0.62, 1.9], r: 0.38, col: [0.95, 0.42, 0.68], refl: 0.14, spec: 35 }, // pink
];
const LIGHT: V = [4.5, 7, -2.5];
const FLOOR_Y = -1;
const MAX_DEPTH = 3;
const EPS = 1e-3;

function hitScene(o: V, d: V): { t: number; n: V; col: V; refl: number; spec: number } | null {
  let best = Infinity;
  let hit: { t: number; n: V; col: V; refl: number; spec: number } | null = null;
  for (const s of SPHERES) {
    const oc = sub(o, s.c);
    const b = dot(oc, d);
    const c = dot(oc, oc) - s.r * s.r;
    const disc = b * b - c;
    if (disc < 0) continue;
    const sq = Math.sqrt(disc);
    let t = -b - sq;
    if (t < EPS) t = -b + sq;
    if (t > EPS && t < best) {
      best = t;
      const p = add(o, mul(d, t));
      hit = { t, n: norm(sub(p, s.c)), col: s.col, refl: s.refl, spec: s.spec };
    }
  }
  if (Math.abs(d[1]) > 1e-6) {
    const t = (FLOOR_Y - o[1]) / d[1];
    if (t > EPS && t < best) {
      const p = add(o, mul(d, t));
      const checker = (Math.floor(p[0]) + Math.floor(p[2])) & 1;
      const base: V = checker ? [0.16, 0.17, 0.2] : [0.62, 0.63, 0.68];
      // fade the checker into a flat tone with distance so it never aliases into grain
      const fade = Math.min(1, t / 16);
      hit = { t, n: [0, 1, 0], col: mix(base, [0.34, 0.35, 0.4], fade), refl: 0.22, spec: 20 };
    }
  }
  return hit;
}

function trace(o: V, d: V, depth: number): V {
  const h = hitScene(o, d);
  if (!h) {
    const tt = 0.5 * (d[1] + 1); // 0 down .. 1 up
    return mix([0.05, 0.06, 0.09], [0.12, 0.14, 0.24], tt); // cool sky gradient
  }
  const p = add(o, mul(d, h.t));
  const toLight = norm(sub(LIGHT, p));
  const shadow = hitScene(add(p, mul(h.n, EPS)), toLight);
  const lit = !(shadow && shadow.t < len(sub(LIGHT, p)));
  // hemisphere ambient: a touch brighter where the surface faces up
  let lambert = 0.18 + 0.14 * Math.max(0, h.n[1]);
  let specular = 0;
  if (lit) {
    lambert += Math.max(0, dot(h.n, toLight)) * 0.95;
    const r = reflect(mul(toLight, -1), h.n);
    specular = Math.pow(Math.max(0, dot(r, mul(d, -1))), h.spec) * 1.1;
  }
  let col: V = [h.col[0] * lambert + specular, h.col[1] * lambert + specular, h.col[2] * lambert + specular];
  if (h.refl > 0 && depth < MAX_DEPTH) {
    const r = norm(reflect(d, h.n));
    col = mix(col, trace(add(p, mul(h.n, EPS)), r, depth + 1), h.refl);
  }
  return col;
}

export default function RayTracer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;

    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d")!;

    const cam = { az: 0.7, el: 0.36, drag: false, lx: 0, ly: 0 };
    let dirty = true;

    const renderAt = (RW: number) => {
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return;
      const RH = Math.max(60, Math.round(RW * (h / w)));
      buf.width = RW;
      buf.height = RH;
      const img = bctx.createImageData(RW, RH);
      const dist = 6;
      const co: V = [
        Math.sin(cam.az) * Math.cos(cam.el) * dist,
        Math.sin(cam.el) * dist + 0.7,
        Math.cos(cam.az) * Math.cos(cam.el) * dist,
      ];
      const fwd = norm(sub([0, 0, 0], co));
      const right = norm([-fwd[2], 0, fwd[0]]); // cross(fwd, worldUp)
      const up: V = [
        right[1] * fwd[2] - right[2] * fwd[1],
        right[2] * fwd[0] - right[0] * fwd[2],
        right[0] * fwd[1] - right[1] * fwd[0],
      ];
      const fov = 1.35;
      const aspect = RH / RW;
      const data = img.data;
      for (let y = 0; y < RH; y++) {
        const sy = (1 - (2 * (y + 0.5)) / RH) * fov * aspect;
        for (let x = 0; x < RW; x++) {
          const sx = ((2 * (x + 0.5)) / RW - 1) * fov;
          const dir = norm([
            fwd[0] + right[0] * sx + up[0] * sy,
            fwd[1] + right[1] * sx + up[1] * sy,
            fwd[2] + right[2] * sx + up[2] * sy,
          ]);
          const c = trace(co, dir, 0);
          const i = (y * RW + x) * 4;
          data[i] = Math.min(255, Math.sqrt(Math.max(0, c[0] * 1.15)) * 255);
          data[i + 1] = Math.min(255, Math.sqrt(Math.max(0, c[1] * 1.15)) * 255);
          data[i + 2] = Math.min(255, Math.sqrt(Math.max(0, c[2] * 1.15)) * 255);
          data[i + 3] = 255;
        }
      }
      bctx.putImageData(img, 0, 0);
      ctx.drawImage(buf, 0, 0, w, h);
    };

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.imageSmoothingEnabled = true;
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const onDown = (e: PointerEvent) => {
      cam.drag = true;
      cam.lx = e.clientX;
      cam.ly = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!cam.drag) return;
      cam.az -= (e.clientX - cam.lx) * 0.008;
      cam.el = Math.max(-0.15, Math.min(1.25, cam.el + (e.clientY - cam.ly) * 0.008));
      cam.lx = e.clientX;
      cam.ly = e.clientY;
      dirty = true;
    };
    const onUp = () => {
      if (cam.drag) {
        cam.drag = false;
        dirty = true; // final sharp pass
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    let onScreen = true;
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) dirty = true;
    }, { threshold: 0 });
    io.observe(wrap);

    let raf = 0;
    const loop = () => {
      if (dirty && onScreen && !document.hidden) {
        renderAt(cam.drag ? 170 : 460); // coarse while dragging, sharp when settled
        dirty = false;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#070608]">
      <canvas ref={canvasRef} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" />
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
        Drag to orbit
      </span>
    </div>
  );
}
