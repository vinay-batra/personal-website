"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { fadeUp } from "@/lib/motion";

type Channel = {
  label: string;
  value: string;
  href: string;
  external: boolean;
  accent: boolean;
  note?: string;
};

const CHANNELS: Channel[] = [
  // the work — live products, in amber
  {
    label: "CORVO",
    value: "CORVO.CAPITAL",
    href: "https://corvo.capital",
    external: true,
    accent: true,
  },
  {
    label: "LARK",
    value: "LARK.COACH",
    href: "https://lark.coach",
    external: true,
    accent: true,
  },
  {
    label: "FBLA ONE",
    value: "FBLA.ONE",
    href: "https://fbla.one",
    external: true,
    accent: true,
  },
  // find me
  {
    label: "GITHUB",
    value: "@VINAY-BATRA",
    href: "https://github.com/vinay-batra",
    external: true,
    accent: false,
    note: "3.2K commits",
  },
  {
    label: "LINKEDIN",
    value: "/IN/VINAY-BATRA",
    href: "https://www.linkedin.com/in/vinay-batra",
    external: true,
    accent: false,
    note: "2.3K followers · 2.3K connections",
  },
  {
    label: "EMAIL",
    value: "VINAYBATRA2010@GMAIL.COM",
    href: "mailto:vinaybatra2010@gmail.com",
    external: false,
    accent: false,
  },
];

export default function Contact() {
  return (
    <section id="contact" data-section="CONTACT" className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-28 md:pt-44 pb-20">
        <SectionHeading index="06" eyebrow="CONTACT" lines={["Get in", "touch."]} />

        <motion.p
          className="mt-8 max-w-md font-sans text-[16px] leading-[1.7] text-bone/70"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          Want to talk about a project, an idea, or anything I&rsquo;m working on?
          The fastest way to reach me is email.
        </motion.p>

        {/* ---------- links ---------- */}
        <div className="mt-12 max-w-2xl">
          {CHANNELS.map((c, i) => (
            <motion.a
              key={c.label}
              href={c.href}
              {...(c.external ? { target: "_blank", rel: "noopener" } : {})}
              className="group flex items-baseline border-b border-bone/12 py-5 outline-amber focus-visible:outline"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              custom={i}
            >
              <span className="font-mono text-[11px] tracking-[0.18em] text-dim uppercase">
                {c.label}
              </span>
              <span className="dotlead" aria-hidden />
              <span className="flex flex-col items-end leading-tight">
                <span
                  className={`font-mono text-[13px] tracking-wide uppercase ${
                    c.accent ? "text-amber" : "text-bone"
                  }`}
                >
                  {c.value}
                </span>
                {c.note && (
                  <span className="mt-1 font-mono text-[9px] tracking-[0.1em] text-dim uppercase">
                    {c.note}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className="ml-3 font-mono text-[11px] text-up opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                &rarr; OPEN
              </span>
            </motion.a>
          ))}
        </div>

      </div>
    </section>
  );
}
