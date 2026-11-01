import { CHAT_LIMITS, ChatError, parseChatRequest } from "../chat-contract.ts";
import type { ChatRequest, ChatReply } from "../chat-contract.ts";

export function createRequestGate(now: () => number = Date.now) {
  let windowStart = now(), requests = 0, active = 0;
  return () => {
    if (now() - windowStart >= 60000) { windowStart = now(); requests = 0; }
    if (requests >= 20 || active >= 2) throw new ChatError(429, "Сейчас слишком много запросов. Попробуйте немного позже.");
    requests++; active++;
    let released = false;
    return () => { if (!released) { active--; released = true; } };
  };
}

async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > CHAT_LIMITS.bodyBytes) throw new ChatError(413, "Запрос слишком большой.");
  const reader = request.body?.getReader();
  if (!reader) throw new ChatError(400, "Пустой запрос.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > CHAT_LIMITS.bodyBytes) { await reader.cancel(); throw new ChatError(413, "Запрос слишком большой."); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new ChatError(400, "Некорректный запрос."); }
}

export function createChatHandler(dependencies: { answer: (request: ChatRequest, signal: AbortSignal) => Promise<ChatReply>; gate: ReturnType<typeof createRequestGate> }) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    let release: (() => void) | undefined;
    try {
      const expected = new URL(request.url);
      // Next.js can construct an internal URL from its listener hostname.
      // Host is the actual browser destination; do not trust forwarded-host.
      const host = request.headers.get("host");
      if (host) expected.host = host;
      if (request.headers.get("origin") !== expected.origin) throw new ChatError(403, "Этот запрос недоступен.");
      if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") throw new ChatError(415, "Ожидается JSON-запрос.");
      const input = parseChatRequest(await readBody(request));
      release = dependencies.gate();
      const result = await dependencies.answer(input, AbortSignal.any([request.signal, AbortSignal.timeout(45000)]));
      return Response.json(result, { headers });
    } catch (error) {
      const safe = error instanceof ChatError ? error : new ChatError(500, "Не удалось отправить сообщение. Попробуйте ещё раз.");
      return Response.json({ error: safe.message }, { status: safe.status, headers: { ...headers, ...(safe.status === 429 ? { "Retry-After": "60" } : {}) } });
    } finally { release?.(); }
  };
}
