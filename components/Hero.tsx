"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useLenis } from "lenis/react";
import { EASE } from "@/lib/motion";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { TypeOn } from "./SectionHeading";

const VBParticles = dynamic(() => import("./VBParticles"), { ssr: false });

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const isDesktop = useIsDesktop();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const exitOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  // the particles dissolve + fade themselves; just hide the canvas once fully past
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.92, 1], [1, 1, 0]);

  // Keep the canvas live whenever any part of the hero is on screen, so the
  // click-to-shatter always works, including after you scroll away and back.
  // An IntersectionObserver fires reliably on re-entry where a scroll-progress
  // threshold could stay latched at "scrolled past."
  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const lines = ["I build software", "and invest for", "the long run."];

  return (
    <section
      ref={ref}
      data-section="MASTHEAD"
      className="relative flex flex-col justify-center pt-28 pb-16 md:min-h-[100svh] md:pt-20"
    >
      {/* VB monogram — desktop only; a fixed full-viewport layer so the dissolve
          streams down behind the next section instead of clipping at the hero's
          edge. Not mounted on mobile (no canvas, no blank space). */}
      {isDesktop && (
        <motion.div
          style={{ opacity: sceneOpacity }}
          className="pointer-events-none fixed inset-0 z-0 hidden md:block"
          aria-hidden
        >
          <VBParticles
            reduced={!!reduced}
            scroll={scrollYProgress}
            active={active}
            groupX={4.6}
            groupY={0.15}
            camZ={12.8}
          />
        </motion.div>
      )}

      <motion.div
        style={{ y: exitY, opacity: exitOpacity }}
        className="relative z-10 mx-auto w-full max-w-6xl px-6"
      >
        <h1>
          <span className="mb-5 block font-mono text-[11px] font-medium tracking-[0.22em] text-bone/55 uppercase">
            <TypeOn text="VINAY BATRA · HIGH SCHOOL QUANT · GREATER PHILADELPHIA" />
          </span>
          <span className="serif-head block font-serif text-[clamp(2.6rem,7.5vw,6.25rem)] leading-[1.0] font-semibold tracking-tight">
            {lines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.95, delay: 0.25 + i * 0.1, ease: EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.85, ease: EASE }}
          className="mt-8 max-w-lg font-sans text-[16px] leading-[1.7] text-bone/70 md:text-[17px]"
        >
          I&rsquo;m a high school student in the Philadelphia area. I&rsquo;ve shipped
          three products: Corvo, Lark, and FBLA One. I&rsquo;ve also managed my own
          investment portfolio since 2021.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.05, ease: EASE }}
          className="mt-8 flex flex-wrap items-center gap-7"
        >
          <a
            href="#work"
            onClick={(e) => {
              e.preventDefault();
              lenis?.scrollTo("#work", { offset: -56, duration: 1.4 });
            }}
            className="font-mono text-[11px] tracking-[0.18em] text-bone uppercase transition-opacity hover:opacity-65"
          >
            → View my work
          </a>
          <a
            href="https://www.linkedin.com/in/vinay-batra"
            target="_blank"
            rel="noopener noreferrer"
            className="inklink font-mono text-[11px] tracking-[0.18em] text-dim uppercase"
          >
            LinkedIn
          </a>
          <a
            href="mailto:vinaybatra2010@gmail.com"
            className="inklink font-mono text-[11px] tracking-[0.18em] text-dim uppercase"
          >
            Email
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        style={{ opacity: exitOpacity }}
        className="absolute bottom-10 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 md:flex"
      >
        <span className="font-mono text-[9px] tracking-[0.3em] text-dim uppercase">
          Scroll
        </span>
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="font-mono text-[10px] text-bone/50"
        >
          ▼
        </motion.span>
      </motion.div>
    </section>
  );
}
