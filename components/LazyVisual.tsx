"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts its children only while near the viewport, and unmounts them once far
 * away — so each heavy WebGL canvas creates its GL context on demand instead of
 * all of them at once on page load, and only a couple are ever alive at a time
 * (big win on phones + weak laptops). No quality change: when shown, the real
 * canvas renders at full fidelity. The wrapper keeps the box's reserved size so
 * nothing shifts as it mounts/unmounts.
 */
export default function LazyVisual({
  children,
  className,
  rootMargin = "300px 0px",
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // fallback for environments without IntersectionObserver — just mount it
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setShow(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {show ? children : null}
    </div>
  );
}
