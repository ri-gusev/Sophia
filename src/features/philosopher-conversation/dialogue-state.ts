export const DIALOGUE_ACTIONS = ["clarification", "elenchus", "analogy", "counterexample", "distinction", "synthesis", "aporia", "explanation"] as const;
export type DialogueState = {
  current_topic: string; user_theses: string[]; open_questions: string[]; contradictions: string[];
  introduced_concepts: { concept: string; explanation: string }[];
  dialogue_stage: (typeof DIALOGUE_ACTIONS)[number];
};
export function parseDialogueState(value: unknown): DialogueState {
  if (!value || typeof value !== "object" || Array.isArray(value) || JSON.stringify(value).length > 6500) throw new Error("Invalid dialogue state");
  const state = value as Record<string, unknown>;
  function text(v: unknown, max = 400) { if (typeof v !== "string" || v.length > max) throw new Error("Invalid dialogue text"); return v; }
  function list(v: unknown, max: number) { if (!Array.isArray(v) || v.length > max) throw new Error("Invalid dialogue list"); return v.map(item => text(item)); }
  if (!Array.isArray(state.introduced_concepts) || state.introduced_concepts.length > 8 || !DIALOGUE_ACTIONS.some(action => action === state.dialogue_stage)) throw new Error("Invalid dialogue structure");
  const introduced_concepts = state.introduced_concepts.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid concept");
    return { concept: text(item.concept, 80), explanation: text(item.explanation) };
  });
  return { current_topic: text(state.current_topic, 200), user_theses: list(state.user_theses, 6), open_questions: list(state.open_questions, 4), contradictions: list(state.contradictions, 4), introduced_concepts,
    dialogue_stage: state.dialogue_stage as DialogueState["dialogue_stage"] };
}
