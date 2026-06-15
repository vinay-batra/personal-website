"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useLenis } from "lenis/react";
import { useAccent, hexToRgb } from "@/lib/accent";

/**
 * A fixed, glowing progress spine on the left edge that tracks scroll through the
 * whole page. Each section marker is labelled and clickable (smooth-scrolls to
 * that section), and ignites as the playhead passes it. The labels only appear
 * once the viewport is wide enough to fit them in the gutter without overlapping
 * the centered content; below that it's dots-only. Desktop only.
 */

// friendly labels for each data-section (matches the top nav's vocabulary)
const LABELS: Record<string, string> = {
  MASTHEAD: "Top",
  ABOUT: "About",
  WORK: "Work",
  GITHUB: "Lately",
  LEADERSHIP: "Lead",
  COMMUNITY: "Serve",
  WORDS: "Words",
  CONTACT: "Contact",
  PLAYGROUND: "Play",
};

type Tick = { f: number; ds: string };

export default function ScrollSpine() {
  const { scrollYProgress } = useScroll();
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [progress, setProgress] = useState(0);
  const [wide, setWide] = useState(false); // enough left gutter for labels
  const accent = useAccent();
  const lenis = useLenis();
  const [r, g, b] = hexToRgb(accent).map((v) => Math.round(v * 255));
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;

  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-section]")).filter(
        (el) => el.dataset.section !== "MASTHEAD" // the hero is the start, not a chapter
      );
      setTicks(
        els.map((el) => ({
          f: Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY) / (max || 1))),
          ds: el.getAttribute("data-section") || "",
        }))
      );
    };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 800); // re-measure after fonts/layout settle
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const update = () => setWide(window.innerWidth >= 1400);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v));

  const fillScale = useTransform(scrollYProgress, (v) => v);
  const headTop = useTransform(scrollYProgress, (v) => `${v * 100}%`);

  // the latest section we've reached is the active one
  let activeIdx = -1;
  ticks.forEach((t, i) => {
    if (progress >= t.f - 0.02) activeIdx = i;
  });

  return (
    <div aria-hidden className="pointer-events-none fixed top-28 bottom-28 left-6 z-40 hidden w-px lg:block">
      {/* track */}
      <div className="absolute inset-0 bg-bone/10" />
      {/* fill */}
      <motion.div
        className="absolute inset-x-0 top-0 h-full origin-top"
        style={{
          scaleY: fillScale,
          backgroundImage: `linear-gradient(to bottom, ${rgba(1)}, ${rgba(0.3)})`,
          boxShadow: `0 0 10px ${rgba(0.4)}`,
          transition: "background-image 0.5s ease, box-shadow 0.5s ease",
        }}
      />
      {/* section markers */}
      {ticks.map((t, i) => {
        const passed = progress >= t.f - 0.005;
        return (
          <div
            key={`d${i}`}
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition-all duration-300"
            style={{
              top: `${t.f * 100}%`,
              borderColor: passed ? accent : "rgba(237,228,211,0.25)",
              backgroundColor: passed ? accent : "transparent",
              boxShadow: passed ? `0 0 8px 1px ${rgba(0.5)}` : "none",
            }}
          />
        );
      })}
      {/* labels — clickable, smooth-scroll to the section */}
      {wide &&
        ticks.map((t, i) => {
          const passed = progress >= t.f - 0.005;
          const active = i === activeIdx;
          return (
            <button
              key={`l${i}`}
              type="button"
              onClick={() => lenis?.scrollTo(`[data-section="${t.ds}"]`, { offset: -56, duration: 1.2 })}
              className="pointer-events-auto absolute left-3.5 -translate-y-1/2 cursor-pointer whitespace-nowrap font-mono text-[8.5px] tracking-[0.22em] uppercase transition-colors duration-300 hover:opacity-100"
              style={{
                top: `${t.f * 100}%`,
                color: active ? accent : passed ? rgba(0.7) : "rgba(237,228,211,0.32)",
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {LABELS[t.ds] ?? t.ds}
            </button>
          );
        })}
      {/* glowing playhead */}
      <motion.div
        className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          top: headTop,
          backgroundColor: accent,
          boxShadow: `0 0 14px 4px ${rgba(0.5)}, 0 0 4px 1px ${rgba(0.95)}`,
          transition: "background-color 0.5s ease",
        }}
      />
    </div>
  );
}
