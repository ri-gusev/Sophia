import { ChatError, type ChatRequest, type ChatReply, type CitedSource } from "../chat-contract.ts";
import { parseDialogueState } from "../dialogue-state.ts";
import type { KnowledgeExcerpt } from "./knowledge-retrieval.ts";
import type { TextGenerator } from "./openai-provider.ts";
import { answerPlato } from "./chat-service.ts";
import { ANALYSIS_INSTRUCTIONS } from "./plato-persona.ts";
import { ANALYSIS_SCHEMA, DRAFT_SCHEMA, VALIDATION_SCHEMA, parseAnalysis, parseDraft, type Draft } from "./structured.ts";
import { parseValidation, programmaticValidation, VALIDATION_INSTRUCTIONS } from "./output-validation.ts";
import { safetyReply } from "./safety-handler.ts";

export type TurnMetrics = { event: "plato_turn"; durationMs: number; retrieved: number; modelCalls: number; regenerations: number; valid: boolean; abstained: boolean; safety: string; localFailures: number; unsupported: number; anachronisms: number; attributions: number; failureCodes: string[] };
type Dependencies = { generate: TextGenerator; retrieve: (query: string, signal?: AbortSignal) => Promise<KnowledgeExcerpt[]>; config: { validation: boolean; historical: boolean }; log?: (metrics: TurnMetrics) => void };
class UnsafeGeneratedOutput extends Error {}
export async function answerHistoricalPlato(request: ChatRequest, dependencies: Dependencies, signal?: AbortSignal): Promise<ChatReply> {
  const start = Date.now();
  let modelCalls = 0, retrieved = 0, regenerations = 0, valid = false, safety = "unknown";
  let localFailures = 0, unsupported = 0, anachronisms = 0, attributions = 0;
  let abstained = false;
  const failureCodes = new Set<string>();
  const generate: TextGenerator = async value => { if (signal?.aborted) throw new ChatError(499, "Отправка остановлена."); modelCalls++; return dependencies.generate({ ...value, signal }); };
  try {
    const analysis = parseAnalysis(await generate({ instructions: ANALYSIS_INSTRUCTIONS, input: [{ role: "user", content: JSON.stringify({ message: request.message, memory: request.memory }) }], maxOutputTokens: 2000, format: { name: "turn_analysis", schema: ANALYSIS_SCHEMA } }));
    safety = analysis.safety;
    if (safety !== "allow") { valid = true; return safetyReply(analysis.safety as "refuse" | "crisis", request.memory); }
    // Merge preserved definitions rather than silently losing them when the recent window compacts.
    const concepts = new Map(request.memory.dialogue?.introduced_concepts.map(item => [item.concept.toLowerCase(), item]) ?? []);
    const normalized = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
    const userStatements = [...request.memory.recent.filter(item => item.role === "user").map(item => item.content), request.message];
    let definedNow = false;
    // A model paraphrase is not evidence the user supplied a definition. Require a literal user statement.
    for (const item of analysis.state.introduced_concepts) {
      const previous = concepts.get(item.concept.toLowerCase());
      if (previous && previous.explanation === item.explanation) continue;
      if (item.explanation.trim() && !item.explanation.includes("?") && userStatements.some(text => normalized(text).includes(normalized(item.explanation)))) {
        concepts.set(item.concept.toLowerCase(), item);
        if (normalized(request.message).includes(normalized(item.explanation))) definedNow = true;
      }
    }
    if (analysis.historical_category === "introduced" && !concepts.size) analysis.historical_category = "modern_unknown";
    if (analysis.historical_category === "modern_unknown" && (definedNow || [...concepts.keys()].some(concept => normalized(`${request.message}\n${analysis.query}`).includes(concept)))) analysis.historical_category = "introduced";
    analysis.state.introduced_concepts = [...concepts.values()].slice(-8);
    try { analysis.state = parseDialogueState(analysis.state); } catch { throw new ChatError(502, "Состояние разговора слишком велико. Попробуйте снова."); }
    if (analysis.historical_category === "modern_unknown" && dependencies.config.historical) {
      // Fixed, auditable clarification: the model cannot smuggle its own modern definition into this turn.
      const message = "Мне это незнакомо. Что ты под этим подразумеваешь? Объясни, и мы попробуем вместе это исследовать.";
      const result = await answerPlato({ ...request, memory: { ...request.memory, dialogue: analysis.state } }, {
        retrieve: () => [], generate: value => value.maxOutputTokens === 450 ? generate(value) : Promise.resolve(message),
      }, signal);
      valid = true;
      return { ...result, memory: { ...result.memory, dialogue: analysis.state }, outcome: "clarification" };
    }
    const excerpts = analysis.historical_category === "modern_unknown" && dependencies.config.historical ? [] : await dependencies.retrieve(analysis.query || request.message, signal);
    retrieved = excerpts.length;
    let accepted: Draft | undefined;
    const result = await answerPlato({ ...request, memory: { ...request.memory, dialogue: analysis.state } }, {
      retrieve: () => excerpts, context: { action: analysis.action, historical_category: analysis.historical_category, historical_mode: dependencies.config.historical },
      generate: async value => {
        // Compaction is a separate, plain-text task. The turn's structured state already preserves definitions.
        if (value.maxOutputTokens === 450) return generate(value);
        let feedback: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
          const draft = parseDraft(await generate({ ...value, maxOutputTokens: 1800, format: { name: "plato_draft", schema: DRAFT_SCHEMA }, input: [...value.input, ...(feedback ? [{ role: "user" as const, content: `Данные проверки предыдущего черновика: ${JSON.stringify(feedback)}. Сформируй исправленный ответ по исходным правилам; не показывай проверку.` }] : [])] }));
          const local = programmaticValidation(draft, excerpts, analysis);
          const semantic = dependencies.config.validation ? parseValidation(await generate({ instructions: VALIDATION_INSTRUCTIONS,
            input: [{ role: "user", content: JSON.stringify({ draft, analysis, message: request.message, recent: request.memory.recent, sources: excerpts.map((source, index) => ({ number: index + 1, ...source })) }) }], maxOutputTokens: 2400, reasoningEffort: "low", format: { name: "grounding_validation", schema: VALIDATION_SCHEMA } })) : local;
          if (!local.valid) localFailures++;
          for (const code of [...local.unsupported_claims, ...local.historical_anachronisms, ...local.fabricated_attributions, ...semantic.unsupported_claims, ...semantic.historical_anachronisms, ...semantic.fabricated_attributions]) {
            if (/^(?:unsupported_historical_fact|unsupported_position|factual_reconstruction|missing_definition|modern_extra_knowledge|unhelpful_questioning|unsafe_output|context_mismatch|fabricated_quote|fabricated_work|invalid_message_size|technical_or_markup_leak|excessive_questions|missing_evidence|evidence_not_in_context|unverified_evidence|quotation_mismatch|modern_explanation_without_definition)$/.test(code)) failureCodes.add(code);
          }
          unsupported += semantic.unsupported_claims.length; anachronisms += semantic.historical_anachronisms.length; attributions += semantic.fabricated_attributions.length;
          if (semantic.unsupported_claims.includes("unsafe_output")) throw new UnsafeGeneratedOutput();
          if (local.valid && semantic.valid) { accepted = draft; valid = true; return draft.message; }
          feedback = { previousDraft: draft, local, semantic };
          if (!attempt) regenerations++;
        }
        // Honest abstention is not a fabricated historical answer or a successful validation.
        abstained = true;
        return "Не стану утверждать то, для чего у меня нет надёжного основания. Пока не могу уверенно ответить на этот вопрос без риска приписать прошлому лишнее. Можем исследовать саму мысль без такой атрибуции. Что ты хотел бы в ней прояснить?";
      },
    }, signal);
    const used = new Set(accepted?.claims.flatMap(claim => claim.evidence.map(evidence => evidence.source)) ?? []);
    const sources: CitedSource[] = excerpts.flatMap((source, i) => used.has(i + 1) ? [{ id: source.id, documentId: source.documentId, title: source.work || "Историческое основание", revision: source.revision, reference: i + 1,
      ...(source.work ? { work: source.work } : {}), ...(source.stephanus ? { stephanus: source.stephanus } : {}) }] : []);
    return { ...result, memory: { ...result.memory, dialogue: analysis.state }, sources, outcome: abstained ? "abstained" : "answer" };
  } catch (error) {
    if (error instanceof UnsafeGeneratedOutput) { safety = "refuse_output"; valid = true; return safetyReply("refuse", request.memory); }
    throw error;
  } finally {
    dependencies.log?.({ event: "plato_turn", durationMs: Date.now() - start, retrieved, modelCalls, regenerations, valid, abstained, safety, localFailures, unsupported, anachronisms, attributions, failureCodes: [...failureCodes] });
  }
}
