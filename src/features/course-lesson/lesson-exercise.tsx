"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCorrect, moveItem, type ExerciseAnswer, type ExerciseScene } from "./lesson-state";
import styles from "./lesson-introduction.module.css";

export function LessonExercise({ scene, answer, onChange }: {
  scene: ExerciseScene;
  answer: ExerciseAnswer;
  onChange: (answer: ExerciseAnswer) => void;
}) {
  const group = useId();
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (answer.checked) feedback.current?.focus({ preventScroll: true });
  }, [answer.checked]);
  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>{scene.question}</legend>
      {scene.type === "single-choice" ? <div className={styles.options}>
        {scene.options.map(option => <label key={option.id} className={`${styles.option} ${answer.selected === option.id ? styles.selected : ""}`}>
          <input type="radio" name={group} value={option.id} checked={answer.selected === option.id} disabled={answer.checked}
            onChange={() => onChange({ ...answer, selected: option.id })} />
          <span>{option.text}</span>
        </label>)}
      </div> : <ol className={styles.ordering} aria-label="Порядок философов">
        {answer.order.map((id, index) => {
          const option = scene.options.find(item => item.id === id)!;
          return <li key={id}>
            <span className={styles.ordinal} aria-hidden="true">0{index + 1}</span>
            <span data-testid="ordering-item-name">{option.text}</span>
            <div className={styles.moveButtons}>
              <button type="button" aria-label={`${option.text}: переместить выше`} disabled={answer.checked || index === 0}
                onClick={() => onChange({ ...answer, order: moveItem(answer.order, index, -1) })}><ArrowUp size={16} aria-hidden="true" /></button>
              <button type="button" aria-label={`${option.text}: переместить ниже`} disabled={answer.checked || index === answer.order.length - 1}
                onClick={() => onChange({ ...answer, order: moveItem(answer.order, index, 1) })}><ArrowDown size={16} aria-hidden="true" /></button>
            </div>
          </li>;
        })}
      </ol>}
    </fieldset>
    <div className={styles.checkRow}>
      {!answer.checked && <Button type="button" variant="outline" size="sm" disabled={scene.type === "single-choice" && !answer.selected}
        onClick={() => onChange({ ...answer, checked: true })}>Проверить</Button>}
    </div>
    <div className={styles.feedbackSlot}>
      {answer.checked && <p ref={feedback} role="status" tabIndex={-1} className={styles.feedback} data-testid="exercise-feedback">
        {isCorrect(scene, answer) ? scene.feedback.correct : scene.feedback.incorrect}
      </p>}
    </div>
  </div>;
}
