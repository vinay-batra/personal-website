"use client";

import { useId, useRef } from "react";

/**
 * Wraps content in an SVG turbulence + displacement filter. On hover the
 * displacement springs up (and the noise gently flows) so the inner visual —
 * even a live WebGL/2D canvas — ripples like disturbed water, then settles on
 * leave. Fine-pointer only; touch just renders the child untouched.
 */
export default function LiquidHover({
  children,
  className,
  strength = 16,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = `liquid-${rawId}`;
  const disp = useRef<SVGFEDisplacementMapElement>(null);
  const turb = useRef<SVGFETurbulenceElement>(null);
  const raf = useRef(0);
  const cur = useRef(0);
  const target = useRef(0);
  const t = useRef(0);

  const loop = () => {
    t.current += 0.016;
    cur.current += (target.current - cur.current) * 0.12;
    if (disp.current) disp.current.scale.baseVal = cur.current;
    if (turb.current) {
      // drift the vertical frequency a touch so the warp flows while hovered
      const fy = 0.014 + Math.sin(t.current * 1.6) * 0.004 * (cur.current / strength);
      turb.current.setAttribute("baseFrequency", `0.010 ${fy.toFixed(4)}`);
    }
    if (cur.current > 0.05 || target.current > 0) {
      raf.current = requestAnimationFrame(loop);
    } else {
      cur.current = 0;
      if (disp.current) disp.current.scale.baseVal = 0;
      raf.current = 0;
    }
  };

  const start = () => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (!raf.current) raf.current = requestAnimationFrame(loop);
  };
  const enter = () => {
    target.current = strength;
    start();
  };
  const leave = () => {
    target.current = 0;
    start();
  };

  return (
    <div
      onPointerEnter={enter}
      onPointerLeave={leave}
      className={className}
      style={{ filter: `url(#${id})` }}
    >
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            ref={turb}
            type="fractalNoise"
            baseFrequency="0.010 0.014"
            numOctaves={2}
            seed={4}
            result="noise"
          />
          <feDisplacementMap
            ref={disp}
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      {children}
    </div>
  );
}
