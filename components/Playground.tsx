"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import InkCanvas, { DEFAULT_INK, type InkParams } from "./InkFluid";
import ObsidianGem, { DEFAULT_GEM, GEM_PALETTES } from "./ObsidianGem";
import Lava, { DEFAULT_LAVA, type LavaParams } from "./Lava";
import Kaleido, { DEFAULT_KALEIDO, type KaleidoParams } from "./Kaleido";
import LazyVisual from "./LazyVisual";
import { fadeUp } from "@/lib/motion";

type RGB = [number, number, number];

const INK_PALETTES: { name: string; a: RGB; b: RGB; css: string }[] = [
  { name: "Amber · Teal", a: [0.91, 0.64, 0.24], b: [0.5, 0.66, 0.73], css: "linear-gradient(135deg,#E8A33D,#87a5b4)" },
  { name: "Ember", a: [0.97, 0.5, 0.16], b: [0.85, 0.18, 0.16], css: "linear-gradient(135deg,#f7a93f,#d92f28)" },
  { name: "Aurora", a: [0.36, 0.85, 0.6], b: [0.36, 0.55, 0.95], css: "linear-gradient(135deg,#5cdb98,#5d8cf2)" },
  { name: "Orchid", a: [0.86, 0.36, 0.78], b: [0.5, 0.42, 0.96], css: "linear-gradient(135deg,#db5cc7,#806bf5)" },
];

const LAVA_PALETTES: { name: string; a: RGB; b: RGB; c: RGB; css: string }[] = [
  { name: "Magma", a: [0.3, 0.08, 0.5], b: [0.88, 0.2, 0.55], c: [1.0, 0.72, 0.32], css: "linear-gradient(135deg,#7c3aed,#db2777,#f7a93f)" },
  { name: "Inferno", a: [0.35, 0.05, 0.05], b: [0.9, 0.25, 0.1], c: [1.0, 0.78, 0.3], css: "linear-gradient(135deg,#7a1e0a,#e8500f,#ffd23c)" },
  { name: "Toxic", a: [0.05, 0.3, 0.15], b: [0.3, 0.85, 0.3], c: [0.85, 1.0, 0.45], css: "linear-gradient(135deg,#0b4d2a,#36d65a,#d9ff5c)" },
  { name: "Ice", a: [0.05, 0.15, 0.4], b: [0.2, 0.55, 0.9], c: [0.75, 0.95, 1.0], css: "linear-gradient(135deg,#0b2a6b,#3a8de6,#bfeaff)" },
];

const KALEIDO_PALETTES: { name: string; a: RGB; b: RGB; c: RGB; css: string }[] = [
  { name: "Spectrum", a: [0.45, 0.2, 0.8], b: [0.18, 0.62, 0.74], c: [0.96, 0.6, 0.24], css: "linear-gradient(135deg,#7333cc,#2e9ebd,#f5993d)" },
  { name: "Reef", a: [0.1, 0.45, 0.75], b: [0.1, 0.75, 0.65], c: [0.55, 0.95, 0.85], css: "linear-gradient(135deg,#1a73bf,#19bfa6,#8cf2d9)" },
  { name: "Bloom", a: [0.65, 0.15, 0.55], b: [0.95, 0.35, 0.55], c: [1.0, 0.75, 0.45], css: "linear-gradient(135deg,#a6268c,#f25a8c,#ffbf73)" },
  { name: "Mono", a: [0.2, 0.25, 0.55], b: [0.45, 0.55, 0.85], c: [0.85, 0.9, 1.0], css: "linear-gradient(135deg,#33408c,#738cd9,#d9e6ff)" },
];

const GEM_SWATCHES = GEM_PALETTES.map((p) => ({
  name: p.name,
  css: `linear-gradient(135deg,${p.l2},${p.fire})`,
}));

