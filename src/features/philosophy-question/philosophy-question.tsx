"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Check, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/features/account/progress/client/lesson-progress-provider";
import { isoDate, labelForDay, nextMoscowMidnight } from "./daily-calendar";
import { createDailyQuizStore, quizStorageKey } from "./daily-quiz-store";
import { visibleStreak } from "./daily-streak";
import { questionForDay } from "./question";
import styles from "./philosophy-question.module.css";

const ignitionMs = 900;

export function PhilosophyQuestion({ initialDay }: { initialDay: number }) {
  const { accountId, sessionUnavailable } = useProgressStore();
  const storageKey = sessionUnavailable ? null : quizStorageKey(accountId);
  return <QuizScope key={storageKey ?? "unavailable"} initialDay={initialDay} storageKey={storageKey} />;
}

function QuizScope({ initialDay, storageKey }: { initialDay: number; storageKey: string | null }) {
  const [store] = useState(() => createDailyQuizStore(initialDay, storageKey));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return <QuestionCard key={snapshot.day} snapshot={snapshot} submit={store.submit} />;
}

type QuizStore = ReturnType<typeof createDailyQuizStore>;

function QuestionCard({ snapshot, submit }: { snapshot: ReturnType<QuizStore["getSnapshot"]>; submit: QuizStore["submit"] }) {
  const { day, progress, status } = snapshot;
  const date = isoDate(day);
  const question = questionForDay(day);
  const heading = useId();
  const prompt = useId();
  const [draft, setDraft] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const answer = progress?.lastDate === date ? progress.selectedIndex : null;
  const streak = visibleStreak(progress, day);
  const answered = answer !== null;

  useEffect(() => {
    if (!celebrating) return;
    feedback.current?.focus();
    const timeout = window.setTimeout(() => setCelebrating(false), ignitionMs);
    return () => window.clearTimeout(timeout);
  }, [celebrating]);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft === null || pending || answered || status !== "ready") return;
    setPending(true);
    setSaveFailed(false);
    try {
      if (await submit(day, draft)) setCelebrating(true);
    } catch {
      setSaveFailed(true);
    } finally {
      setPending(false);
    }
  }

  const futureProgress = progress !== null && progress.lastDate > date;
  let warning = "";
  if (status === "account-unavailable" || status === "stale") warning = "Не удалось проверить аккаунт. Обновите страницу, чтобы ответить.";
  if (status === "storage-unavailable") warning = "Разрешите сайту сохранять данные в браузере и обновите страницу.";
  if (futureProgress) warning = "Проверьте дату на устройстве перед ответом.";
  if (saveFailed) warning = "Не удалось сохранить ответ. Попробуйте ещё раз.";
  const disabled = status !== "ready" || futureProgress || pending;

  return (
    <div id="exercise" className={"glass " + styles.card} role="group" aria-labelledby={heading}>
      <div className={styles.top}>
        <h2 id={heading}>Вопрос дня</h2>
        <Streak count={streak} active={answered} celebrating={celebrating && answered} />
      </div>
      <div className={styles.metadata}>
        <span className="pill">{question.category}</span>
        <time dateTime={date} className="micro-label">{labelForDay(day)}</time>
      </div>
      <h3 id={prompt} className={styles.prompt}>{question.question}</h3>
      <form onSubmit={confirm}>
        <div className={styles.options} role="radiogroup" aria-labelledby={prompt}>
          {question.options.map((option, index) => {
            const selected = (answer ?? draft) === index;
            const correct = answered && index === question.correctIndex;
            const wrong = answered && selected && !correct;
            return (
              <label className={styles.option} key={option} data-result={correct ? "correct" : wrong ? "incorrect" : undefined}>
                <input type="radio" name={prompt} checked={selected} disabled={answered || disabled} onChange={() => setDraft(index)} />
                <span className={styles.marker} aria-hidden="true">
                  {correct ? <Check size={14} /> : wrong ? <X size={14} /> : <span />}
                </span>
                <span className={styles.optionContent}>
                  <span>{option}</span>
                  {correct && <span className={styles.optionResult}>Правильный ответ</span>}
                  {wrong && <span className={styles.optionResult}>Ваш ответ</span>}
                </span>
              </label>
            );
          })}
        </div>
        {!answered && (
          <Button type="submit" size="sm" className={styles.submit} disabled={draft === null || disabled}>
            Проверить ответ
          </Button>
        )}
      </form>
      {warning && <p className={styles.warning} role="alert">{warning}</p>}
      <div ref={feedback} tabIndex={-1} role="status" className={answered ? styles.feedback : undefined}
        data-entering={celebrating && answered ? "true" : undefined}>
        {answered && (
          <>
            <div className={styles.resultLine}>
              <strong>{answer === question.correctIndex ? "Верно!" : "Не совсем!"}</strong>
              <span className={styles.reward}>Серия продлена</span>
            </div>
            <p>{question.explanation}</p>
            <p className={styles.source}>
              <a href={question.sourceUrl} rel="noreferrer" target="_blank">{question.source}</a>
            </p>
          </>
        )}
      </div>
      {answered && <Countdown midnight={nextMoscowMidnight(day)} />}
    </div>
  );
}

function Streak({ count, active, celebrating }: { count: number; active: boolean; celebrating: boolean }) {
  const tipId = useId();
  const gradient = useId();
  const [tipOpen, setTipOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = tipOpen || hovered;
  const tip = active ? "Ответ за сегодня уже учтён"
    : count > 0 ? "Ответьте на вопрос дня, чтобы продлить серию" : "Ответьте на вопрос дня, чтобы начать серию";

  return (
    <div className={styles.streak} onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}>
      <button type="button" className={styles.streakButton} data-state={active ? "active" : "inactive"}
        data-celebrating={celebrating ? "true" : undefined} aria-label={"Ежедневная серия — " + count}
        aria-expanded={expanded} aria-controls={tipId} aria-describedby={tipId} onClick={() => setTipOpen(open => !open)}
        onBlur={() => setTipOpen(false)}
        onKeyDown={event => { if (event.key === "Escape") { setTipOpen(false); setHovered(false); } }}>
        <Flame size={19} className={styles.flame} aria-hidden="true"
          fill={active ? "url(#" + gradient + ")" : "none"} stroke={active ? "url(#" + gradient + ")" : "currentColor"}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2=".35" y2="1" gradientUnits="objectBoundingBox">
              <stop stopColor="#f6bf4d" />
              <stop offset="1" stopColor="#b64d19" />
            </linearGradient>
          </defs>
        </Flame>
        <span className={styles.counter} data-previous={Math.max(0, count - 1)} aria-hidden="true">
          <span>{count}</span>
        </span>
      </button>
      <span id={tipId} role="tooltip" className={styles.streakTip} hidden={!expanded}>{tip}</span>
    </div>
  );
}

function Countdown({ midnight }: { midnight: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((midnight - now) / 1000));
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
  return <p role="timer" className={styles.countdown}>До следующего вопроса <span>{time}</span></p>;
}
