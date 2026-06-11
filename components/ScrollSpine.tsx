"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";

/**
 * A fixed, glowing progress spine on the left edge that tracks scroll through
 * the whole page — the Leadership-timeline motif applied site-wide. Section
 * markers ignite as the playhead passes them. Desktop only, scroll-driven.
 */
export default function ScrollSpine() {
  const { scrollYProgress } = useScroll();
  const [ticks, setTicks] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
      const fr = els.map((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        return Math.min(1, Math.max(0, top / (max || 1)));
      });
      setTicks(fr);
    };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 800); // re-measure after fonts/layout settle
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v));

  const fillScale = useTransform(scrollYProgress, (v) => v);
  const headTop = useTransform(scrollYProgress, (v) => `${v * 100}%`);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-28 bottom-28 left-6 z-40 hidden w-px lg:block"
    >
      {/* track */}
      <div className="absolute inset-0 bg-bone/10" />
      {/* fill */}
      <motion.div
        className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-amber to-amber/30 shadow-[0_0_10px_rgba(232,163,61,0.4)]"
        style={{ scaleY: fillScale }}
      />
      {/* section markers */}
      {ticks.map((f, i) => {
        const passed = progress >= f - 0.005;
        return (
          <div
            key={i}
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition-all duration-300"
            style={{
              top: `${f * 100}%`,
              borderColor: passed ? "#E8A33D" : "rgba(237,228,211,0.25)",
              backgroundColor: passed ? "#E8A33D" : "transparent",
              boxShadow: passed ? "0 0 8px 1px rgba(232,163,61,0.5)" : "none",
            }}
          />
        );
      })}
      {/* glowing playhead */}
      <motion.div
        className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber"
        style={{
          top: headTop,
          boxShadow:
            "0 0 14px 4px rgba(232,163,61,0.5), 0 0 4px 1px rgba(232,163,61,0.95)",
        }}
      />
    </div>
  );
}
