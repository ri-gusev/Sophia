export type CourseAccess = "free" | "premium";

export type ThematicLessonReference = Readonly<{
  lessonId: string;
  access: CourseAccess;
}>;

export type ThematicCourse = Readonly<{
  slug: string;
  title: string;
  description: string;
  cover: `/images/courses/${string}.webp`;
  tone: "mint" | "lavender" | "butter" | "sage";
  access: CourseAccess;
  lessons: readonly ThematicLessonReference[];
}>;

export const THEMATIC_COURSES: readonly ThematicCourse[] = [
  {
    slug: "political-philosophy",
    title: "Политическая философия",
    description: "Власть, государство, свобода и справедливость. Исследуй философские основания общественного устройства и отношений человека с государством.",
    cover: "/images/courses/political-philosophy.webp",
    tone: "butter",
    access: "free",
    lessons: [],
  },
  {
    slug: "russian-philosophy",
    title: "Русская философия",
    description: "Познакомься с идеями русских мыслителей, их размышлениями о человеке, свободе, вере и смысле существования.",
    cover: "/images/courses/russian-philosophy.webp",
    tone: "lavender",
    access: "free",
    lessons: [],
  },
  {
    slug: "eastern-philosophy",
    title: "Восточная философия",
    description: "Исследуй философские традиции Китая, Индии и других культур Востока, их представления о гармонии, сознании и человеческой жизни.",
    cover: "/images/courses/eastern-philosophy.webp",
    tone: "mint",
    access: "free",
    lessons: [],
  },
  {
    slug: "history-of-philosophy",
    title: "История философии",
    description: "Проследи развитие философской мысли, её ключевые эпохи, интеллектуальные перевороты и взаимосвязи между направлениями.",
    cover: "/images/courses/history-of-philosophy.webp",
    tone: "sage",
    access: "free",
    lessons: [],
  },
];

export function findThematicCourse(slug: string) {
  return THEMATIC_COURSES.find(course => course.slug === slug);
}
