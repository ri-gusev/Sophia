"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { getImageProps } from "next/image";
import { Button } from "@/components/ui/button";
import type { IntroLesson } from "./lesson-data";
import { MentorScene } from "./mentor-scene";
import { DialogueScene } from "./dialogue-scene";
import { LessonScene } from "./lesson-scene";
import { LessonExercise } from "./lesson-exercise";
import { initialAnswer, isCorrect, lessonHash, readLessonLocation, restoreRun, type ExerciseAnswer } from "./lesson-state";
import styles from "./lesson-introduction.module.css";

export function LessonIntroduction({ lesson, initialSceneId, onClose }: {
  lesson: IntroLesson;
  initialSceneId?: string;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(() => restoreRun(lesson, null, initialSceneId));
  const index = Math.max(0, lesson.scenes.findIndex(item => item.id === run.sceneId));
  const scene = lesson.scenes[index];
  const exercise = scene.type === "single-choice" || scene.type === "ordering" ? scene : null;
  const answer = exercise ? run.exercises[scene.id] ?? initialAnswer(exercise) : null;
  const canContinue = !exercise || Boolean(answer && answer.checked && isCorrect(exercise, answer));
  const nextImage = lesson.scenes[index + 1]?.image;

  useEffect(() => {
    function followFragment() {
      const location = readLessonLocation(window.location.hash);
      if (location?.lessonId === lesson.id) setRun(previous => ({ ...previous, sceneId: location.sceneId }));
    }
    window.addEventListener("hashchange", followFragment);
    return () => window.removeEventListener("hashchange", followFragment);
  }, [lesson.id]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = lessonHash(lesson.id, run.sceneId);
    window.history.replaceState(window.history.state, "", url);
  }, [lesson.id, run.sceneId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = root.current?.querySelector<HTMLHeadingElement>("section:not([hidden] section) h2");
      if (!heading) return;
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
      const banner = heading.closest("section")?.querySelector<HTMLElement>('[data-testid="lesson-scene-header"]') ?? heading;
      if (scene.type !== "dialogue") heading.focus({ preventScroll: true });
      window.scrollTo({ top: Math.max(0, window.scrollY + banner.getBoundingClientRect().top - headerHeight - 24), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [scene.id, scene.type]);

  useEffect(() => {
    if (!nextImage) return;
    const { props } = getImageProps({ src: nextImage.src, alt: "", fill: true, sizes: "(max-width: 760px) 264px, 312px" });
    const image = new window.Image();
    image.sizes = props.sizes ?? "";
    image.srcset = props.srcSet ?? "";
    image.src = props.src;
    void image.decode().catch(() => {});
  }, [nextImage]);

  function updateAnswer(value: ExerciseAnswer) {
    setRun(previous => ({ ...previous, exercises: { ...previous.exercises, [scene.id]: value } }));
  }
  function move(direction: -1 | 1) {
    const destination = lesson.scenes[index + direction];
    if (!destination || (direction === 1 && !canContinue)) return;
    setRun(previous => ({ ...previous, sceneId: destination.id }));
  }

  return <div ref={root} className={styles.lesson} data-testid="lesson-introduction">
    <header className={styles.toolbar}>
      <div><p className={styles.lessonName}>{lesson.title}</p><span className={styles.duration}>{lesson.duration} · Платон</span></div>
      <span className={styles.step} aria-live="polite">Шаг {index + 1} из {lesson.scenes.length}</span>
      <button type="button" className={styles.close} aria-label="Закрыть урок" onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </header>
    <div className={styles.progress} role="progressbar" aria-label="Прогресс урока" aria-valuemin={1} aria-valuemax={lesson.scenes.length} aria-valuenow={index + 1}>
      <span style={{ width: `${(index + 1) / lesson.scenes.length * 100}%` }} />
    </div>
    {lesson.scenes.filter(item => item.type === "dialogue").map(item => item.type === "dialogue" && <div key={item.id} hidden={scene.id !== item.id}><DialogueScene scene={item} onClose={onClose} onContinue={() => move(1)} /></div>)}
    {scene.type === "dialogue" ? null : scene.type === "mentor-dialogue" ? <MentorScene key={scene.id} scene={scene} onBack={() => move(-1)} onClose={onClose} /> : <LessonScene scene={scene}
      navigation={<>
        <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => move(-1)}><ArrowLeft size={15} aria-hidden="true" />Назад</Button>
        <Button type="button" disabled={!canContinue} onClick={scene.type === "completion" ? onClose : () => move(1)}>
          {scene.buttonLabel}{scene.type !== "completion" && <ArrowRight size={15} aria-hidden="true" />}
        </Button>
      </>}>
      {exercise && answer && <LessonExercise scene={exercise} answer={answer} onChange={updateAnswer} />}
    </LessonScene>}
    {scene.type !== "dialogue" && scene.type !== "mentor-dialogue" && <details className={styles.sources}>
      <summary>Источники и иллюстрации</summary>
      <ul>{lesson.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
      {lesson.scenes.map(item => item.portrait && <p key={item.id}>
        Изображение: <a href={item.portrait.sourceUrl} target="_blank" rel="noreferrer">{item.portrait.title}</a>
        {" — "}{item.portrait.credit}{", "}<a href={item.portrait.licenseUrl} target="_blank" rel="noreferrer">{item.portrait.license}</a>.
      </p>)}
      <p>Иллюстрации сцен — художественные интерпретации, созданные для Sophia, а не документальные изображения.</p>
      <a href="/images/lessons/plato/README.md" target="_blank" rel="noreferrer">Происхождение иллюстраций</a>
    </details>}
  </div>;
}
