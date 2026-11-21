"use client";

import { useEffect, useState } from "react";
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
  const [value, setValue] = useState<T>(() => {
    const saved = readSceneField(scene.lessonId, scene.id, field);
    return validate(saved) ? saved : initial;
  });
  useEffect(() => {
    writeSceneField(scene.lessonId, scene.id, field, value);
  }, [scene.lessonId, scene.id, field, value]);
  return [value, setValue] as const;
}
