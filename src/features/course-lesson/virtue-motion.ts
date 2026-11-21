import type { CSSProperties } from "react";

export const VIRTUE_MOTION = {
  text: 320, reveal: 400, card: 560, composition: 760, stage: 440,
  out: "cubic-bezier(.22,1,.36,1)", layout: "cubic-bezier(.25,.8,.25,1)",
} as const;

export const VIRTUE_MOTION_STYLE = {
  "--virtue-text": `${VIRTUE_MOTION.text}ms`, "--virtue-reveal": `${VIRTUE_MOTION.reveal}ms`,
  "--virtue-stage": `${VIRTUE_MOTION.stage}ms`, "--virtue-out": VIRTUE_MOTION.out,
  "--virtue-layout": VIRTUE_MOTION.layout,
} as CSSProperties;

// Only reveal content outside the reading viewport; tall sections never align
// their bottom edge and unexpectedly pull the page away from the current text.
export function revealLessonTarget(element: HTMLElement | null, start = false) {
  if (!element || element.closest("[hidden]")) return;
  const inset = (document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0) + 24;
  const top = element.getBoundingClientRect().top;
  if (!start && top >= inset && top < window.innerHeight - 48) return;
  const destination = Math.max(0, window.scrollY + top - inset);
  if (Math.abs(destination - window.scrollY) < 2) return;
  window.scrollTo({ top: destination, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}
