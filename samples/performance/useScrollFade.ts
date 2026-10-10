// Excerpt from the private FidCaster repository: artifacts/farcaster-client/src/hooks/useScrollFade.ts
// Shown unmodified for review.

import { useCallback, useEffect, useState } from "react";

/**
 * For a sideways-scrolling row (tabs, chips): which edges still hide content.
 * A row that scrolls but looks like it simply ends cut its last label mid-word
 * ("Follo", "Re") with nothing saying there was more; pair this with the
 * .fc-fade-* classes in index.css to fade the edge that has more behind it.
 *
 * Returns a callback ref, so a row that mounts later (after data loads) is
 * still picked up.
 */
export function useScrollFade<T extends HTMLElement>(): { ref: (el: T | null) => void; start: boolean; end: boolean } {
  const [el, setEl] = useState<T | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const at = Math.abs(el.scrollLeft);
      const next = { start: max > 1 && at > 1, end: max > 1 && at < max - 1 };
      setEdges((cur) => (cur.start === next.start && cur.end === next.end ? cur : next));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [el]);
  const ref = useCallback((node: T | null) => setEl(node), []);
  return { ref, ...edges };
}
