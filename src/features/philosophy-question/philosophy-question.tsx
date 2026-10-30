"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHILOSOPHY_QUESTION } from "./question";

type AnswerId = (typeof PHILOSOPHY_QUESTION.options)[number]["id"];

export function PhilosophyQuestion() {
  const [selectedId, setSelectedId] = useState<AnswerId | null>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const hasAnswered = selectedId !== null;

  return (
    <div id="exercise" className="question-card glass" role="group" aria-label="Философский вопрос">
      <div className="question-top"><span className="pill"><MessageCircle size={14} aria-hidden="true" />Поразмышляем?</span><span className="micro-label">Самостоятельное демо</span></div>
      <h2 id={titleId}>{PHILOSOPHY_QUESTION.prompt}</h2>
      <div className="question-options" role="group" aria-labelledby={titleId}>
        {PHILOSOPHY_QUESTION.options.map((option, index) => (
          <button
            key={option.id}
            ref={index === 0 ? firstOption : undefined}
            type="button"
            className={`question-option ${selectedId === option.id ? "is-selected" : ""}`}
            aria-pressed={selectedId === option.id}
            disabled={hasAnswered}
            onClick={() => setSelectedId(option.id)}
          >
            <span className="option-letter" aria-hidden="true">0{index + 1}</span>
            <span>{option.label}</span>
            {selectedId === option.id && <span className="selection-label" aria-hidden="true">Твой выбор</span>}
          </button>
        ))}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className={hasAnswered ? "question-feedback" : ""}>
        {hasAnswered && <p>{PHILOSOPHY_QUESTION.explanation}</p>}
      </div>
      {hasAnswered ? (
        <Button className="question-reset" variant="outline" size="sm" onClick={() => {
          flushSync(() => setSelectedId(null));
          firstOption.current?.focus();
        }}><RotateCcw size={15} aria-hidden="true" />Попробовать ещё раз</Button>
      ) : <p className="question-hint">Здесь нет единственно правильного ответа. А как думаешь ты?</p>}
    </div>
  );
}
