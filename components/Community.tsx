"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Counter from "./Counter";
import SectionHeading from "./SectionHeading";
import { EASE } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

type Position = {
  org: string;
  short: string;
  mandate: string;
  hours: number;
  shade: string;
};

/**
 * Monochrome by design: the three causes are separated by shade, not hue, so
 * the ledger stays in the same cool grey family as the rest of the page.
 */
const POSITIONS: Position[] = [
  {
    org: "Northampton Area Public Library",
    short: "Library",
    mandate: "Education · Young Readers Program",
    hours: 75,
    shade: "#dfe7ee",
  },
  {
    org: "Council Rock High School South",
    short: "School",
    mandate: "Environment · E-Waste & Toner Drives",
    hours: 60,
    shade: "#a4b0bd",
  },
  {
    org: "Trenton Area Soup Kitchen",
    short: "Soup Kitchen",
    mandate: "Economic Empowerment · Meal Service",
    hours: 50,
    shade: "#818c99",
  },
];

const TOTAL_HOURS = POSITIONS.reduce((sum, p) => sum + p.hours, 0);

/** One cell per hour served, coloured by cause. 185 cells, 185 hours. */
function TallyGrid({ active }: { active: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotionSafe();

  const cells: { shade: string; group: number }[] = [];
  POSITIONS.forEach((p, group) => {
    for (let i = 0; i < p.hours; i++) cells.push({ shade: p.shade, group });
  });

  return (
    <div
      ref={ref}
      className="tally flex flex-wrap gap-[3px]"
      data-in={inView ? "true" : "false"}
      aria-hidden
    >
      {cells.map((c, i) => {
        const dim = active !== null && active !== c.group;
        return (
          <span
            key={i}
            className="h-[9px] w-[9px] transition-opacity duration-300 md:h-[10px] md:w-[10px]"
            style={{
              backgroundColor: c.shade,
              animationDelay: reduced ? "0ms" : `${i * 7}ms`,
              opacity: dim ? 0.18 : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export default function Community() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section
      id="community"
      data-section="COMMUNITY"
      className="relative mx-auto max-w-6xl px-6 py-28 md:py-40"
    >
      <SectionHeading
        index="05"
        eyebrow="COMMUNITY"
        accent="#dfe7ee"
        lines={["In my", "community."]}
      />

      <div className="mt-16 border border-bone/15 bg-surface/70 p-6 md:p-12">
        {/* ---------- the tally: one square per hour ---------- */}
        <div className="flex flex-col gap-3 border-b border-bone/12 pb-8 md:flex-row md:items-end md:justify-between md:gap-10">
          <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
            One square = one hour
          </p>
          <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
            2024 &ndash; 2026
          </p>
        </div>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <TallyGrid active={active} />
        </motion.div>

        {/* ---------- the ledger: hover a row to isolate its hours ---------- */}
        <div className="mt-10">
          <div className="hidden border-b border-bone/25 pb-3 font-mono text-[10px] tracking-[0.25em] text-dim uppercase md:grid md:grid-cols-[5fr_4fr_3fr]">
            <span>Organization</span>
            <span>Role</span>
            <span className="text-right">Hours</span>
          </div>

          {POSITIONS.map((p, row) => (
            <motion.div
              key={p.org}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: row * 0.12, ease: EASE }}
              onMouseEnter={() => setActive(row)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(row)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              className="grid grid-cols-1 items-baseline gap-1 border-b border-bone/12 py-5 outline-none transition-colors focus-visible:bg-bone/[0.04] md:grid-cols-[5fr_4fr_3fr] md:gap-0 md:hover:bg-bone/[0.04]"
            >
              <h3 className="flex items-baseline gap-2.5 font-serif text-xl text-bone md:text-2xl">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 translate-y-[-2px]"
                  style={{ backgroundColor: p.shade }}
                />
                {p.org}
              </h3>
              <p className="font-mono text-[11px] tracking-[0.15em] text-dim uppercase">
                {p.mandate}
              </p>
              <div className="flex items-baseline gap-3 md:justify-end">
                <span className="font-mono text-[10px] tracking-[0.14em] text-dim tabular-nums">
                  {Math.round((p.hours / TOTAL_HOURS) * 100)}%
                </span>
                <span
                  className="font-mono text-2xl tabular-nums"
                  style={{ color: p.shade }}
                >
                  <Counter to={p.hours} suffix="+" />
                </span>
              </div>
            </motion.div>
          ))}

          {/* total — closes accounting-style */}
          <div className="rule-double pb-4">
            <div className="mt-2 flex items-baseline border-t border-bone/25 pt-6">
              <span className="font-mono text-[11px] tracking-[0.18em] text-bone uppercase">
                Total hours committed
              </span>
              <span className="dotlead" aria-hidden />
              <span className="font-mono text-3xl font-semibold text-[#dfe7ee] tabular-nums md:text-4xl">
                <Counter to={TOTAL_HOURS} suffix="+" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
