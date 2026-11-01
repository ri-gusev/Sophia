"use client";

import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { BookOpen, ChevronDown, X } from "lucide-react";
import type { PhilosopherCatalog as CatalogData } from "./philosopher-catalog-data";
import type { IntroLessonId } from "../course-lesson/lesson-data";
import styles from "./philosopher-catalog.module.css";

const DESKTOP_QUERY = "(min-width: 1000px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const desktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
const serverSnapshot = () => false;

export function PhilosopherCatalog({ catalog, onClose, onSelectLesson, activeLessonId, lessonPanelId }: {
  catalog: CatalogData;
  onClose: () => void;
  onSelectLesson: (id: IntroLessonId, dismissCatalog: boolean) => void;
  activeLessonId: IntroLessonId | null;
  lessonPanelId: string;
}) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const desktopPanel = useRef<HTMLElement>(null);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const titleId = useId(), descriptionId = useId();
  const lessonCount = catalog.sections.reduce((count, section) => count + (section.kind === "lessons" ? section.lessons.length : 0), 0);
  const plural = new Intl.PluralRules("ru").select(lessonCount);
  const topicWord = plural === "one" ? "тема" : plural === "few" ? "темы" : "тем";

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
      <div>
        <span className={styles.eyebrow}>Античная философия</span>
        <h2 id={titleId}>{catalog.title}</h2>
        <p className={styles.summary}><BookOpen size={14} aria-hidden="true" />{lessonCount} {topicWord} · {catalog.courseTitle}</p>
      </div>
      <button type="button" className={styles.close} aria-label="Закрыть каталог" onClick={onClose}><X size={21} aria-hidden="true" /></button>
    </header>
    <div className={styles.body} role="region" aria-label={`Содержание каталога: ${catalog.title}`} tabIndex={0}>
      <p id={descriptionId} className={styles.description}>{catalog.description}</p>
      <p className={styles.status}>{catalog.status}</p>
      {catalog.sections.map(section => <section key={section.id} className={styles.section} aria-labelledby={`${titleId}-${section.id}`}>
        <h3 id={`${titleId}-${section.id}`}>{section.title}</h3>
        {section.kind === "lessons" ? <ol className={styles.lessons} role="list" aria-label={`Темы: ${catalog.title}`}>
          {section.lessons.map((lesson, index) => <li key={lesson.id} className={styles.lesson} data-lesson-id={lesson.id}>
            <button type="button" className={styles.lessonButton} disabled={!lesson.contentId}
              aria-label={lesson.title}
              aria-controls={lesson.contentId ? lessonPanelId : undefined}
              aria-expanded={lesson.contentId ? activeLessonId === lesson.contentId : undefined}
              onClick={() => { if (lesson.contentId) onSelectLesson(lesson.contentId, !desktop); }}>
              <span className={styles.lessonNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.lessonTitle} data-testid="catalog-lesson-title">{lesson.title}</span>
              {lesson.contentId ? <ChevronDown size={17} aria-hidden="true" /> : <small className={styles.planned} aria-hidden="true">Скоро</small>}
            </button>
          </li>)}
        </ol> : <p>{section.emptyMessage}</p>}
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
