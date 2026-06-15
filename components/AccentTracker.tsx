"use client";

import { useEffect } from "react";
import { setAccent } from "@/lib/accent";

/**
 * Watches the page's [data-section] blocks and publishes the accent of whichever
 * one is nearest the viewport center. Decoupled: each section declares its own
 * hue here, and any component can subscribe via useAccent().
 */
// hero is near-white (black & white), then a smooth cyan → pink spectrum down
// the 8 chapters
const SECTION_ACCENT: Record<string, string> = {
  MASTHEAD: "#dfe7ee", // hero: cool near-white
  ABOUT: "#22d3ee", // cyan
  WORK: "#38bdf8", // light blue
  GITHUB: "#3b82f6", // blue
  LEADERSHIP: "#6366f1", // indigo / light purple
  COMMUNITY: "#8b5cf6", // violet
  WORDS: "#a855f7", // purple
  CONTACT: "#d946ef", // fuchsia
  PLAYGROUND: "#ec4899", // pink
};

export default function AccentTracker() {
  useEffect(() => {
    let els: HTMLElement[] = [];
    const collect = () => {
      els = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
    };
    collect();

    let raf = 0;
    const pick = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const center = (r.top + r.bottom) / 2;
        const d = Math.abs(center - mid);
        if (d < bestD) {
          bestD = d;
          best = el;
        }
      }
      const name = best?.dataset.section;
      if (name && SECTION_ACCENT[name]) setAccent(SECTION_ACCENT[name]);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      collect();
      onScroll();
    });
    const settle = setTimeout(() => {
      collect();
      pick();
    }, 800);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, []);

  return null;
}
