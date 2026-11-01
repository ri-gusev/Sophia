export type PhilosopherCatalog = {
  id: string;
  title: string;
  description: string;
  status: string;
  sections: readonly { id: string; title: string; emptyMessage: string }[];
};

// The approved roadmap content will be imported separately; no lesson list is invented here.
export const PHILOSOPHER_CATALOGS = {
  plato: {
    id: "plato",
    title: "Платон",
    description: "Платон — древнегреческий философ. Здесь будут собраны материалы для знакомства с его философией.",
    status: "Содержание в разработке",
    sections: [
      { id: "themes", title: "Основные темы", emptyMessage: "Темы будут добавлены позже." },
      { id: "works", title: "Диалоги и произведения", emptyMessage: "Перечень диалогов и произведений готовится." },
      { id: "materials", title: "Дополнительные материалы", emptyMessage: "Дополнительные материалы появятся здесь позже." },
    ],
  },
} as const satisfies Record<string, PhilosopherCatalog>;

export type PhilosopherCatalogId = keyof typeof PHILOSOPHER_CATALOGS;
