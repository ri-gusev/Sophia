export const siteAgeCategory = "18+";

export const legalDocuments = {
  privacy: { href: "/privacy", title: "Политика обработки персональных данных" },
  terms: { href: "/terms", title: "Пользовательское соглашение" },
  consent: { href: "/consent", title: "Согласие на обработку персональных данных" },
} as const;

export const legalConfirmations = {
  age: "Подтверждаю, что мне исполнилось 18 лет.",
  terms: "Принимаю пользовательское соглашение.",
  consent: "Даю согласие на обработку персональных данных.",
} as const;

export const confirmationKinds = ["age", "terms", "consent"] as const;
export type ConfirmationKind = typeof confirmationKinds[number];
export type LegalDocumentKind = keyof typeof legalDocuments;
export type RevisionKind = LegalDocumentKind | "age";
export type LegalVersions = Readonly<Record<RevisionKind, string>>;
export const registrationClosed = "Регистрация пока недоступна.";
