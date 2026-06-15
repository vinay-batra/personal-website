"use client";

import { useEffect, useRef } from "react";

/**
 * A ray tracer written from scratch, no library does the rendering. Every pixel
 * casts a ray that intersects spheres + a checkered floor and is shaded with
 * hemisphere ambient, diffuse + specular lighting, hard shadows, a glowing sun
 * and recursive reflections. It renders on demand: a medium pass while you drag,
 * then a sharp anti-aliased pass once you settle, so it stays crisp + responsive.
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
  { c: [0, 0, 0], r: 1, col: [0.93, 0.94, 0.98], refl: 0.78, spec: 120 }, // mirror
  { c: [-2.05, -0.35, -0.35], r: 0.65, col: [0.55, 0.45, 0.97], refl: 0.26, spec: 60 }, // purple
  { c: [1.95, -0.22, 0.45], r: 0.78, col: [0.28, 0.78, 0.76], refl: 0.34, spec: 70 }, // teal
  { c: [0.45, -0.6, 1.95], r: 0.4, col: [0.97, 0.45, 0.7], refl: 0.18, spec: 45 }, // pink
];
const LIGHT: V = [4.5, 7, -2.5];
const SUN = norm(LIGHT);
const FLOOR_Y = -1;
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
      const base: V = checker ? [0.13, 0.14, 0.18] : [0.74, 0.75, 0.8];
      // fade the checker into a flat tone with distance so it never aliases into grain
      const fade = Math.min(1, len(sub(p, o)) / 17);
      hit = { t, n: [0, 1, 0], col: mix(base, [0.32, 0.33, 0.39], fade), refl: 0.28, spec: 24 };
    }
  }
  return hit;
}

function sky(d: V): V {
  const tt = 0.5 * (d[1] + 1); // 0 down .. 1 up
  let c = mix([0.05, 0.06, 0.1], [0.14, 0.17, 0.28], tt); // cool gradient
  // a real, visible sun where the light lives: a hot core + a soft halo
  const s = Math.max(0, dot(d, SUN));
  c = add(c, mul([1.0, 0.96, 0.86], Math.pow(s, 480) * 1.6)); // core
  c = add(c, mul([0.5, 0.55, 0.7], Math.pow(s, 6) * 0.22)); // halo
  return c;
}

function trace(o: V, d: V, depth: number, maxDepth: number): V {
  const h = hitScene(o, d);
  if (!h) return sky(d);
  const p = add(o, mul(d, h.t));
  const toLight = norm(sub(LIGHT, p));
  const shadow = hitScene(add(p, mul(h.n, EPS)), toLight);
  const lit = !(shadow && shadow.t < len(sub(LIGHT, p)));
  // hemisphere ambient: brighter where the surface faces the sky
  let lambert = 0.22 + 0.17 * Math.max(0, h.n[1]);
  let specular = 0;
  if (lit) {
    lambert += Math.max(0, dot(h.n, toLight)) * 1.05;
    const r = reflect(mul(toLight, -1), h.n);
    specular = Math.pow(Math.max(0, dot(r, mul(d, -1))), h.spec) * 1.25;
  }
  let col: V = [h.col[0] * lambert + specular, h.col[1] * lambert + specular, h.col[2] * lambert + specular];
  if (h.refl > 0 && depth < maxDepth) {
    const r = norm(reflect(d, h.n));
    col = mix(col, trace(add(p, mul(h.n, EPS)), r, depth + 1, maxDepth), h.refl);
  }
  return col;
}

// 2x2 rotated-grid jitter for the anti-aliased settle pass
const AA: Array<[number, number]> = [
  [-0.25, -0.375],
  [0.375, -0.25],
  [-0.375, 0.25],
  [0.25, 0.375],
];

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

    const cam = { az: 0.62, el: 0.3, drag: false, lx: 0, ly: 0 };

    type Job = { rw: number; depth: number; spp: number };
    let queue: Job[] = [];

    const renderJob = (job: Job) => {
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return;
      const RW = job.rw;
      const RH = Math.max(60, Math.round(RW * (h / w)));
      buf.width = RW;
      buf.height = RH;
      const img = bctx.createImageData(RW, RH);
      const dist = 5.0; // pulled in closer than before
      const co: V = [
        Math.sin(cam.az) * Math.cos(cam.el) * dist,
        Math.sin(cam.el) * dist + 0.55,
        Math.cos(cam.az) * Math.cos(cam.el) * dist,
      ];
      const fwd = norm(sub([0, -0.05, 0], co)); // aim a touch below the spheres' centers
      const right = norm([-fwd[2], 0, fwd[0]]); // cross(fwd, worldUp)
      const up: V = [
        right[1] * fwd[2] - right[2] * fwd[1],
        right[2] * fwd[0] - right[0] * fwd[2],
        right[0] * fwd[1] - right[1] * fwd[0],
      ];
      const fov = 1.02; // narrower than 1.35 = a gentle zoom-in, less wide-angle stretch
      const aspect = RH / RW;
      const data = img.data;
      const spp = job.spp;
      for (let y = 0; y < RH; y++) {
        for (let x = 0; x < RW; x++) {
          let r = 0;
          let g = 0;
          let b = 0;
          for (let s = 0; s < spp; s++) {
            const jx = spp > 1 ? AA[s][0] : 0;
            const jy = spp > 1 ? AA[s][1] : 0;
            const sx = ((2 * (x + 0.5 + jx)) / RW - 1) * fov;
            const sy = (1 - (2 * (y + 0.5 + jy)) / RH) * fov * aspect;
            const dir = norm([
              fwd[0] + right[0] * sx + up[0] * sy,
              fwd[1] + right[1] * sx + up[1] * sy,
              fwd[2] + right[2] * sx + up[2] * sy,
            ]);
            const c = trace(co, dir, 0, job.depth);
            r += c[0];
            g += c[1];
            b += c[2];
          }
          const inv = 1 / spp;
          const i = (y * RW + x) * 4;
          data[i] = Math.min(255, Math.sqrt(Math.max(0, r * inv * 1.2)) * 255);
          data[i + 1] = Math.min(255, Math.sqrt(Math.max(0, g * inv * 1.2)) * 255);
          data[i + 2] = Math.min(255, Math.sqrt(Math.max(0, b * inv * 1.2)) * 255);
          data[i + 3] = 255;
        }
      }
      bctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(buf, 0, 0, w, h);
    };

    // a quick medium pass while dragging; on settle, a coarse frame for instant
    // feedback then a sharp anti-aliased frame.
    const queueDrag = () => {
      queue = [{ rw: 360, depth: 2, spp: 1 }];
    };
    const queueSharp = () => {
      queue = [
        { rw: 360, depth: 2, spp: 1 },
        { rw: 600, depth: 3, spp: 4 },
      ];
    };

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.imageSmoothingEnabled = true;
      queueSharp();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const onDown = (e: PointerEvent) => {
      cam.drag = true;
      cam.lx = e.clientX;
      cam.ly = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!cam.drag) return;
      cam.az -= (e.clientX - cam.lx) * 0.008;
      cam.el = Math.max(-0.08, Math.min(1.25, cam.el + (e.clientY - cam.ly) * 0.008));
      cam.lx = e.clientX;
      cam.ly = e.clientY;
      queueDrag();
    };
    const onUp = () => {
      if (cam.drag) {
        cam.drag = false;
        queueSharp(); // final crisp pass
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    let onScreen = true;
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen) queueSharp();
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    let raf = 0;
    const loop = () => {
      if (queue.length && onScreen && !document.hidden) {
        const job = queue.shift()!;
        renderJob(job);
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
