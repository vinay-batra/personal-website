"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useLenis } from "lenis/react";
import { EASE } from "@/lib/motion";
import { TypeOn } from "./SectionHeading";
import Magnetic from "./Magnetic";

const VBParticles = dynamic(() => import("./VBParticles"), { ssr: false });
// when true, the page-level ParticleSpine renders the monogram instead
const SPINE = true;

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const exitOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  // the particles dissolve + fade themselves; just hide the canvas once fully past
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.92, 1], [1, 1, 0]);

  // pause the canvas once the hero is fully scrolled away
  const [active, setActive] = useState(true);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(v < 0.99));

  // subtle 3D parallax on the headline — keeps the crisp Fraunces type but
  // lets the whole lockup lean toward the cursor in perspective
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      tiltY.set(nx * 6);
      tiltX.set(-ny * 4.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, tiltX, tiltY]);

  const lines = ["I build software", "and invest for", "the long run."];

  return (
    <section
      ref={ref}
      data-section="MASTHEAD"
      className="relative flex min-h-[100svh] flex-col justify-center pt-20 pb-16"
    >
      {/* VB monogram — disabled while the page-level ParticleSpine is active,
          which forms VB in the hero and morphs it through the sections */}
      {!SPINE && (
        <motion.div
          style={{ opacity: sceneOpacity }}
          className="pointer-events-none fixed inset-0 z-0 hidden md:block"
          aria-hidden
        >
          <VBParticles reduced={!!reduced} scroll={scrollYProgress} active={active} />
        </motion.div>
      )}

      <motion.div
        style={{ y: exitY, opacity: exitOpacity }}
        className="relative z-10 mx-auto w-full max-w-6xl px-6"
      >
        <h1>
          <span className="mb-5 block font-mono text-[11px] font-medium tracking-[0.22em] text-amber uppercase">
            <TypeOn text="VINAY BATRA · HIGH SCHOOL QUANT · GREATER PHILADELPHIA" />
          </span>
          <motion.span
            style={{
              rotateX: tiltX,
              rotateY: tiltY,
              transformPerspective: 900,
              transformOrigin: "left center",
              transition: "transform 0.35s ease-out",
            }}
            className="serif-head headline-3d block font-serif text-[clamp(2.6rem,7.5vw,6.25rem)] leading-[1.0] font-semibold tracking-tight"
          >
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
          </motion.span>
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
          <Magnetic>
            <a
              href="#work"
              onClick={(e) => {
                e.preventDefault();
                lenis?.scrollTo("#work", { offset: -56, duration: 1.4 });
              }}
              className="font-mono text-[11px] tracking-[0.18em] text-amber uppercase hover:text-bone"
            >
              → View my work
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="https://www.linkedin.com/in/vinay-batra"
              target="_blank"
              rel="noopener noreferrer"
              className="inklink font-mono text-[11px] tracking-[0.18em] text-dim uppercase"
            >
              LinkedIn
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="mailto:vinaybatra2010@gmail.com"
              className="inklink font-mono text-[11px] tracking-[0.18em] text-dim uppercase"
            >
              Email
            </a>
          </Magnetic>
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
          className="font-mono text-[10px] text-amber"
        >
          ▼
        </motion.span>
      </motion.div>
    </section>
  );
}
