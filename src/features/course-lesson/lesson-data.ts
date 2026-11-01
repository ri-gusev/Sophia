export type IntroLesson = {
  id: string;
  context: string;
  stage: string;
  title: string;
  paragraphs: readonly string[];
  hook: string;
  question: { id: string; prompt: string; options: readonly { id: string; text: string }[] };
};

// Introductory story supplied by the user. Answer choices are hypotheses, not quotations.
export const INTRO_LESSONS = {
  "plato-introduction": {
    id: "plato-introduction",
    context: "Платон · Кто такой Платон?",
    stage: "Первый урок · Вступление",
    title: "Философ, который мог стать поэтом",
    paragraphs: [
      "Представь молодого афинянина из знатной семьи. Он изучает музыку, занимается гимнастикой и пишет трагедии.",
      "Его зовут Платон.",
      "По легенде, всё изменилось после встречи с Сократом. Платон настолько увлёкся философией, что сжёг свои стихи и отказался от поэтической карьеры.",
    ],
    hook: "Но что такого мог сказать Сократ, чтобы изменить его жизнь?",
    question: {
      id: "socrates-thought",
      prompt: "Как думаешь, какая мысль могла так его увлечь?",
      options: [
        { id: "recognition", text: "Главное в жизни — оставить после себя прекрасные произведения." },
        { id: "examination", text: "Важно не только красиво говорить, но и понимать, что ты считаешь истинным." },
        { id: "tradition", text: "Ответы на самые важные вопросы уже найдены мудрецами прошлого." },
      ],
    },
  },
} as const satisfies Record<string, IntroLesson>;

export type IntroLessonId = keyof typeof INTRO_LESSONS;
