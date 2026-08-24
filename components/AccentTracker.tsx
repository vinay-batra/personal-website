"use client";

import { useEffect } from "react";
import { setAccent } from "@/lib/accent";

/**
 * Watches the page's [data-section] blocks and publishes the accent of whichever
 * one is nearest the viewport center. Decoupled: each section declares its own
 * hue here, and any component can subscribe via useAccent().
 */
// The page is monochrome: every section uses a shade of the same cool grey as
// the hero, so the aurora drifts between light and dark greys instead of
// running a colour spectrum. No blues / purples / pinks anywhere.
const SECTION_ACCENT: Record<string, string> = {
  MASTHEAD: "#dfe7ee", // hero: cool near-white
  ABOUT: "#d4dde6",
  WORK: "#c6d1dc",
  GITHUB: "#b8c4d1",
  LEADERSHIP: "#cad4de",
  COMMUNITY: "#dae3ea",
  WORDS: "#c6d1dc",
  CONTACT: "#d4dde6",
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
