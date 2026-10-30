# Restore reference course map implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the user's selected v4 map on `/learn`, including its large scale and original scenes, with repaired transitions and stronger material depth on steps.

**Architecture:** Keep the existing CourseMap client interaction and typed content. Restore the v4 geometry of 3800 × 650 with five 760px eras. Render original local scenery and edited transition regions below one SVG route; use code-native layered button faces and bases.

**Tech Stack:** Existing Next.js, React, strict TypeScript, CSS Modules, Lucide and Playwright. No dependencies or persistence.

**Spec:** User annotation selecting the stage represented by `artifacts/sophia-learning-map-v4.html`, `sophia-continuous-map.css` and `sophia-continuous-map.js`.

## Global constraints

- Five eras, five steps each. Preserve existing dialogs, accessible names and keyboard/focus behavior.
- Fixed map scale on desktop and mobile: 3800 × 650px, each era 760px.
- Restore original realistic scenes; retain the later request to remove large era cards from the landscape.
- Buttons keep the reference material of each era and gain visible extrusion, beveled face, relief icons and grounding shadows.
- Confine horizontal overflow to the map. Preserve the three-section landing, layouts and honest lesson-preview status.
- No Git commit/push, new services, dependencies, credentials or persisted progress.

## Review focus

- All five steps remain reachable by scrolling within each era, including the last era and narrow screens.
- Native horizontal wheel updates the selected era after a navigation click.
- Large scale does not create page overflow; touch and keyboard movement remain available.
- Repeated dialog open/close restores focus without stale selection.
- Edited seams preserve the source scenes and avoid straight cuts or doubled landmarks.

## Task 1: Restore scale, scenery and button depth

**Files:** `src/features/course-map/{course-map.tsx,course-map-data.ts,course-map.module.css}`, `public/images/course-map/`, `tests/learning-map.spec.ts`.

- [x] Update map tests to require the restored 3800 × 650 viewport content, original scenery and transitions; run the new contract against the current compressed map and confirm failure.
- [x] Restore the original five scene assets as compressed WebP and edit only four transition regions using source references.
- [x] Restore step coordinates `(94,376)`, `(229,285)`, `(374,386)`, `(518,292)`, `(664,381)` per 760px era and the reference continuous path proportions.
- [x] Add separate decorative shadow/base/face layers inside each semantic button with material-specific CSS and press states.
- [x] Preserve all map navigation and dialogs; run typecheck, lint, build and the entire Playwright suite on the production build.
- [x] Inspect desktop/mobile map screenshots, all era styles and all four transition regions.

## Task 2: Record verified state

**Files:** `docs/development/{CURRENT_STATE,TESTING}.md`, relevant architecture/design/reference documents, asset provenance README.

- [x] Describe the restored reference scale and imagery accurately, replacing the single-panorama decision with the user-approved restoration.
- [x] Record only observed verification results and remaining environment limitations.
- [x] Review final diff, local documentation links and UTF-8. Leave the local site available for user review.
