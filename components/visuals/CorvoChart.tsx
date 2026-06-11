"use client";

import { useMemo } from "react";
import type { MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D, rng } from "@/lib/useCanvas2D";

const GREEN = "#5cb88a";
const GOLD = "#c9a84c";

const N = 64;

/** Corvo — an equity curve + Monte Carlo fan that draws itself as you scroll. */
export default function CorvoChart({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionSafe();

  const { main, fan } = useMemo(() => {
    const r = rng(2021);
    const main: number[] = [];
    let y = 0;
    for (let i = 0; i < N; i++) {
      y += 0.06 + (r() - 0.42) * 0.5;
      main.push(y);
    }
    // normalize so it rises across the range
    const lift = 4 - main[N - 1];
    for (let i = 0; i < N; i++) main[i] += (lift * i) / (N - 1);
    // a fan of forward paths from the last point
    const fan: { pts: number[]; up: boolean }[] = [];
    for (let p = 0; p < 7; p++) {
      const r2 = rng(100 + p * 7);
      const pts: number[] = [main[N - 1]];
      let v = main[N - 1];
      const drift = (r2() - 0.45) * 0.32;
      for (let i = 1; i < 20; i++) {
        v += drift + (r2() - 0.5) * 0.4;
        pts.push(v);
      }
      fan.push({ pts, up: pts[pts.length - 1] >= main[N - 1] });
    }
    return { main, fan };
  }, []);

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    const all = [...main, ...fan.flatMap((f) => f.pts)];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const padX = 14;
    const mainW = w * 0.66;
    const X = (i: number, span: number, x0 = padX, width = mainW) =>
      x0 + (i / (span - 1)) * width;
    const Y = (v: number) =>
      h - 14 - ((v - min) / (max - min || 1)) * (h - 28);

    // grid
    ctx.strokeStyle = "rgba(237,228,211,0.06)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const yy = 14 + (g / 3) * (h - 28);
      ctx.beginPath();
      ctx.moveTo(padX, yy);
      ctx.lineTo(w - padX, yy);
      ctx.stroke();
    }

    // scroll-scrubbed build (falls back to time if no scroll progress passed)
    const sp = progress ? progress.get() : null;
    const prog = sp !== null ? Math.min(1, Math.max(0, sp)) : reduced ? 1 : Math.min(1, t / 1.6);
    const mainProg = Math.min(1, prog / 0.6);
    const fanProg = Math.min(1, Math.max(0, (prog - 0.5) / 0.5));

    // monte carlo fan (forward)
    fan.forEach((f) => {
      const fprog = reduced ? 1 : fanProg;
      ctx.strokeStyle = f.up
        ? "rgba(92,184,138,0.22)"
        : "rgba(224,92,92,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const count = Math.max(2, Math.floor(fprog * f.pts.length));
      for (let i = 0; i < count; i++) {
        const x = mainW + padX + (i / (f.pts.length - 1)) * (w - mainW - padX * 2);
        const y = Y(f.pts[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // main equity line
    const drawn = Math.max(2, Math.floor(mainProg * N));
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < drawn; i++) {
      const x = X(i, N);
      const y = Y(main[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // soft area under the line
    ctx.lineTo(X(drawn - 1, N), h - 14);
    ctx.lineTo(padX, h - 14);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 14, 0, h);
    grad.addColorStop(0, "rgba(92,184,138,0.14)");
    grad.addColorStop(1, "rgba(92,184,138,0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // crosshair on hover (once the curve is fully drawn)
    if (ptr.inside && mainProg >= 0.99) {
      const rel = Math.min(1, Math.max(0, (ptr.x - padX) / mainW));
      const idx = Math.round(rel * (N - 1));
      const cx = X(idx, N);
      const cy = Y(main[idx]);
      ctx.strokeStyle = "rgba(201,168,76,0.5)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, 14);
      ctx.lineTo(cx, h - 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(237,228,211,0.85)";
      ctx.font = '10px "IBM Plex Mono", monospace';
      const val = ((main[idx] - min) / (max - min || 1)) * 100;
      ctx.fillText(`+${val.toFixed(1)}%`, Math.min(cx + 6, w - 48), cy - 8);
    }

    // label
    ctx.fillStyle = "rgba(237,228,211,0.4)";
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText("PORTFOLIO · MONTE CARLO", padX, 12);
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
