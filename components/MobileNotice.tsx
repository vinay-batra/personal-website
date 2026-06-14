"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** First-visit nudge on phones to view the site on a desktop. Shows once. */
export default function MobileNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    let seen = false;
    try {
      seen = !!localStorage.getItem("vb-desktop-notice-v1");
    } catch {}
    if (isMobile && !seen) {
      // appear just after the brief mobile loader lifts
      const t = setTimeout(() => setShow(true), 1300);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem("vb-desktop-notice-v1", "1");
    } catch {}
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-6 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={dismiss} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Best viewed on desktop"
            className="relative w-full max-w-sm border border-bone/15 bg-surface p-7 text-center"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-[10px] tracking-[0.25em] text-amber uppercase">
              A quick note
            </p>
            <h2 className="serif-head mt-3 font-serif text-[1.9rem] leading-tight font-semibold text-bone">
              Best on a computer.
            </h2>
            <p className="mt-3 font-sans text-[15px] leading-[1.65] text-bone/70">
              Use a computer for the best viewing experience. The 3D and motion on
              this site really come alive on a bigger screen.
            </p>
            <button
              onClick={dismiss}
              className="mt-6 w-full border border-amber/40 bg-amber/10 py-3 font-mono text-[11px] tracking-[0.18em] text-amber uppercase transition-colors hover:bg-amber/20"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
