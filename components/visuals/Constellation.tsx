"use client";

import { useMemo } from "react";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D, rng } from "@/lib/useCanvas2D";

const AMBER = "255,184,28";
const BONE = "237,228,211";

/** Bright constellation nodes in normalized space — node 0 is "home". */
const NODES = [
  { x: 0.28, y: 0.52, home: true }, // Greater Philadelphia
  { x: 0.42, y: 0.34 },
  { x: 0.55, y: 0.5 },
  { x: 0.5, y: 0.7 },
  { x: 0.68, y: 0.32 },
  { x: 0.74, y: 0.58 },
  { x: 0.86, y: 0.44 },
  { x: 0.36, y: 0.72 },
];
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 3],
  [2, 4],
  [4, 5],
  [5, 6],
  [4, 6],
  [3, 7],
  [0, 7],
];

/**
 * A quiet star map labeled with Greater Philadelphia. Faint twinkling field,
 * a connected constellation, and a bright "home" star at Philly's coordinates.
 * Moving the cursor near a star links to it, like charting your own sky.
 */
export default function Constellation() {
  const reduced = useReducedMotionSafe();

  // faint background starfield
  const stars = useMemo(() => {
    const r = rng(391575);
    return Array.from({ length: 54 }, () => ({
      x: r(),
      y: r(),
      s: 0.4 + r() * 1.1,
      ph: r() * Math.PI * 2,
      sp: 0.6 + r() * 1.4,
    }));
  }, []);

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    const px = (n: { x: number; y: number }) => n.x * w;
    const py = (n: { x: number; y: number }) => n.y * h;

    // background twinkle
    for (const st of stars) {
      const tw = reduced ? 0.5 : 0.5 + Math.sin(t * st.sp + st.ph) * 0.5;
      ctx.globalAlpha = 0.1 + tw * 0.35;
      ctx.fillStyle = `rgb(${BONE})`;
      ctx.beginPath();
      ctx.arc(st.x * w, st.y * h, st.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // nearest constellation node to the cursor
    let near = -1;
    if (ptr.inside) {
      let best = 1e9;
      NODES.forEach((n, i) => {
        const d = (px(n) - ptr.x) ** 2 + (py(n) - ptr.y) ** 2;
        if (d < best) {
          best = d;
          near = i;
        }
      });
      if (best > 150 * 150) near = -1;
    }

    // constellation edges
    ctx.lineWidth = 0.8;
    for (const [a, b] of EDGES) {
      const hot = near === a || near === b;
      ctx.strokeStyle = hot ? `rgba(${AMBER},0.55)` : `rgba(${BONE},0.18)`;
      ctx.beginPath();
      ctx.moveTo(px(NODES[a]), py(NODES[a]));
      ctx.lineTo(px(NODES[b]), py(NODES[b]));
      ctx.stroke();
    }

    // links from the cursor to nearby stars
    if (ptr.inside) {
      NODES.forEach((n) => {
        const d = Math.hypot(px(n) - ptr.x, py(n) - ptr.y);
        if (d < 130) {
          ctx.strokeStyle = `rgba(${AMBER},${0.45 * (1 - d / 130)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(ptr.x, ptr.y);
          ctx.lineTo(px(n), py(n));
          ctx.stroke();
        }
      });
    }

    // constellation nodes
    NODES.forEach((n, i) => {
      const x = px(n);
      const y = py(n);
      const hot = near === i;
      if (n.home) {
        // pulsing home star + halo
        const pulse = reduced ? 0.5 : 0.5 + Math.sin(t * 1.4) * 0.5;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 16 + pulse * 6);
        glow.addColorStop(0, `rgba(${AMBER},0.5)`);
        glow.addColorStop(1, `rgba(${AMBER},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 16 + pulse * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${AMBER},0.7)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 7 + pulse * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgb(${AMBER})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();

        // label
        ctx.fillStyle = `rgba(${BONE},0.85)`;
        ctx.font = '600 11px "IBM Plex Mono", monospace';
        ctx.fillText("GREATER PHILADELPHIA", x + 18, y - 2);
        ctx.fillStyle = `rgba(${BONE},0.4)`;
        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillText("39.95° N · 75.17° W", x + 18, y + 12);
      } else {
        const tw = reduced ? 0.6 : 0.55 + Math.sin(t * 1.3 + i) * 0.45;
        ctx.fillStyle = hot ? `rgb(${AMBER})` : `rgba(${BONE},${0.45 + tw * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, hot ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
