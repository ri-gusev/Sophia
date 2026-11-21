"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { VIRTUE_MOTION } from "./virtue-motion";

// Observe natural content, never the animated shell: no per-frame measuring or
// ResizeObserver feedback loop. The shell returns to auto after each transition.
export function MotionRegion({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const shell = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const outer = shell.current, inner = content.current;
    if (!outer || !inner || !active) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previous = inner.getBoundingClientRect().height;
    let from = previous, to = previous;
    let animation: Animation | null = null;
    function cancel() {
      animation?.cancel(); animation = null;
      outer!.style.height = ""; outer!.style.overflow = "";
    }
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      const next = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
      if (Math.abs(next - previous) < .5) return;
      const progress = animation?.effect?.getComputedTiming().progress;
      const start = typeof progress === "number" ? from + (to - from) * progress : previous;
      previous = next;
      cancel();
      if (media.matches || outer.closest("[hidden]")) return;
      from = start; to = next;
      outer.style.height = `${next}px`;
      outer.style.overflow = "clip";
      animation = outer.animate([{ height: `${start}px` }, { height: `${next}px` }], { duration: VIRTUE_MOTION.reveal, easing: VIRTUE_MOTION.out });
      animation.onfinish = cancel;
    });
    const reduce = () => { if (media.matches) cancel(); };
    observer.observe(inner);
    media.addEventListener("change", reduce);
    return () => { observer.disconnect(); media.removeEventListener("change", reduce); cancel(); };
  }, [active]);
  return <div ref={shell} data-motion-region><div ref={content} style={{ display: "flow-root" }}>{children}</div></div>;
}
