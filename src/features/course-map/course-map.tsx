"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { BookOpen, Lightbulb, MessageCircle, Star, Trophy, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COURSE_ERAS, ERA_WIDTH, MAP_HEIGHT, MAP_WIDTH, TRANSITION_WIDTH } from "./course-map-data";
import { MAP_BRANCHES, MAP_NODES, type MapIcon, type MapNode } from "./course-map-config";
import { PHILOSOPHER_CATALOGS } from "./philosopher-catalog-data";
import { PhilosopherCatalog } from "./philosopher-catalog";
import { INTRO_LESSONS, type IntroLessonId } from "../course-lesson/lesson-data";
import { LessonIntroduction } from "../course-lesson/lesson-introduction";
import styles from "./course-map.module.css";

const NODE_ICONS = { book: BookOpen, dialogue: MessageCircle, idea: Lightbulb, star: Star, trophy: Trophy, followers: Users } satisfies Record<MapIcon, typeof BookOpen>;

export function CourseMap() {
  const viewport = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const catalogTrigger = useRef<HTMLButtonElement | null>(null);
  const catalogPosition = useRef({ map: 0, page: 0 });
  const lessonPanel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startScroll: number } | null>(null);
  const requestedEra = useRef<number | null>(null);
  const [activeEra, setActiveEra] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollLimit, setScrollLimit] = useState(MAP_WIDTH);
  const [selectedStep, setSelectedStep] = useState<MapNode | null>(null);
  const [catalogNode, setCatalogNode] = useState<MapNode | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<IntroLessonId | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const titleId = useId();
  const copyId = useId();
  const mapId = useId();
  const lessonPanelId = useId();
  const catalog = catalogNode?.action.kind === "catalog" ? PHILOSOPHER_CATALOGS[catalogNode.action.catalogId] : null;

  const closeCatalog = useCallback(() => {
    flushSync(() => setCatalogNode(null));
    if (viewport.current) viewport.current.scrollLeft = catalogPosition.current.map;
    catalogTrigger.current?.focus({ preventScroll: true });
    window.scrollTo({ top: catalogPosition.current.page, behavior: "instant" });
  }, []);

  function openNode(node: MapNode, button: HTMLButtonElement) {
    if (node.action.kind === "catalog") {
      catalogTrigger.current = button;
      if (!catalogNode) catalogPosition.current = { map: viewport.current?.scrollLeft ?? 0, page: window.scrollY };
      setCatalogNode(node);
      return;
    }
    trigger.current = button;
    flushSync(() => { setCatalogNode(null); setSelectedStep(node); });
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }

  const scrollBehavior = (): ScrollBehavior => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";

  function openLesson(id: IntroLessonId, dismissCatalog: boolean) {
    flushSync(() => {
      setSelectedLessonId(id);
      if (dismissCatalog) setCatalogNode(null);
    });
    lessonPanel.current?.querySelector<HTMLHeadingElement>("h2")?.focus({ preventScroll: true });
    lessonPanel.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }

  function goToEra(index: number) {
    if (catalogNode) flushSync(() => setCatalogNode(null));
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
    if (!element) return;
    setScrollPosition(element.scrollLeft);
    if (!scene.current || requestedEra.current !== null) return;
    const atEnd = element.scrollWidth - element.clientWidth - element.scrollLeft < 2;
    const index = atEnd ? COURSE_ERAS.length - 1 : Math.round(element.scrollLeft / (scene.current.clientWidth / COURSE_ERAS.length));
    setActiveEra(Math.max(0, Math.min(COURSE_ERAS.length - 1, index)));
  }

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    function syncScrollRange() {
      if (!element) return;
      setScrollLimit(Math.max(0, element.scrollWidth - element.clientWidth));
      setScrollPosition(element.scrollLeft);
    }
    const observer = new ResizeObserver(syncScrollRange);
    observer.observe(element);
    syncScrollRange();
    function handleWheel(event: WheelEvent) {
      // Vertical wheel events keep their native page scroll; horizontal/Shift
      // wheel must not move the map. Preserve the vertical part of a gesture.
      if (event.ctrlKey || (event.deltaX === 0 && !event.shiftKey)) return;
      event.preventDefault();
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      if (event.deltaY) window.scrollBy({ top: event.deltaY * multiplier, behavior: "instant" });
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", handleWheel);
    };
  }, []);

  function closeDialog() { dialog.current?.close(); }
  function endDrag() { drag.current = null; setIsDragging(false); }

  return (
    <div className={`container ${styles.courseMap}`}>
      <nav className={styles.eraNavigation} aria-label="Эпохи курса">
        {COURSE_ERAS.map((era, index) => <button key={era.id} type="button" className={styles.eraButton} aria-pressed={activeEra === index} onClick={() => goToEra(index)}>{era.title}</button>)}
      </nav>
      <div className={styles.workspace} data-catalog-open={Boolean(catalog)}>
      <div className={styles.mapColumn}>
      <div className={styles.mapFrame} data-testid="course-map-frame">
        <div
          id={mapId}
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
                src={`/images/course-map/adventure/${era.id}.webp`}
                alt="" width={ERA_WIDTH} height={MAP_HEIGHT}
                priority={index === 0} unoptimized draggable={false}
                className={styles.scenery}
                style={{ left: index * ERA_WIDTH }}
                data-testid="course-map-scenery"
              />)}
              {COURSE_ERAS.slice(1).map((era, index) => <Image
                key={era.id}
                src={`/images/course-map/adventure/transition-${COURSE_ERAS[index].id}-${era.id}.webp`}
                alt="" width={TRANSITION_WIDTH} height={MAP_HEIGHT}
                unoptimized draggable={false}
                className={styles.terrainTransition}
                style={{ left: (index + 1) * ERA_WIDTH - TRANSITION_WIDTH / 2 }}
                data-testid="course-map-transition"
              />)}
            </div>
            <svg className={styles.branchRoutes} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true" data-testid="course-branch-route">
              {MAP_BRANCHES.map(branch => <g key={branch.id}>
                <path className={styles.branchRouteEdge} d={branch.path} />
                <path className={styles.branchRouteSurface} d={branch.path} />
              </g>)}
            </svg>
            {MAP_NODES.map((step) => {
              const Icon = NODE_ICONS[step.icon];
              return <div key={step.id} className={`${styles.stepPosition} ${styles[step.eraId]} ${step.type === "branch" ? styles.branch : ""}`} style={{ left: step.position.x, top: step.position.y }}>
                <button
                  type="button"
                  className={styles.step}
                  data-testid="course-step"
                  data-node-id={step.id}
                  data-node-type={step.type}
                  data-era-id={step.eraId}
                  data-parent-id={step.parentId}
                  aria-label={`${step.era.title}: ${step.type === "main" ? `шаг ${step.number}` : "дополнительная ветка"} — ${step.title}`}
                  aria-pressed={selectedStep?.id === step.id || catalogNode?.id === step.id}
                  onFocus={() => { requestedEra.current = step.eraIndex; setActiveEra(step.eraIndex); }}
                  onClick={event => openNode(step, event.currentTarget)}
                >
                  <span className={styles.stepArtwork} aria-hidden="true">
                  <span className={styles.stepShadow} aria-hidden="true" />
                  <span className={styles.stepBase} aria-hidden="true" />
                  <span className={styles.stepFace} aria-hidden="true">
                    <Icon size={29} />
                    {step.type === "main" && <span className={styles.stepNumber}>{step.number}</span>}
                  </span>
                  </span>
                </button>
                <span className={styles.stepLabel} aria-hidden="true">{step.type === "branch" && <small>Дополнительно</small>}{step.title}</span>
              </div>;
            })}
          </div>
        </div>
        <input
          className={styles.mapScrollbar}
          type="range" min={0} max={100} step={0.1}
          aria-label="Прокрутка карты"
          aria-controls={mapId}
          aria-valuetext={`${Math.round(scrollLimit ? scrollPosition / scrollLimit * 100 : 0)}% карты`}
          value={scrollLimit ? scrollPosition / scrollLimit * 100 : 0}
          onChange={(event) => {
            if (!viewport.current) return;
            requestedEra.current = null;
            const left = Number(event.currentTarget.value) / 100 * scrollLimit;
            viewport.current.scrollLeft = left;
            setScrollPosition(left);
          }}
        />
      </div>
      <div className={styles.mapFooter}>
        <p>Перетаскивай карту за фон или используй ползунок снизу. Выбери шаг, чтобы познакомиться с темой. Полные уроки готовятся.</p>
      </div>
      </div>
      {catalog && <PhilosopherCatalog catalog={catalog} onClose={closeCatalog} onSelectLesson={openLesson}
        activeLessonId={selectedLessonId} lessonPanelId={lessonPanelId} />}
      </div>
      <div ref={lessonPanel} id={lessonPanelId} className={styles.lessonSlot}>
        {selectedLessonId && <LessonIntroduction key={selectedLessonId} lesson={INTRO_LESSONS[selectedLessonId]} />}
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
          <span className={styles.dialogEra}>{selectedStep && `${selectedStep.era.title} · ${selectedStep.type === "main" ? `шаг ${selectedStep.number} из ${selectedStep.era.steps.length}` : "дополнительная ветка"}`}</span>
          <h2 id={titleId}>{selectedStep?.title}</h2>
          <div id={copyId}><p>{selectedStep?.description}</p><p className={styles.previewNotice}>{selectedStep?.type === "branch" ? "Материалы этой дополнительной ветки появятся позже." : "Предварительный просмотр темы. Содержание урока находится в разработке; прохождение и сохранение прогресса пока недоступны."}</p></div>
          <Button variant="outline" onClick={closeDialog}>Вернуться к карте</Button>
        </div>
      </dialog>
    </div>
  );
}
