"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useScroll, type Variants } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { EASE } from "@/lib/motion";

// Each product lists the stack it actually runs on (Corvo is the only one with a
// separate Python service, so it's the only one tagged FastAPI/Python).
const CORVO_STACK = ["Next.js", "TypeScript", "FastAPI", "Python", "Supabase", "Claude API"];
const FBLA_STACK = ["Next.js", "TypeScript", "Supabase", "Claude API"];
const MORECO_STACK = ["Next.js", "TypeScript", "Tailwind CSS", "Supabase", "Resend", "Claude API"];
const LARK_STACK = ["Next.js", "TypeScript", "Web Audio API", "Supabase", "Claude API"];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const CorvoChart = dynamic(() => import("./visuals/CorvoChart"), { ssr: false });
const LarkStrings = dynamic(() => import("./visuals/LarkStrings"), { ssr: false });
const FblaDashboard = dynamic(() => import("./visuals/FblaDashboard"), { ssr: false });
const MorecoUnits = dynamic(() => import("./visuals/MorecoUnits"), { ssr: false });

type Project = {
  index: string;
  name: string;
  mandate: string;
  status: string;
  brand: string; // accent color for this block
  desc: string;
  features: string[];
  tags: string[];
  links: { label: string; href: string; primary?: boolean }[];
  preview?: { src: string; href: string };
  kind: "corvo" | "lark" | "fbla" | "moreco";
};

const PROJECTS: Project[] = [
  {
    index: "01",
    name: "Corvo",
    mandate: "Portfolio intelligence platform",
    status: "LIVE · PRODUCT HUNT",
    brand: "#dfe7ee",
    desc: "Institutional-grade portfolio analytics, free. Corvo watches your holdings daily, flags the real risks, and tells you what to do, using Monte Carlo simulation, deep risk analytics, and an AI advisor that knows your exact portfolio. Built to show how a portfolio behaves under uncertainty, not to predict the market.",
    features: [
      "Monte Carlo simulation, 10,000 paths",
      "Value at Risk, volatility, drawdown",
      "Correlation + S&P 500 benchmarking",
      "AI advisor on your holdings",
      "What-if testing, alerts, PDF reports",
    ],
    tags: CORVO_STACK,
    links: [
      { label: "Visit corvo.capital", href: "https://corvo.capital", primary: true },
    ],
    preview: { src: "/corvo-preview.png", href: "https://corvo.capital" },
    kind: "corvo",
  },
  {
    index: "02",
    name: "FBLA One",
    mandate: "All-in-one platform for FBLA chapters",
    status: "LIVE",
    brand: "#dfe7ee",
    desc: "A complete operating system for FBLA chapters. FBLA One generates unlimited AI practice tests calibrated to each event's exact topic outline, with a full explanation for every question, and brings study guides, prep tracking, and an advisor dashboard into one place. Built for my own chapter and live for any of the 230,000+ FBLA members nationally.",
    features: [
      "Unlimited AI practice tests",
      "Guaranteed-correct numeric answers",
      "55 competition study guides",
      "Advisor dashboard + leaderboard",
      "Weak-topic drills, Road to Nationals",
    ],
    tags: FBLA_STACK,
    links: [{ label: "Visit fbla.one", href: "https://fbla.one", primary: true }],
    preview: { src: "/fbla-preview.png", href: "https://fbla.one" },
    kind: "fbla",
  },
  {
    index: "03",
    name: "Moreco Properties",
    mandate: "Rental listings site for a local property manager",
    status: "LIVE",
    brand: "#dfe7ee",
    desc: "Moreco Properties needed a real website instead of word of mouth and paper flyers. I built the family's first site: live unit availability, an AI chat that answers renter questions, and one form that handles both rental inquiries and maintenance requests. It was my first time building for someone else's business instead of my own. Next up: a private finance dashboard so the owner can track rent and bills in one place.",
    features: [
      "Live unit availability",
      "AI chat for renter questions",
      "Unified inquiry + maintenance form",
      "Owner finance dashboard (in progress)",
    ],
    tags: MORECO_STACK,
    links: [
      { label: "Visit morecoproperties.com", href: "https://morecoproperties.com", primary: true },
    ],
    preview: { src: "/moreco-preview.png", href: "https://morecoproperties.com" },
    kind: "moreco",
  },
  {
    index: "04",
    name: "Lark",
    mandate: "AI guitar coach",
    status: "LIVE",
    brand: "#dfe7ee",
    desc: "An AI guitar tutor that actually listens. Lark hears you play through your mic, scores you in real time, and coaches you on your accuracy and timing, with 83 real songs, a structured curriculum, a slow-it-down practice mode, and on-demand AI tab generation.",
    features: [
      "Real-time pitch + chord detection",
      "Note-by-note scoring across 83 songs",
      "6-stage structured curriculum",
      "AI coach on accuracy and timing",
      "Tuner, metronome, chord library",
    ],
    tags: LARK_STACK,
    links: [{ label: "Visit lark.coach", href: "https://lark.coach", primary: true }],
    preview: { src: "/lark-preview.png", href: "https://lark.coach" },
    kind: "lark",
  },
];

