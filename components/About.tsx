"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { fadeUp } from "@/lib/motion";

const AboutGraphic = dynamic(() => import("./visuals/AboutGraphic"), { ssr: false });

const VIEWPORT = { once: true, margin: "-80px" } as const;

const SCORES = [
  { test: "ACT", score: "35", max: "36", note: "99th · Feb 2026" },
  { test: "SSAT", score: "2398", max: "2400", note: "99th · Apr 2025" },
];

const LANGS = [
  { name: "English", level: "Native" },
  { name: "Hindi", level: "Native" },
  { name: "Spanish", level: "Professional · Duolingo 115" },
  { name: "Urdu", level: "Professional" },
];

export default function About() {
  return (
    <section
      id="about"
      data-section="ABOUT"
      className="relative mx-auto max-w-6xl px-6 py-20 md:py-28"
    >
      <div className="grid items-center gap-10 md:grid-cols-[5fr_7fr] lg:gap-16">
        {/* LEFT — heading with the bio grouped right under it */}
        <div>
          <SectionHeading
            index="01"
            eyebrow="ABOUT"
            accent="#E8A33D"
            lines={["A bit", "about me."]}
          />
          <div className="mt-8 font-sans text-[16px] leading-[1.7] text-bone/80 md:text-[17px]">
            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={0}
            >
              I&rsquo;m a student at Council Rock High School South. I build
              software, usually because I wanted something to exist and it
              didn&rsquo;t yet.
            </motion.p>
            <motion.p
              className="mt-4"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={1}
            >
              Outside of that I lead a few clubs, volunteer around my community,
              and read a lot. Hover the map to see what I&rsquo;m into.
            </motion.p>
          </div>

          {/* test scores + languages */}
          <div className="mt-9 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={2}
            >
              <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
                Test Scores
              </p>
              <div className="mt-3.5 space-y-3">
                {SCORES.map((s) => (
                  <div key={s.test} className="flex items-baseline gap-2.5">
                    <span className="w-11 font-mono text-[11px] tracking-[0.14em] text-bone/65 uppercase">
                      {s.test}
                    </span>
                    <span className="font-serif text-2xl leading-none text-amber tabular-nums">
                      {s.score}
                    </span>
                    <span className="font-mono text-[10px] text-dim">/{s.max}</span>
                    <span className="font-mono text-[9px] tracking-[0.1em] text-dim uppercase">
                      {s.note}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={3}
            >
              <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
                Languages
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {LANGS.map((l) => (
                  <li
                    key={l.name}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="font-sans text-[14px] text-bone/85">
                      {l.name}
                    </span>
                    <span className="text-right font-mono text-[9px] tracking-[0.1em] text-dim uppercase">
                      {l.level}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* RIGHT — the big interactive map, centered against the left block */}
        <motion.div
          variants={{
            hidden: { opacity: 0, x: 40 },
            show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
          }}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          className="relative min-h-[420px] overflow-hidden border border-amber/20 md:min-h-[480px]"
          style={{
            background: "linear-gradient(180deg, rgba(232,163,61,0.06), transparent 72%)",
          }}
        >
          <AboutGraphic />
        </motion.div>
      </div>
    </section>
  );
}
