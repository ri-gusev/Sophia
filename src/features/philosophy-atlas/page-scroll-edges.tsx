"use client";

import { useRef, type PointerEvent } from "react";
import styles from "./philosophy-atlas.module.css";

export function PageScrollEdges() {
  const drag = useRef<{ id: number; y: number; scroll: number } | null>(null);
  const start = (event: PointerEvent<HTMLDivElement>) => {
    // Touch retains native vertical scrolling and momentum in these margins.
    if (event.pointerType === "touch" || event.button !== 0 || !event.isPrimary) return;
    drag.current = { id: event.pointerId, y: event.clientY, scroll: window.scrollY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    window.scrollTo({ top: current.scroll + current.y - event.clientY, behavior: "instant" });
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <>{(["left", "right"] as const).map(side => <div key={side} aria-hidden="true" data-testid={`atlas-page-scroll-${side}`} className={`${styles.pageScrollEdge} ${side === "left" ? styles.pageScrollLeft : styles.pageScrollRight}`} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { drag.current = null; }} />)}</>;
}
