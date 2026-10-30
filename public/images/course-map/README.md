# Course map landscape assets

These local assets restore the realistic environments and scale of the user-selected `sophia-learning-map-v4.html` prototype on `/learn`. The world is 3800 x 650 CSS pixels: five eras of 760 x 650. The five source paintings were generated for Sophia with the built-in `image_gen` tool on 2026-10-30; four seam viewports were repaired with that tool in edit mode on 2026-10-31. No external map service, photographs or third-party scene assets are used.

The artwork is decorative rather than a historical source or geographically accurate map. All text, the continuous SVG route and the layered DOM/CSS lesson buttons are rendered separately by the application. No lesson progress is baked into the images or persisted.

## Files and processing

| Shipped asset | Source | Processing and placement |
| --- | --- | --- |
| `era-antiquity.webp` | `artifacts/realistic-antiquity.png` | Original 1374 x 1145 pixels retained; Sharp WebP quality 88, effort 6. Runtime `object-fit: cover` inside a 760 x 650 era. |
| `era-medieval.webp` | `artifacts/realistic-medieval.png` | Original 1374 x 1145 pixels retained; Sharp WebP quality 88, effort 6. Runtime `object-fit: cover` inside a 760 x 650 era. |
| `era-early-modern.webp` | `artifacts/realistic-early-modern.png` | Original 1374 x 1145 pixels retained; Sharp WebP quality 88, effort 6. Runtime `object-fit: cover` inside a 760 x 650 era. |
| `era-german.webp` | `artifacts/realistic-german.png` | Original 1374 x 1145 pixels retained; Sharp WebP quality 88, effort 6. Runtime `object-fit: cover` inside a 760 x 650 era. |
| `era-contemporary.webp` | `artifacts/realistic-contemporary.png` | Original 1374 x 1145 pixels retained; Sharp WebP quality 88, effort 6. Runtime `object-fit: cover` inside a 760 x 650 era. |
| `transition-antiquity-medieval.webp` | `artifacts/seam-source-1.png`, edited with built-in `image_gen` | Sharp resize to 760 x 650 (`fit: fill`), WebP quality 90, effort 6. Positioned at era boundary minus 380 pixels; CSS mask feathers the outer 16% on both sides. |
| `transition-medieval-modern.webp` | `artifacts/seam-source-2.png`, edited with built-in `image_gen` | Sharp resize to 760 x 650 (`fit: fill`), WebP quality 90, effort 6. Positioned at era boundary minus 380 pixels; CSS mask feathers the outer 16% on both sides. |
| `transition-modern-german.webp` | `artifacts/seam-source-3.png`, edited with built-in `image_gen` | Sharp resize to 760 x 650 (`fit: fill`), WebP quality 90, effort 6. Positioned at era boundary minus 380 pixels; CSS mask feathers the outer 16% on both sides. |
| `transition-german-contemporary.webp` | `artifacts/seam-source-4.png`, edited with built-in `image_gen` | Sharp resize to 760 x 650 (`fit: fill`), WebP quality 90, effort 6. Positioned at era boundary minus 380 pixels; CSS mask feathers the outer 16% on both sides. |

The superseded single `course-panorama.webp` is no longer shipped or referenced by the application. A local copy is retained as `artifacts/course-panorama-superseded.webp`; `artifacts/` is ignored by Git.

## Original scene generation requests

The source record is `artifacts/REALISTIC_MAP_PROMPTS.md`. Each complete recorded request below combines its shared brief and the corresponding era brief. This reproduces all generation instructions retained in that record; the prototype-only status note in the old record describes its state at generation time, before site integration.

### `era-antiquity.webp`

Mode: built-in `image_gen`, new generation, 2026-10-30.

```text
One full-bleed landscape environment per era, approximately 1.2:1. Premium realistic miniature-world / isometric strategy-game environmental art, elevated oblique view. Natural light, realistic stone, wood, foliage, water, atmospheric depth and contact shadows. A relatively open horizontal band at 45–70% image height is reserved for five overlaid interactive steps. Concentrate landmarks in the upper third and bottom corners. No text, UI, icons, lesson buttons, circles or route baked into the image. Calm Sophia-compatible color direction, with unmistakably different environments for each era.

sunlit Mediterranean coast, turquoise sea, cream marble Greek temple, warm limestone, olive trees and amphitheater; gold, ivory and turquoise. Output: `realistic-antiquity.png`.
```

### `era-medieval.webp`

Mode: built-in `image_gen`, new generation, 2026-10-30.

```text
One full-bleed landscape environment per era, approximately 1.2:1. Premium realistic miniature-world / isometric strategy-game environmental art, elevated oblique view. Natural light, realistic stone, wood, foliage, water, atmospheric depth and contact shadows. A relatively open horizontal band at 45–70% image height is reserved for five overlaid interactive steps. Concentrate landmarks in the upper third and bottom corners. No text, UI, icons, lesson buttons, circles or route baked into the image. Calm Sophia-compatible color direction, with unmistakably different environments for each era.

moss-green forest valley, fortified stone castle, monastery library, a discreet knight and scholar, early morning mist; forest green, sage and ochre. Output: `realistic-medieval.png`.
```

