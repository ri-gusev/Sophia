import {
  confirmationKinds, legalConfirmations, legalDocuments, mailingConsentVersion, registrationClosed, siteAgeCategory,
  type LegalDocumentKind, type LegalVersions, type RevisionKind,
} from "../contract.ts";
import { AccountError } from "../../account/server/errors.ts";
import { accountSettings } from "../../account/server/config.ts";
import { documentText } from "./document-text.ts";

export type LegalRevision = Readonly<{
  kind: RevisionKind;
  version: string;
  title: string;
  effectiveDate: string | null;
  body: string;
}>;

// Publish a new version after the owner confirms the items in docs/legal/DATA_PROCESSING.md.
const release: { approved: boolean; effectiveDates: Partial<Record<LegalDocumentKind, string>>; ageCategory: string | null } = {
  approved: false,
  effectiveDates: { privacy: "2026-11-28", consent: "2026-11-28" },
  ageCategory: siteAgeCategory,
};

const publicKinds = ["privacy", "terms", "consent"] as const;
export const revisionKinds = [...publicKinds, "age"] as const;
const versions: LegalVersions = { privacy: "1.0-draft.4", terms: "1.0-draft.2", consent: "1.0-draft.4", age: "1.0" };

export function legalRevision(kind: LegalDocumentKind): LegalRevision {
  const age = `Возрастная маркировка сайта Sophia и всех его образовательных материалов — ${release.ageCategory ?? "уточняется"}.

`;
  return {
    kind,
    version: kind === "mailings" ? mailingConsentVersion : versions[kind],
    title: `${legalDocuments[kind].title} Sophia`,
    effectiveDate: release.effectiveDates[kind] ?? null,
    body: age + documentText[kind],
  };
}

export function submittedMailingConsent(value: unknown): LegalRevision | null {
  if (value === undefined) return null;
  if (value !== mailingConsentVersion) {
    throw new AccountError(409, "Обновите страницу и ознакомьтесь с текущей редакцией согласия на рассылки.");
  }
  return legalRevision("mailings");
}

export function registrationRevisions(): readonly LegalRevision[] {
  return [...publicKinds.map(legalRevision), {
    kind: "age", version: versions.age, title: "Подтверждение возраста", effectiveDate: null, body: legalConfirmations.age,
  }];
}

export function legalReleaseReady(): boolean {
  const now = Date.now();
  return release.approved && /^(0|6|12|16|18)\+$/.test(release.ageCategory ?? "") &&
    publicKinds.map(legalRevision).every(({ version, effectiveDate, body }) => {
      if (!effectiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return false;
      const time = Date.parse(`${effectiveDate}T00:00:00+03:00`);
      return Number.isFinite(time) && time <= now &&
        new Date(Date.parse(`${effectiveDate}T00:00:00Z`)).toISOString().slice(0, 10) === effectiveDate &&
        /^\d+\.\d+(?:\.\d+)?$/.test(version) && !/\[[^\]]+\]|уточняется|подлежат подтверждению/iu.test(body);
    });
}

export function availableLegalVersions(): LegalVersions | null {
  try {
    const { mode } = accountSettings();
    if (mode === "local" && process.env.ACCOUNT_MAIL_TRANSPORT === "test") return versions;
    return process.env.ACCOUNT_REGISTRATION_ENABLED === "true" && legalReleaseReady() ? versions : null;
  } catch (error) {
    if (error instanceof AccountError) return null;
    throw error;
  }
}

export function requireLegalRegistration(): LegalVersions {
  const current = availableLegalVersions();
  if (!current) throw new AccountError(503, registrationClosed);
  return current;
}

export function requireLegalConfirmations(body: Record<string, unknown>) {
  const expected = requireLegalRegistration();
  if (confirmationKinds.some(kind => body[kind] !== true)) {
    throw new AccountError(400, "Подтвердите возраст, примите соглашение и дайте согласие на обработку данных.");
  }
  if (!body.legalVersions || typeof body.legalVersions !== "object") {
    throw new AccountError(409, "Обновите страницу и ознакомьтесь с текущими редакциями документов.");
  }
  const submitted = body.legalVersions as Record<string, unknown>;
  if (Object.keys(submitted).length !== revisionKinds.length ||
      revisionKinds.some(kind => !Object.hasOwn(submitted, kind) || submitted[kind] !== expected[kind])) {
    throw new AccountError(409, "Обновите страницу и ознакомьтесь с текущими редакциями документов.");
  }
  return registrationRevisions();
}
