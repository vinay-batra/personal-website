"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { fadeUp } from "@/lib/motion";

const AboutGraphic = dynamic(() => import("./visuals/AboutGraphic"), { ssr: false });

const VIEWPORT = { once: true, margin: "-80px" } as const;

export default function About() {
  return (
    <section
      id="about"
      data-section="ABOUT"
      className="relative mx-auto max-w-6xl px-6 py-20 md:py-28"
    >
      <div className="grid items-center gap-10 md:grid-cols-[5fr_7fr] lg:gap-16">
        {/* LEFT — heading with the bio grouped right under it */}
        <div>
          <SectionHeading
            index="01"
            eyebrow="ABOUT"
            accent="#E8A33D"
            lines={["A bit", "about me."]}
          />
          <div className="mt-8 font-sans text-[16px] leading-[1.7] text-bone/80 md:text-[17px]">
            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={0}
            >
              I&rsquo;m a student at Council Rock High School South. I build
              software, usually because I wanted something to exist and it
              didn&rsquo;t yet.
            </motion.p>
            <motion.p
              className="mt-4"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={VIEWPORT}
              custom={1}
            >
              Outside of that I lead a few clubs, volunteer around my community,
              and read a lot. Hover the map to see what I&rsquo;m into.
            </motion.p>
          </div>
        </div>

        {/* RIGHT — the big interactive map, centered against the left block */}
        <motion.div
          variants={{
            hidden: { opacity: 0, x: 40 },
            show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
          }}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          className="relative min-h-[420px] overflow-hidden border border-amber/20 md:min-h-[480px]"
          style={{
            background: "linear-gradient(180deg, rgba(232,163,61,0.06), transparent 72%)",
          }}
        >
          <AboutGraphic />
        </motion.div>
      </div>
    </section>
  );
}
