"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { getImageProps } from "next/image";
import { Button } from "@/components/ui/button";
import { useProgressSnapshot, useProgressStore } from "@/features/account/progress/client/lesson-progress-provider";
import type { IntroLesson, IntroLessonId, LessonSceneData } from "./lesson-data";
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
import { LessonSlideNavigator } from "./lesson-slide-navigator";
import { confirmedSlides, confirmSlideTransition, finishLesson, subscribeLessonProgress } from "./lesson-slide-progress";
import { initialAnswer, isCorrect, lessonHash, readLessonLocation, restoreRun, type ExerciseAnswer } from "./lesson-state";
import { useSceneState } from "./use-scene-state";
import { PRIMARY_SOURCES } from "./primary-source-data";
import { PrimarySourceLink } from "./primary-source-link";
import { isBoolean, readResumeRun, readResumeScroll, resetSceneResume, writeResumeAnswer, writeResumeScene, writeResumeScroll } from "./lesson-resume";
import styles from "./lesson-introduction.module.css";

const emptyProgress = () => "[]";

export function LessonIntroduction({ lesson, initialSceneId, onClose }: {
  lesson: IntroLesson & { id: IntroLessonId };
  initialSceneId?: string;
  onClose: () => void;
}) {
  const store = useProgressStore();
  const { accountId } = store;
  const snapshot = useProgressSnapshot();
  const accountLesson = snapshot.progress?.lessons.find(entry => entry.lessonId === lesson.id);
  const root = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(() => {
    const exercises = lesson.scenes.filter(scene => scene.type === "single-choice" || scene.type === "ordering");
    return restoreRun(lesson, readResumeRun(lesson.id, exercises.map(scene => scene.id), accountId),
      initialSceneId ?? accountLesson?.resumeSceneId ?? undefined);
  });
  const mountedSceneId = useRef(run.sceneId);
  const [sceneVersions, setSceneVersions] = useState<Record<string, number>>({});
  const [saveError, setSaveError] = useState(false);
  const [missingSlide, setMissingSlide] = useState<string | null>(null);
  const [resumeFailure, setResumeFailure] = useState<string | null>(null);
  const [resumeAttempts, setResumeAttempts] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);
  const progressAction = useRef<symbol | null>(null);
  const guestProgress = useSyncExternalStore(subscribeLessonProgress, () => {
    if (accountId !== null) return emptyProgress();
    try { return JSON.stringify(confirmedSlides(lesson)); } catch { return emptyProgress(); }
  }, emptyProgress);
  const confirmed = new Set<string>(accountId === null ? JSON.parse(guestProgress) : accountLesson?.confirmedSceneIds);
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
      if (location?.lessonId === lesson.id) {
        progressAction.current = null;
        setSavingProgress(false);
        setMissingSlide(null);
        setSaveError(false);
        setRun(previous => previous.sceneId === location.sceneId ? previous : { ...previous, sceneId: location.sceneId });
      }
    }
    window.addEventListener("hashchange", followFragment);
    window.addEventListener("popstate", followFragment);
    return () => {
      window.removeEventListener("hashchange", followFragment);
      window.removeEventListener("popstate", followFragment);
    };
  }, [lesson.id]);

  useEffect(() => {
    if (accountId === null) {
      writeResumeScene(lesson.id, run.sceneId);
      return;
    }
    let active = true;
    void store.request({ action: "resume", lessonId: lesson.id, sceneId: run.sceneId }).then(
      () => { if (active) setResumeFailure(null); },
      () => { if (active) setResumeFailure(run.sceneId); },
    );
    return () => { active = false; };
  }, [accountId, lesson.id, run.sceneId, resumeAttempts, store]);

  useEffect(() => () => { progressAction.current = null; }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = lessonHash(lesson.id, mountedSceneId.current);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [lesson.id]);

  useEffect(() => {
    const savedOffset = readResumeScroll(lesson.id, scene.id, accountId);
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    let attached = false;
    let lastOffset = savedOffset ?? 0;
    let banner: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function save() {
      if (discardedScroll.current !== scene.id) writeResumeScroll(lesson.id, scene.id, lastOffset, accountId);
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
  }, [accountId, lesson.id, scene.id]);

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
    writeResumeAnswer(lesson.id, scene.id, value, accountId);
    setRun(previous => ({ ...previous, exercises: { ...previous.exercises, [scene.id]: value } }));
  }

  function openSlide(id: string, push = false) {
    if (id === scene.id || !lesson.scenes.some(item => item.id === id)) return;
    progressAction.current = null;
    setSavingProgress(false);
    setMissingSlide(null);
    setSaveError(false);
    const url = new URL(window.location.href);
    url.hash = lessonHash(lesson.id, id);
    if (push) window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
    setRun(previous => ({ ...previous, sceneId: id }));
  }

  function saveAccountProgress(action: "confirm" | "finish", onSaved: (missingSceneId?: string) => void) {
    if (progressAction.current) return;
    const token = Symbol();
    progressAction.current = token;
    setSavingProgress(true);
    setSaveError(false);
    setMissingSlide(null);
    void store.request({ action, lessonId: lesson.id, sceneId: scene.id }).then(
      result => {
        if (progressAction.current !== token) return;
        progressAction.current = null;
        setSavingProgress(false);
        onSaved(result.missingSceneId);
      },
      () => {
        if (progressAction.current !== token) return;
        progressAction.current = null;
        setSavingProgress(false);
        setSaveError(true);
      },
    );
  }

  function finish() {
    if (accountId !== null) {
      saveAccountProgress("finish", missing => missing ? setMissingSlide(missing) : onClose());
      return;
    }
    setSaveError(false);
    try {
      const result = finishLesson(lesson, scene.id);
      if (!result) return;
      if (result.missing) setMissingSlide(result.missing);
      else onClose();
    } catch {
      setMissingSlide(null);
      setSaveError(true);
    }
  }

  const feedback = missingSlide ? <div className={styles.saveFeedback}>
    <p role="alert">Чтобы завершить урок, пройди оставшиеся слайды.</p>
    <Button type="button" variant="outline" onClick={() => openSlide(missingSlide, true)}>К первому непройденному слайду</Button>
  </div> : saveError ? <p role="alert" className={styles.saveFeedback}>{accountId === null
    ? "Не удалось сохранить прогресс в этом браузере. Разреши локальное хранилище и попробуй снова."
    : "Не удалось сохранить прогресс в аккаунте. Попробуй ещё раз."}</p> : null;

  function move(direction: -1 | 1) {
    const destination = lesson.scenes[index + direction];
    if (!destination || (direction === 1 && !canContinue)) return;
    if (direction === 1) {
      if (accountId !== null) {
        saveAccountProgress("confirm", () => openSlide(destination.id));
        return;
      }
      try { confirmSlideTransition(lesson, scene.id); } catch {
        // Keep reading available, while leaving the failed slide unconfirmed.
        openSlide(destination.id);
        setSaveError(true);
        return;
      }
    } else if (virtueScene) {
      // The previous slide keeps its state. Restart the departed slide on the next visit.
      discardedScroll.current = scene.id;
      resetSceneResume(lesson.id, scene.id, accountId);
      setSceneVersions(previous => ({ ...previous, [scene.id]: (previous[scene.id] ?? 0) + 1 }));
    }
    openSlide(destination.id);
  }

  return <div ref={root} className={styles.lesson} data-testid="lesson-introduction">
    <header className={styles.toolbar}>
      <div><p className={styles.lessonName}>{lesson.title}</p><span className={styles.duration}>{lesson.duration} · Платон</span></div>
      <span className={styles.step} aria-live="polite">{lesson.plannedSlides ? `Слайд ${index + 1} из ${lesson.plannedSlides}` : `Шаг ${index + 1} из ${lesson.scenes.length}`}</span>
      <button type="button" className={styles.close} aria-label="Закрыть урок" onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </header>
    <div className={styles.slideLayout}>
    <LessonSlideNavigator lesson={lesson} currentId={scene.id} confirmed={confirmed} onSelect={id => openSlide(id, true)} />
    <div className={styles.slideContent}>
    {!virtueScene && <div className={styles.progress} role="progressbar" aria-label="Прогресс урока" aria-valuemin={0} aria-valuemax={lesson.scenes.length} aria-valuenow={confirmed.size}>
      <span style={{ width: `${confirmed.size / lesson.scenes.length * 100}%` }} />
    </div>}
    {savingProgress && <p role="status" className={styles.saveFeedback}>Сохраняем прогресс…</p>}
    {resumeFailure === scene.id && <div className={styles.saveFeedback}>
      <p role="alert">Не удалось сохранить место в уроке.</p>
      <Button type="button" variant="outline" onClick={() => setResumeAttempts(value => value + 1)}>Повторить сохранение</Button>
    </div>}
    {saveError && index !== lesson.scenes.length - 1 && feedback}
    {lesson.scenes.map(item => {
      const key = `${item.id}:${sceneVersions[item.id] ?? 0}`;
      if (item.type === "virtue-intro") return <div key={key} hidden={scene.id !== item.id}><VirtueIntroScene scene={item} active={scene.id === item.id} onClose={onClose} onContinue={() => move(1)} /></div>;
      if (item.type === "virtue-gallery") return <div key={key} hidden={scene.id !== item.id}><VirtueGalleryScene scene={item} active={scene.id === item.id} onContinue={() => move(1)} onBack={() => move(-1)} onClose={onClose} /></div>;
      if (item.type === "virtue-swarm") return <div key={key} hidden={scene.id !== item.id}><VirtueSwarmScene scene={item} active={scene.id === item.id} onContinue={() => move(1)} onBack={() => move(-1)} onClose={onClose} /></div>;
      if (item.type === "virtue-definition-practice") return <div key={key} hidden={scene.id !== item.id}><VirtueDefinitionPracticeScene onContinue={() => move(1)} scene={item} active={scene.id === item.id} onBack={() => move(-1)} onClose={onClose} /></div>;
      if (item.type === "virtue-finale") return <div key={key} hidden={scene.id !== item.id}><VirtueFinaleScene scene={item} active={scene.id === item.id} onBack={() => move(-1)} onClose={onClose} onComplete={finish} feedback={feedback} /></div>;
      return null;
    })}
    {lesson.scenes.filter(item => item.type === "dialogue").map(item => item.type === "dialogue" && <div key={item.id} hidden={scene.id !== item.id}><DialogueScene scene={item} onContinue={() => move(1)} /></div>)}
    {lesson.scenes.map(item => item.type === "mentor-dialogue" ? <div key={item.id} hidden={scene.id !== item.id}><MentorScene scene={item} onBack={() => move(-1)} onContinue={() => move(1)} /></div> : item.type === "guided-practice" ? <div key={item.id} hidden={scene.id !== item.id}><PracticeScene scene={item} onBack={() => move(-1)} onContinue={() => move(1)} /></div> : item.type === "question-workshop" ? <div key={item.id} hidden={scene.id !== item.id}><WorkshopScene scene={item} onBack={() => move(-1)} onContinue={() => move(1)} /></div> : item.type === "lesson-reflection" ? <div key={item.id} hidden={scene.id !== item.id}><LessonReflectionScene scene={item} onBack={() => move(-1)} onComplete={finish} feedback={feedback} /></div> : null)}
    {virtueScene || scene.type === "dialogue" || scene.type === "mentor-dialogue" || scene.type === "guided-practice" || scene.type === "question-workshop" || scene.type === "lesson-reflection" ? null : <LessonScene scene={scene}
      navigation={<>
        <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => move(-1)}><ArrowLeft size={15} aria-hidden="true" />Назад</Button>
        <Button type="button" disabled={!canContinue} onClick={scene.type === "completion" ? finish : () => move(1)}>
          {scene.type === "completion" ? "Завершить урок" : scene.buttonLabel}
          {scene.type !== "completion" && <ArrowRight size={15} aria-hidden="true" />}
        </Button>
    </>}>
      {exercise && answer
        ? <LessonExercise scene={exercise} answer={answer} onChange={updateAnswer} />
        : scene.type === "completion" ? feedback : null}
    </LessonScene>}
    {PRIMARY_SOURCES[lesson.id]?.[scene.id]?.map(source => <PrimarySourceLink
      key={source.title + source.range} source={source} lesson={{ lessonId: lesson.id, sceneId: scene.id }} />)}
    {!virtueScene && scene.type !== "dialogue" && scene.type !== "mentor-dialogue" && scene.type !== "guided-practice" && scene.type !== "question-workshop" && scene.type !== "lesson-reflection" && <LessonSources key={scene.id} scene={scene} lesson={lesson} />}
    </div>
    </div>
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
