"use client";
import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSceneState } from "./use-scene-state";
import { boundedIndex, isBoolean, oneOf } from "./lesson-resume";
import type { LessonSceneData } from "./lesson-data";
import shared from "./mentor-scene.module.css";
import styles from "./practice-scene.module.css";

export function PracticeScene({ scene, onBack, onContinue }: { scene: Extract<LessonSceneData, { type: "guided-practice" }>; onBack: () => void; onContinue?: () => void }) {
  const [turn, setTurn] = useSceneState(scene, "turn", 0, boundedIndex(scene.practice.lines.length));
  const [selected, setSelected] = useSceneState<string | null>(scene, "selected", null, oneOf([null, ...scene.practice.options.map(option => option.id)]));
  const [checked, setChecked] = useSceneState(scene, "checked", false, isBoolean);
  const lastAdvance = useRef(0);
  const group = useId();
  const data = scene.practice;
  const ready = turn === data.lines.length - 1;
  const correct = checked && selected === data.correctAnswer;
  const feedbackRef = useRef<HTMLDivElement>(null);
  const previousChecked = useRef(checked);
  useEffect(() => {
    if (previousChecked.current === checked) return;
    previousChecked.current = checked;
    if (!checked) return;
    const frame = requestAnimationFrame(() => {
      const feedback = feedbackRef.current;
      if (!feedback || feedback.closest("[hidden]")) return;
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
      const top = feedback.getBoundingClientRect().top;
      const targetTop = Math.max(headerHeight + 24, window.innerHeight * 0.22);
      if (top <= targetTop) return;
      window.scrollBy({
        top: top - targetTop,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [checked]);
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
          {checked && <div ref={feedbackRef} className={styles.feedback} role="status" aria-live="polite"><span>{data.character.name}</span><p>{correct ? data.correct : data.incorrect}</p></div>}
        </div>}
      </div>
    </div>
    {correct && <div className={styles.discovery}>
      <p>{data.assertion.before} <span className={styles.strike}>{data.assertion.word}</span> {data.assertion.after}.</p>
      <h3>{data.discovery}.</h3>
      <div className={styles.summary}>{data.summary.map((text, index) => <p key={text}>{index === 0 ? <strong>{text}</strong> : text}</p>)}</div>
    </div>}
    <nav className={shared.actions} aria-label="Навигация по заданию"><Button variant="ghost" onClick={onBack}>К предыдущему слайду</Button>{correct && <Button variant="ghost" onClick={repeat}>Повторить задание</Button>}{correct && onContinue && <Button onClick={onContinue}>Продолжить урок</Button>}</nav>
  </section>;
}
