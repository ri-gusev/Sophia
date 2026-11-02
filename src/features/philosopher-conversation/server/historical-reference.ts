import type { KnowledgeExcerpt } from "./knowledge-retrieval.ts";

/** Narrow, manually checked primary-source summary, not an upgrade of the private corpus.
 * Plato, Apology, Jowett translation: indictment and verdict sections.
 * https://classics.mit.edu/Plato/apology.html (checked 2026-11-02).
 * Does NOT attest Plato's personal attendance, private motives or meetings.
 */
const APOLOGY_CHARGES: KnowledgeExcerpt = {
  id: "primary:apology:charges-verdict", documentId: "plato-apology-primary-note", revision: 1,
  title: "Апология Сократа", work: "Апология Сократа", sourceId: "mit-classics-apology-jowett",
  verificationStatus: "verified", claimType: "historical_fact",
  text: "В «Апологии Сократа» изложено обвинение: Сократ развращает юношей, не признаёт богов, которых признаёт город, и вводит иные божественные существа. Это содержание обвинения, а не доказательство его справедливости. После признания виновным суд приговорил Сократа к смерти. Эти сведения не устанавливают личного присутствия Платона или скрытых мотивов обвинителей.",
};

/** Phaedo, Jowett translation, discussion of the unchanging forms and changing visible things.
 * https://classics.mit.edu/Plato/phaedo.html (checked 2026-11-02).
 * This limited doctrinal note does not certify unrelated claims from the private corpus.
 */
const PHAEDO_FORMS: KnowledgeExcerpt = {
  id: "primary:phaedo:forms-change", documentId: "plato-phaedo-primary-note", revision: 1,
  title: "Федон", work: "Федон", sourceId: "mit-classics-phaedo-jowett",
  verificationStatus: "verified", claimType: "philosophical_position",
  text: "В «Федоне» различаются неизменные сущности, например само равное и само прекрасное, и изменяющиеся равные или красивые вещи. Отдельные вещи доступны чувствам; неизменное постигается умом. Это различение философских предметов, а не утверждение о личной встрече или воспоминании автора.",
};

export function historicalReferences(message: string): KnowledgeExcerpt[] {
  if (/сократ/iu.test(message) && /казн|суд|обвин|приговор/iu.test(message)) return [{ ...APOLOGY_CHARGES }];
  if (/теори[яюи].{0,20}идей|мир.{0,15}идей|что.{0,15}иде[яи]/iu.test(message)) return [{ ...PHAEDO_FORMS }];
  return [];
}
