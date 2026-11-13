import { PORTRAIT_CREDITS } from "./portrait-credits";
import type { AtlasPhilosopher } from "./philosopher-types";
import { MODERN_BIOGRAPHIES } from "./philosophers-modern-data";
import { MODERN_PORTRAITS } from "./modern-portrait-assets";
import { EARLY_MEDIEVAL_BIOGRAPHIES } from "./philosophers-early-medieval-data";
export type { AtlasPhilosopher } from "./philosopher-types";

type Entry = [id: string, name: string, birth: number, death: number, place: string, latitude: number, longitude: number, school: string, description: string, source: string];
const entries: readonly Entry[] = [
  ["thales", "Фалес Милетский", -620, -546, "Милет", 37.53, 27.28, "Милетская школа", "Искал естественное начало мира и связывал его с водой. Один из ранних представителей ионийской натурфилософии.", "https://iep.utm.edu/thales/"],
  ["pythagoras", "Пифагор", -570, -490, "Кротон", 39.08, 17.13, "Пифагореизм", "Связывал устройство мира с числом и гармонией. В основанном им сообществе философия соединялась с особым образом жизни.", "https://plato.stanford.edu/entries/pythagoras/"],
  ["heraclitus", "Гераклит", -535, -475, "Эфес", 37.94, 27.34, "Ионийская философия", "Исследовал изменение, единство противоположностей и общий порядок — логос. Его мысль сохранилась в кратких фрагментах.", "https://iep.utm.edu/heraclit/"],
  ["parmenides", "Парменид", -515, -450, "Элея", 40.16, 15.15, "Элейская школа", "Различал путь истины и путь мнения. В поэме исследовал бытие и условия, при которых о чём-либо можно мыслить и говорить.", "https://plato.stanford.edu/entries/parmenides/"],
  ["socrates", "Сократ", -469, -399, "Афины", 37.98, 23.73, "Сократическая философия", "Через вопросы и беседу исследовал добродетель, знание и хорошую жизнь. Собственных сочинений не оставил; известен прежде всего по свидетельствам учеников.", "https://plato.stanford.edu/entries/socrates/"],
  ["democritus", "Демокрит", -460, -370, "Абдера", 40.94, 24.97, "Античный атомизм", "Развивал учение об атомах и пустоте. Объяснял природные явления соединением и движением мельчайших тел.", "https://plato.stanford.edu/entries/democritus/"],
  ["plato", "Платон", -428, -347, "Афины", 37.98, 23.73, "Платонизм · Академия", "Основал Академию и писал философские диалоги. Исследовал идеи, познание, справедливость и устройство хорошей жизни.", "https://iep.utm.edu/plato/"],
  ["aristotle", "Аристотель", -384, -322, "Афины", 37.98, 23.73, "Перипатетическая школа", "Основал Ликей. Разрабатывал логику, этику и учение о природе, соединяя наблюдение с исследованием причин.", "https://plato.stanford.edu/entries/aristotle/"],
  ["diogenes", "Диоген Синопский", -404, -323, "Коринф", 37.91, 22.88, "Кинизм", "Отстаивал независимость от условностей и жизнь согласно природе. Его философия выражалась также в поступках и публичных спорах.", "https://iep.utm.edu/diogenes-of-sinope/"],
  ["epicurus", "Эпикур", -341, -270, "Афины", 37.98, 23.73, "Эпикуреизм · Сад", "Связывал счастливую жизнь с дружбой, разумным выбором желаний и освобождением от страха. Основал в Афинах школу Сад.", "https://plato.stanford.edu/entries/epicurus/"],
  ["zeno", "Зенон Китийский", -334, -262, "Афины", 37.98, 23.73, "Ранняя Стоя", "Основал стоическую школу. Рассматривал добродетель и жизнь в согласии с природой как основания хорошей жизни.", "https://catalog.perseus.tufts.edu/catalog/urn%3Acite%3Aperseus%3Aauthor.1502"],
  ["seneca", "Сенека", -4, 65, "Рим", 41.9, 12.5, "Римский стоицизм", "Исследовал нравственный выбор, страсти и отношение к судьбе. Его письма и диалоги посвящены практической философии жизни.", "https://plato.stanford.edu/entries/seneca/"],
  ["epictetus", "Эпиктет", 55, 135, "Никополь", 39.03, 20.73, "Римский стоицизм", "Учил различать зависящее и не зависящее от нас. Его беседы о свободе суждения записал ученик Арриан.", "https://plato.stanford.edu/entries/epictetus/"],
  ["marcus-aurelius", "Марк Аврелий", 121, 180, "Рим", 41.9, 12.5, "Римский стоицизм", "Римский император и автор личных философских записей. Размышлял о долге, самообладании и принадлежности человека общему миру.", "https://plato.stanford.edu/entries/marcus-aurelius/"],
  ["plotinus", "Плотин", 205, 270, "Рим", 41.9, 12.5, "Неоплатонизм", "Исследовал Единое, ум и душу, развивая платоническую традицию. Его трактаты ученик Порфирий собрал в «Эннеады».", "https://plato.stanford.edu/archives/spr2024/entries/plotinus/"],
];

const portraitNotes: Record<string, string> = {
  thales: "Позднее художественное изображение Луки Джордано; не прижизненный портрет.",
  epictetus: "Воображаемый образ: гравюра из издания 1715 года.",
  democritus: "Бюст неизвестного грека, традиционно связываемый с Демокритом; идентификация не установлена.",
  heraclitus: "Бюст неизвестного философа; отождествление с Гераклитом предположительно и не подтверждено музеем.",
  plotinus: "Римский бюст, традиционно связываемый с Плотином; идентификация спорна.",
  diogenes: "Античное мозаичное изображение; не свидетельство точной внешности.",
};

const legacyPhilosophers: readonly AtlasPhilosopher[] = entries.map(([id, name, birthYear, deathYear, place, latitude, longitude, school, description, source]) => ({
  id, name, birthYear, deathYear, place, latitude, longitude, school, description, source,
  approximateBirth: !["aristotle", "epicurus", "marcus-aurelius"].includes(id),
  approximateDeath: !["socrates", "aristotle", "epicurus", "seneca", "marcus-aurelius", "plotinus"].includes(id),
  approximateLocation: true,
  locationType: "activity",
  verifiedAt: "2026-11-13",
  portrait: `/images/philosophers/${id}.${id === "plato" ? "png" : "jpg"}`,
  portraitPosition: id === "epictetus" ? "65% 22%" : id === "thales" ? "52% 18%" : "50% 30%",
  portraitScale: id === "thales" ? 2.6 : id === "epictetus" ? 2 : 1,
  portraitNote: portraitNotes[id] ?? "Скульптурное изображение в античной традиции; не подтверждённый прижизненный портрет.",
  credit: PORTRAIT_CREDITS[id],
}));

export const PHILOSOPHERS: readonly AtlasPhilosopher[] = [...legacyPhilosophers, ...[...MODERN_BIOGRAPHIES, ...EARLY_MEDIEVAL_BIOGRAPHIES].map(person => {
  const asset = MODERN_PORTRAITS[person.id];
  return { ...person, portrait: asset?.path ?? null, portraitPosition: asset?.position ?? "50% 30%",
    portraitScale: asset?.scale ?? 1, portraitNote: asset?.note ?? "Проверенный свободный портрет недоступен; показаны инициалы.", credit: asset?.credit ?? null };
})];
