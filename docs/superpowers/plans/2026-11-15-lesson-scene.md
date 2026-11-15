# Lesson Scene Implementation Plan

**Goal:** Replace the existing introduction card with a seamless reusable illustrated scene while preserving its behavior.

**Architecture:** `LessonScene` owns presentation and reveal effects. `LessonIntroduction` retains radio state; typed lesson data retains all existing educational copy. The course map still opens the lesson below its workspace.

**Tech Stack:** Existing Next.js, React, TypeScript and CSS modules; local WebP.

**Spec:** [Design](../specs/2026-11-15-lesson-scene-design.md).

## Constraints and review focus

No routes, new educational content, invented continuation, dependencies or completion storage. Text must remain outside the artwork on narrow screens. Preserve focus and selection, disable motion for reduced motion, keep failed artwork from blocking text, and record image provenance.

## Steps

- [x] Extend `tests/plato-lesson.spec.ts` with a failing image/scene-position check against the existing introduction.
- [x] Add `lesson-scene.tsx` / CSS, image metadata to `lesson-data.ts`, and adapt `lesson-introduction.tsx` / CSS without changing the story or answer state.
- [x] Generate and optimize `public/images/lessons/plato-young-athenian.webp`; record prompt and origin.
- [x] Add motion/responsive checks and screenshots at 320/390/768/1440 px; retain existing axe and keyboard regression checks.
- [x] Run typecheck, lint, build, relevant browser tests and full suite; inspect screenshots and update current state / design / decisions with verified results. Relevant suite: 28 passed; full suite: 113 passed, 7 skipped, 2 pre-existing Atlas portrait assertions failed.
