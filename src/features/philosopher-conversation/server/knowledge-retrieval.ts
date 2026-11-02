import type { ChatSource } from "../chat-contract.ts";

/** Retrieved data only. Runtime retrieval lives in rag/index-store.ts. */
export type KnowledgeExcerpt = ChatSource & { text: string; sourceId?: string; work?: string; stephanus?: string; claimType?: string; verificationStatus?: string };
