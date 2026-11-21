"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, CircleHelp, Layers, ScanSearch, Shapes } from "lucide-react";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import { completeLesson } from "./lesson-progress";
import { boundedIndex } from "./lesson-resume";
import { MotionRegion } from "./motion-region";
import { useSceneState } from "./use-scene-state";
import { revealLessonTarget, VIRTUE_MOTION_STYLE } from "./virtue-motion";
import styles from "./virtue-finale-scene.module.css";

const icons = { question: CircleHelp, examples: Shapes, common: Layers, check: ScanSearch };
const DIALOGUE_START = 0, PATH_START = 3, PATH_END = 4, QUESTION_START = 5, SUMMARY = 7;

export function VirtueFinaleScene({ scene, active, onBack, onClose }: {
  scene: Extract<LessonSceneData, { type: "virtue-finale" }>;
  active: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const content = scene.finale;
  // A single checkpoint preserves the order of the dialogue, path and conclusion.
  const [checkpoint, setCheckpoint] = useSceneState(scene, "checkpoint", DIALOGUE_START, boundedIndex(SUMMARY + 1));
  const [error, setError] = useState(false);
  const saving = useRef(false);
  const reading = useRef<HTMLDivElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const previous = useRef(checkpoint);
  const dialogue = checkpoint < PATH_START;
  const path = checkpoint >= PATH_START && checkpoint <= PATH_END;
  const question = checkpoint >= QUESTION_START && checkpoint < SUMMARY;
  const outcomes = checkpoint === SUMMARY;
  const line = dialogue ? content.dialogue[checkpoint] : question ? { speaker: "Сократ", text: content.returnDialogue[checkpoint - QUESTION_START] } : null;
  const button = checkpoint < PATH_START - 1 ? content.buttons.next : checkpoint === PATH_START - 1 ? content.buttons.research
    : checkpoint === PATH_START ? content.buttons.path
    : checkpoint === PATH_END ? content.buttons.question : checkpoint === QUESTION_START ? content.buttons.next : content.buttons.summary;

  useLayoutEffect(() => {
    if (previous.current === checkpoint) return;
    previous.current = checkpoint;
    if (!active) return;
    revealLessonTarget(reading.current);
    action.current?.focus({ preventScroll: true });
  }, [active, checkpoint]);

  function finish() {
    if (saving.current) return;
    saving.current = true;
    setError(false);
    try {
      completeLesson(scene.lessonId);
    } catch {
      setError(true);
      saving.current = false;
      return;
    }
    onClose();
  }

  return <section className={styles.scene} style={VIRTUE_MOTION_STYLE} data-testid="virtue-finale-scene">
    <header className={styles.header} data-testid="lesson-scene-header">
      <h2>{scene.title}</h2>
      <a href={content.source}>{content.adaptation}</a>
    </header>
    <figure className={styles.garden} data-summary={outcomes}>
      <Image key={String(outcomes)} className={styles.backdrop} src={outcomes ? content.gardenPath : scene.image.src} alt={outcomes ? content.gardenPathAlt : scene.imageAlt} fill sizes="(max-width: 760px) 100vw, 1180px" />
      <figcaption>{content.garden}</figcaption>
    </figure>
    <div ref={reading} className={styles.reading}>
      <MotionRegion active={active}><div className={styles.story}>
        {line && <div className={styles.reveal}>
          {question && <h3 className={styles.question}>{content.question}</h3>}
          <div role="status" aria-atomic="true">
            <div key={checkpoint} className={styles.reveal}>
              <p className={styles.speaker}>{line.speaker}</p><blockquote>{line.text}.</blockquote>
            </div>
          </div>
          {checkpoint === QUESTION_START + 1 && <div className={styles.directions}>
            <ul>{content.directions.map(item => <li key={item}>{item}</li>)}</ul>
            <p><strong>{content.transition}.</strong></p><p>{content.nextLesson}</p>
          </div>}
        </div>}
        {(path || checkpoint === QUESTION_START) && <div className={styles.reveal} data-retreat={!path} aria-hidden={!path}>
          <h3>{content.path}</h3>
          <ol className={styles.path} aria-label={content.path}>
            {content.steps.map(({ title, text, icon }, index) => {
              const Icon = icons[icon];
              const shown = checkpoint >= PATH_END;
              return <li key={title} data-lit={shown} style={{ "--delay": `${index * 105}ms` } as CSSProperties}>
                <Icon size={22} aria-hidden="true" /><h4>{title}</h4>
                {shown && <p className={styles.reveal}>{text}</p>}
              </li>;
            })}
          </ol>
          {checkpoint >= PATH_END && <p className={styles.open}><span aria-hidden="true">?</span>{content.open}</p>}
        </div>}
        {outcomes && <div className={styles.reveal}>
          <h3>{content.summary}</h3><p>{content.subtitle}.</p>
          <ul className={styles.outcomes}>{content.outcomes.map((item, index) => <li key={item} style={{ "--delay": `${index * 85}ms` } as CSSProperties}>{item}.</li>)}</ul>
          <figure className={styles.thought}><blockquote>{content.thought}.</blockquote><figcaption>{content.credit}</figcaption></figure>
        </div>}
      </div></MotionRegion>
      <div className={styles.actions}>
        {error && <p role="alert">{content.saveError}</p>}
        <Button ref={action} onClick={outcomes ? finish : () => setCheckpoint(value => Math.min(SUMMARY, value + 1))}>
          {outcomes ? content.buttons.finish : button}{!outcomes && <ArrowRight size={16} aria-hidden="true" />}
        </Button>
      </div>
    </div>
    <nav className={styles.nav} aria-label="Навигация по заключению">
      <Button variant="ghost" disabled={checkpoint === DIALOGUE_START} onClick={() => {
        setError(false);
        setCheckpoint(value => Math.max(DIALOGUE_START, value - 1));
      }}><ArrowLeft size={15} aria-hidden="true" />Назад</Button>
      <Button variant="ghost" onClick={onBack}>{content.buttons.back}</Button>
      <Button variant="ghost" onClick={() => { setError(false); setCheckpoint(DIALOGUE_START); }}>{content.buttons.replay}</Button>
      <Button variant="ghost" onClick={onClose}>{content.buttons.close}</Button>
    </nav>
  </section>;
}
