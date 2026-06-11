"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe reduced-motion flag. Returns `false` during SSR *and* the
 * first client render, then flips to the real preference after mount.
 *
 * framer-motion's useReducedMotion() reads matchMedia synchronously on first
 * client render while returning null on the server — so branching rendered
 * output (text, attributes, structure) on it produces hydration mismatches.
 * Use this for any reduced-motion branch that changes what is rendered.
 * For pure motion-component animations, prefer <MotionConfig reducedMotion="user">.
 */
export function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
