"use client";

import { useEffect } from "react";
import { setAccent } from "@/lib/accent";

/**
 * Watches the page's [data-section] blocks and publishes the accent of whichever
 * one is nearest the viewport center. Decoupled: each section declares its own
 * hue here, and any component can subscribe via useAccent().
 */
// blues → greens → purples → pinks, nothing else
const SECTION_ACCENT: Record<string, string> = {
  MASTHEAD: "#6aa8e6", // blue
  ABOUT: "#5cc8a6", // green
  WORK: "#3fbfb0", // teal
  GITHUB: "#6aa8e6", // blue
  LEADERSHIP: "#8b5cf6", // violet
  COMMUNITY: "#48c6a0", // green
  WORDS: "#a855f7", // purple
  CONTACT: "#ec6cb0", // pink
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