const VISUALS = { corvo: CorvoChart, lark: LarkStrings, fbla: FblaDashboard, moreco: MorecoUnits };

function ProjectBlock({ project, flip }: { project: Project; flip: boolean }) {
  const ref = useRef<HTMLElement>(null);
  // builds the visual as the block scrolls from entering to roughly centered
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "center 0.42"],
  });
  const Visual = VISUALS[project.kind];

  const text = (
    <motion.div variants={container} className={flip ? "md:order-2" : ""}>
      <motion.div variants={item} className="flex items-center gap-3">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: project.brand }}
        />
        <span className="font-mono text-[11px] tabular-nums" style={{ color: project.brand }}>
          {project.index}
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-dim uppercase">
          {project.status}
        </span>
      </motion.div>
      <motion.h3
        variants={item}
        className="serif-head mt-3 font-serif text-4xl leading-none font-semibold md:text-5xl"
      >
        {project.name}
      </motion.h3>
      <motion.p
        variants={item}
        className="mt-2 font-mono text-[11px] tracking-[0.12em] text-bone/70 uppercase"
      >
        {project.mandate}
      </motion.p>
      <motion.p
        variants={item}
        className="mt-5 max-w-xl font-sans text-[16px] leading-[1.7] text-bone/75"
      >
        {project.desc}
      </motion.p>
      <motion.ul variants={container} className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {project.features.map((f) => (
          <motion.li
            key={f}
            variants={item}
            className="flex items-baseline gap-2 font-sans text-[14px] text-bone/60"
          >
            <span style={{ color: project.brand }}>▹</span>
            {f}
          </motion.li>
        ))}
      </motion.ul>
      <motion.div variants={item} className="mt-7">
        <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
          Built with
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {project.tags.map((t) => (
            <span
              key={t}
              className="border px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase"
              style={{ borderColor: `${project.brand}40`, color: "var(--bone, #EDE4D3)" }}
            >
              {t}
            </span>
          ))}
        </div>
      </motion.div>
      <motion.div variants={item} className="mt-7 flex flex-wrap gap-7">
        {project.links.map((l) =>
          l.primary ? (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
              style={{ color: project.brand }}
            >
              → {l.label}
            </a>
          ) : (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inklink font-mono text-[11px] tracking-[0.18em] text-dim uppercase"
            >
              {l.label}
            </a>
          )
        )}
      </motion.div>
    </motion.div>
  );

  const cardSlide = {
    hidden: { opacity: 0, x: flip ? -50 : 50 },
    show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
  };

  const visual = (
    <div className={`flex flex-col gap-5 ${flip ? "md:order-1" : ""}`}>
      <motion.div
        variants={cardSlide}
        className="relative min-h-[260px] overflow-hidden border border-[var(--brand)]/25 transition-[box-shadow,border-color,transform] duration-500 group-hover:-translate-y-1 group-hover:border-[var(--brand)]/60 group-hover:[box-shadow:0_0_60px_-18px_var(--brand)] md:min-h-[340px]"
        style={{ background: `linear-gradient(180deg, ${project.brand}14, transparent 72%)` }}
      >
        <Visual progress={scrollYProgress} />
      </motion.div>

      {/* live website preview — same size as the graphic, opens the site */}
      {project.preview && (
        <motion.a
          variants={{
            hidden: { opacity: 0, x: flip ? -50 : 50 },
            show: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.12, ease: EASE } },
          }}
          href={project.preview.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${project.name} website`}
          className="group/prev relative block min-h-[260px] overflow-hidden border border-[var(--brand)]/25 transition-[box-shadow,border-color,transform] duration-500 hover:-translate-y-1 hover:border-[var(--brand)]/60 hover:[box-shadow:0_0_60px_-18px_var(--brand)] md:min-h-[340px]"
        >
          <Image
            src={project.preview.src}
            alt={`${project.name} website`}
            fill
            sizes="(max-width: 768px) 100vw, 520px"
            className="object-cover object-top transition-transform duration-[1.2s] ease-out group-hover/prev:scale-[1.05]"
          />
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-ink via-ink/70 to-transparent px-4 pb-3 pt-12 font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: project.brand }}
          >
            <span>Live preview</span>
            <span aria-hidden>{project.preview.href.replace("https://", "")} ↗</span>
          </span>
        </motion.a>
      )}
    </div>
  );

  return (
    <motion.article
      ref={ref}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-120px" }}
      style={{ ["--brand" as string]: project.brand } as React.CSSProperties}
      className="group grid items-start gap-8 border-t border-bone/20 py-12 md:grid-cols-2 md:gap-14 md:py-20"
    >
      {text}
      {visual}
    </motion.article>
  );
}

export default function Projects() {
  return (
    <section
      id="work"
      data-section="WORK"
      className="relative mx-auto max-w-6xl px-6 pt-28 pb-24 md:pt-40 md:pb-32"
    >
      <SectionHeading
        index="02"
        eyebrow="WORK"
        accent="#dfe7ee"
        lines={["What I've", "built."]}
      />
      <div className="mt-14">
        {PROJECTS.map((p, i) => (
          <ProjectBlock key={p.name} project={p} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
