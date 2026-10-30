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

export const MAP_WIDTH = 3800;
export const MAP_HEIGHT = 650;
export const ERA_WIDTH = 760;
export const MAP_TRANSITIONS = ["antiquity-medieval", "medieval-modern", "modern-german", "german-contemporary"] as const;

// The selected v4 reference keeps the same physical scale on every screen.
const LOCAL_POINTS = [[94, 376], [229, 285], [374, 386], [518, 292], [664, 381]] as const;
export const MAP_STEPS = COURSE_ERAS.flatMap((era, eraIndex) => era.steps.map((step, stepIndex) => ({
  ...step, era, eraIndex, stepIndex,
  x: eraIndex * ERA_WIDTH + LOCAL_POINTS[stepIndex][0],
  y: LOCAL_POINTS[stepIndex][1],
})));

const routePoints = [[-40, 430], ...MAP_STEPS.map(({ x, y }) => [x, y]), [MAP_WIDTH + 40, 430]];
export const MAP_ROUTE = routePoints.slice(0, -1).reduce((path, start, index) => {
  const previous = routePoints[Math.max(0, index - 1)];
  const end = routePoints[index + 1];
  const next = routePoints[Math.min(routePoints.length - 1, index + 2)];
  return `${path} C ${start[0] + (end[0] - previous[0]) / 6} ${start[1] + (end[1] - previous[1]) / 6}, ${end[0] - (next[0] - start[0]) / 6} ${end[1] - (next[1] - start[1]) / 6}, ${end[0]} ${end[1]}`;
}, `M ${routePoints[0][0]} ${routePoints[0][1]}`);
