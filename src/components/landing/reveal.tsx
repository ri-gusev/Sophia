"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -30px 0px" });
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={inView && !reducedMotion ? { y: [16, 0] } : { y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
