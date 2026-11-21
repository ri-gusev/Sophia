"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { useSceneState } from "./use-scene-state";
import { boundedIndex, isBoolean, listOf, oneOf } from "./lesson-resume";
import type { LessonSceneData } from "./lesson-data";
import type { SwarmMode, SwarmStage } from "./virtue-swarm-data";
import { VirtueBee } from "./virtue-bee";
import styles from "./virtue-swarm-scene.module.css";

export function VirtueSwarmScene({ scene, active, onBack, onClose }: {
  scene: Extract<LessonSceneData, { type: "virtue-swarm" }>;
  active: boolean; onBack: () => void; onClose: () => void;
}) {
  const content = scene.swarm;
  const [stage, setStage] = useSceneState<SwarmStage>(scene, "stage", "intro", oneOf(["intro", "garden", "explore", "bridge", "practice", "final"] as const));
  const [line, setLine] = useSceneState(scene, "line", 0, boundedIndex(content.intro.length));
  const [mode, setMode] = useSceneState<SwarmMode | null>(scene, "mode", null, oneOf([null, "differences", "common"] as const));
  const [visited, setVisited] = useSceneState<readonly SwarmMode[]>(scene, "visited", [], listOf(["differences", "common"] as const));
  const [answer, setAnswer] = useSceneState<string | null>(scene, "answer", null, oneOf([null, ...content.options.map(option => option.id)]));
  const [parallel, setParallel] = useSceneState(scene, "parallel", false, isBoolean);
  const [paused, setPaused] = useSceneState(scene, "paused", false, isBoolean);
  const focus = useRef<HTMLHeadingElement>(null);
  const shouldFocus = useRef(false);
  useLayoutEffect(() => {
    if (shouldFocus.current) { focus.current?.scrollIntoView({ block: "nearest" }); shouldFocus.current = false; }
  }, [stage, line, parallel]);
  function advance(next: SwarmStage) { shouldFocus.current = true; setStage(next); }
  function replay() {
    setLine(0); setMode(null); setVisited([]); setAnswer(null); setParallel(false); setPaused(false); advance("intro");
  }
  function chooseMode(next: SwarmMode) {
    setMode(next); setVisited(previous => previous.includes(next) ? previous : [...previous, next]);
  }
  const correct = answer === content.correctAnswer;
  const gathered = stage === "final";
  const bridge = stage === "bridge" || stage === "practice";
  const speech = stage === "intro" ? content.intro[line] : stage === "garden" ? content.observation : stage === "explore" ? content.modes.find(item => item.id === mode)?.speech ?? content.observation : stage === "bridge" ? content.bridge[line] : stage === "final" ? content.closing : null;

  return <section className={styles.scene} data-testid="virtue-swarm-scene">
    <header className={styles.header} data-testid="lesson-scene-header">
      <h2>{scene.title}</h2>
      <a href="https://classics.mit.edu/Plato/meno.html" target="_blank" rel="noreferrer">{content.adaptation}</a>
    </header>
    <div className={styles.composition}>
      {stage === "intro" ? <div className={styles.portrait}>
        <Image src="/images/lessons/dialogue/socrates.webp" alt="Учебный образ Сократа" width={640} height={960} sizes="(max-width: 760px) 180px, 300px" />
      </div> : <div className={styles.gardenWrap}>
        <div className={styles.garden} data-testid="swarm-garden" data-mode={mode} data-gathered={gathered} data-muted={bridge} data-paused={paused}>
          <svg className={styles.landscape} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Солнечный средиземноморский сад с оливами, колоннами и цветами">
            <defs>
              <linearGradient id="swarm-sky" x2="0" y2="1"><stop stopColor="#eee9ce"/><stop offset="1" stopColor="#f9f7e9"/></linearGradient>
              <radialGradient id="swarm-light"><stop stopColor="#fff7cf" stopOpacity=".9"/><stop offset="1" stopColor="#fff7cf" stopOpacity="0"/></radialGradient>
            </defs>
            <path fill="url(#swarm-sky)" d="M0 0H800V600H0z"/>
            <circle cx="580" cy="80" r="300" fill="url(#swarm-light)"/>
            <path d="M0 376Q180 300 380 374T800 342V600H0" fill="#d1d9bc"/>
            <path d="M0 464Q200 403 430 448T800 410V600H0" fill="#b8c59c" opacity=".65"/>
            <path d="M420 600Q315 470 542 368Q385 455 274 600" fill="#e9dfbf"/>
            <g fill="#e9e3cf" stroke="#d9d2bb" strokeWidth="3"><path d="M592 99H800V122H592zM615 122H642V383H615zM714 122H742V378H714z"/><path d="M603 379H654V393H603zM702 375H754V389H702z"/></g>
            <g fill="none" stroke="#8e8c68" strokeWidth="12" strokeLinecap="round"><path d="M-10 563Q120 304 98 50M84 266Q160 150 274 127M101 148Q43 112 0 117"/></g>
            <g fill="#819779" opacity=".7">{[ [70,80,-30],[101,148,30],[130,195,-25],[168,158,25],[208,132,-20],[245,115,32],[40,109,-30],[75,220,20],[42,291,-35] ].map(([x,y,r], i) => <ellipse key={i} cx={x} cy={y} rx="39" ry="11" transform={`rotate(${r} ${x} ${y})`}/>)}</g>
            <g stroke="#81916a" strokeWidth="3" fill="none"><path d="M50 600Q45 499 92 449M113 600Q136 490 161 470M685 600Q663 496 714 448M747 600Q762 514 746 487M215 600L206 538"/></g>
            <g fill="#b397ac">{[[92,449],[161,470],[714,448],[746,487],[206,538]].map(([x,y],i)=><g key={i}><ellipse cx={x} cy={y} rx="12" ry="24"/><ellipse cx={x} cy={y} rx="12" ry="24" transform={`rotate(60 ${x} ${y})`}/><ellipse cx={x} cy={y} rx="12" ry="24" transform={`rotate(-60 ${x} ${y})`}/><circle cx={x} cy={y} r="6" fill="#e4c27f"/></g>)}</g>
          </svg>
          {content.bees.map((bee, i) => <div key={i} className={styles.position} data-bee={i} style={{ "--x": `${bee.x}%`, "--y": `${bee.y}%`, "--gather-x": `${34 + (i % 3) * 16}%`, "--gather-y": `${36 + Math.floor(i / 3) * 22}%`, "--size": bee.size, "--duration": `${bee.duration}s`, "--delay": `${bee.delay}s`, "--tilt": `${bee.tilt}deg` } as CSSProperties}>
            <div className={styles.arrival}><div className={styles.flight}><VirtueBee shade={bee.shade} body={bee.body}/>
              {stage === "explore" && mode === "differences" && bee.label && <span className={styles.marker}>{bee.label}</span>}
            </div></div>
          </div>)}
          {stage === "explore" && mode === "common" && <div className={styles.common}><span aria-hidden="true">?</span><p>{content.beeQuestion}</p></div>}
          {bridge && <div className={styles.reminders}>{content.reminders.map(text => <span key={text}>{text}</span>)}</div>}
        </div>
        <div className={styles.caption}><span>Сад Сократа · условная иллюстрация</span><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Продолжить движение" : "Приостановить движение"}</button></div>
      </div>}
      <div className={styles.dialogue}>
        <p className={styles.speaker}>Сократ</p>
        <h3 ref={focus} className={styles.stageTitle}>{stage === "intro" ? "Неожиданная аналогия" : stage === "practice" ? content.question : stage === "final" ? content.parallel[parallel ? 1 : 0] : stage === "bridge" ? "Вернёмся к добродетели" : "Два способа смотреть"}</h3>
        {speech && <blockquote key={`${stage}-${line}-${mode}`}>{speech}</blockquote>}
        {stage === "intro" && (line < 2 ? <Button onClick={() => { shouldFocus.current = true; setLine(line + 1); }}>Далее</Button> : <Button onClick={() => advance("garden")}>Посмотреть на рой</Button>)}
        {stage === "garden" && <Button onClick={() => advance("explore")}>Исследовать рой</Button>}
        {stage === "explore" && <>
          <div className={styles.modes} role="group" aria-label="Способ исследования">{content.modes.map(item => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => chooseMode(item.id)}>{item.title}</button>)}</div>
          <p className={styles.status} role="status">Исследовано: {visited.length} из 2 способов</p>
          <Button disabled={visited.length < 2} onClick={() => { setLine(0); advance("bridge"); }}>А при чём здесь добродетель?</Button>
        </>}
        {stage === "bridge" && <Button onClick={() => line === 0 ? (setLine(1), shouldFocus.current = true) : advance("practice")}>{line === 0 ? "Далее" : "Попробовать самому"}</Button>}
        {stage === "practice" && <>
          <div className={styles.options} role="group" aria-label={content.question}>{content.options.map(option => <button key={option.id} type="button" aria-pressed={answer === option.id} disabled={correct} data-correct={correct && answer === option.id} onClick={() => setAnswer(option.id)}>{option.text}</button>)}</div>
          {answer && <p className={styles.feedback} role="status">{correct ? content.correct : content.incorrect}</p>}
          {correct && <Button onClick={() => advance("final")}>Открыть общую мысль</Button>}
        </>}
        {gathered && <>{!parallel ? <Button onClick={() => { shouldFocus.current = true; setParallel(true); }}>А добродетели?</Button> : <>
          <p className={styles.explanation}>{content.explanation}</p>
          <figure className={styles.thought}><blockquote>{content.thought}</blockquote><figcaption>Мысль урока · Sophia</figcaption></figure>
        </>}</>}
      </div>
    </div>
    <nav className={styles.navigation} aria-label="Навигация по слайду">
      <Button variant="ghost" size="sm" onClick={onBack}>Ко второму слайду</Button>
      <Button variant="ghost" size="sm" onClick={replay}>Повторить сцену</Button>
      <Button variant="ghost" size="sm" onClick={onClose}>Вернуться в каталог</Button>
    </nav>
    <style>{!active ? `[data-testid="virtue-swarm-scene"] * { animation-play-state: paused !important; }` : ""}</style>
  </section>;
}
