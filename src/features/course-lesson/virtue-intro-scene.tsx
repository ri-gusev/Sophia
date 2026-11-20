"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import styles from "./virtue-intro-scene.module.css";

export function VirtueIntroScene({ scene, onClose, onContinue }: {
  scene: Extract<LessonSceneData, { type: "virtue-intro" }>;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const content = scene.virtue;

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const heading = contentRef.current?.querySelector<HTMLElement>('h3:not([inert] h3)');
    heading?.focus({ preventScroll: true });
    contentRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [stage]);

  return <section className={styles.scene} data-testid="virtue-intro-scene" data-stage={stage}>
    <header data-testid="lesson-scene-header" className={styles.header}>
      <p>Добродетель и правильная жизнь · «Менон»</p>
      <h2 tabIndex={-1}>{scene.title}</h2>
    </header>
    <div className={styles.composition}>
      <figure className={styles.art}>
        <Image src={scene.image.src} alt={scene.imageAlt} width={1536} height={1024} priority sizes="(max-width: 760px) 100vw, 48vw" />
        <figcaption>Сократ и Менон · художественная интерпретация</figcaption>
      </figure>
      <div ref={contentRef} className={styles.reading}>
        <p className={styles.step}>Этап {stage + 1} из 5</p>
        {stage === 0 && <div key="meeting" className={styles.reveal}>
          <h3 tabIndex={-1}>Менон</h3>
          <blockquote className={styles.dialogue}>{content.meno}</blockquote>
          <p className={styles.note}>{content.note}</p>
        </div>}
        {(stage === 1 || stage === 2) && <div className={styles.questionSpace}>
          <div className={styles.choices} data-retreat={stage === 2} inert={stage === 2} aria-hidden={stage === 2}>
            <h3 tabIndex={-1}>{content.question}</h3>
            <p className={styles.hint}>Первое предположение — здесь нет правильного ответа.</p>
            <div className={styles.cards} role="group" aria-label={content.question}>
              {content.hypotheses.map((option, index) => <button type="button" key={option.id} aria-pressed={selected === option.id}
                style={{ animationDelay: `${index * 100}ms` }} onClick={() => setSelected(option.id)}>
                {option.text}
              </button>)}
            </div>
            <button type="button" className={styles.unknown} aria-pressed={selected === "unknown"} onClick={() => setSelected("unknown")}>{content.unknown}</button>
          </div>
          {stage === 2 && <div className={styles.turn}>
            <span className={styles.questionMark} aria-hidden="true">?</span>
            <h3 tabIndex={-1}>{content.turnQuestion}</h3>
            <div className={styles.socrates}><p className={styles.speaker}>Сократ</p><blockquote>{content.socrates}</blockquote><p className={styles.note}>{content.note}</p></div>
          </div>}
        </div>}
        {stage === 3 && <div key="explanation" className={styles.reveal}>
          <h3 tabIndex={-1} className={styles.greek}><span lang="grc">ἀρετή</span> <small>арете́</small></h3>
          {content.explanation.map(text => <p className={styles.explanation} key={text}>{text}</p>)}
        </div>}
        {stage === 4 && <div key="thought" className={`${styles.reveal} ${styles.thought}`}>
          <p className={styles.speaker}>{content.attribution}</p>
          <h3 tabIndex={-1}>{content.thought}.</h3>
        </div>}
        <nav className={styles.navigation} aria-label="Этапы сцены">
          <Button variant="ghost" size="sm" disabled={stage === 0} onClick={() => setStage(value => Math.max(0, value - 1))}><ArrowLeft size={15} aria-hidden="true" />Назад</Button>
          {stage < 4 && <Button size="sm" disabled={stage === 1 && selected === null} onClick={() => setStage(value => Math.min(4, value + 1))}>Продолжить<ArrowRight size={15} aria-hidden="true" /></Button>}
          {stage === 4 && <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setStage(0); }}><RotateCcw size={15} aria-hidden="true" />Повторить сцену</Button>}
          {stage === 4 && <Button size="sm" onClick={onContinue}>{scene.buttonLabel}<ArrowRight size={15} aria-hidden="true" /></Button>}
        </nav>
      </div>
    </div>
    <footer className={styles.footer}>
      <Button variant="ghost" size="sm" onClick={onClose}>Вернуться в каталог</Button>
      <a href="https://classics.mit.edu/Plato/meno.html" target="_blank" rel="noreferrer">Платон, «Менон», 70a–71b</a>
      <a href="/images/lessons/virtue/README.md" target="_blank" rel="noreferrer">Об иллюстрации</a>
    </footer>
  </section>;
}
