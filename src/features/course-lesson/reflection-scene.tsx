"use client";
import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { BookOpen, MessageCircleQuestion, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSceneState } from "./use-scene-state";
import { boundedIndex, isBoolean } from "./lesson-resume";
import type { LessonSceneData } from "./lesson-data";
import shared from "./mentor-scene.module.css";
import styles from "./reflection-scene.module.css";
const icons = { question: MessageCircleQuestion, search: Search, book: BookOpen };
export function LessonReflectionScene({ scene, onBack, onComplete, feedback }: { scene: Extract<LessonSceneData, {type:"lesson-reflection"}>; onBack:()=>void; onComplete:()=>void; feedback: ReactNode }) {
  const [turn,setTurn] = useSceneState(scene, "turn", 0, boundedIndex(scene.reflection.lines.length));
  const [summary,setSummary] = useSceneState(scene, "summary", false, isBoolean);
  const conclusion = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const data = scene.reflection;
  const final = turn === data.lines.length-1;
  function next() { if(performance.now()-last.current<400)return; last.current=performance.now(); setSummary(false);setTurn(value=>Math.min(data.lines.length-1,value+1)); }
  function showSummary() { setSummary(true); requestAnimationFrame(() => conclusion.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })); }
  return <section className={shared.scene} data-testid="reflection-scene">
    <header data-testid="lesson-scene-header"><p>{scene.subtitle}</p><h2>{scene.title}</h2></header>
    <div className={`${shared.composition} ${styles.garden}`}>
      <div className={shared.art}><Image src={scene.image.src} alt="" fill sizes="40vw" className={shared.background}/><div className={shared.figure}><Image src={data.portrait} alt="Сократ в тихом саду среди оливковых деревьев" fill sizes="(max-width:760px) 400px, 550px"/></div></div>
      <div className={`${shared.reading} ${styles.speech}`}><div className={shared.bubbleSpace}><div key={turn} className={shared.bubble} role="status" aria-live="polite" aria-atomic="true"><span>Сократ</span><p>{data.lines[turn]}</p></div></div>
        <nav className={shared.navigation} aria-label="Заключительная речь"><Button variant="ghost" disabled={turn===0} onClick={()=>{setSummary(false);setTurn(value=>value-1);}}>Назад</Button><span>{turn+1} / {data.lines.length}</span><Button disabled={summary} onClick={()=>final?showSummary():next()}>{final?"Посмотреть итоги":"Далее"}</Button></nav>
      </div>
    </div>
    {summary && <div ref={conclusion} className={styles.summary} style={{ scrollMarginTop: "110px" }}><h3>Чему ты научился?</h3><div className={styles.outcomes}>{data.outcomes.map(item=>{const Icon=icons[item.icon];return <div key={item.title}><Icon size={25} aria-hidden="true"/><h4>{item.title}</h4><p>{item.text}</p></div>;})}</div>
      <blockquote><p>{data.thought}.</p><footer>{data.attribution}</footer></blockquote>
      {feedback}
      <div className={styles.finish}><Button onClick={onComplete}>Завершить урок</Button></div>
    </div>}
    <p className={shared.note}>{data.note}</p><nav className={shared.actions} aria-label="Навигация финала"><Button variant="ghost" onClick={onBack}>К предыдущему слайду</Button><Button variant="ghost" onClick={()=>{setTurn(0);setSummary(false);last.current=0;}}>Повторить речь</Button></nav>
  </section>;
}
