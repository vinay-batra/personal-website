"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import AlgoVisualizer from "./visuals/AlgoVisualizer";
import { fadeUp } from "@/lib/motion";

interface Item {
  name: string;
  tag: string;
  blurb: string;
  node: ReactNode;
}

const ITEMS: Item[] = [
  {
    name: "Pathfinding visualizer",
    tag: "Graphs · BFS / DFS / Dijkstra / A*",
    blurb:
      "Four search algorithms written from scratch. Draw walls, drag the endpoints, and watch each one explore the grid then trace its path.",
    node: <AlgoVisualizer />,
  },
];

export default function Experiments() {
  return (
    <section
      id="experiments"
      data-section="EXPERIMENTS"
      className="relative mx-auto max-w-6xl px-6 py-24 md:py-32"
    >
      <motion.header
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mb-10"
      >
        <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.24em] text-amber uppercase">
          From scratch
        </p>
        <h2 className="serif-head font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Built from nothing.
        </h2>
        <p className="mt-4 max-w-lg font-sans text-[15px] leading-[1.7] text-bone/60">
          Classic computer science, rebuilt from the ground up and running live in your
          browser — no libraries doing the hard part.
        </p>
      </motion.header>

      <div className="space-y-8">
        {ITEMS.map((it) => (
          <motion.div
            key={it.name}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="rounded-2xl border border-bone/10 bg-[#0a0908]/50 p-5 md:p-6"
          >
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-serif text-xl font-semibold">{it.name}</h3>
              <p className="font-mono text-[10px] tracking-[0.14em] text-amber/80 uppercase">
                {it.tag}
              </p>
            </div>
            <p className="mb-5 max-w-2xl font-sans text-[14px] leading-[1.6] text-bone/60">
              {it.blurb}
            </p>
            {it.node}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
