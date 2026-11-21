"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { getImageProps } from "next/image";
import { Button } from "@/components/ui/button";
import type { IntroLesson, LessonSceneData } from "./lesson-data";
import { LessonReflectionScene } from "./reflection-scene";
import { WorkshopScene } from "./workshop-scene";
import { PracticeScene } from "./practice-scene";
import { MentorScene } from "./mentor-scene";
import { DialogueScene } from "./dialogue-scene";
import { VirtueIntroScene } from "./virtue-intro-scene";
import { VirtueSwarmScene } from "./virtue-swarm-scene";
import { VirtueFinaleScene } from "./virtue-finale-scene";
import { VirtueDefinitionPracticeScene } from "./virtue-definition-practice-scene";
import { VirtueGalleryScene } from "./virtue-gallery-scene";
import { LessonScene } from "./lesson-scene";
import { LessonExercise } from "./lesson-exercise";
import { initialAnswer, isCorrect, lessonHash, readLessonLocation, restoreRun, type ExerciseAnswer } from "./lesson-state";
import { useSceneState } from "./use-scene-state";
import { isBoolean, readResumeRun, readResumeScroll, resetSceneResume, writeResumeRun, writeResumeScroll } from "./lesson-resume";
import styles from "./lesson-introduction.module.css";

