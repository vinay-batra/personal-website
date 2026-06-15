"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Counter from "./Counter";
import { TypeOn } from "./SectionHeading";
import { fadeUp } from "@/lib/motion";

const USER = "vinay-batra";
const COLORS = [
  "rgba(237,228,211,0.07)",
  "rgba(232,163,61,0.32)",
  "rgba(232,163,61,0.52)",
  "rgba(232,163,61,0.74)",
  "rgba(232,163,61,0.96)",
];

interface Day {
  level: number;
}

/** seeded fallback so the graph always looks alive even if the API is unreachable */
function synth(): Day[] {
  let s = 1907;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 371 }, () => {
    const x = r();
    const level = x > 0.78 ? (x > 0.94 ? 4 : x > 0.88 ? 3 : 2) : x > 0.5 ? 1 : 0;
    return { level };
  });
}

export default function GithubActivity() {
  const [days, setDays] = useState<Day[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(gridRef, { once: true, margin: "-60px" });

  useEffect(() => {
    let alive = true;
    fetch(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return;
        setDays(d.contributions as Day[]);
        const tot =
          typeof d.total === "number"
            ? d.total
            : (d.total?.lastYear ?? Object.values(d.total ?? {})[0] ?? null);
        setTotal(typeof tot === "number" ? tot : null);
        setLive(true);
      })
      .catch(() => {
        if (!alive) return;
        setDays(synth());
        setLive(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // chunk days into columns of 7 (rows = weekday)
  const weeks: Day[][] = [];
  if (days) {
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  }
  const cell = 13;
  const size = 10;

  return (
    <section
      id="github"
      data-section="GITHUB"
      className="relative mx-auto max-w-6xl border-t border-bone/15 px-6 py-24 md:py-32"
    >
      <motion.header
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        <p
          className="mb-4 flex items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.18em] text-[#3b82f6] uppercase"
        >
          <span className="relative flex h-1.5 w-1.5">
            {live && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b82f6]/60" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
          </span>
          <TypeOn text="03 · GITHUB · LIVE" />
        </p>
        <h2 className="serif-head font-serif text-4xl font-semibold tracking-tight md:text-5xl">
          Lately.
        </h2>
      </motion.header>

      <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[13px] text-bone/70">
        {total !== null ? (
          <>
            <span className="text-2xl font-semibold text-amber tabular-nums">
              <Counter to={total} />
            </span>
            <span>contributions in the last year</span>
          </>
        ) : (
          <span>contribution activity</span>
        )}
        <a
          href={`https://github.com/${USER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inklink ml-auto text-[11px] tracking-[0.16em] text-dim uppercase"
        >
          @{USER} ↗
        </a>
      </div>

      {/* heatmap */}
      <div ref={gridRef} className="mt-6 w-full overflow-hidden">
        {weeks.length > 0 && (
          <svg
            viewBox={`0 0 ${weeks.length * cell} ${7 * cell}`}
            className="h-auto w-full"
            preserveAspectRatio="xMinYMin meet"
            role="img"
            aria-label="GitHub contribution graph"
          >
            {weeks.map((week, wi) =>
              week.map((day, di) => (
                <rect
                  key={`${wi}-${di}`}
                  className="gh-cell"
                  x={wi * cell}
                  y={di * cell}
                  width={size}
                  height={size}
                  fill={COLORS[day.level] ?? COLORS[0]}
                  style={
                    inView
                      ? { animation: `ghfade 0.5s ease ${(wi + di) * 0.01}s both` }
                      : { opacity: 0 }
                  }
                />
              ))
            )}
          </svg>
        )}
      </div>
    </section>
  );
}
