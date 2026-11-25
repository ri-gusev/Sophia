import { registrationRevisions } from "../../src/features/legal/server/revisions.ts";

export const legalVersions = Object.fromEntries(registrationRevisions().map(({ kind, version }) => [kind, version]));
export const legalAcceptance = { age: true, terms: true, consent: true, legalVersions };
