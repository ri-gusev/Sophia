"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpen, Lightbulb, MessageCircle, Star, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COURSE_ERAS, ERA_WIDTH, MAP_HEIGHT, MAP_ROUTE, MAP_STEPS, MAP_TRANSITIONS, MAP_WIDTH } from "./course-map-data";
import styles from "./course-map.module.css";

const STEP_ICONS = [BookOpen, MessageCircle, Lightbulb, Star, Trophy];
type MapStep = (typeof MAP_STEPS)[number];

export function CourseMap() {
  const viewport = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const drag = useRef<{ startX: number; startScroll: number } | null>(null);
  const requestedEra = useRef<number | null>(null);
  const [activeEra, setActiveEra] = useState(0);
  const [selectedStep, setSelectedStep] = useState<MapStep | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const titleId = useId();
  const copyId = useId();
  const gradientId = useId().replace(/:/g, "");

  const scrollBehavior = (): ScrollBehavior => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";

  function goToEra(index: number) {
    const element = viewport.current;
    if (!element || !scene.current) return;
    requestedEra.current = index;
    element.scrollTo({ left: scene.current.clientWidth * index / COURSE_ERAS.length, behavior: scrollBehavior() });
    setActiveEra(index);
  }

  function moveMap(direction: number) {
    const element = viewport.current;
    if (!element) return;
    requestedEra.current = null;
    element.scrollBy({ left: direction * element.clientWidth * 0.65, behavior: scrollBehavior() });
  }

  function updateActiveEra() {
    const element = viewport.current;
    if (!element || !scene.current || requestedEra.current !== null) return;
    const atEnd = element.scrollWidth - element.clientWidth - element.scrollLeft < 2;
    const index = atEnd ? COURSE_ERAS.length - 1 : Math.round(element.scrollLeft / (scene.current.clientWidth / COURSE_ERAS.length));
    setActiveEra(Math.max(0, Math.min(COURSE_ERAS.length - 1, index)));
  }

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    function handleWheel(event: WheelEvent) {
      if (!element || event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        requestedEra.current = null;
        return;
      }
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1;
      const next = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, element.scrollLeft + event.deltaY * multiplier));
      if (next !== element.scrollLeft) {
        event.preventDefault();
        requestedEra.current = null;
        element.scrollLeft = next;
      }
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  function closeDialog() { dialog.current?.close(); }
  function endDrag() { drag.current = null; setIsDragging(false); }

  return (
    <div className={styles.courseMap}>
      <nav className={styles.eraNavigation} aria-label="Эпохи курса">
        {COURSE_ERAS.map((era, index) => <button key={era.id} type="button" className={styles.eraButton} aria-pressed={activeEra === index} onClick={() => goToEra(index)}>{era.title}</button>)}
      </nav>
      <div
        ref={viewport}
        className={`${styles.viewport} ${isDragging ? styles.dragging : ""}`}
        data-testid="course-map-viewport"
        role="region"
        aria-label="Карта основного курса"
        tabIndex={0}
        onScroll={updateActiveEra}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          moveMap(event.key === "ArrowRight" ? 1 : -1);
        }}
        onPointerDown={(event) => {
          requestedEra.current = null;
          if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          drag.current = { startX: event.clientX, startScroll: event.currentTarget.scrollLeft };
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsDragging(true);
        }}
        onPointerMove={(event) => {
          if (drag.current) event.currentTarget.scrollLeft = drag.current.startScroll - (event.clientX - drag.current.startX);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div ref={scene} className={styles.scene} data-testid="course-map-scene" style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
          <div className={styles.terrain} aria-hidden="true">
            {COURSE_ERAS.map((era, index) => <Image
              key={era.id}
              src={`/images/course-map/era-${era.id}.webp`}
              alt="" width={ERA_WIDTH} height={MAP_HEIGHT}
              priority={index === 0} unoptimized draggable={false}
              className={styles.scenery}
              style={{ left: index * ERA_WIDTH }}
              data-testid="course-map-scenery"
            />)}
            {MAP_TRANSITIONS.map((transition, index) => <Image
              key={transition}
              src={`/images/course-map/transition-${transition}.webp`}
              alt="" width={ERA_WIDTH} height={MAP_HEIGHT}
              unoptimized draggable={false}
              className={styles.terrainTransition}
              style={{ left: (index + 1) * ERA_WIDTH - ERA_WIDTH / 2 }}
              data-testid="course-map-transition"
            />)}
          </div>
          <svg className={styles.route} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2={MAP_WIDTH} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f0dfbd" /><stop offset="25%" stopColor="#d8caa5" /><stop offset="50%" stopColor="#ead5b9" /><stop offset="75%" stopColor="#e4daeb" /><stop offset="100%" stopColor="#d7e9ec" />
            </linearGradient></defs>
            <path className={styles.routeShadow} d={MAP_ROUTE} />
            <path className={styles.routeSurface} stroke={`url(#${gradientId})`} d={MAP_ROUTE} />
            <path className={styles.routeMarks} d={MAP_ROUTE} />
          </svg>
          {MAP_STEPS.map((step) => {
            const Icon = STEP_ICONS[step.stepIndex];
            return <div key={step.id} className={`${styles.stepPosition} ${styles[step.era.id]}`} style={{ left: step.x, top: step.y }}>
              <button
                type="button"
                className={styles.step}
                data-testid="course-step"
                aria-label={`${step.era.title}: шаг ${step.stepIndex + 1} — ${step.title}`}
                aria-pressed={selectedStep?.id === step.id}
                onFocus={() => { requestedEra.current = step.eraIndex; setActiveEra(step.eraIndex); }}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  flushSync(() => setSelectedStep(step));
                  if (dialog.current && !dialog.current.open) dialog.current.showModal();
                }}
              >
                <span className={styles.stepShadow} aria-hidden="true" />
                <span className={styles.stepBase} aria-hidden="true" />
                <span className={styles.stepFace} aria-hidden="true">
                  <Icon size={29} />
                  <span className={styles.stepNumber}>{step.stepIndex + 1}</span>
                </span>
              </button>
              <span className={styles.stepLabel} aria-hidden="true">{step.title}</span>
            </div>;
          })}
        </div>
      </div>
      <div className={styles.mapFooter}>
        <p>Выбери шаг, чтобы познакомиться с темой. Полные уроки готовятся.</p>
        <div className={styles.mapArrows}>
          <button type="button" aria-label="Прокрутить карту влево" onClick={() => moveMap(-1)}><ArrowLeft size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Прокрутить карту вправо" onClick={() => moveMap(1)}><ArrowRight size={19} aria-hidden="true" /></button>
        </div>
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={copyId}
        onClose={() => {
          // A queued close event may arrive after a fast keyboard reopen.
          if (dialog.current?.open) return;
          setSelectedStep(null);
          trigger.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
      >
        <div className={styles.dialogContent}>
          <button className={styles.closeIcon} type="button" aria-label="Закрыть" onClick={closeDialog}><X size={21} aria-hidden="true" /></button>
          <span className={styles.dialogEra}>{selectedStep?.era.title} · шаг {(selectedStep?.stepIndex ?? 0) + 1} из 5</span>
          <h2 id={titleId}>{selectedStep?.title}</h2>
          <div id={copyId}><p>{selectedStep?.description}</p><p className={styles.previewNotice}>Предварительный просмотр темы. Содержание урока находится в разработке; прохождение и сохранение прогресса пока недоступны.</p></div>
          <Button variant="outline" onClick={closeDialog}>Вернуться к карте</Button>
        </div>
      </dialog>
    </div>
  );
}
