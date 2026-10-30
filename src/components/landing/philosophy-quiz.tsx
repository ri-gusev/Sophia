"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowUpRight, Check, Lightbulb, RotateCcw, X } from "lucide-react";
import { DEMO_QUESTION } from "@/content/landing";
import { Button } from "@/components/ui/button";

export function PhilosophyQuiz() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const hasAnswered = selectedId !== null;
  const isCorrect = selectedId === DEMO_QUESTION.correctId;

  return (
    <section id="exercise" className="quiz-section container" aria-labelledby="quiz-title">
      <div className="quiz-intro">
        <span className="eyebrow">01 / От идеи к открытию</span>
        <h2 id="quiz-title">Попробуем <br />мыслить вместе?</h2>
        <p>Философия — не только чтение.<br />Это вопросы, выбор и маленькие открытия.</p>
        <span className="handwritten">Начнём с одного вопроса <span aria-hidden="true">↗</span></span>
      </div>
      <div className="quiz-card glass">
        <div className="quiz-top"><span className="pill"><Lightbulb size={14} aria-hidden="true" /> Разминка для ума</span><span className="micro-label">Демо-упражнение</span></div>
        <h3>{DEMO_QUESTION.prompt}</h3>
        <div className="quiz-options" role="group" aria-label="Варианты ответа">
          {DEMO_QUESTION.options.map((option, index) => {
            const chosen = selectedId === option.id;
            const correct = hasAnswered && option.id === DEMO_QUESTION.correctId;
            return (
              <button
                key={option.id}
                ref={index === 0 ? firstOption : undefined}
                type="button"
                className={`quiz-option ${chosen ? "is-selected" : ""} ${correct ? "is-correct" : ""} ${chosen && !isCorrect ? "is-wrong" : ""}`}
                aria-pressed={chosen}
                disabled={hasAnswered}
                onClick={() => setSelectedId(option.id)}
              >
                <span className="option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                <span>{option.label}</span>
                {correct ? <Check size={18} aria-label="Правильный ответ" /> : chosen ? <X size={18} aria-label="Неверный ответ" /> : null}
              </button>
            );
          })}
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" className={hasAnswered ? "quiz-feedback" : ""}>
          {hasAnswered && <><strong>{isCorrect ? "Верно! Сомнение ведёт к открытию." : "Не совсем. Это Рене Декарт — познакомимся с его идеей."}</strong><p>{DEMO_QUESTION.explanation}</p></>}
        </div>
        {hasAnswered ? (
          <div className="quiz-footer"><Button variant="outline" size="sm" onClick={() => {
            // Commit the reset before focusing an option that was disabled.
            flushSync(() => setSelectedId(null));
            firstOption.current?.focus();
          }}><RotateCcw size={15} aria-hidden="true" />Попробовать ещё раз</Button><a className="source-link" href={DEMO_QUESTION.source} target="_blank" rel="noreferrer">Первоисточник <ArrowUpRight size={13} aria-hidden="true" /><span className="sr-only"> (новая вкладка)</span></a></div>
        ) : <p className="quiz-hint">Выбери ответ. Здесь любая попытка — повод узнать больше.</p>}
      </div>
    </section>
  );
}
