"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const VBParticles = dynamic(() => import("./VBParticles"), { ssr: false });

/** Intro: the VB assembles from particles on black, then the overlay lifts. */
export default function Loader() {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    setIsDesktop(desktop);
    document.documentElement.style.overflow = "hidden";
    // desktop: hold while the VB assembles; mobile: just a quick brand flash
    const id = setTimeout(
      () => {
        setShow(false);
        document.documentElement.style.overflow = "";
      },
      reduced ? 700 : desktop ? 3400 : 1100
    );
    return () => {
      clearTimeout(id);
      document.documentElement.style.overflow = "";
    };
  }, [reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          aria-hidden
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {isDesktop ? (
            <>
              {/* full-viewport canvas so the particles scatter in from across the
                  whole page, not out of a visible box in the middle */}
              <div className="absolute inset-0">
                <VBParticles reduced={!!reduced} groupX={0} groupY={0} camZ={22} />
              </div>
              <motion.span
                className="absolute bottom-[16%] font-mono text-[10px] tracking-[0.45em] text-dim uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 1 }}
              >
                Vinay Batra
              </motion.span>
            </>
          ) : (
            // mobile: no particle canvas — a clean brand mark instead
            <motion.span
              className="serif-head font-serif text-5xl font-semibold text-bone"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              VB
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
