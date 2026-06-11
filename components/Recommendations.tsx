"use client";

import { Fragment, useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { EASE } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

type Quote = {
  cellRef: string;
  text: string;
  name: string;
  title: string;
  align: "left" | "right";
};

const QUOTES: Quote[] = [
  {
    cellRef: "R1",
    text: "Vinay demonstrated a strong combination of curiosity, technical ability, and initiative. He was quick to grasp complex concepts, translate them into practical solutions, and continuously iterate to improve model performance. I'm confident he will continue to do excellent work at the intersection of finance and AI.",
    name: "Anushka Goyal",
    title: "Director of Programs, BetterMind Labs",
    align: "left",
  },
  {
    cellRef: "R2",
    text: "Vinay has dedicated his free time to our community by writing monthly book reviews for our young adult patrons. He has shown consistency and dependability, and challenged himself by reviewing different genres to reach a broader audience. I would strongly recommend Vinay Batra without hesitation.",
    name: "Susan Elko",
    title: "Reference Librarian, Free Library of Northampton Twp",
    align: "right",
  },
];

/** Tracks the <768px breakpoint via matchMedia (false during SSR). */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

const BODY_CLASS =
  "font-serif italic font-normal text-[clamp(1.4rem,2.8vw,2.25rem)] leading-[1.35] text-bone";

function PullQuote({ quote, simple }: { quote: Quote; simple: boolean }) {
  const reduced = useReducedMotionSafe();
  const words = quote.text.split(" ");

  return (
    <figure
      className={`relative max-w-3xl ${quote.align === "right" ? "ml-auto" : ""}`}
    >
      {/* spreadsheet cell ref, etched */}
      <span
        aria-hidden
        className="absolute -top-7 left-0 font-mono text-[9px] text-dim/50"
      >
        {quote.cellRef}
      </span>

      {/* oversized hanging quotation mark */}
      <motion.span
        aria-hidden
        className="block h-[0.55em] overflow-visible font-serif text-[120px] leading-none text-amber/90 md:text-[140px]"
        style={{ transformOrigin: "bottom left" }}
        initial={
          reduced ? { opacity: 0 } : { opacity: 0, rotate: -8, scale: 0.6 }
        }
        whileInView={
          reduced ? { opacity: 0.9 } : { opacity: 0.9, rotate: 0, scale: 1 }
        }
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        &ldquo;
      </motion.span>

      {simple ? (
        <motion.blockquote
          className={BODY_CLASS}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {quote.text}
        </motion.blockquote>
      ) : (
        <blockquote className={BODY_CLASS}>
          {words.map((word, i) => (
            <Fragment key={i}>
              <motion.span
                className="inline-block"
                initial={{ opacity: 0.08 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.018, ease: EASE }}
              >
                {word}
              </motion.span>{" "}
            </Fragment>
          ))}
        </blockquote>
      )}

      {/* mono ledger attribution */}
      <figcaption className="mt-8 flex max-w-md items-baseline">
        <span className="font-mono text-[12px] tracking-[0.15em] text-bone uppercase">
          {quote.name}
        </span>
        <span className="dotlead" aria-hidden />
        <span className="text-right font-mono text-[11px] text-dim uppercase">
          {quote.title}
        </span>
      </figcaption>
    </figure>
  );
}

export default function Recommendations() {
  const isMobile = useIsMobile();
  const reduced = useReducedMotionSafe();
  const simple = isMobile || reduced;

  return (
    <section
      id="words"
      data-section="WORDS"
      className="relative mx-auto max-w-6xl px-6 py-28 md:py-40"
    >
      <SectionHeading
        index="05"
        eyebrow="RECOMMENDATIONS"
        accent="#8b5cf6"
        lines={["What people", "say."]}
      />

      <div className="mt-20 space-y-28">
        {QUOTES.map((quote) => (
          <PullQuote key={quote.cellRef} quote={quote} simple={simple} />
        ))}
      </div>
    </section>
  );
}
