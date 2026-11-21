import { VIRTUE_SWARM, type VirtueSwarmContent } from "./virtue-swarm-data";
import { VIRTUE_DEFINITION_PRACTICE, type DefinitionPracticeContent } from "./virtue-definition-practice-data";
import { SOCRATIC_REFLECTION, type ReflectionContent } from "./reflection-data";
import { COURAGE_WORKSHOP, type WorkshopContent } from "./workshop-data";
import { SOCRATIC_PRACTICE, type PracticeContent } from "./practice-data";
import { CEPHALUS_DIALOGUE, type DialogueContent } from "./dialogue-data";
import { SOCRATIC_MENTOR, type MentorContent } from "./mentor-data";
import { MENO_QUESTION, type VirtueIntroContent } from "./virtue-intro-data";
import { VIRTUE_GALLERY, type VirtueGalleryContent } from "./virtue-gallery-data";
export type LessonSceneImage = { src: string; position?: string };
export type LessonSource = { title: string; url: string };
type SceneBase = {
  id: string;
  lessonId: string;
  title: string;
  subtitle?: string;
  paragraphs: readonly string[];
  image: LessonSceneImage;
  imageAlt: string;
  buttonLabel: string;
  quote?: string;
  quoteAttribution?: string;
  quotePlacement?: "right";
  exercisePlacement?: "right";
  feedbackPlacement?: "navigation";
  map?: "greece";
  portrait?: {
    presentation?: "story";
    src: string; alt: string; width: number; height: number;
    title: string; credit: string; sourceUrl: string; license: string; licenseUrl: string;
  };
};
type ExerciseFields = {
  question: string;
  questionHighlight?: string;
  options: readonly { id: string; text: string; image?: string }[];
  feedback: { correct: string; incorrect: string };
};
export type LessonSceneData = SceneBase & (
  | { type: "story" }
  | { type: "virtue-intro"; virtue: VirtueIntroContent }
  | { type: "virtue-gallery"; gallery: VirtueGalleryContent }
  | { type: "virtue-swarm"; swarm: VirtueSwarmContent }
  | { type: "virtue-definition-practice"; definitionPractice: DefinitionPracticeContent }
  | { type: "lesson-reflection"; reflection: ReflectionContent }
  | { type: "question-workshop"; workshop: WorkshopContent }
  | { type: "guided-practice"; practice: PracticeContent }
  | { type: "dialogue"; dialogue: DialogueContent }
  | { type: "mentor-dialogue"; mentor: MentorContent }
  | ({ type: "single-choice"; correctAnswer: string } & ExerciseFields)
  | ({ type: "ordering"; correctAnswer: readonly string[] } & ExerciseFields)
  | { type: "completion"; bullets: readonly string[]; closing: readonly string[] }
);
export type IntroLesson = {
  id: string;
  title: string;
  duration: string;
  plannedSlides?: number;
  scenes: readonly LessonSceneData[];
  sources: readonly LessonSource[];
};

