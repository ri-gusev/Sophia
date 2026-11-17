export type DialogueCharacter = { id: string; name: string; portrait: string; alt: string; position: "left" | "right" };
export type DialogueContent = {
  characters: readonly DialogueCharacter[];
  lines: readonly { speaker: string; text: string }[];
  explanation: { title: string; paragraphs: readonly string[]; note: string; source: string };
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
    title: "Добро пожаловать в мир философии!",
    paragraphs: [
      "Ты только что увидел небольшой разговор между Сократом и Кефалом — героями произведения Платона.",
      "Кефал был уверен: справедливый человек всегда говорит правду и возвращает то, что ему доверили.",
      "Но Сократ предложил необычную ситуацию.",
      "Что, если возвращение чужой вещи принесёт кому-то вред?",
      "Оказалось, что даже самое очевидное правило не всегда работает.",
      "Обрати внимание: Сократ не стал просто говорить, что Кефал ошибается. Он предложил пример, который заставляет задуматься над первоначальным утверждением.",
      "В следующем слайде мы подробнее разберём, что именно сделал Сократ и зачем.",
    ],
    note: "Сцена представляет собой художественную учебную адаптацию фрагмента диалога Платона „Государство“, книга I, 331c–331d. Реплики сокращены и переработаны для обучения. Они не являются дословным переводом оригинала.",
    source: "https://classics.mit.edu/Plato/republic.2.i.html",
  },
};