export function LessonIntroduction({ lesson, initialSceneId, onClose }: {
  lesson: IntroLesson;
  initialSceneId?: string;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(() => restoreRun(lesson, readResumeRun(lesson.id), initialSceneId));
  const [sceneVersions, setSceneVersions] = useState<Record<string, number>>({});
  const discardedScroll = useRef<string | null>(null);
  const index = Math.max(0, lesson.scenes.findIndex(item => item.id === run.sceneId));
  const scene = lesson.scenes[index];
  const virtueScene = scene.type === "virtue-intro" || scene.type === "virtue-gallery" || scene.type === "virtue-swarm" || scene.type === "virtue-definition-practice" || scene.type === "virtue-finale";
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
    writeResumeRun(lesson.id, { version: 1, ...run });
    const url = new URL(window.location.href);
    url.hash = lessonHash(lesson.id, run.sceneId);
    window.history.replaceState(window.history.state, "", url);
  }, [lesson.id, run]);

  useEffect(() => {
    const savedOffset = readResumeScroll(lesson.id, scene.id);
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    let attached = false;
    let lastOffset = savedOffset ?? 0;
    let banner: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function save() {
      if (discardedScroll.current !== scene.id) writeResumeScroll(lesson.id, scene.id, lastOffset);
    }
    function saveOnExit() { if (banner) lastOffset = -banner.getBoundingClientRect().top; save(); }
    function remember() {
      if (banner) lastOffset = -banner.getBoundingClientRect().top;
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    }
    const frame = requestAnimationFrame(() => {
      const heading = root.current?.querySelector<HTMLHeadingElement>("section:not([hidden] section) h2");
      if (!heading) return;
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
      banner = heading.closest("section")?.querySelector<HTMLElement>('[data-testid="lesson-scene-header"]') ?? heading;
      // Store a position within the slide: the catalog above it may disappear on reload.
      const origin = window.scrollY + banner.getBoundingClientRect().top;
      window.scrollTo({ top: Math.max(0, origin + (savedOffset ?? -headerHeight - 24)), behavior: "instant" });
      lastOffset = -banner.getBoundingClientRect().top;
      window.addEventListener("scroll", remember, { passive: true });
      window.addEventListener("pagehide", saveOnExit);
      attached = true;
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      if (attached) save();
      if (discardedScroll.current === scene.id) discardedScroll.current = null;
      window.removeEventListener("scroll", remember);
      window.removeEventListener("pagehide", saveOnExit);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [lesson.id, scene.id]);

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
    if (direction === -1 && virtueScene) {
      // The previous slide keeps its state. Restart the departed slide on the next visit.
      discardedScroll.current = scene.id;
      resetSceneResume(lesson.id, scene.id);
      setSceneVersions(previous => ({ ...previous, [scene.id]: (previous[scene.id] ?? 0) + 1 }));
    }
    setRun(previous => ({ ...previous, sceneId: destination.id }));
  }

  return <div ref={root} className={styles.lesson} data-testid="lesson-introduction">
    <header className={styles.toolbar}>
      <div><p className={styles.lessonName}>{lesson.title}</p><span className={styles.duration}>{lesson.duration} · Платон</span></div>
      <span className={styles.step} aria-live="polite">{lesson.plannedSlides ? `Слайд ${index + 1} из ${lesson.plannedSlides}` : `Шаг ${index + 1} из ${lesson.scenes.length}`}</span>
      <button type="button" className={styles.close} aria-label="Закрыть урок" onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </header>
    {!virtueScene && <div className={styles.progress} role="progressbar" aria-label="Прогресс урока" aria-valuemin={1} aria-valuemax={lesson.scenes.length} aria-valuenow={index + 1}>
      <span style={{ width: `${(index + 1) / lesson.scenes.length * 100}%` }} />
    </div>}
    {lesson.scenes.map(item => {
      const key = `${item.id}:${sceneVersions[item.id] ?? 0}`;
      if (item.type === "virtue-intro") return <div key={key} hidden={scene.id !== item.id}><VirtueIntroScene scene={item} active={scene.id === item.id} onClose={onClose} onContinue={() => move(1)} /></div>;
      if (item.type === "virtue-gallery") return <div key={key} hidden={scene.id !== item.id}><VirtueGalleryScene scene={item} active={scene.id === item.id} onContinue={() => move(1)} onBack={() => move(-1)} onClose={onClose} /></div>;
      if (item.type === "virtue-swarm") return <div key={key} hidden={scene.id !== item.id}><VirtueSwarmScene scene={item} active={scene.id === item.id} onContinue={() => move(1)} onBack={() => move(-1)} onClose={onClose} /></div>;
      if (item.type === "virtue-definition-practice") return <div key={key} hidden={scene.id !== item.id}><VirtueDefinitionPracticeScene onContinue={() => move(1)} scene={item} active={scene.id === item.id} onBack={() => move(-1)} onClose={onClose} /></div>;
      if (item.type === "virtue-finale") return <div key={key} hidden={scene.id !== item.id}><VirtueFinaleScene scene={item} active={scene.id === item.id} onBack={() => move(-1)} onClose={onClose} /></div>;
      return null;
    })}
    {lesson.scenes.filter(item => item.type === "dialogue").map(item => item.type === "dialogue" && <div key={item.id} hidden={scene.id !== item.id}><DialogueScene scene={item} onContinue={() => move(1)} /></div>)}
    {lesson.scenes.map(item => item.type === "mentor-dialogue" ? <div key={item.id} hidden={scene.id !== item.id}><MentorScene scene={item} onBack={() => move(-1)} onContinue={() => move(1)} /></div> : item.type === "guided-practice" ? <div key={item.id} hidden={scene.id !== item.id}><PracticeScene scene={item} onBack={() => move(-1)} onContinue={() => move(1)} /></div> : item.type === "question-workshop" ? <div key={item.id} hidden={scene.id !== item.id}><WorkshopScene scene={item} onBack={() => move(-1)} onContinue={() => move(1)} /></div> : item.type === "lesson-reflection" ? <div key={item.id} hidden={scene.id !== item.id}><LessonReflectionScene scene={item} onBack={() => move(-1)} onComplete={onClose} /></div> : null)}
    {virtueScene || scene.type === "dialogue" || scene.type === "mentor-dialogue" || scene.type === "guided-practice" || scene.type === "question-workshop" || scene.type === "lesson-reflection" ? null : <LessonScene scene={scene}
      navigation={<>
        <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => move(-1)}><ArrowLeft size={15} aria-hidden="true" />Назад</Button>
        <Button type="button" disabled={!canContinue} onClick={scene.type === "completion" ? onClose : () => move(1)}>
          {scene.buttonLabel}{scene.type !== "completion" && <ArrowRight size={15} aria-hidden="true" />}
        </Button>
      </>}>
      {exercise && answer && <LessonExercise scene={exercise} answer={answer} onChange={updateAnswer} />}
    </LessonScene>}
    {!virtueScene && scene.type !== "dialogue" && scene.type !== "mentor-dialogue" && scene.type !== "guided-practice" && scene.type !== "question-workshop" && scene.type !== "lesson-reflection" && <LessonSources key={scene.id} scene={scene} lesson={lesson} />}
  </div>;
}

function LessonSources({ scene, lesson }: { scene: LessonSceneData; lesson: IntroLesson }) {
  const [open, setOpen] = useSceneState(scene, "sourcesOpen", false, isBoolean);
  return <details className={styles.sources} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>Источники и иллюстрации</summary>
      <ul>{lesson.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
      {lesson.scenes.map(item => item.portrait && <p key={item.id}>
        Изображение: <a href={item.portrait.sourceUrl} target="_blank" rel="noreferrer">{item.portrait.title}</a>
        {" — "}{item.portrait.credit}{", "}<a href={item.portrait.licenseUrl} target="_blank" rel="noreferrer">{item.portrait.license}</a>.
      </p>)}
      <p>Иллюстрации сцен — художественные интерпретации, созданные для Sophia, а не документальные изображения.</p>
      <a href="/images/lessons/plato/README.md" target="_blank" rel="noreferrer">Происхождение иллюстраций</a>
    </details>;
}
