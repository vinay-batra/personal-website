"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig } from "framer-motion";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ReactLenis
        root
        options={{
          lerp: 0.14,
          wheelMultiplier: 1.15,
          smoothWheel: true,
          syncTouch: true,
        }}
      >
        {children}
      </ReactLenis>
    </MotionConfig>
  );
}
