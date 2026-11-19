export type DialogueCharacter = { id: string; name: string; portrait: string; alt: string; position: "left" | "right" };
export type DialogueContent = {
  characters: readonly DialogueCharacter[];
  lines: readonly { speaker: string; text: string }[];
  explanation: { title: string; paragraphs: readonly string[]; emphasis?: string; note: string; source: string };
};

export const SOCRATES = { id: "socrates", name: "Сократ", portrait: "/images/lessons/dialogue/socrates.webp", alt: "Сократ в шалфейном хитоне, обращённый к Кефалу", position: "left" } as const;
export const CEPHALUS = { id: "cephalus", name: "Кефал", portrait: "/images/lessons/dialogue/cephalus.webp", alt: "Пожилой Кефал в светлом хитоне, обращённый к Сократу", position: "right" } as const;

export const CEPHALUS_DIALOGUE: DialogueContent = {
  characters: [SOCRATES, CEPHALUS],
  lines: [
    { speaker: "cephalus", text: "Знаешь, Сократ, мне спокойно от мысли, что я никого не обманывал и возвращал всё, что был должен" },
    { speaker: "socrates", text: "Значит, ты считаешь, что быть справедливым — это говорить правду и возвращать чужое?" },
    { speaker: "cephalus", text: "Конечно! Разве может быть иначе?" },
    { speaker: "socrates", text: "Представь, что однажды друг оставил тебе на хранение оружие" },
    { speaker: "cephalus", text: "Хорошо. И что дальше?" },
    { speaker: "socrates", text: "Позже он перестал владеть собой и требует оружие обратно. Ты вернёшь его?" },
    { speaker: "cephalus", text: "Но ведь он может навредить себе или другим! Тогда возвращать оружие было бы неправильно" },
    { speaker: "socrates", text: "Так всегда ли справедливо возвращать то, что тебе доверили?" },
  ],
  explanation: {
    title: "Что только что произошло?",
    paragraphs: [
      "Кефал был уверен, что справедливый человек всегда говорит правду и возвращает то, что ему доверили.",
      "Но Сократ предложил необычный случай: что, если возвращение чужой вещи принесёт вред?",
      "Оказалось, что даже привычное правило может оказаться неполным.",
      "Сократ не дал готового ответа. Он задал вопрос, который заставил собеседника задуматься.",
      "Давай разберёмся, почему это важно",
    ],
    emphasis: "Сократ не дал готового ответа. Он задал вопрос, который заставил собеседника задуматься.",
    note: "Сцена представляет собой художественную учебную адаптацию фрагмента диалога Платона „Государство“, книга I, 331c–331d. Реплики сокращены и переработаны для обучения. Они не являются дословным переводом оригинала.",
    source: "https://classics.mit.edu/Plato/republic.2.i.html",
  },
};
