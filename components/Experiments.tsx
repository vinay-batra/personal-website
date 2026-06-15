"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import AlgoVisualizer from "./visuals/AlgoVisualizer";
import RayTracer from "./visuals/RayTracer";
import NeuralNet from "./visuals/NeuralNet";
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
  {
    name: "Ray tracer",
    tag: "Graphics · reflections + shadows",
    blurb:
      "A renderer built from nothing: every pixel casts a ray that bounces off spheres and a floor with real reflections, shadows, and specular highlights. Drag to orbit the scene.",
    node: <RayTracer />,
  },
  {
    name: "Neural network",
    tag: "Machine learning · hand-written backprop",
    blurb:
      "A small neural net with no libraries, its forward pass and backpropagation written by hand. It trains live to separate a non-linear dataset, and the background is its decision boundary learning in real time.",
    node: <NeuralNet />,
  },
];

/**
 * A subsection of Work (no data-section, so it is not its own chapter on the
 * spine): from-scratch CS demos that run live in the browser.
 */
export default function Experiments() {
  return (
    <section id="experiments" className="relative mx-auto -mt-6 max-w-6xl px-6 pb-24 md:-mt-10 md:pb-32">
      <motion.header
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mb-8 border-t border-bone/12 pt-10"
      >
        <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.24em] text-bone/70 uppercase">
          From scratch
        </p>
        <p className="max-w-lg font-sans text-[15px] leading-[1.7] text-bone/60">
          Classic computer science, rebuilt from the ground up and running live in your
          browser, no libraries doing the hard part.
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
              <p className="font-mono text-[10px] tracking-[0.14em] text-bone/55 uppercase">
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