// ---- shared little control widgets ----
function Swatches({
  label,
  items,
  active,
  onPick,
  right,
}: {
  label: string;
  items: { name: string; css: string }[];
  active: number;
  onPick: (i: number) => void;
  right?: ReactNode;
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
            active === i ? "ring-2 ring-amber" : "ring-1 ring-bone/20 hover:ring-bone/50"
          }`}
          style={{ background: p.css }}
        />
      ))}
      {right ? <div className="ml-auto">{right}</div> : null}
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
        className="w-full accent-amber"
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
  const inkClear = useRef<(() => void) | null>(null);
  const [inkPal, setInkPal] = useState(0);
  const [swirl, setSwirl] = useState(DEFAULT_INK.curl);
  const [linger, setLinger] = useState(DEFAULT_INK.density);
  const [inkSize, setInkSize] = useState(DEFAULT_INK.radius);
  const [glow, setGlow] = useState(DEFAULT_INK.brightness);

  // ---- obsidian gem (props → memoized component) ----
  const [gemColor, setGemColor] = useState(DEFAULT_GEM.colorIdx);
  const [gemFacets, setGemFacets] = useState(DEFAULT_GEM.facets);
  const [gemFire, setGemFire] = useState(DEFAULT_GEM.fire);
  const [gemReflect, setGemReflect] = useState(DEFAULT_GEM.reflect);
  const [gemSize, setGemSize] = useState(DEFAULT_GEM.size);

  // ---- lava (live ref → CPU sim + shader) ----
  const lavaRef = useRef<LavaParams>({ ...DEFAULT_LAVA });
  const [lavaPal, setLavaPal] = useState(0);
  const [lavaCount, setLavaCount] = useState(DEFAULT_LAVA.count);
  const [lavaFlow, setLavaFlow] = useState(DEFAULT_LAVA.flow);
  const [lavaHeat, setLavaHeat] = useState(DEFAULT_LAVA.heat);

  // ---- kaleidoscope (live ref → grab-to-turn engine) ----
  const kaleidoRef = useRef<KaleidoParams>({ ...DEFAULT_KALEIDO });
  const [kPal, setKPal] = useState(0);
  const [kSeg, setKSeg] = useState(DEFAULT_KALEIDO.seg);
  const [kSpin, setKSpin] = useState(DEFAULT_KALEIDO.autoSpin);
  const [kZoom, setKZoom] = useState(DEFAULT_KALEIDO.zoom);

  return (
    <section id="playground" data-section="PLAYGROUND" className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <motion.header
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mb-10 text-center"
      >
        <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.24em] text-amber uppercase">Playground</p>
        <h2 className="serif-head font-serif text-3xl font-semibold tracking-tight md:text-4xl">For fun.</h2>
        <p className="mx-auto mt-4 max-w-md font-sans text-[15px] leading-[1.7] text-bone/60">
          Four WebGL toys I built. Stir the ink, shove the lava, spin the stone, turn the
          kaleidoscope. Each one has its own controls.
        </p>
      </motion.header>

      <div className="grid items-start gap-x-6 gap-y-10 md:grid-cols-2">
        {/* ---- ink ---- */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <div className={`${card} bg-[#080706]`}>
            <LazyVisual className="absolute inset-0">
              <InkCanvas paramsRef={inkRef} clearRef={inkClear} />
            </LazyVisual>
            <span className={tagTL}>Stir the ink</span>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            <Swatches
              label="Color"
              items={INK_PALETTES}
              active={inkPal}
              onPick={(i) => {
                setInkPal(i);
                inkRef.current.colorA = INK_PALETTES[i].a;
                inkRef.current.colorB = INK_PALETTES[i].b;
              }}
              right={
                <button
                  type="button"
                  onClick={() => inkClear.current?.()}
                  className="font-mono text-[10px] tracking-[0.16em] text-dim uppercase transition-colors hover:text-amber"
                >
                  Clear ✕
                </button>
              }
            />
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
              <ObsidianGem colorIdx={gemColor} facets={gemFacets} fire={gemFire} reflect={gemReflect} size={gemSize} />
            </LazyVisual>
            <span className={tagTL}>Obsidian</span>
            <span className={tagBC}>Drag to turn</span>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            <Swatches label="Color" items={GEM_SWATCHES} active={gemColor} onPick={setGemColor} />
            <div className="flex gap-6">
              <Slider label="Facets" display={gemFacets} value={gemFacets} min={8} max={28} onChange={setGemFacets} />
              <Slider label="Tint" display={Math.round(gemFire * 100)} value={gemFire} min={0} max={1} step={0.02} onChange={setGemFire} />
            </div>
            <div className="flex gap-6">
              <Slider label="Reflect" display={Math.round(gemReflect * 100)} value={gemReflect} min={0} max={1} step={0.02} onChange={setGemReflect} />
              <Slider label="Size" display={Math.round(gemSize * 100)} value={gemSize} min={0.7} max={1.15} step={0.01} onChange={setGemSize} />
            </div>
          </div>
        </motion.div>

        {/* ---- lava ---- */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={2}>
          <div className={`${card} bg-[#070509]`}>
            <LazyVisual className="absolute inset-0">
              <Lava paramsRef={lavaRef} />
            </LazyVisual>
            <span className={tagTL}>Lava</span>
            <span className={tagBC}>Grab a blob, or sweep to push</span>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            <Swatches
              label="Color"
              items={LAVA_PALETTES}
              active={lavaPal}
              onPick={(i) => {
                setLavaPal(i);
                lavaRef.current.colA = LAVA_PALETTES[i].a;
                lavaRef.current.colB = LAVA_PALETTES[i].b;
                lavaRef.current.colC = LAVA_PALETTES[i].c;
              }}
            />
            <div className="flex gap-6">
              <Slider label="Blobs" display={lavaCount} value={lavaCount} min={3} max={12} onChange={(v) => { setLavaCount(v); lavaRef.current.count = v; }} />
              <Slider label="Flow" display={Math.round(lavaFlow * 100)} value={lavaFlow} min={0.3} max={2} step={0.1} onChange={(v) => { setLavaFlow(v); lavaRef.current.flow = v; }} />
            </div>
            <div className="flex gap-6">
              <Slider label="Heat" display={Math.round(lavaHeat * 100)} value={lavaHeat} min={0.5} max={1.6} step={0.05} onChange={(v) => { setLavaHeat(v); lavaRef.current.heat = v; }} />
              <span className="flex-1" />
            </div>
          </div>
        </motion.div>

        {/* ---- kaleidoscope ---- */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={3}>
          <div className={`${card} bg-[#060509]`}>
            <LazyVisual className="absolute inset-0">
              <Kaleido paramsRef={kaleidoRef} />
            </LazyVisual>
            <span className={tagTL}>Kaleidoscope</span>
            <span className={tagBC}>Grab and turn it</span>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            <Swatches
              label="Color"
              items={KALEIDO_PALETTES}
              active={kPal}
              onPick={(i) => {
                setKPal(i);
                kaleidoRef.current.colA = KALEIDO_PALETTES[i].a;
                kaleidoRef.current.colB = KALEIDO_PALETTES[i].b;
                kaleidoRef.current.colC = KALEIDO_PALETTES[i].c;
              }}
            />
            <div className="flex gap-6">
              <Slider label="Segments" display={kSeg} value={kSeg} min={3} max={16} onChange={(v) => { setKSeg(v); kaleidoRef.current.seg = v; }} />
              <Slider label="Spin" display={Math.round(kSpin * 100)} value={kSpin} min={0} max={1} step={0.05} onChange={(v) => { setKSpin(v); kaleidoRef.current.autoSpin = v; }} />
            </div>
            <div className="flex gap-6">
              <Slider label="Zoom" display={Math.round(kZoom * 100)} value={kZoom} min={0.5} max={2} step={0.05} onChange={(v) => { setKZoom(v); kaleidoRef.current.zoom = v; }} />
              <span className="flex-1" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
