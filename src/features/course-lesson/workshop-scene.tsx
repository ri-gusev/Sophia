"use client";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import shared from "./mentor-scene.module.css";
import styles from "./workshop-scene.module.css";

export function WorkshopScene({ scene, onBack, onClose }: { scene: Extract<LessonSceneData, { type: "question-workshop" }>; onBack: () => void; onClose: () => void }) {
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
  return <section className={shared.scene} data-testid="workshop-scene">
    <header data-testid="lesson-scene-header"><h2>{scene.title}</h2></header>
    <div className={shared.composition}>
      <div className={styles.art}>
        <div className={styles.youth}><Image src={data.characters[1].portrait} alt={data.characters[1].alt} fill sizes="(max-width:760px) 100vw, 500px" /><span>{data.characters[1].name}</span></div>
        <div className={styles.socrates}><Image src={data.characters[0].portrait} alt={data.characters[0].alt} fill sizes="(max-width:760px) 180px, 270px" /><span>{data.characters[0].name}</span></div>
      </div>
      <div className={shared.reading}>
        <div className={shared.bubbleSpace}><div key={turn} className={shared.bubble} role="status" aria-live="polite" aria-atomic="true"><span>{line.speaker}</span><p>{line.text}</p></div></div>
        {!ready && <nav className={shared.navigation} aria-label="Вступление"><Button variant="ghost" disabled={turn === 0} onClick={() => setTurn(value => value - 1)}>Назад</Button><span>{turn + 1} / {data.lines.length}</span><Button onClick={next}>Далее</Button></nav>}
        {ready && <div className={styles.task}>
          <h3><label htmlFor={id}>{data.question}</label></h3><p id={`${id}-help`}>{data.instruction}</p>
          <textarea ref={input} id={id} aria-describedby={`${id}-help`} placeholder={data.placeholder} value={draft} onChange={event => setDraft(event.target.value)} rows={4} readOnly={example} />
          {!example && <div className={styles.buttons}><Button disabled={!draft.trim()} onClick={() => setExample(true)}>Посмотреть пример</Button><Button variant="ghost" onClick={() => setHint(value => !value)} aria-expanded={hint}>Нужна подсказка</Button>{!draft.trim() && <Button variant="ghost" onClick={() => setExample(true)}>Не знаю — покажи пример</Button>}</div>}
          {hint && <p className={styles.hint} role="status">{data.hint}</p>}
          {example && <Button variant="ghost" onClick={() => { setExample(false); requestAnimationFrame(() => input.current?.focus()); }}>Изменить свой вопрос</Button>}
        </div>}
      </div>
    </div>
    {example && <div className={styles.result}>
      <p>{data.introduction}</p><div className={shared.bubble}><span>Сократ</span><p>{data.example}</p></div>
      {data.explanation.map(text => <p key={text}>{text}</p>)}
      <div className={styles.reaction}>{data.reaction.map(text => <p key={text}>{text}</p>)}</div>
      <div className={styles.comparison}>{data.comparison.map(item => <div key={item.title}><span>{item.title}</span><p>{item.text}</p></div>)}</div>
      <p className={styles.closing}>{data.closing}</p>
    </div>}
    <p className={shared.note}>{data.note}</p>
    <nav className={shared.actions} aria-label="Навигация по заданию"><Button variant="ghost" onClick={onBack}>К предыдущему слайду</Button>{example && <><Button variant="ghost" onClick={repeat}>Повторить задание</Button><Button onClick={onClose}>Вернуться к курсу</Button></>}</nav>
  </section>;
}
