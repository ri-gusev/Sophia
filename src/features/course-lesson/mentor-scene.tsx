"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import styles from "./mentor-scene.module.css";

export function MentorScene({ scene, onBack, onClose }: { scene: Extract<LessonSceneData, { type: "mentor-dialogue" }>; onBack: () => void; onClose: () => void }) {
  const [turn, setTurn] = useState(0);
  const lastAdvance = useRef(0);
  const { character, lines, stages, conclusion, note } = scene.mentor;
  const final = turn === lines.length - 1;
  const active = stages.findLastIndex(stage => stage.afterTurn <= turn + 1);
  function move(direction: -1 | 1) {
    if (direction === 1 && performance.now() - lastAdvance.current < 400) return;
    lastAdvance.current = performance.now();
    setTurn(value => Math.max(0, Math.min(lines.length - 1, value + direction)));
  }
  return <section className={styles.scene} data-testid="mentor-scene">
    <header data-testid="lesson-scene-header"><p>{scene.subtitle}</p><h2>{scene.title}</h2></header>
    <div className={styles.composition}>
      <div className={styles.art}>
        <Image src={scene.image.src} alt="" fill sizes="(max-width: 760px) 100vw, 45vw" className={styles.background} />
        <div key={turn} className={styles.figure}><Image src={character.portrait} alt={character.alt} fill priority sizes="(max-width: 760px) 400px, 550px" /></div>
      </div>
      <div className={styles.reading}>
        <div className={styles.bubbleSpace}><div key={turn} role="status" aria-live="polite" aria-atomic="true" className={styles.bubble}><span>{character.name}</span><p>{lines[turn]}</p></div></div>
        <nav aria-label="Реплики Сократа" className={styles.navigation}>
          <Button variant="ghost" size="sm" disabled={turn === 0} onClick={() => move(-1)}>Назад</Button>
          <span>{turn + 1} / {lines.length}</span>
          <Button size="sm" disabled={final} onClick={() => move(1)}>Далее</Button>
        </nav>
        <ol className={styles.stages} aria-label="Как проверяли утверждение">
          {stages.map((stage, index) => <li key={stage.title} data-active={index === active} data-revealed={index <= active}>
            <span className={styles.number}>{index + 1}</span>
            {index <= active ? <><h3>{stage.title}</h3><p>{stage.text}</p></> : <span className={styles.waiting}>Следующий этап</span>}
          </li>)}
        </ol>
      </div>
    </div>
    {final && <div className={styles.conclusion}><h3>{conclusion.title}</h3>{conclusion.paragraphs.map(text => <p key={text}>{text}</p>)}<p className={styles.emphasis}>{conclusion.emphasis}</p></div>}
    <p className={styles.note}>{note}</p>
    <nav className={styles.actions} aria-label="Навигация по уроку">
      <Button variant="ghost" onClick={onBack}>К предыдущему слайду</Button>
      {final && <Button variant="ghost" onClick={() => { setTurn(0); lastAdvance.current = 0; }}>Повторить объяснение</Button>}
      <Button onClick={onClose}>Вернуться к курсу</Button>
    </nav>
  </section>;
}
