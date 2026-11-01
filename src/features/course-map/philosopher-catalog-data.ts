import type { IntroLessonId } from "../course-lesson/lesson-data";

export type CatalogLesson = { id: string; title: string; contentId?: IntroLessonId };
type CatalogSection = { id: string; title: string } & (
  { kind: "lessons"; lessons: readonly CatalogLesson[] } |
  { kind: "placeholder"; emptyMessage: string }
);

export type PhilosopherCatalog = {
  id: string;
  title: string;
  description: string;
  status: string;
  courseTitle: string;
  sections: readonly CatalogSection[];
};

// Titles are supplied by the user; lesson content and navigation are added separately.
export const PHILOSOPHER_CATALOGS = {
  plato: {
    id: "plato",
    title: "Платон",
    description: "Платон — древнегреческий философ. Здесь будут собраны материалы для знакомства с его философией.",
    status: "Содержание в разработке",
    courseTitle: "Основной курс",
    sections: [
      { id: "themes", title: "Основные темы", kind: "lessons", lessons: [
        { id: "who-is-plato", title: "Кто такой Платон?", contentId: "plato-introduction" },
        { id: "virtue", title: "Что такое добродетель?" },
        { id: "world-of-ideas", title: "Мир идей" },
        { id: "knowledge", title: "Что значит знать?" },
        { id: "soul-and-human", title: "Душа и человек" },
        { id: "ideal-state", title: "Идеальное государство" },
        { id: "being", title: "Проблема бытия" },
      ] },
      { id: "works", title: "Диалоги и произведения", kind: "placeholder", emptyMessage: "Перечень диалогов и произведений готовится." },
      { id: "materials", title: "Дополнительные материалы", kind: "placeholder", emptyMessage: "Дополнительные материалы появятся здесь позже." },
    ],
  },
} as const satisfies Record<string, PhilosopherCatalog>;

export type PhilosopherCatalogId = keyof typeof PHILOSOPHER_CATALOGS;
