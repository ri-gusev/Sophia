"use client";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import shared from "./mentor-scene.module.css";
import styles from "./practice-scene.module.css";

export function PracticeScene({ scene, onBack }: { scene: Extract<LessonSceneData, { type: "guided-practice" }>; onBack: () => void }) {
  const [turn, setTurn] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const lastAdvance = useRef(0);
  const group = useId();
  const data = scene.practice;
  const ready = turn === data.lines.length - 1;
  const correct = checked && selected === data.correctAnswer;
  function next() { if (performance.now() - lastAdvance.current < 400) return; lastAdvance.current = performance.now(); setTurn(value => Math.min(data.lines.length - 1, value + 1)); }
  function repeat() { setTurn(0); setSelected(null); setChecked(false); lastAdvance.current = 0; }
  return <section className={shared.scene} data-testid="practice-scene">
    <header data-testid="lesson-scene-header"><h2>{scene.title}</h2></header>
    <div className={shared.composition}>
      <div className={`${shared.art} ${styles.portraitArea}`}><Image src={scene.image.src} alt="" fill className={shared.background} sizes="40vw" /><div className={shared.figure}><Image src={data.character.portrait} alt={data.character.alt} fill sizes="(max-width:760px) 400px, 550px" /></div></div>
      <div className={shared.reading}>
        <div className={shared.bubbleSpace}><div key={turn} className={shared.bubble} role="status" aria-live="polite" aria-atomic="true"><span>{data.character.name}</span><p>{data.lines[turn]}</p></div></div>
        {!ready && <nav className={shared.navigation} aria-label="Вступление к заданию"><Button variant="ghost" disabled={turn === 0} onClick={() => setTurn(value => value - 1)}>Назад</Button><span>{turn + 1} / {data.lines.length}</span><Button onClick={next}>Далее</Button></nav>}
        {ready && <div className={styles.exercise}>
          <fieldset><legend>{data.question}</legend>
            {data.options.map(option => <label key={option.id} className={styles.option} data-selected={selected === option.id}>
              <input type="radio" name={group} value={option.id} checked={selected === option.id} disabled={correct} onChange={() => { setSelected(option.id); setChecked(false); }} /><span>{option.text}</span>
            </label>)}
          </fieldset>
          <Button disabled={!selected || correct} onClick={() => setChecked(true)}>Проверить</Button>
          {checked && <div className={styles.feedback} role="status" aria-live="polite"><span>{data.character.name}</span><p>{correct ? data.correct : data.incorrect}</p></div>}
        </div>}
      </div>
    </div>
    {correct && <div className={styles.discovery}>
      <p>{data.assertion.before} <span className={styles.strike}>{data.assertion.word}</span> {data.assertion.after}.</p>
      <h3>{data.discovery}.</h3><p>{data.closing}</p>
      <div className={styles.summary}>{data.summary.map((text, index) => <p key={text}>{index === 0 ? <strong>{text}</strong> : text}</p>)}</div>
    </div>}
    <nav className={shared.actions} aria-label="Навигация по заданию"><Button variant="ghost" onClick={onBack}>К предыдущему слайду</Button>{correct && <Button variant="ghost" onClick={repeat}>Повторить задание</Button>}</nav>
  </section>;
}
