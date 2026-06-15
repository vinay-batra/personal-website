"use client";

import { useEffect, useState } from "react";
import { useLenis } from "lenis/react";

const LINKS: [string, string, string][] = [
  ["01", "ABOUT", "#about"],
  ["02", "WORK", "#work"],
  ["03", "LATELY", "#github"],
  ["04", "LEAD", "#leadership"],
  ["05", "SERVE", "#community"],
  ["06", "WORDS", "#words"],
  ["07", "CONTACT", "#contact"],
  ["08", "PLAY", "#playground"],
];

export default function TopBar() {
  const lenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // light up the nav item for the section currently in view
  useEffect(() => {
    const els = LINKS.map(([, , href]) => document.getElementById(href.slice(1))).filter(
      (el): el is HTMLElement => !!el
    );
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(`#${e.target.id}`);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    lenis?.scrollTo(href, { offset: -56, duration: 1.4 });
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-bone/12 bg-ink/85 backdrop-blur-sm" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            lenis?.scrollTo(0, { duration: 1.4 });
          }}
          className="flex items-center"
          aria-label="Back to top"
        >
          <span className="font-mono text-[11px] font-medium tracking-[0.22em] text-bone uppercase">
            Vinay Batra
          </span>
        </a>

        <div className="hidden items-center gap-6 lg:flex">
          {LINKS.map(([idx, label, href]) => {
            const isActive = active === href;
            return (
              <a
                key={href}
                href={href}
                onClick={(e) => go(e, href)}
                className={`group font-mono text-[10px] tracking-[0.18em] uppercase transition-colors ${
                  isActive ? "text-bone" : "text-dim hover:text-bone"
                }`}
              >
                <span
                  className={`transition-colors ${
                    isActive ? "text-amber" : "text-amber/50 group-hover:text-amber"
                  }`}
                >
                  {idx}
                </span>{" "}
                {label}
              </a>
            );
          })}
        </div>

        <a
          href="#contact"
          onClick={(e) => go(e, "#contact")}
          className="font-mono text-[10px] tracking-[0.18em] text-dim uppercase hover:text-bone lg:hidden"
        >
          07 CONTACT
        </a>
      </nav>
    </header>
  );
}
