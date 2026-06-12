"use client";

import { useEffect, useRef } from "react";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

type Chip = {
  label: string;
  color: string;
  href: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  angle: number;
  va: number;
};

const SPEC: { label: string; color: string; href: string }[] = [
  { label: "CORVO", color: "#5cb88a", href: "https://corvo.capital" },
  { label: "LARK", color: "#e8a33d", href: "https://lark.coach" },
  { label: "FBLA ONE", color: "#5d9ce4", href: "https://fbla.one" },
];

const G = 1900; // px/s^2
const REST = 0.62; // wall restitution
const FRICTION = 0.985;

/** A tiny physics toy: the three products as pucks you can drag and fling;
 *  they bounce, collide, and settle. Mouse-drag only (touch just watches). */
export default function Playground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0;
    let H = 0;
    const chips: Chip[] = [];

    const measure = (label: string) => {
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      return ctx.measureText(label).width;
    };

    const resize = () => {
      const r = cv.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (chips.length === 0) {
        SPEC.forEach((s, i) => {
          const w = measure(s.label) + 36;
          chips.push({
            ...s,
            w,
            h: 36,
            x: W * (0.25 + i * 0.25),
            y: 30 + i * 12,
            vx: (i - 1) * 40,
            vy: 0,
            angle: 0,
            va: 0,
          });
        });
      } else {
        // keep chips inside on resize
        for (const c of chips) c.x = Math.min(Math.max(c.x, c.w / 2), W - c.w / 2);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // ---- pointer drag (mouse only so touch scroll stays free) ----
    const drag = { i: -1, ox: 0, oy: 0, px: 0, py: 0 };
    const radius = (c: Chip) => Math.max(c.w, c.h) / 2;
    const at = (mx: number, my: number) =>
      chips.findIndex((c) => Math.abs(mx - c.x) < c.w / 2 + 4 && Math.abs(my - c.y) < c.h / 2 + 6);

    const local = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const { x, y } = local(e);
      const i = at(x, y);
      if (i >= 0) {
        drag.i = i;
        drag.ox = x - chips[i].x;
        drag.oy = y - chips[i].y;
        drag.px = x;
        drag.py = y;
        chips[i].vx = chips[i].vy = 0;
        cv.setPointerCapture(e.pointerId);
        cv.style.cursor = "grabbing";
      }
    };
    const move = (e: PointerEvent) => {
      const { x, y } = local(e);
      if (drag.i >= 0) {
        const c = chips[drag.i];
        c.x = x - drag.ox;
        c.y = y - drag.oy;
        c.vx = (x - drag.px) * 12;
        c.vy = (y - drag.py) * 12;
        drag.px = x;
        drag.py = y;
      } else {
        cv.style.cursor = at(x, y) >= 0 ? "grab" : "default";
      }
    };
    const up = (e: PointerEvent) => {
      if (drag.i >= 0) {
        cv.style.cursor = "grab";
        drag.i = -1;
        try {
          cv.releasePointerCapture(e.pointerId);
        } catch {}
      } else {
        // a click that didn't drag opens the product
        const { x, y } = local(e);
        const i = at(x, y);
        if (i >= 0 && Math.hypot(x - drag.px, y - drag.py) < 4) {
          // no-op; click handled on canvas click listener below
        }
      }
    };
    const click = (e: MouseEvent) => {
      const r = cv.getBoundingClientRect();
      const i = at(e.clientX - r.left, e.clientY - r.top);
      if (i >= 0) window.open(chips[i].href, "_blank", "noopener");
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("click", click);

    // ---- sim + render ----
    let raf = 0;
    let last = 0;
    let onScreen = true;
    const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
    io.observe(cv);

    const step = (dt: number) => {
      for (const c of chips) {
        if (chips.indexOf(c) === drag.i) continue;
        c.vy += G * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.angle += c.va * dt;
        c.va *= 0.97;
        const hw = c.w / 2;
        const hh = c.h / 2;
        if (c.x < hw) {
          c.x = hw;
          c.vx = Math.abs(c.vx) * REST;
          c.va += c.vy * 0.0008;
        }
        if (c.x > W - hw) {
          c.x = W - hw;
          c.vx = -Math.abs(c.vx) * REST;
          c.va -= c.vy * 0.0008;
        }
        if (c.y > H - hh) {
          c.y = H - hh;
          c.vy = -Math.abs(c.vy) * REST;
          c.vx *= FRICTION;
          c.va += c.vx * 0.001;
        }
        if (c.y < hh) {
          c.y = hh;
          c.vy = Math.abs(c.vy) * REST;
        }
      }
      // pairwise collisions (circle approximation)
      for (let i = 0; i < chips.length; i++) {
        for (let j = i + 1; j < chips.length; j++) {
          const a = chips[i];
          const b = chips[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const min = radius(a) + radius(b);
          if (d < min) {
            const nx = dx / d;
            const ny = dy / d;
            const overlap = (min - d) / 2;
            if (drag.i !== i) {
              a.x -= nx * overlap;
              a.y -= ny * overlap;
            }
            if (drag.i !== j) {
              b.x += nx * overlap;
              b.y += ny * overlap;
            }
            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const sep = rvx * nx + rvy * ny;
            if (sep < 0) {
              const imp = -sep * 0.7;
              if (drag.i !== i) {
                a.vx -= imp * nx;
                a.vy -= imp * ny;
              }
              if (drag.i !== j) {
                b.vx += imp * nx;
                b.vy += imp * ny;
              }
            }
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const c of chips) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        const r = c.h / 2;
        ctx.beginPath();
        // rounded pill
        ctx.moveTo(-c.w / 2 + r, -c.h / 2);
        ctx.arcTo(c.w / 2, -c.h / 2, c.w / 2, c.h / 2, r);
        ctx.arcTo(c.w / 2, c.h / 2, -c.w / 2, c.h / 2, r);
        ctx.arcTo(-c.w / 2, c.h / 2, -c.w / 2, -c.h / 2, r);
        ctx.arcTo(-c.w / 2, -c.h / 2, c.w / 2, -c.h / 2, r);
        ctx.closePath();
        ctx.fillStyle = c.color + "1f";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = c.color;
        ctx.stroke();
        ctx.fillStyle = c.color;
        ctx.font = '600 13px "IBM Plex Mono", monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.label, 0, 1);
        ctx.restore();
      }
    };

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || document.hidden) {
        last = ts;
        return;
      }
      const dt = Math.min(0.032, (ts - (last || ts)) / 1000);
      last = ts;
      if (!reduced) step(dt);
      draw();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("click", click);
    };
  }, [reduced]);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-10">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
          ◆ Playground
        </span>
        <span className="font-mono text-[10px] tracking-[0.2em] text-dim/70 uppercase">
          drag · fling · click to open
        </span>
      </div>
      <canvas
        ref={ref}
        aria-label="Throw the products around"
        className="h-[200px] w-full rounded-sm border border-bone/10"
        style={{ touchAction: "pan-y" }}
      />
    </section>
  );
}
