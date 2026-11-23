"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { BookOpen, ChevronDown, X } from "lucide-react";
import type { CatalogBlock, PhilosopherCatalog as CatalogData } from "./philosopher-catalog-data";
import { INTRO_LESSONS, type IntroLessonId } from "../course-lesson/lesson-data";
import { readCompletedLessons } from "../course-lesson/lesson-progress";
import { isLessonConfirmed, subscribeLessonProgress } from "../course-lesson/lesson-slide-progress";
import styles from "./philosopher-catalog.module.css";

const DESKTOP_QUERY = "(min-width: 1000px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const desktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
const serverSnapshot = () => false;
type CompletionLabel = "Пройдено" | "Завершено ранее";
type CompletionStatuses = Partial<Record<IntroLessonId, CompletionLabel>>;
function completionSnapshot() {
  const statuses: CompletionStatuses = {};
  try {
    const legacy = new Set(readCompletedLessons());
    for (const lesson of Object.values(INTRO_LESSONS)) {
      if (isLessonConfirmed(lesson)) statuses[lesson.id] = "Пройдено";
      else if (legacy.has(lesson.id)) statuses[lesson.id] = "Завершено ранее";
    }
  } catch { return "{}"; }
  return JSON.stringify(statuses);
}
const emptyCompletion = () => "{}";

export function PhilosopherCatalog({ catalog, onClose, onSelectLesson, activeLessonId, lessonPanelId }: {
  catalog: CatalogData;
  onClose: () => void;
  onSelectLesson: (id: IntroLessonId, dismissCatalog: boolean) => void;
  activeLessonId: IntroLessonId | null;
  lessonPanelId: string;
}) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const completed: CompletionStatuses = JSON.parse(useSyncExternalStore(subscribeLessonProgress, completionSnapshot, emptyCompletion));
  const desktopPanel = useRef<HTMLElement>(null);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const titleId = useId(), descriptionId = useId();
  const lessonCount = catalog.sections.reduce((count, section) => count + (section.kind === "blocks" ? section.blocks.length : 0), 0);
  const plural = new Intl.PluralRules("ru").select(lessonCount);
  const topicWord = plural === "one" ? "блок" : plural === "few" ? "блока" : "блоков";

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
        {section.kind === "blocks" ? <ol className={styles.lessons} role="list" aria-label={`Программа: ${catalog.title}`}>
          {section.blocks.map(block => <CourseBlock key={block.id} block={block}
            lessonPanelId={lessonPanelId} activeLessonId={activeLessonId} completed={completed}
            onSelectLesson={id => onSelectLesson(id, !desktop)} />)}
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

function CourseBlock({ block, lessonPanelId, activeLessonId, completed, onSelectLesson }: {
  block: CatalogBlock;
  lessonPanelId: string;
  activeLessonId: IntroLessonId | null;
  completed: CompletionStatuses;
  onSelectLesson: (id: IntroLessonId) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  return <li className={styles.lesson} data-block-id={block.id}>
    <button type="button" className={styles.lessonButton} aria-label={block.title}
      aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>
      <span className={styles.lessonNumber} aria-hidden="true">{String(block.order).padStart(2, "0")}</span>
      <span className={styles.blockText}>
        <span className={styles.lessonTitle} data-testid="catalog-block-title">{block.title}</span>
        <span className={styles.question}>{block.question}</span>
      </span>
      <ChevronDown size={17} aria-hidden="true" style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
    </button>
    <div id={contentId} hidden={!expanded} className={styles.blockContents}>
      {block.lessons.length > 0 && <ul className={styles.lessons}>
        {block.lessons.map(lesson => <li key={lesson.id} data-lesson-id={lesson.id}>
          <button type="button" className={styles.lessonButton} disabled={!lesson.contentId}
            aria-labelledby={`${contentId}-${lesson.id}-title`}
            aria-describedby={lesson.contentId && completed[lesson.contentId] ? `${contentId}-${lesson.id}-status` : undefined}
            aria-controls={lesson.contentId ? lessonPanelId : undefined}
            aria-expanded={lesson.contentId ? activeLessonId === lesson.contentId : undefined}
            onClick={() => { if (lesson.contentId) onSelectLesson(lesson.contentId); }}>
            <span id={`${contentId}-${lesson.id}-title`} className={styles.lessonTitle} data-testid="catalog-lesson-title">{lesson.title}</span>
            {lesson.contentId && completed[lesson.contentId] && <small id={`${contentId}-${lesson.id}-status`} className={styles.completed}>{completed[lesson.contentId]}</small>}
            {lesson.contentId ? <ChevronDown size={17} aria-hidden="true" /> : <small className={styles.planned}>Скоро</small>}
          </button>
        </li>)}
      </ul>}
      {(block.status === "planned" || block.lessons.length === 0) && <p>Уроки в разработке</p>}
    </div>
  </li>;
}
