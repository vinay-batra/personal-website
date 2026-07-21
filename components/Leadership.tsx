"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import SectionHeading from "./SectionHeading";
import { EASE } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const YEAR_MIN = 2021;
const YEAR_MAX = 2026;

type Entry = {
  year: string;
  role: string;
  org: string;
  desc: string;
};

const ENTRIES: Entry[] = [
  {
    year: "2026",
    role: "Founder",
    org: "CORVO · CORVO.CAPITAL",
    desc: "Built Corvo, a portfolio intelligence platform: Monte Carlo simulation, volatility and drawdown analysis, value-at-risk, and an AI analyst. FastAPI and Next.js. Launched on Product Hunt.",
  },
  {
    year: "2026",
    role: "Essentials of Entrepreneurship",
    org: "WHARTON GLOBAL YOUTH · UPENN",
    desc: "Accepted to Wharton's summer entrepreneurship program at the University of Pennsylvania.",
  },
  {
    year: "2026",
    role: "Competition Chair",
    org: "FBLA",
    desc: "Lead chapter participation in FBLA competitions: event selection, prep sessions, shared resources, and progress tracking.",
  },
  {
    year: "2026",
    role: "CSO · SSAC Lead",
    org: "COUNCIL ROCK HS SOUTH",
    desc: "Designed and launched the STEM Solutions Innovation Competition. Secured $1,500+ in grants and built the prompts, judging rubric, and a mixed panel of teachers, students, and community members.",
  },
  {
    year: "2025",
    role: "Chief Science Officer",
    org: "COUNCIL ROCK HS SOUTH",
    desc: "One of two students chosen to represent the school in the international CSO program: STEM planning and community engagement.",
  },
  {
    year: "2025",
    role: "State Competitor",
    org: "FBLA",
    desc: "Competed at FBLA state events, with nationals next, applying finance and analysis under pressure through structured prep.",
  },
  {
    year: "2025",
    role: "President",
    org: "ENVIRONMENTAL ACTION CLUB",
    desc: "Lead the club on sustainability and resource management. Ran school-wide e-waste and toner-cartridge recycling drives. 60+ volunteer hours.",
  },
  {
    year: "2025",
    role: "Director of Technology",
    org: "JITO YOUTH (FJLP)",
    desc: "Run all digital infrastructure for a 100+ member national youth network: the website, systems, and the annual technology initiatives, planned alongside the board.",
  },
  {
    year: "2024",
    role: "Member",
    org: "ENVIRONMENTAL ACTION CLUB",
    desc: "Supported student-led sustainability work: awareness campaigns, better recycling systems, and school-wide environmental events.",
  },
  {
    year: "2024",
    role: "Member",
    org: "JITO YOUTH (FJLP)",
    desc: "Joined the Future Jain Leadership Program, took part in every meeting and its entrepreneurship competitions, then earned a board seat.",
  },
  {
    year: "2024",
    role: "Software Intern",
    org: "BETTERMIND LABS",
    desc: "Built a full-stack stock-forecasting app on my own with Python, TensorFlow, Prophet, and Streamlit, from training the model to shipping the frontend.",
  },
  {
    year: "2022",
    role: "Reseller",
    org: "DEPOP · GRAILED",
    desc: "Sourced and flipped clothes and shoes on Depop and Grailed, pricing for demand and turning over dozens of pieces. Brought in around $800, my first real read on a marketplace.",
  },
  {
    year: "2022",
    role: "Founder",
    org: "DROPSHIPPING STORE",
    desc: "Ran a small dropshipping store selling clothes: sourcing, listings, and fulfillment, all handled myself. Made about $50, small, but it's where I first learned how a storefront actually works end to end.",
  },
  {
    year: "2021",
    role: "Long-term Investor",
    org: "SELF-MANAGED PORTFOLIO · VS S&P 500",
    desc: "Started managing my own capital. Moved from stock-picking to structured, long-term allocation, benchmarked against the S&P 500. It's the discipline everything else here is built on.",
  },
];

