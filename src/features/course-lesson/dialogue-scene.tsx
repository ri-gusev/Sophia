"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import styles from "./dialogue-scene.module.css";

export function DialogueScene({ scene, onContinue }: { scene: Extract<LessonSceneData, { type: "dialogue" }>; onContinue?: () => void }) {
  const [turn, setTurn] = useState(0);

  const lastAdvance = useRef(0);
  const { characters, lines, explanation } = scene.dialogue;
  const line = lines[turn];
  const speaker = characters.find(character => character.id === line.speaker)!;
  const final = turn === lines.length - 1;
  const [complete, setComplete] = useState(false);
  function move(direction: -1 | 1) {
    if (direction === 1 && performance.now() - lastAdvance.current < 400) return;
    lastAdvance.current = performance.now();

    setComplete(false);
    setTurn(value => Math.max(0, Math.min(lines.length - 1, value + direction)));
  }
  return <section className={styles.scene} data-testid="dialogue-scene" aria-labelledby={`title-${scene.id}`}>
    <header className={styles.heading} data-testid="lesson-scene-header">
      <p>Пирей · Во дворе Кефала</p>
      <h2 id={`title-${scene.id}`}>{scene.title}</h2>
      <span>По мотивам «Государства» Платона · I, 331c–331d</span>
    </header>
    <div className={styles.stage} data-complete={complete}>
      <Image className={styles.background} src={scene.image.src} alt={scene.imageAlt} fill priority sizes="(max-width: 760px) 100vw, 1180px" />
      <button type="button" className={styles.advance} aria-label="Следующая реплика в сцене" disabled={final} onClick={() => move(1)} />
      {characters.map(character => <figure key={character.id} className={styles.character} data-position={character.position} data-speaking={line.speaker === character.id}>
        <Image src={character.portrait} alt={character.alt} fill priority sizes="(max-width: 600px) 46vw, 350px" />
        <figcaption>{character.name}</figcaption>
      </figure>)}
      <div className={styles.bubbleSlot} data-position={speaker.position}>
        <div key={turn} className={styles.bubble} role="status" aria-live="polite" aria-atomic="true">
          <span>{speaker.name}</span><p>{line.text}</p>
        </div>
      </div>
    </div>
    <nav className={styles.navigation} aria-label="Управление диалогом">
      <Button variant="ghost" size="sm" aria-label="Предыдущая реплика" disabled={turn === 0} onClick={() => move(-1)}>← Назад</Button>
      <span data-testid="dialogue-counter">{turn + 1} / {lines.length}</span>
      <Button size="sm" disabled={complete} onClick={() => { if (final) { setComplete(true); requestAnimationFrame(() => document.getElementById(`explanation-${scene.id}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })); } else move(1); }}>{final ? "Разобрать разговор" : "Далее"}</Button>
    </nav>
    <p className={styles.hint}>{final ? "Побудь немного с этим вопросом." : "Читай в своём темпе · Нажми на сцену или «Далее»"}</p>
    {complete && <div id={`explanation-${scene.id}`} className={styles.explanation}>

      <h3>{explanation.title}</h3>
      {explanation.paragraphs.map(paragraph => <p key={paragraph}>{paragraph === explanation.emphasis ? <strong>{paragraph}</strong> : paragraph}</p>)}
      <p className={styles.note}>{explanation.note} <a href={explanation.source} target="_blank" rel="noreferrer">Первоисточник ↗</a></p>
      <div className={styles.actions}><Button variant="ghost" onClick={() => { setComplete(false); setTurn(0); lastAdvance.current = 0; document.getElementById(`title-${scene.id}`)?.scrollIntoView({ block: "start" }); }}>Повторить диалог</Button>{onContinue && <Button onClick={onContinue}>Продолжить урок</Button>}</div>
    </div>}
  </section>;
}
