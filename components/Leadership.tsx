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

/**
 * Entries are grouped by organization, mirroring how LinkedIn stacks multiple
 * roles under one employer (Member then President, State Competitor then
 * Competition Chair). Newest role first, both within a group and across groups.
 */
type Role = {
  title: string;
  period: string;
  desc: string;
};

type Entry = {
  org: string;
  sortYear: string; // the year shown on the spine (most recent role)
  roles: Role[];
};

const ENTRIES: Entry[] = [
  {
    org: "MORECO PROPERTIES",
    sortYear: "2026",
    roles: [
      {
        title: "Founder & Builder",
        period: "Aug 2026 - Present",
        desc: "Built morecoproperties.com, the first real website for a local family property manager: live unit availability, an AI chat that answers renter questions, and one form covering both rental inquiries and maintenance. My first build for someone else's business.",
      },
    ],
  },
  {
    org: "FBLA ONE · SELF-EMPLOYED",
    sortYear: "2026",
    roles: [
      {
        title: "Founder & Builder",
        period: "Jun 2026 - Present",
        desc: "Built FBLA One (fbla.one), an all-in-one platform for FBLA chapters. Engineered an AI practice-test generator on the Claude API with a tool-use loop and a custom calculator engine that guarantees numerically correct answers. Added an advisor dashboard, 55 competition guides, and a Road-to-Nationals study plan. Piloted at Council Rock South, built to scale to 230,000+ members nationally.",
      },
    ],
  },
  {
    org: "LARK · SELF-EMPLOYED",
    sortYear: "2026",
    roles: [
      {
        title: "Founder & Builder",
        period: "Apr 2026 - Present",
        desc: "Built Lark (lark.coach), an AI guitar tutor that hears you play. Engineered a browser audio pipeline for real-time pitch and chord detection with the Web Audio API, powering note-by-note scoring across 83 songs and a 6-stage curriculum, plus an AI coach that returns specific feedback after each take.",
      },
    ],
  },
  {
    org: "FBLA",
    sortYear: "2026",
    roles: [
      {
        title: "Competition Chair",
        period: "Mar 2026 - Present",
        desc: "Lead chapter participation in FBLA competitions: event selection, prep sessions, shared resources, and progress tracking, plus all communication around deadlines and strategy.",
      },
      {
        title: "State Competitor",
        period: "Sep 2025 - Mar 2026",
        desc: "Qualified for and competed at the FBLA state level, applying business, finance, and analytical concepts in timed events.",
      },
    ],
  },
  {
    org: "CORVO · SELF-EMPLOYED",
    sortYear: "2026",
    roles: [
      {
        title: "Founder & Builder",
        period: "Feb 2026 - Present",
        desc: "Built Corvo, a free portfolio intelligence platform focused on risk and decision-making rather than prediction. Engineered the financial models: Monte Carlo simulation over 10,000 fat-tailed paths, Value at Risk, volatility, drawdown, Sharpe ratio, correlation, and S&P 500 benchmarking. FastAPI and Python behind Next.js and TypeScript. Launched publicly on Product Hunt.",
      },
    ],
  },
  {
    org: "COUNCIL ROCK HS SOUTH",
    sortYear: "2026",
    roles: [
      {
        title: "CSO · SSIC Lead",
        period: "Jan 2026 - Present",
        desc: "Designed and launched the STEM Solutions Innovation Challenge, a student-led competition run through the Chief Science Officers program. Secured $1,500+ in grant funding and built the whole thing: tiered problem prompts, a standardized judging rubric, and a mixed panel of teachers, students, and community members.",
      },
      {
        title: "Chief Science Officer",
        period: "Sep 2025 - Jan 2026",
        desc: "One of two students selected to represent the school in the international Chief Science Officers program, contributing to STEM planning and community engagement.",
      },
    ],
  },
  {
    org: "ENVIRONMENTAL ACTION CLUB",
    sortYear: "2025",
    roles: [
      {
        title: "President",
        period: "Sep 2025 - Present",
        desc: "Lead the club on sustainability and resource management. Run school-wide e-waste and toner-cartridge recycling drives end to end, managing volunteers, logistics, and outreach. 60+ volunteer hours.",
      },
      {
        title: "Member",
        period: "Sep 2024 - Sep 2025",
        desc: "Supported student-led sustainability work: awareness campaigns, better recycling systems, and school-wide environmental events.",
      },
    ],
  },
  {
    org: "JITO YOUTH (FJLP)",
    sortYear: "2025",
    roles: [
      {
        title: "Director of Technology",
        period: "Sep 2025 - Present",
        desc: "Manage the digital infrastructure for a 100+ member national youth network: the website, content, and systems, plus the annual technology initiatives planned alongside the board.",
      },
      {
        title: "Member",
        period: "Sep 2024 - Sep 2025",
        desc: "Attended every meeting of the Future Jain Leadership Program and took part in its entrepreneurship competitions, then applied to the executive board and was selected.",
      },
    ],
  },
  {
    org: "BETTERMIND LABS",
    sortYear: "2024",
    roles: [
      {
        title: "Software Intern",
        period: "May 2024 - Sep 2024",
        desc: "Built a full-stack stock forecasting app on my own with Python, TensorFlow, Prophet, and Streamlit, from training the models to shipping the frontend, and learned firsthand where financial prediction breaks down.",
      },
    ],
  },
  {
    org: "DEPOP · GRAILED",
    sortYear: "2022",
    roles: [
      {
        title: "Reseller",
        period: "2022",
        desc: "Sourced and flipped clothes and shoes on Depop and Grailed, pricing for demand and turning over dozens of pieces. Brought in around $800, my first real read on a marketplace. Ran a small dropshipping store alongside it.",
      },
    ],
  },
  {
    org: "SELF-MANAGED PORTFOLIO · VS S&P 500",
    sortYear: "2021",
    roles: [
      {
        title: "Long-term Investor",
        period: "Jun 2021 - Present",
        desc: "Manage a personal portfolio held since 2021, focused on long-term allocation, risk management, and compounding, tracked against the S&P 500. I approach it as a systems problem: structure and risk exposure rather than short-term prediction.",
      },
    ],
  },
];

