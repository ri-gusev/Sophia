type PrimarySourceFields = { author: string; title: string; range: string; context: string };

export type PrimarySource = PrimarySourceFields & (
  { workId: string; start: string; end: string } | { url: string }
);

const diogenesPlato = "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Diogenes_Laertius/Lives_of_the_Eminent_Philosophers/3/Plato%2A.html";
const diogenesAristotle = "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Diogenes_Laertius/Lives_of_the_Eminent_Philosophers/5/Aristotle%2A.html";

function plato(workId: string, title: string, start: string, end: string, context: string): PrimarySource {
  return { author: "Платон", title, range: `${start}–${end}`, workId, start, end, context };
}

function diogenes(range: string, url: string, context: string): PrimarySource {
  return { author: "Диоген Лаэртский", title: "О жизни, учениях и изречениях знаменитых философов", range, url, context };
}

export const PRIMARY_SOURCES: Record<string, Readonly<Partial<Record<string, readonly PrimarySource[]>>>> = {
  "plato-introduction": {
    athens: [diogenes("III, § 1–3", diogenesPlato + "#1", "Античное свидетельство о происхождении Платона.")],
    poet: [diogenes("III, § 5–6", diogenesPlato + "#5", "Античное предание о трагедиях Платона.")],
    socrates: [plato("republic", "Государство", "331c", "331d", "Пример того, как Сократ проверяет определение справедливости.")],
    trial: [
      plato("apology", "Апология Сократа", "24b", "24c", "Платон передаёт обвинения, на которые отвечает Сократ."),
      plato("apology", "Апология Сократа", "38c", "39a", "Обращение Сократа к судьям после приговора."),
    ],
    academy: [
      diogenes("III, § 7–8", diogenesPlato + "#7", "Свидетельство об Академии и возвращении Платона в Афины."),
      diogenes("V, § 1–2", diogenesAristotle + "#1", "Свидетельство об Аристотеле и его связи с Платоном."),
    ],
  },
  "plato-socratic-question": {
    cephalus: [plato("republic", "Государство", "331c", "331d", "Диалог с Кефалом о правде, долге и возврате оружия. Сцена — учебная адаптация.")],
  },
  "plato-virtue-definition": {
    "meno-question": [plato("meno", "Менон", "70a", "71b", "Вопрос Менона и ответ Сократа о том, с чего начать исследование. Сцена — учебная адаптация.")],
    "virtue-many-faces": [plato("meno", "Менон", "71e", "73e", "Менон перечисляет виды добродетели, а Сократ ищет их общее основание.")],
    "virtue-swarm": [plato("meno", "Менон", "72a", "73c", "Образ пчёл и переход от множества примеров к общему.")],
    "virtue-definition-practice": [plato("meno", "Менон", "73c", "73e", "Сократ проверяет определение добродетели через способность управлять.")],
    "virtue-lesson-finale": [plato("meno", "Менон", "100b", "100c", "В финале диалога Сократ возвращается к вопросу о том, что такое добродетель.")],
  },
};
