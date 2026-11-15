# Lesson artwork

Current full nine-scene lesson: [plato/README.md](plato/README.md), with per-image prompts in `plato/generation.json`. The single illustration below belongs to the earlier introductory revision and is retained as an existing project resource; the full lesson uses the nine new matching WebP files.

## plato-young-athenian.webp

- Created for Sophia on 2026-11-15 using the built-in image_gen tool. No external stock image, historical photograph, third-party artwork or reference portrait was supplied.
- An AI-generated artistic interpretation of an anonymous young Athenian, not an authenticated portrait of Plato or an archaeological reconstruction. It illustrates the existing introductory story; it is decorative and uses empty alt text.
- Local WebP, 1536 × 1024, 265,318 bytes; exported with Sharp at quality 88 / effort 6 from the original PNG. No new dependency was added (Sharp is already installed with Next.js).
- Original: `exec-c5c316e7-6427-4e01-af1a-100292e60bbd.png` in generated_images session `01a1df52-0d11-7563-b1d1-162c8d8e6a38`. The runtime uses only the local WebP.
- Usage provenance: project-generated asset, not a third-party licensed stock download. No separate third-party attribution requirement is attached to this asset. This note records its origin and does not promise copyright exclusivity for AI-generated material.

## Generation prompt

Create a refined atmospheric editorial painting for Sophia philosophy education website. Wide landscape 3:2 or 16:10 composition, no text, no letters, no UI, no frame. Classical Athens, late fifth century BCE, an anonymous young Athenian in an understated ivory himation sits on a low stone step under an olive tree, quietly looking down at a rolled papyrus in his hands, no writing visible. Distant restrained Doric architecture and hazy Acropolis, pale limestone paths and muted olive foliage. Warm morning light, soft sage, ivory, dusty gold, pale mint, subdued blue shadows. Sophisticated hand-painted gouache/oil illustration, gently textured, natural proportions, atmospheric depth, coherent details, calm contemplative mood, not cartoon, not photorealistic, not a map. Main figure and beautiful detail concentrated in left 45 percent, distant soft architecture toward center, rightmost third fades into very pale warm gray-green empty mist suitable to blend into website background. Avoid hard vertical transitions. No burning papers, no invented historical quotations or identifying symbols. Scene is an evocative artistic interpretation rather than a historical portrait.

## Adding later scenes

Keep the same muted palette, medium and left-weighted composition. Add a local optimized image and its provenance here, then reference it through the lesson data. `LessonScene` supplies the CSS fade, title, story, assignment slot, navigation slot and optional scene position. Do not bake text or gradients that must match CSS colors into the image.
