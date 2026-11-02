import { parseDialogueState, type DialogueState } from "./dialogue-state.ts";

export const CHAT_LIMITS = {
  messageWords: 50, messageChars: 2000, assistantChars: 6000, summaryChars: 2000,
  recentMessages: 12, recentChars: 16000, keepMessages: 4,
  displayedMessages: 40, bodyBytes: 96 * 1024,
} as const;

/** Words are non-empty sequences separated by whitespace, including newlines. */
export function countMessageWords(value: string): number {
  return value.match(/\S+/gu)?.length ?? 0;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatMemory = { summary: string; recent: ChatMessage[]; dialogue?: DialogueState };
export type ChatSource = { id: string; documentId: string; title: string; revision: number; work?: string; stephanus?: string };
export type CitedSource = ChatSource & { reference: number };
export type ChatReply = { message: string; memory: ChatMemory; sources: CitedSource[]; outcome?: "answer" | "clarification" | "safety" | "abstained" };
export type ChatRequest = { philosopherId: "plato"; message: string; memory: ChatMemory };
export const EMPTY_CHAT_MEMORY: ChatMemory = { summary: "", recent: [] };
export const CHAT_MEMORY_NOTICE = "Разговор хранится только в этой вкладке. После перезагрузки он исчезнет.";

export class ChatError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ChatError(400, "Некорректный запрос.");
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) throw new ChatError(400, "Проверьте длину и содержимое сообщения.");
  return value;
}

export function parseChatRequest(value: unknown): ChatRequest {
  const body = record(value);
  if (body.philosopherId !== "plato") throw new ChatError(400, "Сейчас доступен только разговор с Платоном.");
  const memory = record(body.memory);
  const summary = text(memory.summary, CHAT_LIMITS.summaryChars, true);
  if (!Array.isArray(memory.recent) || memory.recent.length > CHAT_LIMITS.recentMessages || memory.recent.length % 2) throw new ChatError(400, "Некорректная память разговора. Начните новый разговор.");
  const recent = memory.recent.map((value, index): ChatMessage => {
    const item = record(value);
    const role = index % 2 === 0 ? "user" : "assistant";
    if (item.role !== role || Object.keys(item).some(key => key !== "role" && key !== "content")) throw new ChatError(400, "Некорректная история разговора.");
    return { role, content: text(item.content, role === "user" ? CHAT_LIMITS.messageChars : CHAT_LIMITS.assistantChars) };
  });
  if (recent.reduce((sum, item) => sum + item.content.length, 0) > CHAT_LIMITS.recentChars) throw new ChatError(400, "Слишком большая история разговора.");
  let dialogue: DialogueState | undefined;
  if (memory.dialogue !== undefined) {
    try { dialogue = parseDialogueState(memory.dialogue); } catch { throw new ChatError(400, "Некорректное состояние беседы. Начните новый разговор."); }
  }
  const message = text(body.message, CHAT_LIMITS.messageChars).trim();
  if (countMessageWords(message) > CHAT_LIMITS.messageWords) throw new ChatError(400, "Сообщение должно содержать не больше 50 слов.");
  return { philosopherId: "plato", message, memory: { summary, recent, ...(dialogue ? { dialogue } : {}) } };
}

export function parseChatReply(value: unknown): ChatReply {
  const reply = record(value);
  const message = text(reply.message, CHAT_LIMITS.assistantChars);
  const memory = parseChatRequest({ philosopherId: "plato", message: "validate", memory: reply.memory }).memory;
  if (!Array.isArray(reply.sources) || reply.sources.length > 8) throw new Error("Invalid response sources");
  const sources = reply.sources.map((value): CitedSource => {
    const source = record(value);
    if (!Number.isInteger(source.revision) || Number(source.revision) < 1 || !Number.isInteger(source.reference) || Number(source.reference) < 1 || Number(source.reference) > 8) throw new Error("Invalid source reference");
    return { id: text(source.id, 240), documentId: text(source.documentId, 80), title: text(source.title, 300), revision: Number(source.revision), reference: Number(source.reference),
      ...(source.work ? { work: text(source.work, 300) } : {}), ...(source.stephanus ? { stephanus: text(source.stephanus, 120) } : {}) };
  });
  if (reply.outcome !== undefined && !["answer", "clarification", "safety", "abstained"].includes(String(reply.outcome))) throw new Error("Invalid chat outcome");
  return { message, memory, sources, ...(reply.outcome ? { outcome: reply.outcome as ChatReply["outcome"] } : {}) };
}
