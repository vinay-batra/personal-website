"use client";

import { useEffect, useState, useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useVelocity,
  useTransform,
  useSpring,
  type Variants,
} from "framer-motion";
import { EASE } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

/** A shared skew that leans with scroll velocity and springs back when you stop. */
function useScrollSkew() {
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const raw = useTransform(velocity, [-2500, 0, 2500], [4, 0, -4], { clamp: true });
  return useSpring(raw, { stiffness: 250, damping: 40, mass: 0.4 });
}

/** Types the eyebrow on character-by-character with a block cursor that blinks twice, then dies. */
export function TypeOn({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotionSafe();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setN(text.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [inView, text, reduced]);

  const done = n >= text.length;
  return (
    <span ref={ref} aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      <span aria-hidden className={done ? "cursor-block" : ""}>
        ▮
      </span>
    </span>
  );
}

/**
 * The two-deck headline lockup: mono eyebrow above a Fraunces headline.
 * The in-view trigger lives on the (unclipped) h2 — a translated child inside
 * an overflow-hidden mask has an empty intersection rect and would never fire.
 */
export default function SectionHeading({
  index,
  eyebrow,
  lines,
  accent = "#E8A33D",
  className = "",
}: {
  index: string;
  eyebrow: string;
  lines: React.ReactNode[];
  accent?: string;
  className?: string;
}) {
  const skewY = useScrollSkew();

  // Single variant for everyone — SSR-identical. MotionConfig reducedMotion="user"
  // makes the transform instant for reduced-motion users (the line lands visible).
  const lineVariants: Variants = {
    hidden: { y: "110%" },
    show: (i: number) => ({
      y: "0%",
      transition: { duration: 0.9, delay: i * 0.09, ease: EASE },
    }),
  };

  return (
    <header className={className}>
      <p
        className="mb-5 flex items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.18em] uppercase"
        style={{ color: accent }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <TypeOn text={`${index} / ${eyebrow}`} />
      </p>
      <motion.h2
        className="serif-head font-serif text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] font-semibold tracking-tight"
        style={{ skewY }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.08em]">
            <motion.span className="block" variants={lineVariants} custom={i}>
              {line}
            </motion.span>
          </span>
        ))}
      </motion.h2>
    </header>
  );
}
