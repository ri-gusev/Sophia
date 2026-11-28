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

const publicKinds = ["privacy", "terms", "consent"] as const;
export const revisionKinds = [...publicKinds, "age"] as const;
const versions: LegalVersions = { privacy: "1.0", terms: "1.0", consent: "1.0", age: "1.0" };

function configuredEffectiveDate(): string | null {
  const date = process.env.LEGAL_RELEASE_EFFECTIVE_DATE;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

export function legalRevision(kind: LegalDocumentKind): LegalRevision {
  const age = `Возрастная маркировка сайта «София» и всех его образовательных материалов — ${siteAgeCategory}.

`;
  return {
    kind,
    version: kind === "mailings" ? mailingConsentVersion : versions[kind],
    title: `${legalDocuments[kind].title} «София»`,
    effectiveDate: configuredEffectiveDate(),
    body: age + documentText[kind],
  };
}

export function submittedMailingConsent(value: unknown): LegalRevision | null {
  if (value === undefined) return null;
  if (value !== mailingConsentVersion) {
    throw new AccountError(409, "Обновите страницу и ознакомьтесь с текущей редакцией согласия на рассылки.");
  }
  if (!availableLegalVersions()) throw new AccountError(503, registrationClosed);
  return legalRevision("mailings");
}

export function registrationRevisions(): readonly LegalRevision[] {
  return [...publicKinds.map(legalRevision), {
    kind: "age", version: versions.age, title: "Подтверждение возраста", effectiveDate: null, body: legalConfirmations.age,
  }];
}

export function legalReleaseReady(): boolean {
  // Set only after the operator signs off on docs/legal/DATA_PROCESSING.md.
  if (process.env.LEGAL_RELEASE_APPROVED !== "true") return false;
  const date = configuredEffectiveDate();
  return date !== null && Date.parse(`${date}T00:00:00+03:00`) <= Date.now() &&
    /^(0|6|12|16|18)\+$/.test(siteAgeCategory) &&
    [...publicKinds, "mailings" as const].map(legalRevision).every(({ version, body }) =>
      /^\d+\.\d+(?:\.\d+)?$/.test(version) && !/\[[^\]]+\]|уточняется|подлежат подтверждению/iu.test(body));
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
