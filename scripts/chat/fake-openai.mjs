// Used only as a preload for the isolated production-route test process.
import { appendFileSync } from "node:fs";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const callLog = process.env.SOPHIA_FAKE_OPENAI_CALL_LOG;
assert.ok(callLog);

const analysis = {
  safety: "allow", historical_category: "historical", query: "справедливость", action: "explanation",
  state: {
    current_topic: "справедливость", user_theses: [], open_questions: [], contradictions: [],
    introduced_concepts: [], dialogue_stage: "clarification",
  },
};
const draft = { message: "Рассмотрим, почему равное обращение не всегда означает справедливость.", claims: [] };
const validation = {
  valid: true, unsupported_claims: [], historical_anachronisms: [], fabricated_attributions: [],
  dialogue_violations: [], requires_regeneration: false,
};
const responses = { turn_analysis: analysis, plato_draft: draft, grounding_validation: validation };
const record = event => appendFileSync(callLog, `${event}\n`, "utf8");

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.hostname !== "api.openai.com") return originalFetch(input, init);
  record("request");
  const request = new Request(input, init);
  assert.equal(request.headers.get("authorization"), "Bearer synthetic-sophia-route-test");
  assert.equal(request.method, "POST");
  const body = await request.json();
  if (url.pathname === "/v1/embeddings") {
    record("embedding");
    assert.equal(body.dimensions, 256);
    assert.deepEqual(body.input, ["справедливость"]);
    return Response.json({
      usage: { prompt_tokens: 100 },
      data: [{ index: 0, embedding: [1, ...Array(255).fill(0)] }],
    });
  }
  assert.equal(url.pathname, "/v1/responses");
  assert.equal(body.store, false);
  const stage = body.text?.format?.name;
  assert.ok(Object.hasOwn(responses, stage), `Unexpected fake response stage ${stage}`);
  record(stage);
  if (stage === "turn_analysis" && JSON.parse(body.input[0].content).message === "Отмена тестового ответа") {
    return new Promise((_, reject) => {
      const cancel = () => { record("aborted"); reject(request.signal.reason); };
      if (request.signal.aborted) cancel();
      else request.signal.addEventListener("abort", cancel, { once: true });
    });
  }
  return Response.json({
    status: "completed",
    usage: { input_tokens: 10000, output_tokens: 1000 },
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(responses[stage]) }] }],
  });
};
