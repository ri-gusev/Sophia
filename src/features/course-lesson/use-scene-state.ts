"use client";

import { useEffect, useRef, useState } from "react";
import { useProgressStore } from "@/features/account/progress/client/lesson-progress-provider";
import type { LessonSceneData } from "./lesson-data";
import { readSceneField, writeSceneField } from "./lesson-resume";

// LessonIntroduction mounts after CourseMap's hydration, so reading browser state
// in the initializer restores the first visible frame without a reset flash.
export function useSceneState<T>(
  scene: Pick<LessonSceneData, "lessonId" | "id">,
  field: string,
  initial: T,
  validate: (value: unknown) => value is T,
) {
  const { accountId } = useProgressStore();
  const [value, setValue] = useState<T>(() => {
    const saved = readSceneField(scene.lessonId, scene.id, field, accountId);
    return validate(saved) ? saved : initial;
  });
  const savedValue = useRef(value);
  useEffect(() => {
    if (Object.is(savedValue.current, value)) return;
    savedValue.current = value;
    writeSceneField(scene.lessonId, scene.id, field, value, accountId);
  }, [scene.lessonId, scene.id, field, value, accountId]);
  return [value, setValue] as const;
}
