"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import LazyVisual from "./LazyVisual";
import { fadeUp } from "@/lib/motion";

const AboutConstellation = dynamic(() => import("./visuals/AboutConstellation"), {
  ssr: false,
});

const VIEWPORT = { once: true, margin: "-80px" } as const;

const LANGS = [
  { name: "English", level: "Native" },
  { name: "Hindi", level: "Native" },
  { name: "Spanish", level: "Professional · Duolingo 115 · Spanish Honor Society" },
  { name: "Urdu", level: "Professional" },
];

const COURSEWORK = [
  {
    grade: "11th",
    gpa: null as string | null,
    courses: [
      "AP Calc BC",
      "Honors Spanish 4",
      "Honors Chemistry",
      "Honors Physics",
      "AP European History",
      "AP Lang",
      "AP Psychology (self-study)",
      "AP Environmental Science (self-study)",
    ],
  },
  {
    grade: "10th",
    gpa: "4.55",
    courses: [
      "Honors Analysis",
      "Honors Spanish 3",
      "Honors Biology",
      "AP US History",
      "Honors English 10",
      "AP Computer Science Principles",
    ],
  },
  {
    grade: "9th",
    gpa: "4.37",
    courses: [
      "Honors Algebra 2",
      "Honors Spanish 2",
      "Accelerated Chem/Physics",
      "Honors History 9",
      "Honors English 9",
    ],
  },
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
            accent="#dfe7ee"
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
              software for myself, the community, and businesses.
            </motion.p>
            <motion.p
              className="mt-4"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={1}
            >
              Outside of that I lead clubs, volunteer locally, and stay active.
              Drag the constellation to explore what I&rsquo;m into.
            </motion.p>
          </div>

          {/* languages + coursework — stacked, clean */}
          <div className="mt-10 max-w-md space-y-8">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={2}
            >
              <p className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
                <span className="h-px w-4 bg-[#dfe7ee]/50" />
                Languages
              </p>
              <ul className="mt-3 divide-y divide-bone/10">
                {LANGS.map((l) => (
                  <li
                    key={l.name}
                    className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0"
                  >
                    <span className="font-sans text-[15px] text-bone/90">
                      {l.name}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.14em] text-dim uppercase">
                      {l.level}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={3}
            >
              <p className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
                <span className="h-px w-4 bg-[#dfe7ee]/50" />
                Coursework
              </p>
              <div className="mt-4 space-y-4">
                {COURSEWORK.map((c) => (
                  <div key={c.grade}>
                    <p className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.14em] text-bone/60 uppercase">
                      <span>{c.grade} Grade</span>
                      <span className="text-dim">{c.gpa ? `${c.gpa} GPA` : "In progress"}</span>
                    </p>
                    <p className="mt-1.5 font-sans text-[13px] leading-[1.6] text-bone/80">
                      {c.courses.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
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
          className="relative min-h-[520px] md:min-h-[640px]"
        >
          <LazyVisual className="absolute inset-0">
            <AboutConstellation />
          </LazyVisual>
        </motion.div>
      </div>
    </section>
  );
}
