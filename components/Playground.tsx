"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import InkCanvas, { DEFAULT_INK, type InkParams } from "./InkFluid";
import ObsidianGem, { DEFAULT_GEM, GEM_PALETTES } from "./ObsidianGem";
import LazyVisual from "./LazyVisual";
import { fadeUp } from "@/lib/motion";

type RGB = [number, number, number];
const ACCENT = "#ec4899"; // the Playground (pink) section accent

const INK_PALETTES: { name: string; a: RGB; b: RGB; css: string }[] = [
  { name: "Amber · Teal", a: [0.91, 0.64, 0.24], b: [0.5, 0.66, 0.73], css: "linear-gradient(135deg,#E8A33D,#87a5b4)" },
  { name: "Ember", a: [0.97, 0.5, 0.16], b: [0.85, 0.18, 0.16], css: "linear-gradient(135deg,#f7a93f,#d92f28)" },
  { name: "Aurora", a: [0.36, 0.85, 0.6], b: [0.36, 0.55, 0.95], css: "linear-gradient(135deg,#5cdb98,#5d8cf2)" },
  { name: "Orchid", a: [0.86, 0.36, 0.78], b: [0.5, 0.42, 0.96], css: "linear-gradient(135deg,#db5cc7,#806bf5)" },
];
const RAINBOW_CSS =
  "conic-gradient(from 140deg,#ff5d5d,#ffb24d,#ffe84d,#5dff8f,#4dd2ff,#7a5cff,#e85cff,#ff5d5d)";

const GEM_SWATCHES = GEM_PALETTES.map((p) => ({
  name: p.name,
  css: `linear-gradient(135deg,${p.l2},${p.fire})`,
}));

// ---- shared little control widgets (Playground-pink accent) ----
function Swatches({
  label,
  items,
  active,
  onPick,
}: {
  label: string;
  items: { name: string; css: string }[];
  active: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] tracking-[0.16em] text-dim uppercase">{label}</span>
      {items.map((p, i) => (
        <button
          key={p.name}
          type="button"
          onClick={() => onPick(i)}
          aria-label={p.name}
          title={p.name}
          className={`h-6 w-6 rounded-full transition ${
            active === i ? "ring-2 ring-[#ec4899]" : "ring-1 ring-bone/20 hover:ring-bone/50"
          }`}
          style={{ background: p.css }}
        />
      ))}
    </div>
  );
}

function Slider({
  label,
  display,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  display: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex-1">
      <span className="mb-1.5 flex justify-between font-mono text-[10px] tracking-[0.16em] text-dim uppercase">
        <span>{label}</span>
        <span className="tabular-nums text-bone/45">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full"
        style={{ accentColor: ACCENT }}
      />
    </label>
  );
}

const card =
  "relative h-[340px] overflow-hidden rounded-2xl border border-bone/10 shadow-[inset_0_1px_0_rgba(237,228,211,0.05),0_30px_70px_-40px_rgba(0,0,0,0.85)] md:h-[380px]";
const tagTL =
  "pointer-events-none absolute left-4 top-3.5 font-mono text-[10px] tracking-[0.2em] text-bone/45 uppercase";
const tagBC =
  "pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase";

