# Plato Full Lesson Implementation Plan

**Goal:** Deliver the approved nine-scene lesson through the existing catalog and `/learn`.

**Architecture:** Typed scene data, pure answer/location/state helpers, one scene presentation and one exercise component. `LessonIntroduction` owns tab-local run state; CourseMap opens/restores/closes the lesson and returns to its catalog.

**Tech Stack:** Existing React / Next.js / TypeScript / CSS Modules, local WebP, Playwright. No added dependencies.

**Spec:** [Design](../specs/2026-11-15-plato-full-lesson-design.md).

## Constraints and review focus

Preserve approved text and lesson ID. No new routes, other courses, server completion, paid APIs or rewards. Verify reload and backward navigation, invalid tab state, keyboard focus after checking and ordering, image continuity, and small-screen controls. All artwork is explicitly an artistic interpretation.

## Tasks

- [x] Add a failing full-journey browser scenario against the previous single-scene lesson.
- [x] Populate `lesson-data.ts` with all nine scenes directly from the attachment; add `lesson-state.ts` and pure contract checks.
- [x] Extend `lesson-scene.tsx` and implement `lesson-exercise.tsx`; adapt the existing introduction to navigation, feedback and completion.
- [x] Extend map integration to scene fragments and return-to-catalog; preserve the seven course blocks.
- [x] Generate nine matching originals, export optimized WebP and record provenance/prompts.
- [x] Validate full journey, wrong answers, reload/state recovery, keyboard, axe, motion, mobile and visual captures. Fix issues.
- [x] Obtain independent code review, run typecheck/lint/build and full Playwright; document results and deliver key screenshots. Full suite: 129 passed, 7 skipped, 2 pre-existing Atlas portrait assertions failed. All 20 lesson test combinations passed.
