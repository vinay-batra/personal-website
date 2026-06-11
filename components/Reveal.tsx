"use client";

import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";

type From = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<From, { x?: number; y?: number }> = {
  up: { y: 30 },
  down: { y: -30 },
  left: { x: 44 },
  right: { x: -44 },
  none: {},
};

/**
 * Directional scroll-reveal: fades + slides in as it enters the viewport.
 * Transforms are disabled for reduced-motion users by MotionConfig, leaving a
 * clean fade. SSR-safe (the observed element is never inside an overflow mask).
 */
export default function Reveal({
  children,
  from = "up",
  delay = 0,
  duration = 0.7,
  margin = "-60px",
  className,
}: {
  children: React.ReactNode;
  from?: From;
  delay?: number;
  duration?: number;
  margin?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...OFFSET[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
