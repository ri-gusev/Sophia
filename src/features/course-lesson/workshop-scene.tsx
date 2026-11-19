"use client";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import styles from "./workshop-scene.module.css";

export function WorkshopScene({ scene, onBack, onContinue }: { scene: Extract<LessonSceneData, { type: "question-workshop" }>; onBack: () => void; onContinue?: () => void }) {
  const [turn, setTurn] = useState(0);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState(false);
  const [example, setExample] = useState(false);
  const lastAdvance = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const data = scene.workshop;
  const ready = turn === data.lines.length - 1;
  const line = data.lines[turn];
  function next() { if (performance.now() - lastAdvance.current < 400) return; lastAdvance.current = performance.now(); setTurn(value => Math.min(data.lines.length - 1, value + 1)); }
  function repeat() { setTurn(0); setDraft(""); setHint(false); setExample(false); lastAdvance.current = 0; }
  return <section className={styles.scene} data-testid="workshop-scene">
    <header data-testid="lesson-scene-header"><h2>{scene.title}</h2></header>
    <div className={styles.dialogue}>
      <div className={styles.illustration}><Image src={data.illustration.src} alt={data.illustration.alt} fill priority sizes="(max-width:760px) 100vw, 440px" /></div>
      <div className={styles.conversation}>
        <div className={styles.lineSlot}><div key={turn} className={styles.line} role="status" aria-live="polite" aria-atomic="true"><span>{line.speaker}</span><p>{line.text}</p></div></div>
        <nav className={styles.navigation} aria-label="Вступление"><Button variant="ghost" size="sm" disabled={turn === 0} onClick={() => setTurn(value => value - 1)}>Назад</Button><span>{turn + 1} / {data.lines.length}</span><Button size="sm" disabled={ready} onClick={next}>Далее</Button></nav>
      </div>
    </div>
    {ready && <div className={styles.task}>
      <h3><label htmlFor={id}>{data.question}</label></h3>
      <p className={styles.assertion}>{data.assertion.before} <strong>{data.assertion.emphasis}</strong> {data.assertion.after}.</p>
      <p id={`${id}-instruction`} className={styles.instruction}>{data.instruction}</p>
      <textarea ref={input} id={id} aria-describedby={`${id}-instruction`} placeholder={data.placeholder} value={draft} onChange={event => setDraft(event.target.value)} rows={4} readOnly={example} />
      {!example && <div className={styles.buttons}><Button disabled={!draft.trim()} onClick={() => setExample(true)}>Сравнить с вопросом Сократа</Button><Button variant="ghost" onClick={() => setHint(value => !value)} aria-expanded={hint} aria-controls={`${id}-hint`}>Получить подсказку</Button>{!draft.trim() && <button className={styles.skip} onClick={() => setExample(true)}>Не знаю — покажи пример</button>}</div>}
      {hint && <div id={`${id}-hint`} className={styles.hint} role="status"><span>Сократ</span><p>{data.hint}</p></div>}
      {example && <Button variant="ghost" onClick={() => { setExample(false); requestAnimationFrame(() => input.current?.focus()); }}>Изменить свой вопрос</Button>}
    </div>}
    {example && ready && <div className={styles.result} aria-live="polite">
      <div className={styles.questions} data-has-draft={Boolean(draft.trim())}>
        {draft.trim() && <div><h3>Твой вопрос</h3><p>{draft}</p></div>}
        <div className={styles.socraticQuestion}><h3>Вопрос Сократа</h3><p>{data.example}</p></div>
      </div>
      <div className={styles.explanation}>{data.explanation.map((item,index) => <div key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></div>)}</div>
      <div className={styles.comparison}>{data.comparison.map(item => <div key={item.title}><span>{item.title}</span><p>{item.text}</p></div>)}</div>
      <div className={styles.final}><span>Сократ</span><p>{data.reaction}</p><strong>{data.closing}.</strong></div>
    </div>}
    <p className={styles.note}>{data.note}</p>
    <nav className={styles.actions} aria-label="Навигация по заданию"><Button variant="ghost" onClick={onBack}>К предыдущему слайду</Button>{example && <><Button variant="ghost" onClick={repeat}>Повторить задание</Button>{onContinue && <Button onClick={onContinue}>Продолжить урок</Button>}</>}</nav>
  </section>;
}
