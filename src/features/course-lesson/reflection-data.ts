export type ReflectionContent = { lines: readonly string[]; outcomes: readonly { icon: "question" | "search" | "book"; title: string; text: string }[]; thought: string; attribution: string; note: string; portrait: string };
export const SOCRATIC_REFLECTION: ReflectionContent = {
  portrait: "/images/lessons/dialogue/socrates.webp",
  lines: ["Сегодня ты увидел, как легко принять привычное мнение за истину", "Но ты научился делать кое-что важное: не спешить с ответом, проверять слова на примерах и задавать вопросы", "Помни: признать, что ты чего-то не знаешь, — не поражение. Иногда именно с этого начинается настоящее исследование"],
  outcomes: [
    { icon: "question", title: "Задавать вопросы", text: "Не принимать уверенное утверждение без проверки" },
    { icon: "search", title: "Искать исключения", text: "Замечать случаи, когда общее правило не работает" },
    { icon: "book", title: "Сомневаться осмысленно", text: "Понимать, что опровергнуть один ответ — ещё не значит найти окончательную истину" },
  ],
  thought: "Философия начинается не тогда, когда у тебя есть все ответы, а тогда, когда ты начинаешь задавать вопросы",
  attribution: "Мысль урока · Sophia",
  note: "Заключительная речь — авторская учебная адаптация Sophia, а не историческая цитата Сократа. Прогресс сохраняется только в этом браузере.",
};
