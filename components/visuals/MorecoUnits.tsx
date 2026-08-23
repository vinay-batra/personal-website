"use client";

import { useRef } from "react";
import type { MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D, rng } from "@/lib/useCanvas2D";

const COLS = 6;
const ROWS = 4;
const UNITS = COLS * ROWS;

type Unit = { available: boolean; address: string; rent: number };

const AVAILABLE: Record<number, { address: string; rent: number }> = {
  9: { address: "725 S Broad St, Apt 4", rent: 1800 },
  16: { address: "107 Genesee St, Apt 2", rent: 1800 },
};

/** Moreco Properties — a small building facade of unit windows that light up
 *  as you scroll. Two glow brick-orange (available); hover one to see the
 *  address and rent, everything else is occupied and stays dim. */
export default function MorecoUnits({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionSafe();
  const units = useRef<Unit[]>([]);
  if (units.current.length === 0) {
    const r = rng(725);
    units.current = Array.from({ length: UNITS }, (_, i) => {
      const av = AVAILABLE[i];
      return {
        available: !!av,
        address: av?.address ?? "",
        rent: av?.rent ?? Math.round((1500 + r() * 500) / 10) * 10,
      };
    });
  }

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    const padX = 16;
    const padTop = 26;
    const padBottom = 14;
    const gap = 8;
    const plotW = w - padX * 2;
    const plotH = h - padTop - padBottom;
    const cellW = (plotW - gap * (COLS - 1)) / COLS;
    const cellH = (plotH - gap * (ROWS - 1)) / ROWS;
    const sp = progress ? Math.min(1, Math.max(0, progress.get())) : 1;
    const prog = reduced ? 1 : sp;

    ctx.fillStyle = "rgba(237,228,211,0.4)";
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText("RENTAL PORTFOLIO", padX, 14);

    let hovered = -1;

    for (let i = 0; i < UNITS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = padX + col * (cellW + gap);
      const y = padTop + row * (cellH + gap);

      const reveal = reduced ? 1 : Math.min(1, Math.max(0, (prog - (i / UNITS) * 0.75) * 4));
      if (reveal <= 0.001) continue;

      const inside =
        ptr.inside && ptr.x >= x && ptr.x <= x + cellW && ptr.y >= y && ptr.y <= y + cellH;
      if (inside) hovered = i;

      const unit = units.current[i];
      const breathe = unit.available && !reduced ? 1 + Math.sin(t * 2 + i) * 0.08 : 1;

      if (unit.available) {
        const glow = Math.min(1, breathe) * reveal;
        ctx.fillStyle = `rgba(176,68,38,${0.22 + glow * 0.5})`;
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = `rgba(232,138,102,${0.5 + glow * 0.5})`;
        ctx.lineWidth = inside ? 2 : 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
      } else {
        ctx.fillStyle = `rgba(237,228,211,${0.05 * reveal})`;
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = `rgba(237,228,211,${0.1 * reveal})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
      }
    }

    if (hovered >= 0) {
      const unit = units.current[hovered];
      const col = hovered % COLS;
      const row = Math.floor(hovered / COLS);
      const x = padX + col * (cellW + gap);
      const y = padTop + row * (cellH + gap);
      const label = unit.available ? `${unit.address} · $${unit.rent}` : "Occupied";
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(label).width;
      const tx = Math.min(Math.max(x + cellW / 2 - tw / 2, padX), w - padX - tw);
      const ty = row === 0 ? y + cellH + 14 : y - 8;
      ctx.fillStyle = unit.available ? "rgba(232,138,102,1)" : "rgba(237,228,211,0.6)";
      ctx.fillText(label, tx, ty);
    }
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
