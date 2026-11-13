# Atlas Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Историческая шкала 650 до н. э. — 270 н. э. с 15 философами, географическими портретами, группировкой и карточками.
**Architecture:** Единственный выбранный год в AtlasView; pure helpers времени/географии/группировки; Drei Html в существующем Canvas; отдельная timeline вне сцены. Локальный каталог и изображения с атрибуцией.
**Tech Stack:** Existing Next.js/React/TypeScript strict, Three/Fiber/Drei, CSS modules, Playwright and Node tests. No new dependencies.
**Spec:** `docs/superpowers/specs/2026-11-13-atlas-timeline-design.md` (approved).

## Global Constraints

- Светлый пастельный UI, текущие текстуры/освещение/палитра/controls/errors; не менять обучение/чат/RAG.
- Диапазон -650…270 без исторического нуля; включительные границы жизни.
- Все портреты реальные, локальные и с документированными правами; датировки/привязки с источниками и оговорками.
- Не коммитить/публиковать без отдельной инструкции. Выполнить самостоятельно: пользователь прямо поручил «выполняй».

## Review Focus

- Быстрый scrub туда/обратно не оставляет исчезнувших интерактивных маркеров или старую карточку (task 3).
- Маркер за горизонтом не виден и недоступен по Tab (tasks 1,3).
- Одинаковые координаты доступны через группу; zoom не сдвигает географию (tasks 1,3).
- Шкала/карточка не мешают rotation/keyboard; Canvas и texture identity сохраняются (task 3).
- Частые обновления/закрытие не оставляют постоянного RAF или таймеров (task 4).

### Task 1 — Historical time and geography
**Files:** `historical-time.ts`, `geo-utils.ts`, `marker-groups.ts` in atlas feature; `tests/atlas-logic.spec.ts`.
**Interfaces:** `toAxisYear(year): number`, `fromAxisYear(axis): number`, `formatHistoricalYear(year): string`, `isAliveAt(philosopher,year): boolean`; `latLonToVector3(lat,lon,radius=1.015): Vector3`, `isFacingCamera(point,camera): boolean`; `groupProjectedMarkers(points,threshold=48)` returns stable actual-point representatives and members.
- [x] Write pure failing Playwright tests (Node-side imports) for era adjacency, zero rejection, inclusive intervals, poles/meridians/known cities, horizon and connected groups preserving coordinates.
- [x] Run RED; implement helpers and run GREEN.

### Task 2 — Sourced catalogue and portraits
**Files:** `philosophers-data.ts`, `public/images/philosophers/*`, README resources and `docs/references/ATLAS_HISTORY.md`.
**Interfaces:** readonly `PHILOSOPHERS: readonly AtlasPhilosopher[]`; fields in approved spec, dates nonzero, source links, credit/license and portrait crop.
- [x] Verify dates/places from academic sources; select documented approximate working dates.
- [x] Reuse three existing portraits; obtain twelve suitable licensed images and visually inspect face crops. Record origin/rights and historical identity caveats.
- [x] Add catalogue integrity tests: 15 unique IDs, valid intervals/coordinates, all local images exist, sources/credits present.

### Task 3 — Integrated timeline, markers and cards
**Files:** `timeline.tsx`, `philosopher-markers.tsx`, `philosopher-card.tsx`, CSS; modify `atlas-view.tsx`, `earth-globe.tsx`.
**Interfaces:** Timeline selectedYear/onYearChange/count; marker layer philosophers/onSelect and Earth mesh ref; card philosopher/onClose and group selection list.
- [x] Add browser RED scenarios for slider years/boundaries/no zero, group selection/card/close, Canvas preservation, back-face visibility and controls.
- [x] Implement native timeline with centuries/period bands, count and default -400; cards and keyboard/focus handling.
- [x] Connect markers at verified world coordinates, screen-distance grouping, horizon/raycast hiding, short enter/exit transitions with reduced-motion support. Keep lifecycle stable and only update group state when membership/visibility changes.
- [x] Run focused tests and inspect desktop, zoom/card/group and mobile screenshots; correct mapping against Athens/Rome/Miletus.

### Task 4 — Verification and documentation
**Files:** tests and project docs CURRENT_STATE, TESTING, DESIGN_SYSTEM, OVERVIEW, STRUCTURE, DECISIONS.
- [x] Run typecheck, lint, production build, logic/browser atlas tests, existing page regressions without paid external APIs. Fix own failures.
- [x] Check real render/occlusion, responsive/axe, no errors, idle RAF and resource identity; update docs with actual results and limits.
- [x] Review final diff and report changed files/results/limits. No commit/push.

## Execution record

- Ruling: work continued in the user-specified D:/Sophia checkout, preserving the established local workflow; no worktree/branch/commit/push was created.
- Helpers: observed missing-module RED, then 3 passing pure tests; catalogue checks added and passed. UI: observed missing-slider RED, then implemented timeline/markers/cards.
- Portraits: 12 verified Commons downloads plus 3 existing; original thumbnails retained, CSS face crops and source/license registry.
- Regression: initial 95 passed / 2 resize assumptions failed / 5 skipped; adjusted only the narrow viewport height to account for timeline. Isolated resize 2 passed.
- Review: group-to-person keyboard focus reproduced RED, fixed by focusing persistent close before selection, final review clean.
- Final: production build, typecheck, lint; full Playwright port3158 97 passed / 5 skipped (1.9m), exit0. Docs and limitations updated, own servers stopped.
