"use client";

import Image from "next/image";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import type { VirtueGalleryContent } from "./virtue-gallery-data";
import styles from "./virtue-gallery-scene.module.css";

type Stage = "meno" | "gallery" | "socrates" | "mosaic";
type CardId = VirtueGalleryContent["cards"][number]["id"];

export function VirtueGalleryScene({ scene, onBack, onClose }: {
  scene: Extract<LessonSceneData, { type: "virtue-gallery" }>;
  onBack: () => void;
  onClose: () => void;
}) {
  const content = scene.gallery;
  const [stage, setStage] = useState<Stage>("meno");
  const [visited, setVisited] = useState<readonly CardId[]>([]);
  const [selected, setSelected] = useState<CardId | null>(null);
  const [reflection, setReflection] = useState(false);
  const focusTarget = useRef<HTMLElement | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const before = useRef<DOMRect[]>([]);
  const shouldFocus = useRef(false);
  const detailsId = useId();
  const mosaic = stage === "mosaic";

  useLayoutEffect(() => {
    if (shouldFocus.current) {
      focusTarget.current?.focus();
      shouldFocus.current = false;
    }
    if (!mosaic || !before.current.length) return;
    const tiles = board.current?.querySelectorAll<HTMLElement>("[data-virtue-tile]");
    const oldRects = before.current;
    before.current = [];
    if (!tiles || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Measure after the responsive grid changes so both layouts use the same cards.
    const animations = Array.from(tiles, (tile, i) => {
      const end = tile.getBoundingClientRect();
      const start = oldRects[i];
      return tile.animate([
        { transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width}, ${start.height / end.height})` },
        { transform: "none" },
      ], { duration: 850, easing: "cubic-bezier(.22,.75,.25,1)" });
    });
    return () => animations.forEach(animation => animation.cancel());
  }, [mosaic, stage, reflection]);

  function advance(next: Stage) {
    shouldFocus.current = true;
    setStage(next);
  }

  function explore(id: CardId) {
    setSelected(previous => previous === id ? null : id);
    setVisited(previous => previous.includes(id) ? previous : [...previous, id]);
  }

  function rearrange() {
    before.current = Array.from(board.current?.querySelectorAll("[data-virtue-tile]") ?? [], tile => tile.getBoundingClientRect());
    advance("mosaic");
  }

  function replay() {
    setVisited([]);
    setSelected(null);
    setReflection(false);
    advance("meno");
  }

  return <section className={styles.scene} data-testid="virtue-gallery-scene">
    <header className={styles.header} data-testid="lesson-scene-header">
      <h2 tabIndex={-1}>{scene.title}</h2>
      <a href="https://classics.mit.edu/Plato/meno.html" target="_blank" rel="noreferrer">{content.adaptation}</a>
    </header>

    {stage === "meno" && <div className={styles.meeting}>
      <Image src={scene.image.src} alt={scene.imageAlt} width={1536} height={1024} sizes="(max-width: 760px) 100vw, 48vw" />
      <div className={styles.speech}>
        <h3 tabIndex={-1} ref={element => { focusTarget.current = element; }}>Менон</h3>
        <blockquote>{content.meno.map(text => <p key={text}>{text}</p>)}</blockquote>
        <Button onClick={() => advance("gallery")}>Посмотреть примеры<ArrowRight size={16} aria-hidden="true" /></Button>
      </div>
    </div>}

    {stage !== "meno" && <>
      {stage === "gallery" && <div className={styles.galleryHeader}>
        <h3 tabIndex={-1} ref={element => { focusTarget.current = element; }}>Примеры Менона</h3>
        <p role="status">Изучено: {visited.length} из {content.cards.length}</p>
      </div>}
      {stage === "socrates" && <div className={styles.reaction}>
        <h3 tabIndex={-1} ref={element => { focusTarget.current = element; }}>Сократ</h3>
        <blockquote>{content.reaction}</blockquote>
        <Button onClick={rearrange}>Далее<ArrowRight size={16} aria-hidden="true" /></Button>
      </div>}
      {mosaic && <div className={styles.reaction}>
        <p className={styles.speaker}>Сократ</p>
        <h3 tabIndex={-1} ref={element => { if (!reflection) focusTarget.current = element; }}>{content.challenge}</h3>
      </div>}

      <div ref={board} className={styles.board} data-layout={mosaic ? "mosaic" : "gallery"}>
        {mosaic && <svg className={styles.connections} viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M150 50V103 M50 150L124 111 M250 150L176 111" vectorEffect="non-scaling-stroke" />
        </svg>}
        {content.cards.map((card, index) => {
          const expanded = stage === "gallery" && selected === card.id;
          const picture = <Image src={`/images/lessons/virtue/${card.image}`} alt="" width={512} height={580}
            sizes="(max-width: 540px) 100vw, 33vw" />;
          return <article key={card.id} className={styles.tile} data-virtue-tile={card.id}
            data-expanded={expanded} style={{ "--stagger": `${index * 115}ms` } as React.CSSProperties}>
            {stage === "gallery" ? <>
              <button type="button" className={styles.cardButton} aria-expanded={expanded}
                aria-controls={`${detailsId}-${card.id}`} onClick={() => explore(card.id)}>
                {picture}
                <span className={styles.cardLabel}>
                  <span>{card.title}</span>
                  {visited.includes(card.id) && <small><Check size={13} aria-hidden="true" />Изучено</small>}
                </span>
              </button>
              <p className={styles.details} id={`${detailsId}-${card.id}`} hidden={!expanded}>{card.text}</p>
            </> : <div className={styles.cardButton}>
              {picture}
              <p className={styles.cardLabel}>{card.title}</p>
            </div>}
          </article>;
        })}
        {mosaic && <div className={styles.center}><span aria-hidden="true">?</span><p>{content.question}</p></div>}
      </div>

      {stage === "gallery" && <div className={styles.galleryFooter}>
        <p>{content.context} {content.historicalNote}</p>
        {visited.length === content.cards.length && <Button onClick={() => advance("socrates")}>Что скажет Сократ?<ArrowRight size={16} aria-hidden="true" /></Button>}
      </div>}
      {mosaic && <div className={styles.discovery}>
        <h3>{content.discovery}</h3>
        {!reflection && <Button onClick={() => { shouldFocus.current = true; setReflection(true); }}>Открыть объяснение<ArrowRight size={16} aria-hidden="true" /></Button>}
        {reflection && <div className={styles.reflection}>
          <div tabIndex={-1} ref={element => { if (element) focusTarget.current = element; }} role="group" aria-label="Объяснение">
            {content.explanation.map(text => <p key={text}>{text}</p>)}
          </div>
          <p className={styles.speaker}>Сократ</p>
          <blockquote>{content.closing}</blockquote>
          <figure className={styles.thought}>
            <blockquote>{content.thought}.</blockquote>
            <figcaption>Мысль урока · Sophia</figcaption>
          </figure>
        </div>}
      </div>}
    </>}

    <nav className={styles.navigation} aria-label="Навигация по слайду">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />К первому слайду</Button>
      {stage !== "meno" && <Button variant="ghost" size="sm" onClick={replay}><RotateCcw size={15} aria-hidden="true" />Повторить сцену</Button>}
      <Button variant="ghost" size="sm" onClick={onClose}>{scene.buttonLabel}</Button>
    </nav>
  </section>;
}
