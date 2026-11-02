import { DIALOGUE_ACTIONS, parseDialogueState, type DialogueState } from "../dialogue-state.ts";
import { ChatError } from "../chat-contract.ts";
const string = { type: "string" };
export const objectSchema = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const array = (items: unknown) => ({ type: "array", items });
const action = { type: "string", enum: [...DIALOGUE_ACTIONS] };
export const ANALYSIS_SCHEMA = objectSchema({ safety: { type: "string", enum: ["allow", "refuse", "crisis"] }, historical_category: { type: "string", enum: ["historical", "modern_unknown", "introduced"] }, query: string, action,
  state: objectSchema({ current_topic: string, user_theses: array(string), open_questions: array(string), contradictions: array(string), introduced_concepts: array(objectSchema({ concept: string, explanation: string })), dialogue_stage: action }) });
export function draftSchema(verifiedSources: number[]) {
  const evidence = verifiedSources.length ? array(objectSchema({ source: { type: "integer", enum: verifiedSources }, quote: { type: "string", minLength: 1 } })) : { ...array(objectSchema({ source: { type: "integer" }, quote: string })), maxItems: 0 };
  return objectSchema({ message: string, claims: array(objectSchema({ text: string, kind: { type: "string", enum: verifiedSources.length ? ["fact", "position", "quote", "reconstruction"] : ["reconstruction"] }, evidence })) });
}
export const VALIDATION_SCHEMA = objectSchema({ valid: { type: "boolean" }, unsupported_claims: array(string), historical_anachronisms: array(string), fabricated_attributions: array(string), dialogue_violations: array(string), requires_regeneration: { type: "boolean" } });
export type TurnAnalysis = { safety: "allow" | "refuse" | "crisis"; historical_category: "historical" | "modern_unknown" | "introduced"; query: string; action: DialogueState["dialogue_stage"]; state: DialogueState };
export type Draft = { message: string; claims: { text: string; kind: "fact" | "position" | "quote" | "reconstruction"; evidence: { source: number; quote: string }[] }[] };
export type ValidationResult = { valid: boolean; unsupported_claims: string[]; historical_anachronisms: string[]; fabricated_attributions: string[]; dialogue_violations: string[]; requires_regeneration: boolean };
export function jsonObject(raw: string): Record<string, unknown> {
  try { const value: unknown = JSON.parse(raw); if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>; } catch {}
  throw new ChatError(502, "Не удалось проверить ответ. Попробуйте ещё раз.");
}
export function parseAnalysis(raw: string): TurnAnalysis {
  const value = jsonObject(raw);
  if (!["allow", "refuse", "crisis"].includes(String(value.safety)) || !["historical", "modern_unknown", "introduced"].includes(String(value.historical_category)) || typeof value.query !== "string" || value.query.length > 600 || !DIALOGUE_ACTIONS.includes(value.action as DialogueState["dialogue_stage"])) throw new ChatError(502, "Не удалось проверить запрос. Попробуйте снова.");
  let state: DialogueState;
  try { state = parseDialogueState(value.state); } catch { throw new ChatError(502, "Не удалось обновить состояние беседы. Попробуйте снова."); }
  return { safety: value.safety as TurnAnalysis["safety"], historical_category: value.historical_category as TurnAnalysis["historical_category"], query: value.query, action: value.action as TurnAnalysis["action"], state };
}
export function parseDraft(raw: string): Draft {
  const value = jsonObject(raw);
  if (typeof value.message !== "string" || !value.message.trim() || value.message.length > 6000 || !Array.isArray(value.claims) || value.claims.length > 20) throw new ChatError(502, "Не удалось проверить ответ. Попробуйте снова.");
  const claims = value.claims.map(item => {
    if (!item || typeof item !== "object" || typeof item.text !== "string" || item.text.length > 1500 || !["fact", "position", "quote", "reconstruction"].includes(item.kind) || !Array.isArray(item.evidence) || item.evidence.length > 8) throw new ChatError(502, "Не удалось проверить утверждения ответа.");
    const evidence = item.evidence.map((entry: unknown) => {
      if (!entry || typeof entry !== "object" || !("source" in entry) || !("quote" in entry) || !Number.isInteger(entry.source) || typeof entry.quote !== "string" || entry.quote.length > 2000) throw new ChatError(502, "Не удалось проверить ссылки ответа.");
      return { source: Number(entry.source), quote: entry.quote };
    });
    return { text: item.text as string, kind: item.kind as Draft["claims"][number]["kind"], evidence };
  });
  return { message: value.message.trim(), claims };
}