### `era-early-modern.webp`

Mode: built-in `image_gen`, new generation, 2026-10-30.

```text
One full-bleed landscape environment per era, approximately 1.2:1. Premium realistic miniature-world / isometric strategy-game environmental art, elevated oblique view. Natural light, realistic stone, wood, foliage, water, atmospheric depth and contact shadows. A relatively open horizontal band at 45–70% image height is reserved for five overlaid interactive steps. Concentrate landmarks in the upper third and bottom corners. No text, UI, icons, lesson buttons, circles or route baked into the image. Calm Sophia-compatible color direction, with unmistakably different environments for each era.

terracotta/peach canal city, Renaissance townhouses, copper-domed observatory, telescope, printing workshop; warm orange, copper and canal blue. Output: `realistic-early-modern.png`.
```

### `era-german.webp`

Mode: built-in `image_gen`, new generation, 2026-10-30.

```text
One full-bleed landscape environment per era, approximately 1.2:1. Premium realistic miniature-world / isometric strategy-game environmental art, elevated oblique view. Natural light, realistic stone, wood, foliage, water, atmospheric depth and contact shadows. A relatively open horizontal band at 45–70% image height is reserved for five overlaid interactive steps. Concentrate landmarks in the upper third and bottom corners. No text, UI, icons, lesson buttons, circles or route baked into the image. Calm Sophia-compatible color direction, with unmistakably different environments for each era.

Central European neoclassical university and library garden, stone colonnades, books and writing desks, philosopher statue, lavender-flowering trees; lavender, parchment and ink blue. No medieval battlements. Output: `realistic-german.png`.
```

### `era-contemporary.webp`

Mode: built-in `image_gen`, new generation, 2026-10-30.

```text
One full-bleed landscape environment per era, approximately 1.2:1. Premium realistic miniature-world / isometric strategy-game environmental art, elevated oblique view. Natural light, realistic stone, wood, foliage, water, atmospheric depth and contact shadows. A relatively open horizontal band at 45–70% image height is reserved for five overlaid interactive steps. Concentrate landmarks in the upper third and bottom corners. No text, UI, icons, lesson buttons, circles or route baked into the image. Calm Sophia-compatible color direction, with unmistakably different environments for each era.

20th-century-and-later city park, glass-and-steel library, concrete pavilion, modernist skyline, abstract metal sculpture; ice blue, cyan, silver and coral. Output: `realistic-contemporary.png`.
```

## Exact seam repair prompts

The following texts are copied without shortening from `artifacts/seam-edits-left.json` and `artifacts/seam-edits-right.json`. Each edit target is a 760 x 650 viewport spanning two original scenes, with the original join at x=380. The central join is repaired while the outer margins are preserved for blending back into the source paintings. The application overlays these repaired viewports across the corresponding boundaries.

### `transition-antiquity-medieval.webp`

Mode: built-in `image_gen`, edit, 2026-10-31. Input: `artifacts/seam-source-1.png`. Generated source filename: `exec-2149696c-df7c-46a8-a0e7-b0cc3ea72cae.png`.

```text
Use case: compositing / precise landscape seam repair.
Edit target: the attached 760x650 game landscape viewport, which consists of two original paintings with an abrupt vertical join exactly at x=380.
Primary request: repair ONLY that central join so the two landscapes meet as ONE physically coherent world, with a gradual natural transition from a sunlit ancient Mediterranean sanctuary on limestone and sandy ground (left) to a forested medieval Alpine valley (right). This is a repair of an existing world, not a new concept.
Critical invariants: keep the camera position, scale, 760:650 composition, ALL outermost 150px on the left and ALL outermost 150px on the right unchanged as closely as possible. Keep the large marble temple and staircase in the upper left, existing far-left coast, existing far-right meadow, mountains, waterfalls, bridge and river as recognizable original landmarks in their original positions. Do not zoom out or rearrange the artwork.
Work within the middle approximately x=220..540: connect limestone terraces into green slopes, let scattered grass and rocks cross sandy ground, connect the turquoise inlet/lower-left water naturally to the rocky stream on the right, reconcile the mountain/sky horizon gradually. Lighting may gently harmonize near the join, but preserve warm left and cooler right identities.
Style: match the existing detailed realistic historical fantasy landscape, clear material texture and sharp architecture.
Avoid: visible vertical boundary, split image, collage edge, translucent ghost/doubled architecture, smeared texture, fog stripe, blurry blend, decorative frame, text, letters, UI, map buttons, route graphics, or a newly invented main monument.
Output one clean landscape image at the same aspect ratio and framing.
```

### `transition-medieval-modern.webp`

Mode: built-in `image_gen`, edit, 2026-10-31. Input: `artifacts/seam-source-2.png`. Generated source filename: `exec-4ad9d6a7-17cf-464e-907a-9441b45dab5e.png`.

