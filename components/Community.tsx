"use client";

import { motion } from "framer-motion";
import Counter from "./Counter";
import SectionHeading from "./SectionHeading";
import { EASE } from "@/lib/motion";

type Position = {
  org: string;
  mandate: string;
  hours: number;
};

const POSITIONS: Position[] = [
  {
    org: "Northampton Area Public Library",
    mandate: "Education · Young Readers Program",
    hours: 75,
  },
  {
    org: "Council Rock High School South",
    mandate: "Environment · E-Waste & Toner Drives",
    hours: 60,
  },
  {
    org: "Trenton Area Soup Kitchen",
    mandate: "Economic Empowerment · Meal Service",
    hours: 50,
  },
];

const TOTAL_HOURS = 185;

/** 75hrs ≈ 10 glyphs, 60hrs ≈ 8 — one block per 7.5 hours held. */
const HOURS_PER_GLYPH = 7.5;

/** The position-size bar: block glyphs that fill left-to-right on view. */
function HoursBar({ hours, row }: { hours: number; row: number }) {
  const count = Math.round(hours / HOURS_PER_GLYPH);

  return (
    <span aria-hidden className="font-mono text-sm leading-none text-amber">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0.12 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.35, delay: row * 0.12 + i * 0.06, ease: EASE }}
        >
          ▮
        </motion.span>
      ))}
    </span>
  );
}

export default function Community() {
  return (
    <section
      id="community"
      data-section="COMMUNITY"
      className="relative mx-auto max-w-6xl px-6 py-28 md:py-40"
    >
      <SectionHeading
        index="05"
        eyebrow="COMMUNITY"
        accent="#8b5cf6"
        lines={["In my", "community."]}
      />

      <div className="mt-16 border border-bone/15 bg-surface p-8 md:p-12">
        {/* column headers */}
        <div className="hidden border-b border-bone/25 pb-3 font-mono text-[10px] tracking-[0.25em] text-dim uppercase md:grid md:grid-cols-[5fr_4fr_3fr]">
          <span>Organization</span>
          <span>Role</span>
          <span className="text-right">Hours</span>
        </div>

        {/* positions */}
        {POSITIONS.map((p, row) => (
          <motion.div
            key={p.org}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: row * 0.12, ease: EASE }}
            className="grid grid-cols-1 items-baseline gap-1 border-b border-bone/12 py-6 md:grid-cols-[5fr_4fr_3fr] md:gap-0"
          >
            <h3 className="font-serif text-xl text-bone md:text-2xl">
              {p.org}
            </h3>
            <p className="font-mono text-[11px] tracking-[0.15em] text-dim uppercase">
              {p.mandate}
            </p>
            <div className="flex items-baseline gap-3 md:justify-end">
              <HoursBar hours={p.hours} row={row} />
              <span className="font-mono text-2xl text-amber tabular-nums">
                <Counter to={p.hours} suffix="+" />
              </span>
            </div>
          </motion.div>
        ))}

        {/* total — closes accounting-style: hairline above, double rule below */}
        <div className="rule-double pb-4">
          <div className="mt-2 flex items-baseline border-t border-bone/25 pt-6">
            <span className="font-mono text-[11px] tracking-[0.18em] text-bone uppercase">
              Total hours committed
            </span>
            <span className="dotlead" aria-hidden />
            <span className="font-mono text-3xl font-semibold text-amber tabular-nums md:text-4xl">
              <Counter to={TOTAL_HOURS} suffix="+" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
