# Socrates and Cephalus implementation plan

Goal: implement only scene one of lesson two, using three reusable illustration layers.
Architecture: extend the existing lesson union with dialogue data; render a focused DialogueScene inside LessonIntroduction. Preserve all introduction scenes.
Stack: existing Next.js, React, TypeScript, CSS modules, Playwright, Sharp; no new dependencies or runtime APIs.

- [x] Add a failing browser test for eight fixed turns, back, completion, replay and return.
- [x] Add typed character registry, dialogue content and catalog entry.
- [x] Implement keyboard-accessible scene with separate characters, speaker emphasis, responsive bubbles and reduced motion.
- [x] Export local optimized illustrations and record provenance.
- [x] Run typecheck, lint, build and focused Playwright including first lesson regression; inspect desktop/mobile screenshots.
- [x] Update current state with actual results.

Review focus: rapid clicks cannot skip turns; final turn stays readable before explanation; mobile faces stay clear; replay cancels completion timers; first lesson remains unchanged.
