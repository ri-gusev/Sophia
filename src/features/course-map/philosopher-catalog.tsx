"use client";

import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import type { PhilosopherCatalog as CatalogData } from "./philosopher-catalog-data";
import styles from "./philosopher-catalog.module.css";

const DESKTOP_QUERY = "(min-width: 1000px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const desktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
const serverSnapshot = () => false;

export function PhilosopherCatalog({ catalog, onClose }: { catalog: CatalogData; onClose: () => void }) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const desktopPanel = useRef<HTMLElement>(null);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const titleId = useId(), descriptionId = useId();

  useLayoutEffect(() => {
    if (desktop) desktopPanel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    else if (mobileDialog.current && !mobileDialog.current.open) mobileDialog.current.showModal();
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [desktop, onClose]);

  const contents = <>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Античная философия</span><h2 id={titleId}>{catalog.title}</h2></div>
      <button type="button" className={styles.close} aria-label="Закрыть каталог" onClick={onClose}><X size={21} aria-hidden="true" /></button>
    </header>
    <div className={styles.body} role="region" aria-label={`Содержание каталога: ${catalog.title}`} tabIndex={0}>
      <p id={descriptionId} className={styles.description}>{catalog.description}</p>
      <p className={styles.status}>{catalog.status}</p>
      {catalog.sections.map(section => <section key={section.id} className={styles.section} aria-labelledby={`${titleId}-${section.id}`}>
        <h3 id={`${titleId}-${section.id}`}>{section.title}</h3>
        <p>{section.emptyMessage}</p>
      </section>)}
    </div>
  </>;

  return desktop ? <aside
    ref={desktopPanel} role="dialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={descriptionId}
    className={styles.panel} data-testid="philosopher-catalog"
  >{contents}</aside> : <dialog
    ref={mobileDialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    className={styles.mobileDialog} data-testid="philosopher-catalog"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
  >{contents}</dialog>;
}
