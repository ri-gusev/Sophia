import type { IntroLessonId } from "../course-lesson/lesson-data";

export type CatalogLesson = { id: string; title: string; contentId?: IntroLessonId };
export type CatalogBlock = {
  id: string;
  order: number;
  title: string;
  question: string;
  lessons: readonly CatalogLesson[];
  status: "partial" | "planned" | "ready";
};
type CatalogSection = { id: string; title: string } & (
  { kind: "blocks"; blocks: readonly CatalogBlock[] } |
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
      { id: "themes", title: "Программа обучения", kind: "blocks", blocks: [
        { id: "socrates", order: 1, title: "Сократ и рождение философского вопроса", question: "С чего начинается философия?", lessons: [{ id: "who-is-plato", title: "Кто такой Платон?", contentId: "plato-introduction" }, { id: "socratic-question", title: "Как Сократ разрушал уверенность?", contentId: "plato-socratic-question" }], status: "partial" },
        { id: "virtue", order: 2, title: "Добродетель и правильная жизнь", question: "Что значит быть хорошим человеком?", lessons: [], status: "planned" },
        { id: "knowledge", order: 3, title: "Познание и истина", question: "Что мы можем знать?", lessons: [], status: "planned" },
        { id: "world-of-ideas", order: 4, title: "Душа и мир идей", question: "Что существует на самом деле?", lessons: [], status: "planned" },
        { id: "ideal-state", order: 5, title: "Справедливость и государство", question: "Как должно быть устроено общество?", lessons: [], status: "planned" },
        { id: "being", order: 6, title: "Бытие, небытие и диалектика", question: "Как устроена реальность и как её мыслить?", lessons: [], status: "planned" },
        { id: "legacy", order: 7, title: "Благо, счастье и философское наследие Платона", question: "Как жить и чему нас научил Платон?", lessons: [], status: "planned" },
      ] },
      { id: "works", title: "Диалоги и произведения", kind: "placeholder", emptyMessage: "Перечень диалогов и произведений готовится." },
      { id: "materials", title: "Дополнительные материалы", kind: "placeholder", emptyMessage: "Дополнительные материалы появятся здесь позже." },
    ],
  },
} as const satisfies Record<string, PhilosopherCatalog>;

export type PhilosopherCatalogId = keyof typeof PHILOSOPHER_CATALOGS;
