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
      "Four pathfinding algorithms, all written from scratch. Pick one and press Run to watch it search for the shortest route between the two dots. Drag across the grid to draw walls, drag the dots to move the start and goal, or press Maze for a random layout.",
    node: <AlgoVisualizer />,
  },
  {
    name: "Ray tracer",
    tag: "Graphics · reflections + shadows",
    blurb:
      "A 3D renderer built from nothing: every pixel shoots a ray that bounces off the spheres and the floor, with real reflections, shadows, and highlights. Drag the scene to orbit around it.",
    node: <RayTracer />,
  },
  {
    name: "Neural network",
    tag: "Machine learning · hand-written backprop",
    blurb:
      "A neural network with no libraries, the learning math written by hand. It teaches itself to tell the teal dots from the pink ones, and the glowing line is the boundary it has found. Pick a built-in pattern, or draw your own dots, and watch it relearn live.",
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
          browser, no libraries doing the hard part. Each one is interactive, so dig in and play.
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
