"use client";

import type { MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D } from "@/lib/useCanvas2D";

const FLOORS = 4;
const PER_FLOOR = 5;

type Unit = { address: string; rent: string };

/** floor*PER_FLOOR + col  →  the two units actually listed as vacant. */
const AVAILABLE: Record<number, Unit> = {
  8: { address: "725 S Broad St, Apt 4", rent: "$1,800/mo" },
  16: { address: "107 Genesee St, Apt 2", rent: "$1,800/mo" },
};

const LIGHT = "223,231,238"; // the page's cool grey, as rgb parts

/**
 * Moreco Properties — a front elevation of an apartment building. Floors light
 * up from the ground as you scroll; the two vacant units stay lit and gently
 * pulse, and hovering any window names the unit. Monochrome to match the page.
 */
export default function MorecoUnits({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionSafe();

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    const sp = progress ? Math.min(1, Math.max(0, progress.get())) : 1;
    const prog = reduced ? 1 : sp;

    // The canvas can be measured at (or near) zero during the first layout pass;
    // drawing at that size yields negative widths and throws on createRadialGradient.
    if (w < 120 || h < 120) return;

    /* ---------- building envelope ---------- */
    const padTop = 34;
    const padBottom = 26;
    const groundY = h - padBottom;
    const bw = Math.min(w * 0.74, 360);
    const bx = (w - bw) / 2;
    const by = padTop;
    const bh = groundY - by;

    // ground line, running the full width so the building sits on something
    ctx.strokeStyle = `rgba(${LIGHT},0.22)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, groundY + 0.5);
    ctx.lineTo(w - 12, groundY + 0.5);
    ctx.stroke();

    // facade
    const facade = ctx.createLinearGradient(0, by, 0, groundY);
    facade.addColorStop(0, "rgba(255,255,255,0.055)");
    facade.addColorStop(1, "rgba(255,255,255,0.015)");
    ctx.fillStyle = facade;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = `rgba(${LIGHT},0.4)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    // roof cornice — a wider slab so the top reads as a roof, not a cut-off box
    ctx.fillStyle = `rgba(${LIGHT},0.16)`;
    ctx.fillRect(bx - 9, by - 9, bw + 18, 9);
    ctx.strokeStyle = `rgba(${LIGHT},0.45)`;
    ctx.strokeRect(bx - 8.5, by - 8.5, bw + 17, 9);

    /* ---------- window grid ---------- */
    const inset = 18;
    const doorH = 34; // ground floor keeps room for the entrance
    const gridX = bx + inset;
    const gridW = bw - inset * 2;
    const gridY = by + 16;
    const gridH = bh - 16 - doorH - 12;

    const gapX = 10;
    const gapY = 14;
    const winW = (gridW - gapX * (PER_FLOOR - 1)) / PER_FLOOR;
    const winH = (gridH - gapY * (FLOORS - 1)) / FLOORS;

    let hovered = -1;
    const rects: { x: number; y: number; i: number }[] = [];

    for (let f = 0; f < FLOORS; f++) {
      for (let c = 0; c < PER_FLOOR; c++) {
        const i = f * PER_FLOOR + c;
        // light up from the ground floor upward as the section scrolls in
        const order = (FLOORS - 1 - f) * PER_FLOOR + c;
        const reveal = reduced
          ? 1
          : Math.min(1, Math.max(0, (prog - (order / (FLOORS * PER_FLOOR)) * 0.75) * 4));
        if (reveal <= 0.001) continue;

        const x = gridX + c * (winW + gapX);
        const y = gridY + f * (winH + gapY);
        rects.push({ x, y, i });

        const inside =
          ptr.inside && ptr.x >= x && ptr.x <= x + winW && ptr.y >= y && ptr.y <= y + winH;
        if (inside) hovered = i;

        const vacant = i in AVAILABLE;
        const pulse = vacant && !reduced ? 0.82 + Math.sin(t * 1.9 + i) * 0.18 : 1;
        const lit = vacant ? 0.9 * pulse : 0.1;

        // glow behind a vacant window so it reads as "lights on"
        if (vacant) {
          const g = ctx.createRadialGradient(
            x + winW / 2,
            y + winH / 2,
            1,
            x + winW / 2,
            y + winH / 2,
            Math.max(1, winW * 1.5)
          );
          g.addColorStop(0, `rgba(${LIGHT},${0.3 * pulse * reveal})`);
          g.addColorStop(1, `rgba(${LIGHT},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - winW, y - winH, winW * 3, winH * 3);
        }

        // pane
        ctx.fillStyle = `rgba(${LIGHT},${lit * reveal})`;
        ctx.fillRect(x, y, winW, winH);
        // frame
        ctx.strokeStyle = `rgba(${LIGHT},${(inside ? 0.95 : vacant ? 0.75 : 0.32) * reveal})`;
        ctx.lineWidth = inside ? 1.6 : 1;
        ctx.strokeRect(x + 0.5, y + 0.5, winW - 1, winH - 1);

        // mullions — the cross that makes a rectangle read as a window
        ctx.strokeStyle = `rgba(${vacant ? "15,13,10" : LIGHT},${
          (vacant ? 0.5 : 0.22) * reveal
        })`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + winW / 2, y + 2);
        ctx.lineTo(x + winW / 2, y + winH - 2);
        ctx.moveTo(x + 2, y + winH / 2);
        ctx.lineTo(x + winW - 2, y + winH / 2);
        ctx.stroke();

        // sill
        ctx.fillStyle = `rgba(${LIGHT},${0.3 * reveal})`;
        ctx.fillRect(x - 1.5, y + winH, winW + 3, 1.5);
      }
    }

    /* ---------- entrance ---------- */
    const doorW = Math.max(24, bw * 0.085);
    const dx = bx + bw / 2 - doorW / 2;
    const dy = groundY - doorH;
    const doorReveal = reduced ? 1 : Math.min(1, Math.max(0, prog * 4));
    ctx.fillStyle = `rgba(${LIGHT},${0.14 * doorReveal})`;
    ctx.fillRect(dx, dy, doorW, doorH);
    ctx.strokeStyle = `rgba(${LIGHT},${0.5 * doorReveal})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(dx + 0.5, dy + 0.5, doorW - 1, doorH - 1);
    // transom + handle
    ctx.beginPath();
    ctx.moveTo(dx + 1, dy + 9);
    ctx.lineTo(dx + doorW - 1, dy + 9);
    ctx.stroke();
    ctx.fillStyle = `rgba(${LIGHT},${0.65 * doorReveal})`;
    ctx.fillRect(dx + doorW - 7, dy + doorH / 2 + 3, 2.5, 3);
    // stoop
    ctx.fillStyle = `rgba(${LIGHT},${0.2 * doorReveal})`;
    ctx.fillRect(dx - 7, groundY, doorW + 14, 2);

    /* ---------- labels ---------- */
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillStyle = `rgba(237,228,211,0.4)`;
    ctx.fillText("RENTAL PORTFOLIO", 14, 14);

    const vacantCount = Object.keys(AVAILABLE).length;
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${LIGHT},0.75)`;
    ctx.fillText(`${vacantCount} AVAILABLE`, w - 14, 14);
    ctx.textAlign = "left";

    /* ---------- hover readout ---------- */
    if (hovered >= 0) {
      const unit = AVAILABLE[hovered];
      const label = unit ? `${unit.address} · ${unit.rent}` : "Occupied";
      const r = rects.find((rr) => rr.i === hovered)!;
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(label).width;
      const padX = 7;
      let tx = r.x + winW / 2 - (tw + padX * 2) / 2;
      tx = Math.min(Math.max(tx, 8), w - tw - padX * 2 - 8);
      const isTopRow = r.y < gridY + winH;
      const ty = isTopRow ? r.y + winH + 8 : r.y - 24;

      ctx.fillStyle = "rgba(15,13,10,0.92)";
      ctx.fillRect(tx, ty, tw + padX * 2, 18);
      ctx.strokeStyle = `rgba(${LIGHT},${unit ? 0.5 : 0.2})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, tw + padX * 2 - 1, 17);
      ctx.fillStyle = unit ? `rgba(${LIGHT},1)` : "rgba(237,228,211,0.55)";
      ctx.fillText(label, tx + padX, ty + 12.5);
    }
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
