"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny global store for the page's current accent color. One <AccentTracker>
 * sets it from whichever section is centered in the viewport; the cursor,
 * scroll spine, and aurora all read it so the whole page shifts hue together.
 */
const DEFAULT = "#dfe7ee";
let current = DEFAULT;
const listeners = new Set<() => void>();

export function setAccent(hex: string) {
  if (hex === current) return;
  current = hex;
  listeners.forEach((l) => l());
}

export function getAccent() {
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive hook — re-renders the consumer when the accent changes. */
export function useAccent() {
  return useSyncExternalStore(subscribe, getAccent, () => DEFAULT);
}

/** "#5cb88a" → [0.36, 0.72, 0.54] (0–1 floats), for WebGL uniforms. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
