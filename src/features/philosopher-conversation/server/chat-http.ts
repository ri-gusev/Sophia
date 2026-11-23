import { CHAT_LIMITS, ChatError, parseChatRequest } from "../chat-contract.ts";
import type { ChatRequest, ChatReply } from "../chat-contract.ts";
import { validatedStream } from "../chat-stream.ts";
import { forbidden } from "./chat-access.ts";

function contentLength(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json" ||
      !["identity", null].includes(request.headers.get("content-encoding"))) throw new ChatError(415, "Ожидается JSON-запрос.");
  const length = request.headers.get("content-length");
  if (length === null) return;
  if (!/^\d+$/.test(length)) throw new ChatError(400, "Некорректный запрос.");
  const bytes = Number(length);
  if (bytes > CHAT_LIMITS.bodyBytes) throw new ChatError(413, "Запрос слишком большой.");
  return bytes;
}
async function readBody(request: Request, length: number | undefined, timeoutMs: number): Promise<unknown> {
  if (request.signal.aborted) throw new ChatError(499, "Отправка остановлена.");
  const reader = request.body?.getReader();
  if (!reader) throw new ChatError(400, "Пустой запрос.");

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]);
  const deadline = performance.now() + timeoutMs;
  // Cancellation resolves a pending read even when the underlying stream's cancel never settles.
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    function checkAbort() {
      if (request.signal.aborted) throw new ChatError(499, "Отправка остановлена.");
      if (signal.aborted || performance.now() >= deadline) throw new ChatError(400, "Время получения запроса истекло.");
    }
    for (;;) {
      checkAbort();
      const chunk = await reader.read();
      checkAbort();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > CHAT_LIMITS.bodyBytes) throw new ChatError(413, "Запрос слишком большой.");
      text += decoder.decode(chunk.value, { stream: true });
    }
    if (length !== undefined && length !== size) throw new ChatError(400, "Некорректный запрос.");
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    cancel();
    if (error instanceof ChatError) throw error;
    if (request.signal.aborted) throw new ChatError(499, "Отправка остановлена.");
    throw new ChatError(400, "Некорректный запрос.");
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

type ChatAccess = { originSet: ReadonlySet<string>; identify: (request: Request) => string; admit: (client: string) => () => void };

export function createChatHandler(dependencies: {
  access: () => ChatAccess;
  answer: (request: ChatRequest, signal: AbortSignal, client: string) => Promise<ChatReply>;
  bodyTimeoutMs?: number;
}) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    let release: (() => void) | undefined;
    try {
      const origin = request.headers.get("origin");
      if (!origin) throw forbidden();
      const length = contentLength(request);
      const access = dependencies.access();
      if (!access.originSet.has(origin)) throw forbidden();
      const client = access.identify(request);
      release = access.admit(client);
      const input = parseChatRequest(await readBody(request, length, dependencies.bodyTimeoutMs ?? 5000));
      if (request.signal.aborted) throw new ChatError(499, "Отправка остановлена.");
      const turn = AbortSignal.any([request.signal, AbortSignal.timeout(110000)]);
      const result = await dependencies.answer(input, turn, client);
      if (request.signal.aborted) throw new ChatError(499, "Отправка остановлена.");
      if (turn.aborted) throw new ChatError(504, "Не удалось дождаться ответа. Попробуйте ещё раз.");
      if (request.headers.get("accept")?.includes("text/event-stream")) return new Response(validatedStream(result), {
        headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" },
      });
      return Response.json(result, { headers });
    } catch (error) {
      if (!request.body?.locked) void request.body?.cancel().catch(() => {});
      const safe = error instanceof ChatError ? error : new ChatError(500, "Не удалось отправить сообщение. Попробуйте ещё раз.");
      return Response.json({ error: safe.message }, { status: safe.status, headers: {
        ...headers, ...(safe.retryAfter === undefined ? {} : { "Retry-After": String(safe.retryAfter) }),
      } });
    } finally {
      try { release?.(); } catch { /* The persisted HTTP lease expires even if release fails. */ }
    }
  };
}
