"use client";

import { useId, useState } from "react";
import type { IntroLesson } from "./lesson-data";
import styles from "./lesson-introduction.module.css";

export function LessonIntroduction({ lesson }: { lesson: IntroLesson }) {
  const titleId = useId(), answerGroup = useId();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  return <section className={styles.lesson} aria-labelledby={titleId} data-testid="lesson-introduction">
    <div className={styles.reading}>
      <p className={styles.context}>{lesson.context}</p>
      <p className={styles.stage}>{lesson.stage}</p>
      <h2 id={titleId} className={styles.title} tabIndex={-1}>{lesson.title}</h2>
      <div className={styles.story}>
        {lesson.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <p className={styles.hook}>{lesson.hook}</p>
      </div>
      <fieldset className={styles.question}>
        <legend>{lesson.question.prompt}</legend>
        <div className={styles.options}>
          {lesson.question.options.map(option => <label
            key={option.id}
            className={`${styles.option} ${selectedAnswer === option.id ? styles.selected : ""}`}
          >
            <input type="radio" name={`${answerGroup}-${lesson.question.id}`} value={option.id}
              checked={selectedAnswer === option.id} onChange={() => setSelectedAnswer(option.id)} />
            <span>{option.text}</span>
            {selectedAnswer === option.id && <small aria-hidden="true">Твой выбор</small>}
          </label>)}
        </div>
      </fieldset>
    </div>
  </section>;
}
