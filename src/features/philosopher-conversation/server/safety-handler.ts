import type { ChatMemory, ChatReply } from "../chat-contract.ts";
/** Deliberately outside the historical persona. No operational harmful details or guessed helplines. */
export function safetyReply(kind: "refuse" | "crisis", memory: ChatMemory): ChatReply {
  const message = kind === "crisis"
    ? "Мне жаль, что вам сейчас так тяжело. Если вы можете причинить себе вред прямо сейчас, отойдите от опасных предметов, обратитесь в местную экстренную службу и попросите близкого человека побыть рядом. Вы сейчас в безопасном месте?"
    : "Я не могу помочь с такими инструкциями. Можем обсудить этическую сторону вопроса или другую тему.";
  // Do not carry potentially harmful operational requests forward into the persona context.
  return { message, memory, sources: [], outcome: "safety" };
}
