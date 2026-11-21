export type DefinitionStage = "intro" | "sort" | "test" | "final";
export type DefinitionCategory = "example" | "definition";

export const VIRTUE_DEFINITION_PRACTICE = {
  adaptation: "Учебная адаптация «Менона» Платона, 73c–73e. Реплики не являются дословным переводом.",
  workshop: "Философская мастерская",
  intro: [
    "Мы уже увидели, что примеров добродетели может быть много. Но теперь попробуй сам отличить пример от попытки объяснить, что такое добродетель",
    "Перед тобой несколько утверждений. Посмотрим, какие из них называют отдельные поступки, а какие пытаются объяснить само понятие",
  ],
  instruction: "Выбери табличку, затем нажми на одну из двух областей.",
  distinction: "Попытка определения — ещё не правильное определение. Её предстоит проверить.",
  categories: [{ id: "example", title: "Конкретный пример", hint: "Отдельный поступок" }, { id: "definition", title: "Попытка определения", hint: "Общая формулировка" }],
  cards: [
    { id: "money", letter: "А", text: "Человек вернул найденные деньги владельцу, хотя никто за ним не наблюдал", category: "example", note: "Учебная ситуация Sophia" },
    { id: "rule", letter: "Б", text: "Добродетель — способность человека управлять другими", category: "definition", note: "Попытка Менона · учебная адаптация" },
    { id: "mistake", letter: "В", text: "Человек признал свою ошибку, хотя ему было выгоднее промолчать", category: "example", note: "Учебная ситуация Sophia" },
    { id: "character", letter: "Г", text: "Добродетель — качество характера, которое помогает человеку поступать достойно", category: "definition", note: "Учебная формулировка Sophia, не утверждённое определение" },
  ],
  feedback: {
    example: "Верно. Здесь описан конкретный поступок. Но из него ещё не ясно, что такое добродетель вообще",
    definition: "Верно. Здесь пытаются сказать не об отдельном поступке, а о добродетели в целом. Однако определение ещё предстоит проверить",
    incorrect: "Посмотри внимательнее: утверждение описывает один конкретный случай или пытается объяснить понятие в целом?",
  },
  classified: "Отлично. Но есть одна тонкость…",
  invitation: "Не всякая попытка определения оказывается удачной. Проверим одну из них?",
  definition: "Добродетель — способность управлять другими",
  definitionCredit: "Попытка Менона · учебная адаптация, 73c–73d",
  testQuestion: "Подходит ли такое определение ко всем случаям добродетели?",
  situationsNote: "Учебные ситуации Sophia — придуманные примеры, а не события из жизни Менона и не буквальные сценки Платона.",
  situations: [
    {
      id: "without-power", title: "Человек без власти", art: "honesty",
      caption: "Он поступил честно, но никем не управлял",
      description: "Молодой человек признаёт собственную ошибку, хотя мог бы избежать ответственности.",
      question: "Если человек поступает достойно, но не управляет другими, что это говорит об определении?",
      options: [{ id: "narrow", text: "Определение может быть слишком узким" }, { id: "never", text: "Значит, такой поступок никогда не бывает добродетельным" }],
      correctAnswer: "narrow",
      incorrect: "Подумай о границах определения: оно охватывает этот достойный поступок или оставляет его за пределами понятия?",
      feedback: "Да. Если добродетель может проявляться без власти над другими, управление не охватывает всех возможных случаев",
      finding: "Не охватывает все подходящие случаи",
    },
    {
      id: "unjust-power", title: "Власть без справедливости", art: "power",
      caption: "Он способен управлять людьми, но использует власть несправедливо",
      description: "Правитель отдаёт несправедливый приказ ради личной выгоды.",
      question: "Достаточно ли одной способности управлять, чтобы назвать человека добродетельным?",
      options: [{ id: "any-ruler", text: "Да, любой правитель добродетелен" }, { id: "investigate", text: "Нет, нужно исследовать и то, как он использует власть" }],
      correctAnswer: "investigate",
      incorrect: "Посмотри не только на способность отдавать приказы, но и на то, как человек распоряжается властью.",
      feedback: "Именно. Само умение управлять ещё не гарантирует справедливости. Поэтому предложенное определение требует дальнейшего исследования",
      finding: "Может включать неподходящие случаи",
    },
  ],
  finding: "Требует проверки",
  conclusion: "Хорошее определение должно выдерживать проверку разными случаями",
  explanation: "Оно должно охватывать подходящие случаи и не включать неподходящие только потому, что формулировка звучит убедительно",
  conclusionNote: "Методический вывод Sophia. Окончательное определение добродетели пока не найдено.",
  closing: [
    "Теперь ты видишь: назвать примеры недостаточно. Но и предложить общее определение — лишь начало работы",
    "Нужно проверить, подходит ли оно к разным случаям и не скрывает ли противоречий",
  ],
  steps: [{ title: "Пример", text: "Отдельный поступок", icon: "example" }, { title: "Определение", text: "Общая формулировка", icon: "definition" }, { title: "Проверка", text: "Исследование разных ситуаций", icon: "test" }],
  thought: "Философ не просто предлагает ответы. Он проверяет, насколько они выдерживают вопросы",
} as const;

export type DefinitionPracticeContent = typeof VIRTUE_DEFINITION_PRACTICE;
export type DefinitionCardId = DefinitionPracticeContent["cards"][number]["id"];
export type DefinitionAssignments = Partial<Record<DefinitionCardId, DefinitionCategory>>;
export type DefinitionAnswer = DefinitionPracticeContent["situations"][number]["options"][number]["id"];
export type DefinitionAnswers = Partial<Record<"without-power" | "unjust-power", DefinitionAnswer>>;

export function isDefinitionAssignments(value: unknown): value is DefinitionAssignments {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, category]) =>
    VIRTUE_DEFINITION_PRACTICE.cards.some(card => card.id === id && card.category === category));
}

export function isDefinitionAnswers(value: unknown): value is DefinitionAnswers {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, answer]) =>
    VIRTUE_DEFINITION_PRACTICE.situations.some(situation => situation.id === id && situation.options.some(option => option.id === answer)));
}
