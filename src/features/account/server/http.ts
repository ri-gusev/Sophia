import { proxyClient } from "../../philosopher-conversation/server/chat-access.ts";
import { accountSettings } from "./config.ts";
import { AccountError, accountUnavailable } from "./errors.ts";

export { AccountError };

export function verifyOrigin(request: Request): void {
  const { origin } = accountSettings();
  if (request.headers.get("origin") !== origin) throw new AccountError(403, "Запрос с этого сайта недоступен.");
}

export function identifyAccountNetwork(request: Request): string {
  if (accountSettings().mode === "local") return "local";
  const secret = process.env.CHAT_PROXY_SECRET ?? "";
  if (!/^[a-f0-9]{64}$/i.test(secret)) throw accountUnavailable();
  try {
    return proxyClient(request.headers, secret);
  } catch {
    throw accountUnavailable();
  }
}

export async function readJson(request: Request, maxBytes = 8192, timeoutMs = 5000): Promise<Record<string, unknown>> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json" || ![null, "identity"].includes(request.headers.get("content-encoding"))) {
    throw new AccountError(415, "Ожидается формат JSON.");
  }
  const tooLarge = () => new AccountError(413, "Данные запроса слишком длинные.");
  const badJson = () => new AccountError(400, "Проверь данные запроса.");
  const disconnected = () => new AccountError(499, "Отправка остановлена.");
  if (request.signal.aborted) throw disconnected();
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) throw badJson();
    if (Number(contentLength) > maxBytes) throw tooLarge();
  }
  const reader = request.body?.getReader();
  if (!reader) throw badJson();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]);
  const deadline = performance.now() + timeoutMs;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  function checkDeadline() {
    if (request.signal.aborted) throw disconnected();
    if (signal.aborted || performance.now() >= deadline) throw new AccountError(408, "Время получения запроса истекло.");
  }
  const bytes = new Uint8Array(maxBytes);
  let length = 0;
  try {
    while (true) {
      checkDeadline();
      const { done, value } = await reader.read();
      checkDeadline();
      if (done) break;
      if (length + value.byteLength > maxBytes) throw tooLarge();
      bytes.set(value, length);
      length += value.byteLength;
    }
    if (contentLength !== null && Number(contentLength) !== length) throw badJson();
    const data: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length)));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw badJson();
    return data as Record<string, unknown>;
  } catch (error) {
    cancel();
    if (error instanceof AccountError) throw error;
    if (request.signal.aborted) throw disconnected();
    throw badJson();
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
