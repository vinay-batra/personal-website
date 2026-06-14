"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import InkCanvas, { DEFAULT_INK, type InkParams } from "./InkFluid";
import ObsidianGem from "./ObsidianGem";
import { fadeUp } from "@/lib/motion";

type RGB = [number, number, number];
const PALETTES: { name: string; a: RGB; b: RGB; css: string }[] = [
  { name: "Amber · Teal", a: [0.91, 0.64, 0.24], b: [0.5, 0.66, 0.73], css: "linear-gradient(135deg,#E8A33D,#87a5b4)" },
  { name: "Ember", a: [0.97, 0.5, 0.16], b: [0.85, 0.18, 0.16], css: "linear-gradient(135deg,#f7a93f,#d92f28)" },
  { name: "Aurora", a: [0.36, 0.85, 0.6], b: [0.36, 0.55, 0.95], css: "linear-gradient(135deg,#5cdb98,#5d8cf2)" },
  { name: "Orchid", a: [0.86, 0.36, 0.78], b: [0.5, 0.42, 0.96], css: "linear-gradient(135deg,#db5cc7,#806bf5)" },
];

export default function Playground() {
  const paramsRef = useRef<InkParams>({ ...DEFAULT_INK });
  const clearRef = useRef<(() => void) | null>(null);
  const [pal, setPal] = useState(0);
  const [swirl, setSwirl] = useState(DEFAULT_INK.curl);
  const [linger, setLinger] = useState(DEFAULT_INK.density);

  const pickPalette = (i: number) => {
    setPal(i);
    paramsRef.current.colorA = PALETTES[i].a;
    paramsRef.current.colorB = PALETTES[i].b;
  };
  const onSwirl = (v: number) => {
    setSwirl(v);
    paramsRef.current.curl = v;
  };
  const onLinger = (v: number) => {
    setLinger(v);
    paramsRef.current.density = v;
  };

  return (
    <section
      id="playground"
      data-section="PLAYGROUND"
      className="relative mx-auto max-w-6xl px-6 py-24 md:py-32"
    >
      <motion.header
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mb-10 text-center"
      >
        <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.24em] text-amber uppercase">
          Playground
        </p>
        <h2 className="serif-head font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          For fun.
        </h2>
        <p className="mx-auto mt-4 max-w-md font-sans text-[15px] leading-[1.7] text-bone/60">
          A couple of WebGL toys I built. Stir the ink, spin the stone.
        </p>
      </motion.header>

      <div className="grid items-start gap-6 md:grid-cols-2">
        {/* ---- ink toy ---- */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <div className="relative h-[340px] overflow-hidden rounded-2xl border border-bone/10 bg-[#080706] shadow-[inset_0_1px_0_rgba(237,228,211,0.05),0_30px_70px_-40px_rgba(0,0,0,0.85)] md:h-[380px]">
            <InkCanvas paramsRef={paramsRef} clearRef={clearRef} />
            <span className="pointer-events-none absolute left-4 top-3.5 font-mono text-[10px] tracking-[0.2em] text-bone/45 uppercase">
              Stir the ink
            </span>
          </div>

          {/* controls */}
          <div className="mt-4 flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] tracking-[0.16em] text-dim uppercase">Color</span>
              {PALETTES.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => pickPalette(i)}
                  aria-label={p.name}
                  title={p.name}
                  className={`h-6 w-6 rounded-full transition ${
                    pal === i ? "ring-2 ring-amber" : "ring-1 ring-bone/20 hover:ring-bone/50"
                  }`}
                  style={{ background: p.css }}
                />
              ))}
              <button
                type="button"
                onClick={() => clearRef.current?.()}
                className="ml-auto font-mono text-[10px] tracking-[0.16em] text-dim uppercase transition-colors hover:text-amber"
              >
                Clear ✕
              </button>
            </div>
            <div className="flex gap-6">
              <label className="flex-1">
                <span className="mb-1.5 flex justify-between font-mono text-[10px] tracking-[0.16em] text-dim uppercase">
                  <span>Swirl</span>
                  <span className="tabular-nums text-bone/45">{swirl}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={swirl}
                  onChange={(e) => onSwirl(+e.target.value)}
                  className="w-full accent-amber"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1.5 flex justify-between font-mono text-[10px] tracking-[0.16em] text-dim uppercase">
                  <span>Linger</span>
                  <span className="tabular-nums text-bone/45">{Math.round((linger - 0.9) * 1000)}</span>
                </span>
                <input
                  type="range"
                  min={0.9}
                  max={0.995}
                  step={0.005}
                  value={linger}
                  onChange={(e) => onLinger(+e.target.value)}
                  className="w-full accent-amber"
                />
              </label>
            </div>
          </div>
        </motion.div>

        {/* ---- obsidian gem ---- */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          custom={1}
        >
          <div className="relative h-[340px] overflow-hidden rounded-2xl border border-bone/10 bg-[#0a0908]/70 shadow-[inset_0_1px_0_rgba(237,228,211,0.05),0_30px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur-sm md:h-[380px]">
            <ObsidianGem />
            <span className="pointer-events-none absolute left-4 top-3.5 font-mono text-[10px] tracking-[0.2em] text-bone/45 uppercase">
              Obsidian
            </span>
            <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
              Drag to turn
            </span>
          </div>
          <p className="mt-4 font-sans text-[13px] leading-[1.6] text-bone/55">
            A faceted crystal that refracts the light behind it — real-time
            transmission, chromatic split, amber fire inside.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
