"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useAccent } from "@/lib/accent";

/**
 * Hairline crosshair cursor (pointer:fine only). Over links / buttons /
 * [data-cursor] elements it grows a springy amber ring and prints a small label.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [over, setOver] = useState(false);
  const [label, setLabel] = useState("open");
  const accent = useAccent();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 500, damping: 38 });
  const ry = useSpring(y, { stiffness: 500, damping: 38 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    document.documentElement.classList.add("xcursor");

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.(
        "a, button, [role=button], [data-cursor]"
      );
      if (el) {
        setOver(true);
        setLabel(el.getAttribute("data-cursor") || "open");
      } else {
        setOver(false);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      document.documentElement.classList.remove("xcursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80]">
      {/* crosshair — rides the raw pointer */}
      <motion.div style={{ x, y }} className="absolute top-0 left-0">
        <motion.div animate={{ opacity: over ? 0.35 : 1 }} transition={{ duration: 0.2 }}>
          <div className="absolute top-0 -left-[7px] h-px w-[5px] bg-bone/70" />
          <div className="absolute top-0 left-[3px] h-px w-[5px] bg-bone/70" />
          <div className="absolute -top-[7px] left-0 h-[5px] w-px bg-bone/70" />
          <div className="absolute top-[3px] left-0 h-[5px] w-px bg-bone/70" />
        </motion.div>
      </motion.div>

      {/* springy ring that blooms over interactive elements */}
      <motion.div style={{ x: rx, y: ry }} className="absolute top-0 left-0">
        <motion.div
          className="absolute -top-[19px] -left-[19px] h-[38px] w-[38px] rounded-full border"
          style={{ borderColor: accent, transition: "border-color 0.5s ease" }}
          initial={false}
          animate={{ scale: over ? 1 : 0.2, opacity: over ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        />
      </motion.div>

      {/* label */}
      <motion.div style={{ x: rx, y: ry }} className="absolute top-0 left-0">
        <motion.span
          className="absolute -left-1/2 top-[26px] block translate-x-[-50%] font-mono text-[9px] tracking-[0.25em] uppercase whitespace-nowrap"
          style={{ color: accent, transition: "color 0.5s ease" }}
          animate={{ opacity: over ? 1 : 0, y: over ? 0 : 4 }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.span>
      </motion.div>
    </div>
  );
}
