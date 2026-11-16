"use client";

import { Fragment, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { isCorrect, type ExerciseAnswer, type ExerciseScene } from "./lesson-state";
import { PhilosopherOrdering } from "./philosopher-ordering";
import styles from "./lesson-introduction.module.css";

export function LessonExercise({ scene, answer, onChange }: {
  scene: ExerciseScene;
  answer: ExerciseAnswer;
  onChange: (answer: ExerciseAnswer) => void;
}) {
  const group = useId();
  const feedback = useRef<HTMLParagraphElement>(null);
  const solved = answer.checked && isCorrect(scene, answer);
  const questionParts = scene.questionHighlight ? scene.question.split(scene.questionHighlight) : [scene.question];
  useEffect(() => {
    if (answer.checked) feedback.current?.focus({ preventScroll: true });
  }, [answer.checked]);
  return <div className={styles.exercise} data-exercise-type={scene.type} data-exercise-solved={solved}>
    <div data-exercise-content>
    <fieldset className={styles.question}>
      <legend className={scene.questionHighlight ? styles.highlightedQuestion : undefined}>{questionParts.map((part, index) => <Fragment key={index}>
        {index > 0 && <span className={styles.questionHighlight}>{scene.questionHighlight}</span>}
        {part}
      </Fragment>)}</legend>
      {scene.type === "single-choice" ? <div className={styles.options}>
        {scene.options.map(option => <label key={option.id} className={`${styles.option} ${answer.selected === option.id ? styles.selected : ""}`}>
          <input type="radio" name={group} value={option.id} checked={answer.selected === option.id} disabled={solved}
            onChange={() => onChange({ ...answer, selected: option.id, checked: false })} />
          <span>{option.text}</span>
        </label>)}
      </div> : <PhilosopherOrdering scene={scene} answer={answer} solved={solved} onChange={onChange} />}
    </fieldset>
    <div className={styles.checkRow}>
      {!solved && <Button type="button" variant="outline" size="sm" disabled={scene.type === "single-choice" && !answer.selected}
        onClick={() => onChange({ ...answer, checked: true })}>Проверить</Button>}
    </div>
    </div>
    <div className={styles.feedbackSlot} data-exercise-feedback>
      {answer.checked && <p ref={feedback} role="status" tabIndex={-1} className={styles.feedback} data-testid="exercise-feedback">
        {solved ? scene.feedback.correct : "Ответ неверный"}
      </p>}
    </div>
  </div>;
}