const entryVariants: Variants = {
  hidden: { opacity: 0.35 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

const nodeVariants: Variants = {
  hidden: { backgroundColor: "#0F0D0A", boxShadow: "0 0 0 0 rgba(232,163,61,0)" },
  show: {
    backgroundColor: "#E8A33D",
    boxShadow: "0 0 12px 2px rgba(232,163,61,0.6)",
    transition: { duration: 0.4, ease: EASE },
  },
};

const tickVariants: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.3, ease: EASE } },
};

export default function Leadership() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();
  const [year, setYear] = useState(YEAR_MAX);

  // Drives the big mono year readout — entries now run newest to oldest,
  // so the readout counts down from 2026 to 2021 as you scroll.
  const { scrollYProgress: yearProgress } = useScroll({
    target: sectionRef,
    offset: ["start center", "end center"],
  });
  useMotionValueEvent(yearProgress, "change", (v) => {
    setYear(Math.round(YEAR_MAX - v * (YEAR_MAX - YEAR_MIN)));
  });

  // Drives the spine scrub — raw scroll progress, no spring.
  const { scrollYProgress: spineProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.75", "end 0.6"],
  });
  // glowing playhead that rides the tip of the fill
  const headTop = useTransform(spineProgress, (v) => `${Math.min(Math.max(v, 0), 1) * 100}%`);
  const headOpacity = useTransform(spineProgress, [0, 0.02, 0.97, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={sectionRef}
      id="leadership"
      data-section="LEADERSHIP"
      className="relative mx-auto max-w-6xl px-6 py-28 md:py-40"
    >
      <div className="grid gap-12 md:grid-cols-[4fr_8fr]">
        {/* LEFT — sticky heading + session-year readout */}
        <div className="self-start md:sticky md:top-28">
          <SectionHeading
            index="04"
            eyebrow="LEADERSHIP"
            accent="#6366f1"
            lines={["Where I", "lead."]}
          />
          <div className="mt-10">
            <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
              Year
            </p>
            <p className="mt-2 font-mono text-6xl text-[#6366f1] tabular-nums md:text-7xl">
              {reduced ? YEAR_MAX : year}
            </p>
          </div>
        </div>

        {/* RIGHT — the spine */}
        <div className="relative">
          {/* static hairline track */}
          <div aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-bone/15" />
          {/* amber scrub — scaleY is exactly section scroll progress */}
          <motion.div
            aria-hidden
            className="absolute top-0 bottom-0 left-0 w-[2px] origin-top bg-[#6366f1] shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={reduced ? { scaleY: 1 } : { scaleY: spineProgress }}
          />
          {/* glowing playhead riding the fill */}
          {!reduced && (
            <motion.div
              aria-hidden
              className="absolute left-px z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6366f1]"
              style={{
                top: headTop,
                opacity: headOpacity,
                boxShadow:
                  "0 0 16px 5px rgba(232,163,61,0.55), 0 0 5px 1px rgba(232,163,61,0.95)",
              }}
            />
          )}

          {ENTRIES.map((entry) => (
            <motion.div
              key={`${entry.year}-${entry.org}`}
              className="relative py-9 pl-10"
              initial={reduced ? "show" : "hidden"}
              whileInView="show"
              viewport={{ once: true, margin: "-45% 0px -45% 0px" }}
              variants={entryVariants}
            >
              {/* node — diamond centered on the spine */}
              <motion.span
                aria-hidden
                className="absolute left-[-5px] top-[calc(3.3rem-5px)] h-2.5 w-2.5 rotate-45 border border-[#6366f1]"
                variants={nodeVariants}
              />
              {/* connector tick from spine to text */}
              <motion.span
                aria-hidden
                className="absolute left-2 top-[3.3rem] h-px w-6 origin-left bg-[#6366f1]/60"
                variants={tickVariants}
              />

              <p className="font-mono text-[11px] text-dim tabular-nums">{entry.year}</p>
              <h3 className="font-serif text-[1.75rem] leading-tight font-semibold text-bone">
                {entry.role}
              </h3>
              <p className="mt-1 font-mono text-[11px] tracking-[0.18em] text-[#6366f1] uppercase">
                {entry.org}
              </p>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-bone/60">
                {entry.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
