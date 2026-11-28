"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Fingerprint, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonSceneData } from "./lesson-data";
import { boundedIndex, oneOf } from "./lesson-resume";
import { useSceneState } from "./use-scene-state";
import {
  isDefinitionAnswers, isDefinitionAssignments,
  type DefinitionAnswers, type DefinitionAssignments, type DefinitionCardId,
  type DefinitionCategory, type DefinitionStage,
} from "./virtue-definition-practice-data";
import { DefinitionSituationArt } from "./virtue-definition-situation-art";
import { useFlipLayout } from "./use-flip-layout";
import { MotionRegion } from "./motion-region";
import { revealLessonTarget, VIRTUE_MOTION, VIRTUE_MOTION_STYLE } from "./virtue-motion";
import styles from "./virtue-definition-practice-scene.module.css";

const icons = { example: Fingerprint, definition: BookOpen, test: ScanSearch };

export function VirtueDefinitionPracticeScene({ scene, active, onBack, onClose, onContinue }: {
  scene: Extract<LessonSceneData, { type: "virtue-definition-practice" }>;
  active: boolean;
  onBack: () => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const content = scene.definitionPractice;
  const [stage, setStage] = useSceneState<DefinitionStage>(scene, "stage", "intro", oneOf(["intro", "sort", "test", "final"] as const));
  const [line, setLine] = useSceneState(scene, "line", 0, boundedIndex(content.intro.length));
  const [assignments, setAssignments] = useSceneState<DefinitionAssignments>(scene, "assignments", {}, isDefinitionAssignments);
  const [selected, setSelected] = useSceneState<DefinitionCardId | null>(scene, "selected", null, oneOf([null, ...content.cards.map(card => card.id)]));
  const [attempt, setAttempt] = useSceneState<DefinitionCategory | null>(scene, "attempt", null, oneOf([null, "example", "definition"] as const));
  const [caseIndex, setCaseIndex] = useSceneState(scene, "caseIndex", 0, boundedIndex(content.situations.length));
  const [answers, setAnswers] = useSceneState<DefinitionAnswers>(scene, "answers", {}, isDefinitionAnswers);
  const [closingLine, setClosingLine] = useSceneState(scene, "closingLine", 0, boundedIndex(content.closing.length));
  const area = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const caseAnchor = useRef<HTMLDivElement>(null);
  const captureLayout = useFlipLayout(board, "[data-statement]", assignments, active, VIRTUE_MOTION.card);
  const shouldScroll = useRef(false);
  const card = content.cards.find(item => item.id === selected);
  const sorted = Object.keys(assignments).length;
  const allSorted = sorted === content.cards.length;
  const situation = content.situations[caseIndex];
  const answer = answers[situation.id];
  const correct = answer === situation.correctAnswer;
  const tested = content.situations.every(item => answers[item.id] === item.correctAnswer);
  const feedback = card && (assignments[card.id] ? content.feedback[card.category] : attempt ? content.feedback.incorrect : null);

  useLayoutEffect(() => {
    if (!shouldScroll.current || !active) return;
    shouldScroll.current = false;
    area.current?.querySelector<HTMLElement>("[data-stage-action]:not(:disabled)")?.focus({ preventScroll: true });
    revealLessonTarget(stage === "test" ? caseAnchor.current : area.current);
  }, [stage, line, caseIndex, closingLine, active]);


  function advance(next: DefinitionStage) { shouldScroll.current = true; setStage(next); }
  function classify(category: DefinitionCategory) {
    if (!card || assignments[card.id]) return;
    setAttempt(category);
    if (card.category !== category) return;
    captureLayout();
    setAssignments(previous => ({ ...previous, [card.id]: category }));
  }
  function replay() {
    setLine(0); setAssignments({}); setSelected(null); setAttempt(null);
    setCaseIndex(0); setAnswers({}); setClosingLine(0); advance("intro");
  }

  function previousStep() {
    switch (stage) {
      case "intro":
        shouldScroll.current = true;
        setLine(line - 1);
        break;
      case "sort": {
        if (attempt && card && !assignments[card.id]) {
          setAttempt(null);
          break;
        }
        const lastCard = Object.keys(assignments).at(-1) as DefinitionCardId | undefined;
        if (lastCard) {
          captureLayout();
          const remaining = { ...assignments };
          delete remaining[lastCard];
          setAssignments(remaining);
          setSelected(lastCard);
          setAttempt(null);
        } else if (selected) {
          setSelected(null);
        } else {
          advance("intro");
        }
        break;
      }
      case "test":
        if (answer) {
          const remaining = { ...answers };
          delete remaining[situation.id];
          setAnswers(remaining);
        } else if (caseIndex > 0) {
          shouldScroll.current = true;
          setCaseIndex(caseIndex - 1);
        } else {
          setAnswers({});
          advance("sort");
        }
        break;
      case "final":
        if (closingLine > 0) {
          shouldScroll.current = true;
          setClosingLine(closingLine - 1);
        } else {
          advance("test");
        }
        break;
    }
  }

  return <section className={styles.scene} style={VIRTUE_MOTION_STYLE} data-testid="virtue-definition-practice-scene" data-stage={stage}>
    <header className={styles.header} data-testid="lesson-scene-header">
      <h2>{scene.title}</h2>
      <a href="https://classics.mit.edu/Plato/meno.html" target="_blank" rel="noreferrer">{content.adaptation}</a>
    </header>
    <div ref={area} className={styles.area}>
      {(stage === "intro" || stage === "final") && <div className={styles.meeting}>
        <div className={styles.portrait}><Image src="/images/lessons/dialogue/socrates.webp" alt="Учебный образ Сократа" width={640} height={960} sizes="(max-width: 760px) 170px, 290px" /></div>
        <div className={styles.speech}>
          <p className={styles.eyebrow}>Сократ · {content.workshop}</p>
          <blockquote key={`${stage}-${line}-${closingLine}`}>{stage === "intro" ? content.intro[line] : content.closing[closingLine]}</blockquote>
          {stage === "intro" && (line === 0 ? <Button data-stage-action onClick={() => { shouldScroll.current = true; setLine(1); }}>Далее<ArrowRight size={16} aria-hidden="true" /></Button> : <Button data-stage-action onClick={() => advance("sort")}>Начать исследование</Button>)}
          {stage === "final" && closingLine === 0 && <Button data-stage-action onClick={() => { shouldScroll.current = true; setClosingLine(1); }}>Далее<ArrowRight size={16} aria-hidden="true" /></Button>}
        </div>
      </div>}

      {stage === "sort" && <>
        <div className={styles.sortHeading}><div><p className={styles.eyebrow}>{content.workshop}</p><h3>Пример или попытка определения?</h3></div><p>{content.instruction}</p></div>
        <p className={styles.distinction}>{content.distinction}</p>
        <div ref={board} className={styles.board} data-complete={allSorted} aria-label="Таблички и области классификации" role="group">
          {content.categories.map((category, index) => <button key={category.id} type="button" className={styles.bin}
            style={{ "--column": index === 0 ? 1 : 4, "--mobile-column": index + 1, "--complete-row": index === 0 ? 1 : 4 } as CSSProperties}
            disabled={!card || Boolean(assignments[card.id])} onClick={() => classify(category.id)}>
            <span>{category.title}</span><small>{category.hint}</small>
          </button>)}
          <p className={styles.trayTitle}>Утверждения</p>
          {content.cards.map((item, index) => {
            const category = assignments[item.id];
            const rank = content.cards.slice(0, index).filter(other => assignments[other.id] === category).length;
            return <button key={item.id} type="button" data-stage-action data-statement={item.id}
              data-category={category ?? "pending"} className={styles.tablet} aria-pressed={selected === item.id}
              style={{ "--column": category === "example" ? 1 : category === "definition" ? 4 : rank % 2 + 2, "--row": category ? rank + 2 : Math.floor(rank / 2) + 2,
                "--mobile-column": category === "example" ? "1" : category === "definition" ? "2" : "1 / -1",
                "--mobile-row": rank + (category ? 7 : 3), "--complete-row": rank + (category === "example" ? 2 : 5), "--stagger": `${index * 95}ms` } as CSSProperties}
              onClick={() => { setSelected(item.id); setAttempt(null); }}>
              <span className={styles.letter}>{item.letter}{category && <span aria-label="Распределено"> ✓</span>}</span>
              <span className={styles.statement}>{item.text}</span>
              <small>{item.note}</small>
              {category && <span className={styles.assigned}>{content.categories.find(group => group.id === category)?.title}</span>}
            </button>;
          })}
        </div>
        <div className={styles.sortFooter}>
          <p className={styles.count}>Распределено: {sorted} из {content.cards.length}</p>
          <MotionRegion active={active}><div className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">{feedback && <p key={feedback}>{feedback}</p>}</div></MotionRegion>
          <MotionRegion active={active}>{allSorted && <div className={styles.discovery}><h3>{content.classified}</h3><p>{content.invitation}</p><Button onClick={() => advance("test")}>Проверить определение<ArrowRight size={16} aria-hidden="true" /></Button></div>}</MotionRegion>
        </div>
      </>}

      {stage === "test" && <>
        <div className={styles.definition} data-problem={correct}>
          <p className={styles.eyebrow}>{content.definitionCredit}</p><h3>{content.definition}</h3>
          <p>{content.testQuestion}</p>
          <div className={styles.badgeSlot}>{correct && <span className={styles.badge}>{content.finding}</span>}</div>
        </div>
        <div className={styles.connection} data-problem={correct} aria-hidden="true"><span /></div>
        <MotionRegion active={active}><div ref={caseAnchor} className={styles.case} key={situation.id}>
          <figure className={styles.caseArt}><DefinitionSituationArt kind={situation.art} /><figcaption>{situation.caption}</figcaption></figure>
          <div className={styles.caseReading}>
            <p className={styles.eyebrow}>Ситуация {caseIndex + 1} из 2 · {situation.title}</p>
            <p className={styles.description}>{situation.description}</p>
            <h4>{situation.question}</h4>
            <div role="group" aria-label={situation.question} className={styles.options}>
              {situation.options.map(option => <button type="button" key={option.id} data-stage-action
                aria-pressed={answer === option.id} disabled={correct} onClick={() => setAnswers(previous => ({ ...previous, [situation.id]: option.id }))}>{option.text}</button>)}
            </div>
            {answer && <div role="status" key={answer} className={styles.caseFeedback}><p>{correct ? situation.feedback : situation.incorrect}</p>{correct && <strong>{situation.finding}</strong>}</div>}
            <div className={styles.caseActions}>
              {caseIndex === 1 && <Button variant="ghost" onClick={() => { shouldScroll.current = true; setCaseIndex(0); }}>Предыдущая ситуация</Button>}
              {caseIndex === 0 && correct && <Button onClick={() => { shouldScroll.current = true; setCaseIndex(1); }}>Вторая ситуация<ArrowRight size={16} aria-hidden="true" /></Button>}
            </div>
          </div>
        </div></MotionRegion>
        <p className={styles.note}>{content.situationsNote}</p>
        <MotionRegion active={active}>{tested && <div className={styles.method}><h3>{content.conclusion}</h3><p>{content.explanation}</p><small>{content.conclusionNote}</small><Button onClick={() => advance("final")}>Подвести итог</Button></div>}</MotionRegion>
      </>}

      {stage === "final" && closingLine === 1 && <div className={styles.final}>
        <ol className={styles.steps} aria-label="Пример, определение, проверка">{content.steps.map(item => {
          const Icon = icons[item.icon];
          return <li key={item.title}><Icon aria-hidden="true" size={25} /><h3>{item.title}</h3><p>{item.text}</p></li>;
        })}</ol>
        <figure className={styles.thought}><blockquote>{content.thought}</blockquote><figcaption>Мысль урока · София</figcaption></figure>
        <p className={styles.note}>{content.conclusionNote}</p>
        <Button className="mt-4" onClick={onContinue}>Продолжить урок<ArrowRight size={16} aria-hidden="true" /></Button>
      </div>}
    </div>
    <nav className={styles.navigation} aria-label="Навигация по практике">
      <Button variant="ghost" size="sm" disabled={stage === "intro" && line === 0} onClick={previousStep}><ArrowLeft size={15} aria-hidden="true" />Назад</Button>
      <Button variant="ghost" size="sm" onClick={onBack}>К предыдущему</Button>
      <Button variant="ghost" size="sm" onClick={replay}>Повторить практику</Button>
      <Button variant="ghost" size="sm" onClick={onClose}>Вернуться в каталог</Button>
    </nav>
  </section>;
}
