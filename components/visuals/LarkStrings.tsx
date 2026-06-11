"use client";

import { useRef } from "react";
import type { MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { useCanvas2D } from "@/lib/useCanvas2D";

const STRINGS = 6;

/** Lark — six guitar strings that draw in as you scroll, then you can pluck them. */
export default function LarkStrings({ progress }: { progress?: MotionValue<number> }) {
  const reduced = useReducedMotionSafe();
  // per-string vibration energy
  const amp = useRef<number[]>(Array(STRINGS).fill(0));

  const ref = useCanvas2D((ctx, w, h, t, ptr) => {
    const pad = 18;
    const gap = (h - pad * 2) / (STRINGS - 1);
    const stringY = (i: number) => pad + i * gap;

    // scroll-scrubbed reveal: strings draw in top to bottom
    const sp = progress ? progress.get() : null;
    const prog = sp !== null ? Math.min(1, Math.max(0, sp)) : 1;

    // pluck: if the pointer crossed a string since last frame, add energy
    if (ptr.inside && ptr.py > -900) {
      for (let i = 0; i < STRINGS; i++) {
        const y = stringY(i);
        const crossed = (ptr.py - y) * (ptr.y - y) <= 0; // sign change = crossed
        const near = Math.abs(ptr.y - y) < 6;
        if (crossed || near) amp.current[i] = Math.min(1, amp.current[i] + 0.55);
      }
    }
    if (reduced) {
      // a gentle static curve so it still reads as strings
      for (let i = 0; i < STRINGS; i++) amp.current[i] = 0.12;
    }

    for (let i = 0; i < STRINGS; i++) {
      // each string draws in left-to-right, staggered top to bottom
      const rev = reduced ? 1 : Math.min(1, Math.max(0, (prog - (i / STRINGS) * 0.8) * 2.4));
      if (rev <= 0.001) continue;
      const endX = pad + rev * (w - pad * 2);

      const y = stringY(i);
      const a = amp.current[i];
      // thicker, brighter for lower (thicker) strings
      const thickness = 0.8 + (i / (STRINGS - 1)) * 1.3;
      const baseAlpha = 0.3 + (i / (STRINGS - 1)) * 0.25;
      const alpha = Math.min(1, baseAlpha + a * 0.6);
      ctx.strokeStyle = `rgba(34,197,94,${alpha})`;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      const freq = 1.5 + i * 0.5;
      const speed = reduced ? 0 : 9 + i;
      const amplitude = a * (gap * 0.42);
      for (let x = pad; x <= endX; x += 3) {
        const env = Math.sin(((x - pad) / (w - pad * 2)) * Math.PI); // fixed at ends
        const yy =
          y +
          Math.sin(((x - pad) / (w - pad * 2)) * Math.PI * freq + t * speed) *
            amplitude *
            env;
        x === pad ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();

      // tuning peg dots
      ctx.fillStyle = `rgba(34,197,94,${0.5 + a * 0.5})`;
      ctx.beginPath();
      ctx.arc(pad, y, 1.8, 0, Math.PI * 2);
      if (rev > 0.98) ctx.arc(w - pad, y, 1.8, 0, Math.PI * 2);
      ctx.fill();

      if (!reduced) amp.current[i] *= 0.965; // decay
    }

    // fret markers
    ctx.fillStyle = "rgba(237,228,211,0.12)";
    for (let f = 1; f <= 4; f++) {
      const x = pad + (f / 5) * (w - pad * 2);
      ctx.fillRect(x, pad, 1, h - pad * 2);
    }

    ctx.fillStyle = "rgba(237,228,211,0.4)";
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText("PLUCK A STRING", pad, 12);
  });

  return <canvas ref={ref} className="h-full w-full" />;
}
