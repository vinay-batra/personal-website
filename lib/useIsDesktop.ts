import { useEffect, useState } from "react";

/**
 * True on viewports >= 768px. Starts false (SSR + first client render) and
 * flips after mount, so it's safe for gating heavy client-only widgets (the VB
 * canvas) without a hydration mismatch.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}
