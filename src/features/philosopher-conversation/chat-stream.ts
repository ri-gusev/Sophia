import { parseChatReply, type ChatReply } from "./chat-contract.ts";

/** The entire model draft is validated before this stream is constructed. */
export function validatedStream(reply: ChatReply): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const parts = Array.from(reply.message); // Don't split surrogate pairs.
  let offset = 0;
  return new ReadableStream({ pull(controller) {
    if (offset < parts.length) {
      const text = parts.slice(offset, offset + 80).join(""); offset += 80;
      controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify({ text })}\n\n`));
    } else {
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(reply)}\n\n`));
      controller.close();
    }
  } });
}
export async function readChatResponse(response: Response, onText: (text: string) => void): Promise<ChatReply> {
  if (!response.headers.get("content-type")?.includes("text/event-stream")) return parseChatReply(await response.json());
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty chat stream");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "", content = "", bytes = 0, result: ChatReply | undefined;
  try {
    for (;;) {
      const read = await reader.read();
      if (read.done) { buffer += decoder.decode(); break; }
      bytes += read.value.byteLength;
      if (bytes > 256 * 1024) throw new Error("Chat stream too large");
      buffer += decoder.decode(read.value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        const lines = event.split("\n");
        const name = lines.find(line => line.startsWith("event: "))?.slice(7);
        const data: unknown = JSON.parse(lines.filter(line => line.startsWith("data: ")).map(line => line.slice(6)).join("\n"));
        if (result) throw new Error("Unexpected event after chat completion");
        if (name === "delta") {
          if (!data || typeof data !== "object" || !("text" in data) || typeof data.text !== "string") throw new Error("Invalid chat delta");
          content += data.text;
          if (content.length > 6000) throw new Error("Chat answer too large");
          onText(content);
        } else if (name === "done") {
          result = parseChatReply(data);
          if (content !== result.message) throw new Error("Chat stream mismatch");
        } else throw new Error("Unexpected chat event");
      }
    }
    if (!result || buffer.trim()) throw new Error("Incomplete chat stream");
    return result;
  } finally { await reader.cancel(); reader.releaseLock(); }
}
