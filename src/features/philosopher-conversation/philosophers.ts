export type PhilosopherId = "plato" | "aristotle" | "marcus-aurelius";

type ConversationProfile = {
  id: PhilosopherId;
  name: string;
  image: string;
  school: string;
  draftAvailable: boolean;
  status: string;
  source: string;
  photographer: string;
  license: "CC BY 2.5" | "Public domain";
};

export const CONVERSATION_PHILOSOPHERS: readonly ConversationProfile[] = [
  {
    id: "plato", name: "Платон", image: "/images/philosophers/plato.png",
    school: "Академия · Античная философия", draftAvailable: true, status: "В подготовке",
    source: "https://commons.wikimedia.org/wiki/File:Plato_Silanion_Musei_Capitolini_MC1377.png",
    photographer: "Marie-Lan Nguyen", license: "CC BY 2.5",
  },
  {
    id: "aristotle", name: "Аристотель", image: "/images/philosophers/aristotle.jpg",
    school: "Ликей · Античная философия", draftAvailable: false, status: "Скоро",
    source: "https://commons.wikimedia.org/wiki/File:Aristotle_Altemps_Inv8575.jpg",
    photographer: "Jastrow", license: "Public domain",
  },
  {
    id: "marcus-aurelius", name: "Марк Аврелий", image: "/images/philosophers/marcus-aurelius.jpg",
    school: "Стоицизм · Античная философия", draftAvailable: false, status: "Скоро",
    source: "https://commons.wikimedia.org/wiki/File:Marcus_Aurelius_Louvre_MR561_n02.jpg",
    photographer: "Marie-Lan Nguyen", license: "CC BY 2.5",
  },
];

export const PLATO_CONVERSATION_PROMPTS = [
  "Что такое добродетель?",
  "Как отличить знание от мнения?",
  "Почему мы ищем справедливость?",
] as const;
