"use client";

import { useEffect, useRef } from "react";

export interface Pointer {
  x: number;
  y: number;
  px: number;
  py: number;
  inside: boolean;
}

type Render = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  pointer: Pointer
) => void;

/**
 * DPR-aware 2D canvas with a rAF render loop, ResizeObserver sizing, and
 * pointer tracking. `render` is read from a ref each frame, so it always sees
 * fresh closure state without re-initializing the loop.
 */
export function useCanvas2D(render: Render) {
  const ref = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef(render);
  renderRef.current = render;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const pointer: Pointer = { x: -999, y: -999, px: -999, py: -999, inside: false };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    cv.addEventListener("pointermove", onMove, { passive: true });
    cv.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let start: number | null = null;
    let hidden = false;
    let onScreen = true;
    const onVis = () => {
      hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    // only paint while the canvas is actually on screen — keeps scrolling smooth
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
    });
    io.observe(cv);

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (hidden || !onScreen) return;
      if (start === null) start = ts;
      const t = (ts - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      renderRef.current(ctx, w, h, t, pointer);
      pointer.px = pointer.x;
      pointer.py = pointer.y;
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return ref;
}

/** tiny deterministic PRNG for stable visual layouts */
export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
