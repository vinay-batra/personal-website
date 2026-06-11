"use client";

import { useMemo } from "react";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D, rng } from "@/lib/useCanvas2D";

const AMBER = "#E8A33D";
const BONE = "#EDE4D3";

type Kind = "fact" | "skill";
interface Item {
  label: string;
  kind: Kind;
}

// a map of me — key facts (amber) woven through interests & skills (bone)
const ITEMS: Item[] = [
  { label: "Investing · 5 yrs", kind: "fact" },
  { label: "3 products shipped", kind: "fact" },
  { label: "195+ volunteer hrs", kind: "fact" },
  { label: "Quant finance", kind: "skill" },
  { label: "Python", kind: "skill" },
  { label: "Next.js", kind: "skill" },
  { label: "Three.js", kind: "skill" },
  { label: "Machine learning", kind: "skill" },
  { label: "Vercel", kind: "skill" },
  { label: "GitHub", kind: "skill" },
  { label: "Guitar", kind: "skill" },
  { label: "Reading", kind: "skill" },
  { label: "Leadership", kind: "skill" },
  { label: "Entrepreneurship", kind: "skill" },
];

interface Node extends Item {
  x: number;
  y: number;
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** About — an interactive "map of me": facts + interests drift, connect, and light up under the cursor. */
export default function AboutGraphic() {
  const reduced = useReducedMotionSafe();

  const nodes = useMemo<Node[]>(() => {
    const r = rng(164);
    // scatter organically across the whole box: random placement that rejects
    // spots too close to another node or that would overlap a wide label
    const placed: Node[] = [];
    for (const it of ITEMS) {
      let x = 0.5;
      let y = 0.5;
      for (let tries = 0; tries < 160; tries++) {
        x = 0.12 + r() * 0.76;
        y = 0.1 + r() * 0.82;
        const ok = placed.every((q) => {
          const dx = Math.abs(q.x - x);
          const dy = Math.abs(q.y - y);
          const farEnough = Math.hypot(dx, dy) > 0.13;
          const labelsClear = dx > 0.24 || dy > 0.07;
          return farEnough && labelsClear;
        });
        if (ok) break;
      }
      placed.push({ ...it, x, y });
    }
    return placed;
  }, []);

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    const intro = reduced ? 1 : easeOut(Math.min(1, t / 1.3));

    // gentle oscillation around each node's fixed grid home (no free drift,
    // so nodes + labels never collide)
    const disp = nodes.map((n, i) => ({
      x: (n.x + (reduced ? 0 : Math.sin(t * 0.3 + i) * 0.012)) * w,
      y: (n.y + (reduced ? 0 : Math.cos(t * 0.26 + i * 1.3) * 0.014)) * h,
    }));

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
      if (best > 150 * 150) near = -1;
    }

    // edges between nearby items
    const maxD = Math.min(w, h) * 0.5;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = disp[i];
        const b = disp[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < maxD) {
          const hot = near === i || near === j;
          const k = (1 - d / maxD) * intro;
          ctx.strokeStyle = hot
            ? `rgba(232,163,61,${0.4 * k})`
            : `rgba(237,228,211,${0.1 * k})`;
          ctx.lineWidth = hot ? 1 : 0.6;
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
        const d = Math.hypot(p.x - ptr.x, p.y - ptr.y);
        if (d < 150) {
          ctx.strokeStyle = `rgba(232,163,61,${0.35 * (1 - d / 150) * intro})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(ptr.x, ptr.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });
    }

    // nodes + labels
    nodes.forEach((n, i) => {
      const p = disp[i];
      const hot = near === i;
      const fact = n.kind === "fact";
      const color = fact ? AMBER : BONE;

      if (hot) {
        ctx.fillStyle = "rgba(232,163,61,0.16)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = intro;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, fact ? (hot ? 5 : 3.6) : hot ? 4 : 2.4, 0, Math.PI * 2);
      ctx.fill();

      // label: facts always readable; skills dim until hovered
      const labelAlpha = fact ? 0.85 : hot ? 0.9 : 0.32;
      ctx.globalAlpha = intro * labelAlpha;
      ctx.fillStyle = fact ? AMBER : BONE;
      ctx.font = `${fact ? "600 " : ""}${fact ? 11 : 10}px 'IBM Plex Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText(n.label.toUpperCase(), p.x, p.y - 10);
      ctx.globalAlpha = 1;
    });

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(237,228,211,0.4)";
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.fillText("A MAP OF ME", 14, 16);
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
