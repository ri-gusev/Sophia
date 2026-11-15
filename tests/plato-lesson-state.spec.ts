import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { INTRO_LESSONS, type IntroLesson } from "../src/features/course-lesson/lesson-data";
import { initialAnswer, isCorrect, moveItem, readLessonLocation, restoreRun } from "../src/features/course-lesson/lesson-state";

const lesson: IntroLesson = INTRO_LESSONS["plato-introduction"];

test("approved lesson has nine stable, ordered scenes, four exercises and local artwork", () => {
  expect(lesson.scenes.map(scene => scene.id)).toEqual(["journey", "athens", "poet", "socrates", "trial", "academy", "dialogues", "legacy", "completion"]);
  expect(lesson.scenes.filter(scene => scene.type === "single-choice")).toHaveLength(3);
  expect(lesson.scenes.filter(scene => scene.type === "ordering")).toHaveLength(1);
  for (const scene of lesson.scenes) {
    expect(scene.lessonId).toBe("plato-introduction");
    expect(existsSync(`public${scene.image.src}`)).toBe(true);
    expect(scene.imageAlt.length).toBeGreaterThan(20);
  }
});

test("all exercises distinguish correct choices from wrong choices and ordering moves stay bounded", () => {
  for (const scene of lesson.scenes) {
    if (scene.type !== "single-choice" && scene.type !== "ordering") continue;
    const answer = initialAnswer(scene);
    expect(isCorrect(scene, answer)).toBe(false);
    if (scene.type === "single-choice") {
      expect(isCorrect(scene, { ...answer, selected: "b" })).toBe(true);
      expect(isCorrect(scene, { ...answer, selected: "a" })).toBe(false);
      expect(isCorrect(scene, { ...answer, selected: "c" })).toBe(false);
    } else {
      const moved = moveItem(moveItem(answer.order, 0, 1), 1, 1);
      expect(moved).toEqual(["socrates", "plato", "aristotle"]);
      expect(isCorrect(scene, { ...answer, order: moved })).toBe(true);
      expect(moveItem(moved, 0, -1)).toEqual(moved);
      expect(moveItem(moved, 2, 1)).toEqual(moved);
    }
  }
});

test("malformed tab state and unknown fragments cannot inject invalid scenes or answer IDs", () => {
  expect(readLessonLocation("#lesson=unknown")).toBeNull();
  expect(readLessonLocation("#lesson=plato-introduction&scene=unknown")?.sceneId).toBe("journey");
  expect(restoreRun(lesson, null).sceneId).toBe("journey");
  const restored = restoreRun(lesson, { version: 1, sceneId: "unknown", exercises: {
    poet: { selected: "invalid", checked: true },
    academy: { order: ["socrates", "socrates", "injected"], checked: true },
  } });
  expect(restored.sceneId).toBe("journey");
  expect(restored.exercises.poet.checked).toBe(false);
  expect(restored.exercises.poet.selected).toBeNull();
  expect(restored.exercises.academy.order).toEqual(["aristotle", "socrates", "plato"]);
  expect(restored.exercises.academy.checked).toBe(false);
});
