"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CHAT_LIMITS, EMPTY_CHAT_MEMORY, countMessageWords } from "./chat-contract";
import { readChatResponse } from "./chat-stream";
import type { ChatMemory, ChatMessage, CitedSource, ChatReply } from "./chat-contract";

export type VisibleChatMessage = ChatMessage & { id: string; sources?: CitedSource[]; outcome?: ChatReply["outcome"] };
type ChatSession = {
  draft: string; setDraft: (value: string) => void;
  messages: VisibleChatMessage[]; pending: string | null; error: string | null; trimmed: boolean;
  streamed: string;
  send: () => Promise<void>; stop: () => void; reset: () => void;
};
const ChatContext = createContext<ChatSession | null>(null);
class PublicChatError extends Error {}

/** Memory belongs to this browser document only, including client-side navigation. */
export function PlatoChatProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<VisibleChatMessage[]>([]);
  const [memory, setMemory] = useState<ChatMemory>(EMPTY_CHAT_MEMORY);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trimmed, setTrimmed] = useState(false);
  const [streamed, setStreamed] = useState("");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);

  async function send() {
    const message = draft.trim();
    if (!message || message.length > CHAT_LIMITS.messageChars || countMessageWords(message) > CHAT_LIMITS.messageWords || controller.current) return;
    const active = new AbortController();
    controller.current = active;
    setPending(message); setDraft(""); setError(null); setStreamed("");
    try {
      const response = await fetch("/api/philosopher-chat", {
        method: "POST", signal: AbortSignal.any([active.signal, AbortSignal.timeout(120000)]), cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" }, body: JSON.stringify({ philosopherId: "plato", message, memory }),
      });
      if (!response.ok) {
        const data: unknown = await response.json();
        const publicError = data && typeof data === "object" && "error" in data ? (data as { error: unknown }).error : undefined;
        throw new PublicChatError(typeof publicError === "string" && publicError.length < 300 ? publicError : "Не удалось получить ответ. Попробуйте ещё раз.");
      }
      const reply = await readChatResponse(response, text => { if (!active.signal.aborted && controller.current === active) setStreamed(text); });
      if (active.signal.aborted || controller.current !== active) return;
      setMemory(reply.memory);
      setMessages(previous => {
        let next: VisibleChatMessage[] = [...previous,
          { id: crypto.randomUUID(), role: "user", content: message },
          { id: crypto.randomUUID(), role: "assistant", content: reply.message, sources: reply.sources, outcome: reply.outcome },
        ];
        while (next.length > CHAT_LIMITS.displayedMessages || next.reduce((sum, item) => sum + item.content.length, 0) > 96000) next = next.slice(2);
        return next;
      });
      if (messages.length + 2 > CHAT_LIMITS.displayedMessages || messages.reduce((sum, item) => sum + item.content.length, 0) + message.length + reply.message.length > 96000) setTrimmed(true);
    } catch (cause) {
      if (controller.current !== active) return;
      setDraft(message);
      setError(active.signal.aborted ? "Отправка остановлена. Вопрос можно отправить снова."
        : cause instanceof PublicChatError ? cause.message : "Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      if (controller.current === active) { controller.current = null; setPending(null); setStreamed(""); }
    }
  }

  function reset() {
    controller.current?.abort(); controller.current = null;
    setMessages([]); setMemory(EMPTY_CHAT_MEMORY); setPending(null); setDraft(""); setError(null); setTrimmed(false); setStreamed("");
  }

  function stop() {
    const active = controller.current;
    if (!active) return;
    // Release UI immediately even if the network has not settled its abort yet.
    controller.current = null;
    active.abort();
    setDraft(pending ?? ""); setPending(null); setStreamed("");
    setError("Отправка остановлена. Вопрос можно отправить снова.");
  }

  return <ChatContext.Provider value={{ draft, setDraft, messages, pending, error, trimmed, streamed, send, stop, reset }}>{children}</ChatContext.Provider>;
}

export function usePlatoChat() {
  const session = useContext(ChatContext);
  if (!session) throw new Error("PlatoChatProvider is required.");
  return session;
}
