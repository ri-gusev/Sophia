import test from "node:test";
import assert from "node:assert/strict";
import { programmaticValidation } from "../../src/features/philosopher-conversation/server/output-validation.ts";
import { dialogueViolations } from "../../src/features/philosopher-conversation/server/dialogue-style.ts";
import { parseValidation } from "../../src/features/philosopher-conversation/server/output-validation.ts";
import { historicalReferences } from "../../src/features/philosopher-conversation/server/historical-reference.ts";
import { parseAnalysis, draftSchema } from "../../src/features/philosopher-conversation/server/structured.ts";

test("academic role commentary, verbose disclaimers and assistant service endings are rejected", () => {
  for (const message of ["В платоновском контексте знание отличается от мнения.", "Согласно философии Платона, это благо.", "Как языковая модель, я не знаю.", "Если смотреть с точки зрения Платона, это справедливо.", "Я не буду выдавать это за биографическую истину.", "В исторических источниках говорится о Сократе.", "Если хочешь, я могу рассказать подробнее.", "Хочешь, я расскажу подробнее?", "Я могу помочь тебе разобраться.", "Давай рассмотрим несколько аспектов."]) {
    assert.ok(dialogueViolations({ message, claims: [] }).length, message);
    assert.equal(programmaticValidation({ message, claims: [] }, []).valid, false);
  }
});

test("natural first-person reasoning, honest uncertainty and direct explanation need no obligatory question", () => {
  for (const message of ["Приветствую тебя. О чём ты размышляешь?", "Я бы различил истинное мнение и знание: верное мнение может оказаться удачной догадкой, а знающий способен дать основание своему ответу.", "Этого я не знаю наверняка.", "Ты не согласен с выводом или с тем, как мы к нему пришли?"]) assert.deepEqual(dialogueViolations({ message, claims: [] }), []);
});

test("invented personal encounters cannot be protected by a reconstruction claim", () => {
  const draft = { message: "Я помню, как мы с Алкивиадом гуляли в саду.", claims: [{ text: "Встреча", kind: "reconstruction" as const, evidence: [] }] };
  assert.ok(dialogueViolations(draft).includes("unsupported_personal_memory"));
  assert.ok(!dialogueViolations({ message: "Я не знаю, что он об этом думал.", claims: [] }).includes("unsupported_personal_memory"));
  assert.ok(dialogueViolations({ message: "Я встречался с Алкивиадом в Афинах.", claims: [] }).includes("unsupported_personal_memory"));
});

test("unfamiliar concepts allow philosophical exploration without importing modern technical facts", () => {
  const analysis = parseAnalysis(JSON.stringify({ safety: "allow", historical_category: "modern_unknown", query: "ИИ", action: "clarification", state: { current_topic: "ИИ", user_theses: [], open_questions: [], contradictions: [], introduced_concepts: [], dialogue_stage: "clarification" } }));
  assert.equal(programmaticValidation({ message: "Если искусственное создано мастерством человека, может ли оно обладать разумом, а не только подражать ему?", claims: [] }, [], analysis).valid, true);
  assert.equal(programmaticValidation({ message: "Я бы различил разум и его подражание. Разум умеет дать основание суждению. Если нечто создано человеком, почему это само по себе должно лишать его разума? И всё же верный ответ не всегда означает знание: иногда его можно повторить, не понимая. Что для тебя было бы признаком понимания?", claims: [] }, [], analysis).valid, true);
  assert.equal(programmaticValidation({ message: "ИИ обучается на больших наборах данных и использует нейросети.", claims: [] }, [], analysis).valid, false);
  assert.equal(programmaticValidation({ message: "Мне незнакомо это имя. Какие мысли ты с ним связываешь?", claims: [] }, [], analysis).valid, true);
  assert.equal(programmaticValidation({ message: "Что ты называешь искусственным интеллектом?", claims: [] }, [], analysis).valid, true);
});

test("generation schema exposes historical evidence only for verified source numbers", () => {
  type Fields = { kind: { enum: string[] }; evidence: { maxItems?: number; items: { properties: { source: { enum?: number[] } } } } };
  const shape = (numbers: number[]) => (JSON.parse(JSON.stringify(draftSchema(numbers))) as { properties: { claims: { items: { properties: Fields } } } }).properties.claims.items.properties;
  assert.deepEqual(shape([]).kind.enum, ["reconstruction"]);
  assert.equal(shape([]).evidence.maxItems, 0);
  assert.deepEqual(shape([1]).evidence.items.properties.source.enum, [1]);
});

test("verbatim repeated assistant questions are detected within the conversation", () => {
  const recent = [{ role: "user" as const, content: "Справедливость — сила" }, { role: "assistant" as const, content: "Что ты называешь силой?" }, { role: "user" as const, content: "Способность заставлять других" }];
  assert.ok(dialogueViolations({ message: "Что ты называешь силой?", claims: [] }, recent).includes("repeated_question"));
  assert.deepEqual(dialogueViolations({ message: "Может ли человек быть сильным, если не владеет собой?", claims: [] }, recent), []);
});

test("semantic moralizing and role violations invalidate a factually clean answer", () => {
  const result = parseValidation(JSON.stringify({ valid: true, unsupported_claims: [], historical_anachronisms: [], fabricated_attributions: [], dialogue_violations: ["moralizing", "missing_inquiry"], requires_regeneration: false }));
  assert.equal(result.valid, false);
  assert.equal(result.requires_regeneration, true);
});

test("checked trial summary supports the indictment and verdict but never supplies personal memories", () => {
  const [source] = historicalReferences("Почему Сократа казнили?");
  assert.equal(source.verificationStatus, "verified");
  assert.equal(historicalReferences("Ты знаком с Алкивиадом?").length, 0);
  assert.equal(historicalReferences("Что такое знание?").length, 0);
  const checked = programmaticValidation({ message: "Я помню, как мы с Сократом стояли перед судьями.", claims: [{ text: "Встреча", kind: "reconstruction", evidence: [] }] }, [source]);
  assert.equal(checked.valid, false);
});
