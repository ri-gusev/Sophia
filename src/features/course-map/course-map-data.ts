export type EraId = "antiquity" | "medieval" | "early-modern" | "german" | "contemporary";
export type CourseStep = { id: string; title: string; description: string };
export type CourseEra = { id: EraId; title: string; steps: readonly CourseStep[] };

export const COURSE_ERAS: readonly CourseEra[] = [
  { id: "antiquity", title: "Античность", steps: [
    { id: "first-thought", title: "Начало мысли", description: "Первые попытки объяснить устройство мира через разум и наблюдение." },
    { id: "dialogue", title: "Диалог", description: "Вопросы и диалог как способ исследовать собственные убеждения." },
    { id: "ideas", title: "Мир идей", description: "Размышления о том, что мы знаем и как отличаем знание от мнения." },
    { id: "virtue", title: "Добродетель", description: "Что значит жить хорошо и как человек формирует свой характер?" },
    { id: "antiquity-reflection", title: "Итог эпохи", description: "Связи между главными вопросами античной мысли." },
  ] },
  { id: "medieval", title: "Средневековье", steps: [
    { id: "medieval-context", title: "Войти в эпоху", description: "Исторический контекст средневекового философского поиска." },
    { id: "faith-reason", title: "Вера и разум", description: "Как средневековые мыслители рассматривали отношения веры и разума?" },
    { id: "universals", title: "Универсалии", description: "Что общего между отдельными вещами и как существуют общие понятия?" },
    { id: "scholasticism", title: "Схоластика", description: "Аргумент, возражение и ответ в традиции философского обсуждения." },
    { id: "medieval-reflection", title: "Итог эпохи", description: "Вопросы, связывающие средневековую мысль с последующими эпохами." },
  ] },
  { id: "early-modern", title: "Новое время", steps: [
    { id: "new-perspective", title: "Новый взгляд", description: "Как менялись представления о мире и способах его исследования?" },
    { id: "doubt", title: "Сомнение", description: "Поиск достоверных оснований знания через критическое сомнение." },
    { id: "experience-reason", title: "Опыт и разум", description: "Роль чувственного опыта и рассуждения в познании." },
    { id: "knowledge", title: "Познание", description: "Как обосновывать утверждения о мире и замечать границы знания?" },
    { id: "modern-reflection", title: "Итог эпохи", description: "Сопоставление основных вопросов и подходов Нового времени." },
  ] },
  { id: "german", title: "Немецкая философия", steps: [
    { id: "reason", title: "Вопрос разума", description: "Что разум может узнать о мире и о самом себе?" },
    { id: "critique", title: "Критика", description: "Исследование возможностей и границ человеческого познания." },
    { id: "freedom", title: "Свобода", description: "Связь свободы, ответственности и нравственного действия." },
    { id: "dialectics", title: "Диалектика", description: "Изменение понятий, противоречия и развитие философских идей." },
    { id: "german-reflection", title: "Итог эпохи", description: "Связи между вопросами разума, свободы и развития." },
  ] },
  { id: "contemporary", title: "Современная философия", steps: [
    { id: "twentieth-century", title: "XX век", description: "Новые вопросы и направления философии XX века и более позднего времени." },
    { id: "language", title: "Язык", description: "Как язык связан со значением, пониманием и мышлением?" },
    { id: "existence", title: "Существование", description: "Человеческий опыт, выбор и поиск смысла." },
    { id: "society", title: "Общество", description: "Философские вопросы справедливости, культуры и совместной жизни." },
    { id: "contemporary-reflection", title: "Итог эпохи", description: "Открытые вопросы философии в меняющемся мире." },
  ] },
];

export const ERA_WIDTH = 1180;
export const MAP_WIDTH = ERA_WIDTH * COURSE_ERAS.length;
export const MAP_HEIGHT = 650;
export const TRANSITION_WIDTH = 400;

// Display coordinates follow the painted trail; lesson content and order stay independent.
// One era fills the desktop container; smaller screens pan within it.
const LOCAL_X = [146, 356, 581, 804, 1031] as const;
const TRAIL_Y: Record<EraId, readonly [number, number, number, number, number]> = {
  antiquity: [331, 241, 336, 246, 338],
  medieval: [330, 240, 334, 246, 339],
  "early-modern": [337, 256, 350, 266, 337],
  german: [356, 260, 376, 263, 343],
  contemporary: [327, 243, 336, 249, 338],
};
export const MAP_STEPS = COURSE_ERAS.flatMap((era, eraIndex) => era.steps.map((step, stepIndex) => ({
  ...step, era, eraIndex, stepIndex,
  x: eraIndex * ERA_WIDTH + LOCAL_X[stepIndex],
  y: TRAIL_Y[era.id][stepIndex],
})));
