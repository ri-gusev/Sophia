import { INTRO_LESSONS, type IntroLesson, type IntroLessonId } from "../course-lesson/lesson-data.ts";
import { PHILOSOPHER_CATALOGS, type PhilosopherCatalog } from "../course-map/philosopher-catalog-data.ts";
import { getMoscowDay, isoDate } from "../philosophy-question/daily-calendar.ts";
import type { LessonPosition, LessonProgress } from "./progress/contract.ts";
import type { LearningProgress } from "./progress/server/store.ts";

type DirectionDefinition = {
  id: string;
  name: string;
  philosopher?: { id: string; name: string };
  lessonIds: readonly IntroLessonId[];
};

export type LearningDirection = {
  id: string;
  name: string;
  philosopherName?: string;
  image?: string;
  completed: number;
  total: number;
  continueAt: LessonPosition | null;
  materialsAt: LessonPosition;
};

function catalogDirections(catalog: PhilosopherCatalog): DirectionDefinition[] {
  return catalog.sections.flatMap(section => section.kind === "blocks"
    ? section.blocks.filter(block => block.status !== "planned").map(block => ({
      id: `${catalog.id}:${section.id}:${block.id}`,
      name: block.title,
      philosopher: { id: catalog.id, name: catalog.title },
      lessonIds: [...new Set(block.lessons.flatMap(lesson => lesson.contentId ? [lesson.contentId] : []))],
    }))
    : []);
}

const directions = Object.values(PHILOSOPHER_CATALOGS).flatMap(catalogDirections);

function started(lesson: LessonProgress) {
  return lesson.completed || lesson.legacyCompleted || lesson.resumeSceneId !== null || lesson.confirmedSceneIds.length > 0;
}

function resumePosition(lesson: LessonProgress): LessonPosition {
  const { lessonId, resumeSceneId, confirmedSceneIds } = lesson;
  const { scenes } = INTRO_LESSONS[lessonId];
  const firstUnconfirmed = scenes.find(scene => !confirmedSceneIds.includes(scene.id));
  return { lessonId, sceneId: resumeSceneId ?? firstUnconfirmed?.id ?? scenes.at(-1)!.id };
}

export function buildProfileLearning(learning: LearningProgress, today: number) {
  const { progress, history, revision } = learning;
  const entries = new Map(progress.lessons.map(lesson => [lesson.lessonId, lesson]));
  const orderFor = (id: IntroLessonId) => {
    const order = history[id]?.activityOrder ?? 0;
    return order > 0 ? order + 1 : Number(progress.lastOpened?.lessonId === id);
  };
  const philosophers = new Set<string>();
  const recentDirections: { direction: LearningDirection; order: number }[] = [];

  for (const definition of directions) {
    const lessons = definition.lessonIds.flatMap(id => {
      const entry = entries.get(id);
      return entry ? [entry] : [];
    });
    const active = lessons.filter(started).sort((a, b) => orderFor(b.lessonId) - orderFor(a.lessonId));
    if (!active.length) continue;
    if (definition.philosopher) philosophers.add(definition.philosopher.id);
    const next = active.find(lesson => !lesson.completed) ?? lessons.find(lesson => !lesson.completed);
    const firstLessonId = definition.lessonIds[0];
    const { scenes }: IntroLesson = INTRO_LESSONS[firstLessonId];
    recentDirections.push({
      order: orderFor(active[0].lessonId),
      direction: {
        id: definition.id,
        name: definition.name,
        philosopherName: definition.philosopher?.name,
        image: scenes[0].portrait?.src ?? scenes[0].image.src,
        completed: lessons.filter(lesson => lesson.completed).length,
        total: definition.lessonIds.length,
        continueAt: next ? resumePosition(next) : null,
        materialsAt: { lessonId: firstLessonId, sceneId: scenes[0].id },
      },
    });
  }

  const activity: Record<string, number> = {};
  for (const { completedAt } of Object.values(history)) {
    if (completedAt === null) continue;
    const day = getMoscowDay(completedAt);
    if (day < today - 364 || day > today) continue;
    const date = isoDate(day);
    activity[date] = (activity[date] ?? 0) + 1;
  }

  return {
    directions: recentDirections.sort((a, b) => b.order - a.order).map(item => item.direction),
    philosophers: philosophers.size,
    completed: progress.lessons.filter(lesson => lesson.completed).length,
    activity,
    revision,
  };
}
