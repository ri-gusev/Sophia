# Atlas Modern History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Existing atlas spans 650 BCE–2026 CE with 80 sourced thinkers, era jumps, exact year entry and living/portrait fallback support.
**Architecture:** Preserve AtlasView's single selected year and existing Canvas lifecycle. Extend pure time helpers/types, compose existing and new readonly records, and reuse the portrait component for image/initial fallbacks. Add era configuration and controlled navigation to Timeline.
**Tech Stack:** Existing Next/React/TypeScript, Three/Fiber/Drei, CSS Modules, Playwright. No added dependencies.
**Spec:** `docs/superpowers/specs/2026-11-13-atlas-modern-history-design.md` (approved).

## Global Constraints
- Keep all old 15 IDs, globe/material/lights/controls/fallback, centered cards, compact timeline, footer credits and page scroll edges.
- Add all 60 mandatory names plus five approved regional additions; exact IDs in the staging manifest `artifacts/atlas-modern/people.json`.
- Nonzero years, inclusive life endpoints, deathYear null for verified living people, cutoff2026. Source/city/portrait rights verified; fallback initials explicitly allowed.
- No chat/RAG/learning changes, no heavy dependencies, no commit/push.

## Review Focus
- Null dates render/filter correctly, including 2026 deaths and attempts to select future years (task1/3).
- Invalid/partial exact-year drafts leave selection unchanged; slider/era changes synchronize without focus loss (task3).
- Image missing/error fallback has usable initials and no retry loop, across groups and cards (task3).
- Dense modern groups expose every participant and scroll/close/focus correctly (task4).
- Year/era changes preserve Canvas, texture identity, camera and idle demand rendering (task4).

### Task 1 — Time and era contracts
**Files:** `historical-time.ts`, new `historical-eras.ts`, `tests/atlas-modern.spec.ts` (pure logic).
**Interfaces:** LAST_YEAR2026; `isAliveAt({birthYear,deathYear:number|null},year)` bounded; `parseHistoricalYear(text,era)` validates; readonly `HISTORICAL_ERAS` + `getHistoricalEra(year)`.
- [x] Write/run RED for era adjacency/no zero, null life ranges, invalid/precise input, all seven era boundaries/jumps.
- [x] Implement helpers and run GREEN.

### Task 2 — Sourced catalogue/assets
**Files:** `philosopher-types.ts`, `philosophers-modern-data.ts`, `modern-portrait-assets.ts`, modify `philosophers-data.ts`; local public portraits and source registries.
**Interfaces:** `AtlasBiography` has id/name/life/approx flags/lat/lon/place/locationType/school/description/source/additionalSources; AtlasPhilosopher extends with nullable portrait/credit and crop/note. Modern data/assets joined by id without altering legacy rows.
- [x] Independently research 65 biographies and image rights into staged JSON; review before integrating. Research assistants own staging artifacts/new images only, root owns application code.
- [x] Preserve old15, compose80; integrity/required-ID tests and independent expected sets for8keyyears, living/null/2026-death fixtures.
- [x] Validate sources/coordinates/images/credits or explicit missing portrait; publish complete attribution registry.

### Task 3 — Navigation/cards/initials
**Files:** `timeline.tsx`/CSS, `philosopher-card.tsx`, `philosopher-portrait.tsx`/CSS; existing tests updated only where range/data expectations change.
- [x] Observe browser RED for seven jump controls, year input/era/error and 2026 label.
- [x] Implement exact draft form with explicit submit/Enter, sparse ticks, desktop era buttons/mobile select and derived active era. Keep compact layout and all-history range.
- [x] Render null dates/place type; image-null/error initials with one shared component. No source panel reintroduced into cards.
- [x] Check focus, era/value synchronization, accessible labels and responsive/axe.

### Task 4 — Integration verification/docs
**Files:** atlas tests and project docs.
- [x] Browser: era/year filter, representative keyyears, current dense groups/cards, image failure, same Canvas/no texture re-fetch/same camera, idle RAF and originalcontrols/side scroll/errors.
- [x] Run typecheck, lint, production build, atlas/fullUI regression without paid API. Fix own failures, one whole-change independent review.
- [x] View desktop/mobile modern screenshots; update CURRENT_STATE/TESTING/design/architecture/README/source registries; report actual results and limits.

## Execution ledger
- User approved design and instructed execution. Continue current D:/Sophia checkout/native workflow without another approval gate or branch/commit.
- Ruling: delegate independent content/source and image-rights research under dispatching-parallel-agents, integrate application code here; avoid shared-file writes and concurrent browser tests.

- Completed: typecheck/lint/build pass; full UI on port3168:109 passed,7 skipped,2.1m; modern-only10 passed,12.2s. Fresh independent review resolved one registry-link issue; desktop/mobile captures inspected. No commit/push.