// User-supplied lesson script, with subsequent user-requested revisions.
export const INTRO_LESSONS = {
  "plato-virtue-definition": {
    id: "plato-virtue-definition", title: "Что значит быть хорошим человеком?", duration: "6–10 минут", plannedSlides: 5,
    scenes: [{ id: "meno-question", lessonId: "plato-virtue-definition", type: "virtue-intro",
      title: "Можно ли научиться быть хорошим?", paragraphs: [],
      image: { src: "/images/lessons/virtue/socrates-meno.webp" },
      imageAlt: "Сократ слева и молодой Менон справа беседуют в солнечном древнегреческом дворе среди олив и светлых колонн",
      buttonLabel: "Продолжить урок", virtue: MENO_QUESTION },
      { id: "virtue-many-faces", lessonId: "plato-virtue-definition", type: "virtue-gallery",
        title: "У добродетели много лиц", paragraphs: [],
        image: { src: "/images/lessons/virtue/socrates-meno.webp" },
        imageAlt: "Сократ и Менон беседуют в древнегреческом дворе",
        buttonLabel: "Вернуться в каталог", gallery: VIRTUE_GALLERY },
      { id: "virtue-swarm", lessonId: "plato-virtue-definition", type: "virtue-swarm",
        title: "Рой добродетелей", paragraphs: [], image: { src: "/images/lessons/virtue/socrates-meno.webp" },
        imageAlt: "Сад Сократа", buttonLabel: "Вернуться в каталог", swarm: VIRTUE_SWARM },
      { id: "virtue-definition-practice", lessonId: "plato-virtue-definition", type: "virtue-definition-practice",
        title: "Пример или определение?", paragraphs: [], image: { src: "/images/lessons/dialogue/socrates.webp" },
        imageAlt: "Сократ в философской мастерской", buttonLabel: "Вернуться в каталог", definitionPractice: VIRTUE_DEFINITION_PRACTICE }],
    sources: [{ title: "Платон, «Менон», 70a–73e", url: "https://classics.mit.edu/Plato/meno.html" }],
  },
  "plato-socratic-question": {
    id: "plato-socratic-question", title: "Как Сократ разрушал уверенность?", duration: "10–12 минут",
    scenes: [{ id: "cephalus", lessonId: "plato-socratic-question", type: "dialogue",
      title: "Всегда ли поступать честно — значит поступать правильно?", paragraphs: [],
      image: { src: "/images/lessons/dialogue/courtyard.webp" },
      imageAlt: "Солнечный двор древнегреческого дома в Пирее: колонны, растения и каменная терраса",
      buttonLabel: "Вернуться к курсу", dialogue: CEPHALUS_DIALOGUE },
      { id: "socratic-questions", lessonId: "plato-socratic-question", type: "mentor-dialogue",
        title: "Почему Сократ задавал вопросы?", subtitle: "Теперь Сократ обращается к тебе", paragraphs: [],
        image: { src: "/images/lessons/dialogue/courtyard.webp" }, imageAlt: "Двор Кефала", buttonLabel: "Вернуться к курсу", mentor: SOCRATIC_MENTOR },
      { id: "always-true", lessonId: "plato-socratic-question", type: "guided-practice", title: "А всегда ли это так?", paragraphs: [], image: { src: "/images/lessons/dialogue/courtyard.webp" }, imageAlt: "Двор Кефала", buttonLabel: "Вернуться к курсу", practice: SOCRATIC_PRACTICE },
      { id: "courage-question", lessonId: "plato-socratic-question", type: "question-workshop", title: "Теперь ты на месте Сократа", paragraphs: [], image: { src: "/images/lessons/dialogue/courtyard.webp" }, imageAlt: "Учебная сцена в Афинах", buttonLabel: "Вернуться к курсу", workshop: COURAGE_WORKSHOP },
      { id: "first-step", lessonId: "plato-socratic-question", type: "lesson-reflection", title: "Ты сделал первый шаг", subtitle: "Последние слова Сократа", paragraphs: [], image: { src: "/images/lessons/plato/06-academy.webp" }, imageAlt: "Тихий античный сад", buttonLabel: "Завершить урок", reflection: SOCRATIC_REFLECTION }],
    sources: [{ title: "Платон, Государство, книга I, 331c–331d", url: "https://classics.mit.edu/Plato/republic.2.i.html" }],
  },
  "plato-introduction": {
    "id": "plato-introduction",
    "title": "Кто такой Платон?",
    "duration": "6–8 минут",
    "scenes": [
      {
        "id": "journey",
        "portrait": {
          "src": "/images/philosophers/plato.png",
          "alt": "Мраморный бюст Платона",
          "width": 500,
          "height": 750,
          "credit": "Marie-Lan Nguyen",
          "title": "Plato Silanion Musei Capitolini MC1377.png",
          "sourceUrl": "https://commons.wikimedia.org/wiki/File:Plato_Silanion_Musei_Capitolini_MC1377.png",
          "license": "CC BY 2.5",
          "licenseUrl": "https://creativecommons.org/licenses/by/2.5/"
        },
        "lessonId": "plato-introduction",
        "type": "story",
        "title": "Кто такой Платон?",
        "paragraphs": [
          "Представь человека, жившего почти две с половиной тысячи лет назад.",
          "Он задавал вопросы, над которыми люди размышляют до сих пор.",
          "Что такое справедливость? Можно ли доверять своим чувствам? Что делает человека счастливым?",
          "Его звали Платон.",
          "Он стал одним из самых влиятельных философов в истории. Но когда-то он был обычным молодым афинянином, которому ещё предстояло найти собственный путь."
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/01-athens.webp",
          "position": "center center"
        },
        "imageAlt": "Панорама древних Афин. Акрополь на возвышенности, античные здания, тёплый солнечный свет. Атмосфера начала путешествия.",
        "buttonLabel": "Начать путешествие"
      },
      {
        "id": "athens",
        "map": "greece",
        "lessonId": "plato-introduction",
        "type": "story",
        "title": "Афины, V век до н. э.",
        "paragraphs": [
          "Платон родился приблизительно в 427 году до нашей эры в знатной афинской семье.",
          "Он рос в городе, где обсуждали политику, спорили о справедливости и выступали знаменитые ораторы.",
          "Однако Афины переживали непростое время. Войны и политические потрясения заставляли людей задумываться о том, какой должна быть власть и кто достоин управлять государством.",
          "Именно в этом мире начиналась история будущего философа."
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/02-athenian-streets.webp",
          "position": "center center"
        },
        "imageAlt": "Оживлённые улицы древних Афин. Горожане, торговцы, античные здания.",
        "buttonLabel": "Продолжить"
      },
      {
        "id": "poet",
        "exercisePlacement": "right",
        "lessonId": "plato-introduction",
        "type": "single-choice",
        "title": "Философ, который мог стать поэтом",
        "paragraphs": [
          "Согласно древнему преданию, в юности Платон увлекался поэзией и писал трагедии.",
          "Однажды он услышал рассуждения Сократа — человека, который не предлагал готовых ответов, а заставлял других исследовать собственные убеждения.",
          "Легенда рассказывает, что Платон настолько впечатлился, что сжёг свои трагедии и решил посвятить жизнь философии.",
          "Мы не знаем, произошло ли это на самом деле.",
          "Но история показывает, какое огромное значение античные авторы придавали встрече Платона с Сократом."
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/03-young-plato.webp",
          "position": "center center"
        },
        "imageAlt": "Молодой Платон за деревянным столом среди свитков. Рядом лежит рукопись трагедии. Тёплый свет.",
        "buttonLabel": "Продолжить",
        "question": "Что мы можем сказать об истории с сожжёнными трагедиями?",
        "options": [
          {
            "id": "a",
            "text": "А. Это достоверно установленный исторический факт."
          },
          {
            "id": "b",
            "text": "Б. Это античное предание, достоверность которого неизвестна."
          },
          {
            "id": "c",
            "text": "В. Это современная выдумка, не имеющая античных источников."
          }
        ],
        "correctAnswer": "b",
        "feedback": {
          "correct": "Верно! Рассказ сохранился у античного автора Диогена Лаэртского. Однако наличие письменного свидетельства ещё не доказывает, что описанное событие действительно произошло.",
          "incorrect": "Это античное предание, но его достоверность неизвестна. Важно различать исторически подтверждённые события и рассказы, сохранившиеся в древних источниках."
        }
      },
      {
        "id": "socrates",
        "exercisePlacement": "right",
        "feedbackPlacement": "navigation",
        "lessonId": "plato-introduction",
        "type": "single-choice",
        "title": "Человек, который задавал вопросы",
        "paragraphs": [
          "Сократ был необычным философом.",
          "Вместо длинных лекций он часто вступал в беседы и задавал собеседникам вопросы.",
          "Например, человек мог уверенно заявить, что знает, что такое мужество или справедливость.",
          "Но когда Сократ просил объяснить значение этих слов, выяснялось, что дать точный ответ гораздо сложнее, чем кажется.",
          "Так Сократ помогал людям исследовать собственные убеждения.",
          "Этот способ философствования оказал огромное влияние на Платона."
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/04-socrates.webp",
          "position": "center center"
        },
        "imageAlt": "Сократ разговаривает с афинянами на площади. Молодой Платон среди слушателей. Художественная реконструкция.",
        "buttonLabel": "Продолжить",
        "question": "Представь, что человек говорит:\n\n«Я точно знаю, что такое справедливость».\n\nКакой вопрос лучше всего соответствует сократическому способу исследования?",
        "questionHighlight": "«Я точно знаю, что такое справедливость».",
        "options": [
          {
            "id": "a",
            "text": "А. «Кто научил тебя этому?»"
          },
          {
            "id": "b",
            "text": "Б. «Можешь объяснить, что такое справедливость?»"
          },
          {
            "id": "c",
            "text": "В. «Почему ты считаешь себя умнее остальных?»"
          }
        ],
        "correctAnswer": "b",
        "feedback": {
          "correct": "Именно! Сократический подход начинается с исследования того, что человек имеет в виду и способен ли он обосновать своё утверждение.",
          "incorrect": "Главная задача здесь — не выяснить авторитет собеседника и не оскорбить его, а попросить объяснить само понятие. Это позволяет исследовать убеждение."
        }
      },
      {
        "id": "trial",
        "portrait": {
          "presentation": "story",
          "src": "/images/lessons/plato/05-socrates-prison-portrait-v2.webp",
          "alt": "Сократ беседует с учениками в афинской тюрьме. Художественная интерпретация",
          "width": 800,
          "height": 1000,
          "credit": "Sophia",
          "title": "Сократ и ученики в афинской тюрьме",
          "sourceUrl": "/images/lessons/plato/README.md",
          "license": "Происхождение иллюстрации",
          "licenseUrl": "/images/lessons/plato/README.md"
        },
        "lessonId": "plato-introduction",
        "type": "story",
        "title": "Событие, изменившее многое",
        "paragraphs": [
          "Сократа обвинили в нечестии и развращении молодёжи.",
          "Афинский суд признал его виновным и приговорил к смерти.",
          "Для Платона это было тяжёлым событием. Позднее он посвятил несколько произведений суду над Сократом, его нравственному выбору и последним разговорам с учениками.",
          "Смерть учителя поднимала мучительный вопрос:",
          "Как общество, которое рассуждает о справедливости, могло приговорить к смерти человека, посвятившего жизнь её исследованию?"
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/05-socrates-prison.webp",
          "position": "center center"
        },
        "imageAlt": "Сдержанная драматичная сцена в афинской тюрьме. Сократ среди учеников, мягкий свет.",
        "buttonLabel": "Продолжить",
        "subtitle": "399 год до нашей эры"
      },
      {
        "id": "academy",
        "lessonId": "plato-introduction",
        "type": "ordering",
        "title": "Место, где учились мыслить",
        "paragraphs": [
          "Спустя годы Платон основал в Афинах философскую школу — Академию.",
          "Она возникла приблизительно в 380-х годах до нашей эры.",
          "Здесь занимались философией, математикой и исследованием природы знания.",
          "Одним из самых известных учеников Академии был Аристотель, который впоследствии создал собственное философское учение.",
          "Так идеи передавались от одного поколения мыслителей к другому — но ученики не обязательно соглашались со своими учителями."
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/06-academy.webp",
          "position": "center center"
        },
        "imageAlt": "Античный сад, тенистые аллеи, каменные колонны. Несколько мыслителей обсуждают философские вопросы.",
        "buttonLabel": "Продолжить",
        "question": "Восстанови правильную последовательность философов: кто был учителем кого?",
        "options": [
          {
            "id": "aristotle",
            "image": "/images/lessons/plato/characters/aristotle.webp",
            "text": "Аристотель"
          },
          {
            "id": "socrates",
            "image": "/images/lessons/plato/characters/socrates.webp",
            "text": "Сократ"
          },
          {
            "id": "plato",
            "image": "/images/lessons/plato/characters/plato.webp",
            "text": "Платон"
          }
        ],
        "correctAnswer": [
          "socrates",
          "plato",
          "aristotle"
        ],
        "feedback": {
          "correct": "Отлично! Платон был учеником Сократа, а Аристотель учился в Академии Платона. При этом все трое развивали собственные философские взгляды.",
          "incorrect": "Сначала Сократ повлиял на Платона, а позднее Аристотель учился у Платона. Правильная последовательность: Сократ → Платон → Аристотель."
        }
      },
      {
        "id": "legacy",
        "quotePlacement": "right",
        "lessonId": "plato-introduction",
        "type": "story",
        "title": "Почему мы изучаем Платона?",
        "paragraphs": [
          "Платон умер около 347 года до нашей эры.",
          "Но вопросы, которыми он занимался, пережили его на тысячелетия.",
          "Что такое знание? Существует ли совершенная справедливость? Что делает человеческую жизнь хорошей? Как устроена действительность?",
          "Его произведения повлияли на развитие философии, политической мысли, богословия и образования.",
          "Однако изучать Платона — не значит автоматически соглашаться с ним.",
          "Гораздо важнее научиться понимать его идеи, проверять аргументы и формировать собственную позицию."
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/08-library.webp",
          "position": "center center"
        },
        "imageAlt": "Атмосферная античная библиотека с рукописями. Композиция постепенно переходит к свету, символизирующему продолжение философской традиции.",
        "buttonLabel": "Завершить урок",
        "quote": "«Философия начинается там, где мы перестаём принимать ответы без вопросов».",
        "quoteAttribution": "Авторская формулировка Sophia"
      },
      {
        "id": "completion",
        "lessonId": "plato-introduction",
        "type": "completion",
        "title": "Знакомство состоялось!",
        "paragraphs": [
          "Сегодня ты узнал:"
        ],
        "image": {
          "src": "/images/lessons/plato/headers-v2/09-plato-bust.webp",
          "position": "center center"
        },
        "imageAlt": "Мраморный бюст Платона на фоне светлого античного сада. Спокойная, торжественная атмосфера.",
        "buttonLabel": "Вернуться к курсу",
        "subtitle": "Ты завершил первый урок философии Платона.",
        "bullets": [
          "Кем был Платон и в какую эпоху он жил.",
          "Почему Сократ сыграл важную роль в его жизни.",
          "Как появилась Академия.",
          "Кто такой Аристотель."
        ],
        "closing": [
          "Теперь ты знаешь, кем был Платон.",
          "В следующем уроке мы познакомимся с самим искусством философского вопроса."
        ]
      }
    ],
    "sources": [
      {
        "title": "Карта: Natural Earth — береговая линия, public domain",
        "url": "https://www.naturalearthdata.com/about/terms-of-use/"
      },
      {
        "title": "Координаты Афин — UNGEGN",
        "url": "https://ungegn.un.org/dashboard/cities/details?id=77"
      },
      {
        "title": "Stanford Encyclopedia of Philosophy — Plato",
        "url": "https://plato.stanford.edu/entries/plato/"
      },
      {
        "title": "Stanford Encyclopedia of Philosophy — Socrates",
        "url": "https://plato.stanford.edu/entries/socrates/"
      },
      {
        "title": "Internet Encyclopedia of Philosophy — Plato",
        "url": "https://iep.utm.edu/plato/"
      },
      {
        "title": "Internet Encyclopedia of Philosophy — The Academy",
        "url": "https://iep.utm.edu/plato-academy/"
      },
      {
        "title": "Диоген Лаэртский, книга III, §5–6 (перевод R. D. Hicks)",
        "url": "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Diogenes_Laertius/Lives_of_the_Eminent_Philosophers/3/Plato%2A.html"
      }
    ]
  }
} as const satisfies Record<string, IntroLesson>;

export type IntroLessonId = keyof typeof INTRO_LESSONS;
