"use client";

import { useEffect } from "react";
import { setAccent } from "@/lib/accent";

/**
 * Watches the page's [data-section] blocks and publishes the accent of whichever
 * one is nearest the viewport center. Decoupled: each section declares its own
 * hue here, and any component can subscribe via useAccent().
 */
const SECTION_ACCENT: Record<string, string> = {
  MASTHEAD: "#E8A33D", // amber
  ABOUT: "#E8A33D",
  WORK: "#5cb88a", // corvo green
  GITHUB: "#5cb88a",
  LEADERSHIP: "#5d9ce4", // blue
  COMMUNITY: "#87A5B4", // teal
  WORDS: "#8b5cf6", // violet
  CONTACT: "#E8A33D",
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