```text
Use case: compositing / precise landscape seam repair.
Edit target: the attached 760x650 game landscape viewport, which consists of two original paintings with an abrupt vertical join exactly at x=380.
Primary request: repair ONLY that central join into ONE physically coherent landscape, transitioning from a green medieval castle valley and monastery on the left to a warm Renaissance / early modern canal town and stone terrace on the right. This is a repair of an existing map, not a new concept.
Critical invariants: keep camera position, scale, 760:650 composition, ALL outermost 150px at the left and ALL outermost 150px at the right unchanged as closely as possible. Keep the original prominent castle in the upper left, the monastery in the lower left, the canal city in the upper right, the rightmost building, and rightmost terrace/lantern in their original positions. Preserve all their details and recognizable original shapes. No zoom out or artwork rearrangement.
Modify the middle x=220..540 to establish real terrain continuity: connect meadow and stone monastery terraces into warm stone paving, use an organic garden/retaining wall with trees where required, reconcile the distant valley/canal horizon without straight cuts. The monastery's stonework should meet the town through plausible mixed gardens and masonry, not overlap as translucent objects. Preserve cooler green medieval left and warmer terracotta/gold right identities.
Style: match the existing detailed realistic historical fantasy painting, clear textured stone, clean architectural edges.
Avoid: vertical seam, split image, pasted panel, blurry band, fog curtain, doubled/ghosted buildings, new main monuments, labels, text, UI, buttons or map route.
Output one clean landscape image at the same aspect ratio and framing.
```

### `transition-modern-german.webp`

Mode: built-in `image_gen`, edit, 2026-10-31. Input: `artifacts/seam-source-3.png`. Generated source filename: `exec-77811e15-ce8c-41c1-b523-84467857e645.png`.

```text
Use case: compositing / precise localized seam repair.
Asset type: background transition tile for a continuous horizontal educational map.
Input image 1 is the EDIT TARGET, a 760 by 650 viewport of two adjoining existing map scenes. There is an artificial straight vertical seam at x=380 (50% width). Repair this join ONLY, making it one coherent physical landscape, while keeping the existing scale, framing, elevated camera, architecture, rendering detail, lighting and textures.
The left side shows a warm Renaissance / early modern observatory with bronze telescope, brick city, stone waterfront and canal. The right side shows a lavender-toned German university garden with colonnades, stone plazas, distant academic city, river and hills.
Preserve the outermost 150 pixels on BOTH left and right edges as faithfully as possible, so this tile blends back into the existing scenes. Preserve the observatory dome on left, university colonnade on right, far background and fine detailed realistic illustrated style. Repair primarily the central band x=210 to550: join the stone terraces, steps and planted edges naturally, reconcile foreground water with garden architecture as a continuous canal edge/stone terrace, and connect horizon subtly. The result must be a single continuous landscape without any visible straight dividing line, disjoint ground level, duplicated landmark, translucent double-exposed building, soft fog stripe, gradient strip or collage.
Do not zoom out, change camera or replace the entire world. No text, UI, buttons, badges, road or lesson path, no watermark. Opaque background. Output the same 760:650 aspect ratio and exact composition.
```

### `transition-german-contemporary.webp`

Mode: built-in `image_gen`, edit, 2026-10-31. Input: `artifacts/seam-source-4.png`. Generated source filename: `exec-1f6ee9b7-4b79-415e-94a9-e9b3fff1d05f.png`.

```text
Use case: compositing / precise localized seam repair.
Asset type: background transition tile for a continuous horizontal educational map.
Input image 1 is the EDIT TARGET, a 760 by 650 viewport of two adjoining existing map scenes. There is an artificial straight vertical seam at x=380 (50% width). Repair this join ONLY, making it one coherent physical landscape, while keeping the existing scale, framing, elevated camera, architecture, rendering detail, lighting and textures.
The left side is a historic German university with classical pale stone facade and dome, philosopher statue, lilac flowering gardens, stone terrace and library books in foreground. The right side is a contemporary landscaped waterfront campus with light concrete plazas, glass buildings, trees and turquoise stream/waterfalls, distant city skyline and bay.
Preserve the outermost 150 pixels on BOTH left and right edges as faithfully as possible so this tile blends back into the existing scenes. Preserve the university facade on left, modern plaza/trees/water on right, far background and fine detailed realistic illustrated style. Repair primarily the central band x=210 to550: transition historic terrace stone into pale modern paving organically, join the terraces and planted garden edges naturally, continue the foreground rock-and-water cascade along a coherent garden boundary, and make distant mountain/bay horizon continuous. There must be no visible straight dividing line, disjoint ground level, duplicated landmark, translucent double-exposed building, soft fog stripe, gradient strip or collage.
Do not zoom out, change camera or replace the entire world. No text, UI, buttons, badges, road or lesson path, no watermark. Opaque background. Output the same 760:650 aspect ratio and exact composition.
```