const entryVariants: Variants = {
  hidden: { opacity: 0.35 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

const nodeVariants: Variants = {
  hidden: { backgroundColor: "#0F0D0A", boxShadow: "0 0 0 0 rgba(223,231,238,0)" },
  show: {
    backgroundColor: "#dfe7ee",
    boxShadow: "0 0 12px 2px rgba(223,231,238,0.6)",
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

  // Drives the big mono year readout — entries run newest to oldest, so the
  // readout counts down from 2026 to 2021 as you scroll.
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
        {/* LEFT — sticky heading + scroll-linked year readout */}
        <div className="self-start md:sticky md:top-28">
          <SectionHeading
            index="04"
            eyebrow="LEADERSHIP"
            accent="#dfe7ee"
            lines={["Where I", "lead."]}
          />
          <div className="mt-10">
            <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
              Year
            </p>
            <p className="mt-2 font-mono text-6xl text-[#dfe7ee] tabular-nums md:text-7xl">
              {reduced ? YEAR_MAX : year}
            </p>
          </div>
        </div>

        {/* RIGHT — the spine */}
        <div className="relative">
          {/* static hairline track */}
          <div aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-bone/15" />
          {/* scrub — scaleY is exactly section scroll progress */}
          <motion.div
            aria-hidden
            className="absolute top-0 bottom-0 left-0 w-[2px] origin-top bg-[#dfe7ee] shadow-[0_0_10px_rgba(223,231,238,0.5)]"
            style={reduced ? { scaleY: 1 } : { scaleY: spineProgress }}
          />
          {/* glowing playhead riding the fill */}
          {!reduced && (
            <motion.div
              aria-hidden
              className="absolute left-px z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dfe7ee]"
              style={{
                top: headTop,
                opacity: headOpacity,
                boxShadow:
                  "0 0 16px 5px rgba(223,231,238,0.55), 0 0 5px 1px rgba(223,231,238,0.95)",
              }}
            />
          )}

          {ENTRIES.map((entry) => (
            <motion.div
              key={entry.org}
              className="relative py-9 pl-10"
              initial={reduced ? "show" : "hidden"}
              whileInView="show"
              viewport={{ once: true, margin: "-45% 0px -45% 0px" }}
              variants={entryVariants}
            >
              {/* node — diamond centered on the spine */}
              <motion.span
                aria-hidden
                className="absolute left-[-5px] top-[calc(2.6rem-5px)] h-2.5 w-2.5 rotate-45 border border-[#dfe7ee]"
                variants={nodeVariants}
              />
              {/* connector tick from spine to text */}
              <motion.span
                aria-hidden
                className="absolute left-2 top-[2.6rem] h-px w-6 origin-left bg-[#dfe7ee]/60"
                variants={tickVariants}
              />

              <p className="font-mono text-[11px] text-dim tabular-nums">
                {entry.sortYear}
              </p>
              <p className="mt-1 font-mono text-[11px] tracking-[0.18em] text-[#dfe7ee] uppercase">
                {entry.org}
              </p>

              {/* roles stacked newest first; a hairline rail links them when
                  one organization holds more than one role */}
              <div
                className={
                  entry.roles.length > 1
                    ? "mt-4 space-y-6 border-l border-bone/15 pl-5"
                    : "mt-4"
                }
              >
                {entry.roles.map((role) => (
                  <div key={role.title} className="relative">
                    {entry.roles.length > 1 && (
                      <span
                        aria-hidden
                        className="absolute top-[0.6rem] left-[-1.4rem] h-1.5 w-1.5 rounded-full bg-bone/35"
                      />
                    )}
                    <h3 className="font-serif text-[1.6rem] leading-tight font-semibold text-bone md:text-[1.75rem]">
                      {role.title}
                    </h3>
                    <p className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                      {role.period}
                    </p>
                    <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-bone/60">
                      {role.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
