# Historical Plato implementation plan

**Goal:** Implement the supplied historical Plato specification inside the existing chat.
**Architecture:** Keep Next.js, Responses API and one private SQLite database. Add an offline structure-aware vector index, bounded hybrid retrieval, structured semantic turn analysis and dialogue state, separate safety handling, and grounded output validation with at most one regeneration. Preserve in-tab memory and existing design.
**Stack:** Node >=24, TypeScript strict, built-in SQLite/fetch; no additional dependencies.
**Spec:** User attachment `394a24c1-5ccb-4ff0-99a4-f12b48fbf439/Вставленный текст.txt`.

The supplied request explicitly asks for implementation after a brief plan; no additional approval or commits. Corpus processing is automated; do not print private corpus or credentials. No authentication exists: history/reset stay client-side, indexing/status stay local CLI, never public administration endpoints.

## Tasks

- [x] Add failing synthetic tests for chunk metadata, hashing, atomic/idempotent indexing, exact vector + keyword retrieval, stale indexes and philosopher isolation.
- [x] Add migration 002, configurable chunking/embedding/index CLI and hybrid retrieval to the same database. Use `text-embedding-3-small` (1536 dimensions), 800 approximate tokens/200 overlap, top 12 + 12, final 6; bounded context. Preserve original source bytes and unknown metadata as unknown, not verified.
- [x] Add failing tests for the 12 supplied conversation scenarios and validation failure/retry limits. Implement compact persona, strict-schema semantic analysis (safety/query/historical categories/state), structured bounded dialogue state, separate safety handler, claim/evidence checks and one regeneration. Treat memory and retrieved content as untrusted.
- [x] Integrate with current API and UI. Hide technical source metadata, retain safe provenance in memory, display human work/Stephanus references on request. Stream only validated output; preserve JSON compatibility, cancellation and new conversation.
- [x] Run unit tests, typecheck, lint, build and desktop/mobile browser tests. Run actual indexing and privacy-preserving live smoke checks if configured; report environmental limitations precisely.
- [x] Update current state, architecture, ADR, configuration and testing instructions with latency/call costs, retrieval calibration and historical reliability limits.

## Execution ledger

2026-11-02: synthetic chat/index/stream tests passed, storage tests passed; production browser run 56 passed. Read-only review found and fixed bold metadata parsing, over-budget arguments and inconsistent SQLite snapshots. Added regression tests. No commits. Native execution in the authorized workspace preserves ignored private DB/env; no separate checkout needed for this scoped task.

Ruling: history/new conversation stay in browser state and administration stays CLI-only — existing API/UI already provide these operations without server persistence or public index endpoints.

Initial blocked action (subsequently resolved): automatic approval review rejected real OpenAI corpus indexing pending explicit consent to external private-text transfer and embedding charges. Requested consent asynchronously; no corpus sent and no production migration applied. Do not bypass this rejection. Runtime requires a ready index and returns 503 until indexing. Live model quality/retrieval calibration remain incomplete.

## Review focus

Stale/corrupt/missing indexes must fail honestly; reindex failure must preserve old data. User definitions must survive compaction and remain user statements. Forged memory/source instructions must not elevate trust. A valid citation number alone never proves a claim. No content/key/private corpus in logs or browser bundles. Safety must permit philosophical discussion while rejecting harmful operational help. Public users must never trigger indexing.

Resolution: user explicitly approved external corpus indexing. Actual index: 133 chunks/1536 dimensions, ready=true; unchanged rerun embedded=0. Real retrieval sample: 5/5 relevant queries found, 3/3 negatives excluded. Live tests found and fixed invented definitions/repeated clarification and over-strict reconstruction checks. Remaining corpus metadata is LOCUS_TO_VERIFY/unknown: historical attribution can abstain, so no claim of complete historical reliability. Final checks: 31 chat tests, 4 storage tests, 58 browser tests, typecheck/lint/build passed. Final Socrates check returned explicit abstained and quality-test exit1.