export default function Playground() {
  // ---- ink ----
  const inkRef = useRef<InkParams>({ ...DEFAULT_INK });
  const [inkPal, setInkPal] = useState(0);
  const [rainbow, setRainbow] = useState(DEFAULT_INK.rainbow);
  const [swirl, setSwirl] = useState(DEFAULT_INK.curl);
  const [linger, setLinger] = useState(DEFAULT_INK.density);
  const [inkSize, setInkSize] = useState(DEFAULT_INK.radius);
  const [glow, setGlow] = useState(DEFAULT_INK.brightness);

  // ---- obsidian gem (props → memoized component) ----
  const [gemColor, setGemColor] = useState(DEFAULT_GEM.colorIdx);
  const [gemFacets, setGemFacets] = useState(DEFAULT_GEM.facets);
  const [gemFire, setGemFire] = useState(DEFAULT_GEM.fire);
  const [gemReflect, setGemReflect] = useState(DEFAULT_GEM.reflect);

  const pickPalette = (i: number) => {
    setInkPal(i);
    setRainbow(false);
    inkRef.current.rainbow = false;
    inkRef.current.colorA = INK_PALETTES[i].a;
    inkRef.current.colorB = INK_PALETTES[i].b;
  };
  const pickRainbow = () => {
    setRainbow(true);
    inkRef.current.rainbow = true;
  };

  return (
    <section id="playground" data-section="PLAYGROUND" className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <motion.header
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mb-10 text-center"
      >
        <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.24em] text-[#ec4899] uppercase">08 · Playground</p>
        <h2 className="serif-head font-serif text-3xl font-semibold tracking-tight md:text-4xl">For fun.</h2>
        <p className="mx-auto mt-4 max-w-md font-sans text-[15px] leading-[1.7] text-bone/60">
          A couple of WebGL toys I built from scratch: a fluid ink sim and a refracting gem. Move your
          cursor over each one to play with it, and use the controls to change how it looks.
        </p>
      </motion.header>

      <div className="grid items-start gap-x-6 gap-y-10 md:grid-cols-2">
        {/* ---- ink ---- */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <div className={`${card} bg-[#080706]`}>
            <LazyVisual className="absolute inset-0">
              <InkCanvas paramsRef={inkRef} />
            </LazyVisual>
            <span className={tagTL}>Ink</span>
            <span className={tagBC}>Move your cursor to stir it</span>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] tracking-[0.16em] text-dim uppercase">Color</span>
              <button
                type="button"
                onClick={pickRainbow}
                aria-label="Rainbow"
                title="Rainbow (auto-cycling colors)"
                className={`h-6 w-6 rounded-full transition ${
                  rainbow ? "ring-2 ring-[#ec4899]" : "ring-1 ring-bone/20 hover:ring-bone/50"
                }`}
                style={{ background: RAINBOW_CSS }}
              />
              {INK_PALETTES.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => pickPalette(i)}
                  aria-label={p.name}
                  title={p.name}
                  className={`h-6 w-6 rounded-full transition ${
                    !rainbow && inkPal === i ? "ring-2 ring-[#ec4899]" : "ring-1 ring-bone/20 hover:ring-bone/50"
                  }`}
                  style={{ background: p.css }}
                />
              ))}
            </div>
            <div className="flex gap-6">
              <Slider label="Swirl" display={swirl} value={swirl} min={0} max={50} onChange={(v) => { setSwirl(v); inkRef.current.curl = v; }} />
              <Slider label="Linger" display={Math.round((linger - 0.9) * 1000)} value={linger} min={0.9} max={0.995} step={0.005} onChange={(v) => { setLinger(v); inkRef.current.density = v; }} />
            </div>
            <div className="flex gap-6">
              <Slider label="Size" display={Math.round(inkSize * 100)} value={inkSize} min={0.05} max={0.5} step={0.01} onChange={(v) => { setInkSize(v); inkRef.current.radius = v; }} />
              <Slider label="Glow" display={Math.round(glow * 100)} value={glow} min={0.08} max={0.5} step={0.01} onChange={(v) => { setGlow(v); inkRef.current.brightness = v; }} />
            </div>
          </div>
        </motion.div>

        {/* ---- obsidian gem ---- */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={1}>
          <div className={`${card} bg-[#0a0908]/70 backdrop-blur-sm`}>
            <LazyVisual className="absolute inset-0">
              <ObsidianGem colorIdx={gemColor} facets={gemFacets} fire={gemFire} reflect={gemReflect} />
            </LazyVisual>
            <span className={tagTL}>Obsidian</span>
            <span className={tagBC}>Drag to turn it</span>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            <Swatches label="Color" items={GEM_SWATCHES} active={gemColor} onPick={setGemColor} />
            <div className="flex gap-6">
              <Slider label="Facets" display={gemFacets} value={gemFacets} min={8} max={28} onChange={setGemFacets} />
              <Slider label="Tint" display={Math.round(gemFire * 100)} value={gemFire} min={0} max={1} step={0.02} onChange={setGemFire} />
            </div>
            <div className="flex gap-6">
              <Slider label="Reflect" display={Math.round(gemReflect * 100)} value={gemReflect} min={0} max={1} step={0.02} onChange={setGemReflect} />
              <span className="flex-1" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
