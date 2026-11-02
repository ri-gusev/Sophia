# Plato dialogue refinement

**Goal:** First-person philosophical conversation without assistant clichés, moral lectures or academic disclaimers. Keep source integrity, memory, safety, RAG/index and frontend.
**Scope:** persona/analysis instructions, generation orchestration and output validation; synthetic regressions and real ten-scenario API evaluation. No commits or corpus changes.

- [x] Add failing tests for role breaks, service endings, excessive disclaimers, invented personal memories, repeated questions and direct explanations without mandatory questions.
- [x] Add a focused dialogue-style checker; extend semantic validation with dialogue violations without weakening source/quote/biographical checks. Preserve neutral safety handler outside persona.
- [x] Rewrite compact persona and analysis guidance around user thesis → concept → appropriate reasoning move → usually one useful question. Preserve direct explanations and natural greeting/disagreement. Make uncertainty/fallback in-character. Keep unknown modern concepts constrained and definitions user-supplied.
- [x] Execute ten requested scenarios against the real API, recording exact returned text, source of response, outcomes, five-axis assessment and failures without fabricated examples. Scenario 7 follows scenario 6 so disagreement has context. No exact-match evaluation. No raw corpus/key logging.
- [x] Run chat/storage unit tests, TypeScript, ESLint, production build and appropriate browser checks; review final diff; update CURRENT_STATE and architecture/testing notes. Report known corpus-verification limits honestly.

Acceptance: no role/metacommentary or service clichés; moral ambiguity is investigated without automatic condemnation or endorsing harm; claims/personal events remain grounded; modern unknown does not gain modern facts; ten actual returned answers are available to the user. Full historical truth cannot be certified by a model grader.

## Execution notes

Real runs uncovered (and preserved evidence of) unverified citations on ordinary reasoning, moral idioms misclassified as technology, latent AI definitions, ignored per-turn rules inside untrusted data, and spurious repeated-question judgements against planned state questions. Addressed through strict draft schemas, analysis guidance, trusted enum-based generation policy and clearer validator criteria. Closed policy text contains no user strings.

Ruling: add only two small checked primary-source notes for the indictment/verdict and changing things/unchanging forms. This preserves existing verification instead of weakening it or upgrading LOCUS_TO_VERIFY. SQLite/embeddings/private corpus not modified; no new migrations/dependencies.

Final full API run 2026-11-02T16-17-03-846Z: all ten responses answer/clarification, no abstention; complete exact output and five-axis editorial assessment in ignored artifacts/plato-persona-eval/2026-11-02-final-report.md. This is one sample, not a truth/stability guarantee. Synthetic 41 chat/4 storage passed; TS/lint/build passed, browser58 passed. Read-only review found eval dependency labelling issue, fixed; final source/trust recheck found no concrete regression. No commits.
