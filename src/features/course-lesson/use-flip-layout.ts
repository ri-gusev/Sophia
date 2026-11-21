"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { VIRTUE_MOTION } from "./virtue-motion";

type Box = { left: number; top: number; width: number; height: number };
function measure(elements: readonly HTMLElement[]) {
  const x = window.scrollX, y = window.scrollY;
  return new Map(elements.map(element => {
    const rect = element.getBoundingClientRect();
    return [element, { left: rect.left + x, top: rect.top + y, width: rect.width, height: rect.height }] as const;
  }));
}

// Read every rectangle before any animation writes. Capture a running transform
// before cancelling it, so rapid changes continue from the presented position.
export function useFlipLayout(root: RefObject<HTMLElement | null>, selector: string, revision: unknown, active: boolean, duration: number) {
  const before = useRef(new Map<HTMLElement, Box>());
  const animations = useRef<Animation[]>([]);
  const cancel = useCallback(() => { animations.current.forEach(animation => animation.cancel()); animations.current = []; }, []);
  function capture() {
    before.current = measure(Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? []));
    cancel();
  }

  useLayoutEffect(() => {
    cancel();
    const starts = before.current;
    before.current = new Map();
    if (!active || !starts.size || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ends = measure(Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? []));
    for (const [element, end] of ends) {
      const start = starts.get(element);
      if (!start || !end.width || !end.height) continue;
      animations.current.push(element.animate([
        { transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width}, ${start.height / end.height})` },
        { transform: "translate(0px, 0px) scale(1, 1)" },
      ], { duration, easing: VIRTUE_MOTION.layout }));
    }
    return cancel;
  }, [revision, active, duration, root, selector, cancel]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => { if (media.matches) cancel(); };
    media.addEventListener("change", reduce);
    return () => { media.removeEventListener("change", reduce); cancel(); };
  }, [cancel]);
  return capture;
}
