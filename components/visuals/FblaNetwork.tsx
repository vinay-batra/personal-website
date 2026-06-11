"use client";

import { useMemo } from "react";
import type { MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D, rng } from "@/lib/useCanvas2D";

const BLUE = "#5d9ce4";
const GOLD = "#ffb81c";
const COUNT = 16;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** FBLA One — a chapter network that assembles from a point as you scroll, then drifts and links to your cursor. */
export default function FblaNetwork({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionSafe();

  const nodes = useMemo<Node[]>(() => {
    const r = rng(1907);
    return Array.from({ length: COUNT }, () => ({
      x: 0.08 + r() * 0.84,
      y: 0.1 + r() * 0.8,
      vx: (r() - 0.5) * 0.04,
      vy: (r() - 0.5) * 0.04,
    }));
  }, []);

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    if (!reduced) {
      for (const n of nodes) {
        n.x += n.vx * 0.012;
        n.y += n.vy * 0.012;
        if (n.x < 0.05 || n.x > 0.95) n.vx *= -1;
        if (n.y < 0.06 || n.y > 0.94) n.vy *= -1;
        n.x = Math.max(0.05, Math.min(0.95, n.x));
        n.y = Math.max(0.06, Math.min(0.94, n.y));
      }
    }

    // scroll-scrubbed assembly: nodes emerge from the center, staggered
    const sp = progress ? progress.get() : null;
    const prog = sp !== null ? Math.min(1, Math.max(0, sp)) : 1;
    const cx = w / 2;
    const cy = h / 2;
    const disp = nodes.map((n, i) => {
      const a = reduced
        ? 1
        : easeOut(Math.min(1, Math.max(0, (prog - (i / COUNT) * 0.5) * 2)));
      const hx = n.x * w;
      const hy = n.y * h;
      return { x: cx + (hx - cx) * a, y: cy + (hy - cy) * a, a };
    });

    // nearest node to the cursor
    let near = -1;
    let best = 1e9;
    if (ptr.inside) {
      disp.forEach((p, i) => {
        const d = (p.x - ptr.x) ** 2 + (p.y - ptr.y) ** 2;
        if (d < best) {
          best = d;
          near = i;
        }
      });
      if (best > 130 * 130) near = -1;
    }

    // edges between close members
    const maxD = Math.min(w, h) * 0.42;
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const a = disp[i];
        const b = disp[j];
        const vis = Math.min(a.a, b.a);
        if (vis < 0.15) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < maxD) {
          const hot = near === i || near === j;
          const k = (1 - d / maxD) * vis;
          ctx.strokeStyle = hot
            ? `rgba(255,184,28,${0.5 * k})`
            : `rgba(93,156,228,${0.32 * k})`;
          ctx.lineWidth = hot ? 1.1 : 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // links from the cursor
    if (ptr.inside) {
      disp.forEach((p) => {
        if (p.a < 0.5) return;
        const d = Math.hypot(p.x - ptr.x, p.y - ptr.y);
        if (d < 120) {
          ctx.strokeStyle = `rgba(255,184,28,${0.5 * (1 - d / 120)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(ptr.x, ptr.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });
    }

    // nodes
    disp.forEach((p, i) => {
      const hot = near === i;
      const pulse = reduced ? 0 : Math.sin(t * 1.5 + i) * 0.5 + 0.5;
      ctx.fillStyle = hot ? GOLD : BLUE;
      ctx.globalAlpha = p.a * (hot ? 1 : 0.55 + pulse * 0.25);
      ctx.beginPath();
      ctx.arc(p.x, p.y, hot ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = "rgba(237,228,211,0.4)";
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText("CHAPTER NETWORK", 14, 14);
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
