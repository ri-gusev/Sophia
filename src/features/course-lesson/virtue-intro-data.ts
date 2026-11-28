export type VirtueIntroContent = {
  meno: string;
  note: string;
  question: string;
  hypotheses: readonly { id: string; text: string }[];
  unknown: string;
  turnQuestion: string;
  socrates: string;
  explanation: readonly string[];
  thought: string;
  attribution: string;
};

export const MENO_QUESTION: VirtueIntroContent = {
  meno: "Сократ, скажи: можно ли научиться добродетели? Или её приобретают упражнениями? А может, с ней рождаются?",
  note: "Учебная адаптация диалога Платона „Менон“, 70a–71b",
  question: "А как думаешь ты?",
  hypotheses: [
    { id: "learning", text: "Этому можно научиться" },
    { id: "practice", text: "Добродетель развивается через поступки и упражнения" },
    { id: "nature", text: "Многое зависит от характера человека с рождения" },
  ],
  unknown: "Пока не знаю",
  turnQuestion: "Но что такое добродетель?",
  socrates: "Менон, прежде чем выяснять, можно ли научиться добродетели, давай сначала разберёмся: что такое сама добродетель?",
  explanation: [
    "Древнегреческое слово ἀρετή (арете́) обычно переводят как „добродетель“. Но оно связано также с достоинством и совершенством.",
    "Для греков речь шла не просто о том, чтобы быть добрым.",
    "Теперь нам предстоит разобраться, что вообще делает человека достойным.",
  ],
  thought: "Иногда, прежде чем искать ответ, нужно задать более глубокий вопрос",
  attribution: "Мысль урока · София",
};
