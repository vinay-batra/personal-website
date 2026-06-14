"use client";

import { useRef } from "react";
import type { MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D, rng } from "@/lib/useCanvas2D";

const BARS = 11;

/** FBLA One — a chapter dashboard: an upward-trending bar series that grows in
 *  as you scroll, with a gold trend line. Hover a bar to read its value. */
export default function FblaDashboard({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionSafe();
  const heights = useRef<number[]>([]);
  if (heights.current.length === 0) {
    const r = rng(1907);
    let base = 0.24;
    heights.current = Array.from({ length: BARS }, () => {
      base = Math.min(0.95, base + 0.045 + r() * 0.11);
      return Math.max(0.12, base - r() * 0.16);
    });
  }

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    const padX = 16;
    const padTop = 26;
    const padBottom = 16;
    const plotW = w - padX * 2;
    const plotH = h - padTop - padBottom;
    const baseY = h - padBottom;
    const sp = progress ? Math.min(1, Math.max(0, progress.get())) : 1;
    const prog = reduced ? 1 : sp;

    // faint gridlines
    ctx.strokeStyle = "rgba(237,228,211,0.06)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const y = padTop + (g / 3) * plotH;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - padX, y);
      ctx.stroke();
    }

    const slot = plotW / BARS;
    const barW = slot * 0.52;
    const tops: [number, number][] = [];

    let hovered = -1;
    if (ptr.inside) {
      const idx = Math.floor((ptr.x - padX) / slot);
      if (idx >= 0 && idx < BARS) hovered = idx;
    }

    for (let i = 0; i < BARS; i++) {
      const rev = reduced ? 1 : Math.min(1, Math.max(0, (prog - (i / BARS) * 0.7) * 3));
      const breathe = reduced ? 1 : 1 + Math.sin(t * 1.5 + i) * 0.015;
      const hv = heights.current[i] * rev * breathe;
      const bx = padX + i * slot + (slot - barW) / 2;
      const bh = hv * plotH;
      const by = baseY - bh;
      tops.push([bx + barW / 2, by]);
      if (rev <= 0.001) continue;
      const hot = i === hovered;
      const grad = ctx.createLinearGradient(0, by, 0, baseY);
      if (hot) {
        grad.addColorStop(0, "rgba(255,184,28,0.95)");
        grad.addColorStop(1, "rgba(255,184,28,0.22)");
      } else {
        grad.addColorStop(0, "rgba(93,156,228,0.9)");
        grad.addColorStop(1, "rgba(0,60,126,0.32)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, barW, bh);
      ctx.fillStyle = hot ? "rgba(255,184,28,1)" : "rgba(149,196,244,0.95)";
      ctx.fillRect(bx, by, barW, 2);
    }

    // gold trend line through the bar tops
    if (prog > 0.05) {
      ctx.strokeStyle = "rgba(255,184,28,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      tops.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.fillStyle = "rgba(255,184,28,0.9)";
      for (const [x, y] of tops) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "rgba(237,228,211,0.4)";
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText("CHAPTER DASHBOARD", padX, 14);

    if (hovered >= 0 && tops[hovered]) {
      const [x, y] = tops[hovered];
      const val = Math.round(heights.current[hovered] * 240 + 40);
      ctx.fillStyle = "rgba(255,184,28,1)";
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(String(val), x, Math.max(y - 8, padTop + 8));
      ctx.textAlign = "left";
    }
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
