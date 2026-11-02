import test from "node:test";
import assert from "node:assert/strict";
import { validatedStream, readChatResponse } from "../../src/features/philosopher-conversation/chat-stream.ts";
const reply = { message: "Проверенный ответ с кириллицей", memory: { summary: "", recent: [] }, sources: [] };
test("SSE transports only a completed validated reply and supports byte-fragmented UTF8", async () => {
  const bytes = new Uint8Array(await new Response(validatedStream(reply)).arrayBuffer());
  let offset = 0;
  const fragmented = new ReadableStream<Uint8Array>({ pull(controller) { if (offset < bytes.length) controller.enqueue(bytes.slice(offset, ++offset)); else controller.close(); } });
  const response = new Response(fragmented, { headers: { "content-type": "text/event-stream" } });
  let partial = "";
  const parsed = await readChatResponse(response, text => { partial = text; });
  assert.deepEqual(parsed, reply);
  assert.equal(partial, reply.message);
});
test("incomplete streams cannot commit dialogue memory and JSON mocks remain supported", async () => {
  await assert.rejects(readChatResponse(new Response('event: delta\ndata: {"text":"partial"}\n\n', { headers: { "content-type": "text/event-stream" } }), () => {}));
  assert.deepEqual(await readChatResponse(Response.json(reply), () => {}), reply);
});
