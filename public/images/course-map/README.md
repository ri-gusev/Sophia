# Detailed adventure map resources

Current revision: 2026-11-01. User feedback supersedes the strict roof-plan-only direction: readable historic buildings may use a slight tilt within the illustrated 2D environment. Each era fills the desktop map frame (1180 × 650 CSS px); the world currently spans 5900 × 650. The layout aligns with the shared Sophia header container.

## Active assets

All active resources are under `adventure/`. Five independently generated native-resolution paintings preserve fine detail; there is no upscaling, sharpening filter or blurred low-resolution master panorama. Source dimensions are retained during WebP export (quality 94, effort 6). The four seam repairs also retain native dimensions; alpha quality 100. No runtime blur or CSS mask is applied.

| Asset | Native dimensions | Display dimensions | Recognizable landmarks |
| --- | --- | --- | --- |
| antiquity.webp | 1691 × 930 | 1180 × 650 | Doric temple, amphitheatre, philosopher bust, papyrus |
| medieval.webp | 1691 × 930 | 1180 × 650 | Gothic monastery, keep, pennants, manuscript |
| early-modern.webp | 1690 × 931 | 1180 × 650 | Observatory, telescope, armillary sphere, sailing ship |
| german.webp | 1904 × 826 | 1180 × 650 | Classical university, thinker monument, clock tower |
| contemporary.webp | 1691 × 930 | 1180 × 650 | Modern library, sculpture, reading plaza, tram |
| transition-antiquity-medieval.webp | 984 × 1599 | 400 × 650 | Sand and limestone transition into forest cobbles |
| transition-medieval-early-modern.webp | 984 × 1599 | 400 × 650 | Creek bank, bridge and garden; cropped house removed |
| transition-early-modern-german.webp | 984 × 1599 | 400 × 650 | Canal garden continues into university park |
| transition-german-contemporary.webp | 984 × 1599 | 400 × 650 | Historic garden continues into a modern plaza |

Total size of the nine WebP files: 7,866,794 bytes. The first scene is prioritized; subsequent scenes/transitions use native image lazy loading. Native pixels are finite: this is not vector or unlimited-zoom art. Full source detail is retained; display resizing follows the common CSS coordinates.

## Composition and extension

The five paintings and four transition edits were produced with built-in image_gen for Sophia on 2026-10-31/2026-11-01. The project-created path guide and first ancient painting served as composition/style references. No external stock artwork or historical source was used. Landmarks are decorative interpretations, not reconstructions or portraits with verified identities.

The trail is part of the paintings, with no second SVG road. Buttons use explicit node-ID configurations in `course-map-config.ts`, with eraId, position, icon, action and optional parentId. Antiquity now has four main stops and one optional Plato branch; the other scenes retain five main stops. The small branch route is a separate SVG layer; the main trail remains painted into these unchanged resources. Native scene sizes differ, so the displayed 1180 × 650 frame is authoritative for placement.

Seam authoring used a temporary 1475 × 812 downsample of each source to make adjacent 500 × 812 reference crops. The generated edits are shipped at their larger native size; reference crops are not the product images. At export, each transition receives a smooth alpha fade across its outer 19% on each side; its central region is fully opaque. It is placed at the adjacent-era boundary minus 200 CSS pixels. The actual terrain/trail continuity is painted by image editing, not synthesized by the fade. The medieval-to-early-modern house was removed in an additional edit, replaced by creek-bank rocks, reeds and flowers.

To extend the world later:

1. Agree on the new era and content; update `EraId`, `COURSE_ERAS` and the explicit node configurations. No additional era or lesson is implemented in this revision.
2. Paint a new sharp scene, preserving sufficient native pixels for a 1180 × 650 frame and the intended stopping points. Avoid buildings crossing its outer margins.
3. Add `adventure/{new-id}.webp` and a painted `adventure/transition-{previous-id}-{new-id}.webp` (400 × 650 display footprint, feathered alpha edges). Keep previous source files unchanged.
4. World width and neighboring transition placement derive from the era list. There is no fixed five-image panorama to regenerate.
5. Recheck joins, trail/stop registration, image loading, scroll/navigation, keyboard focus and mobile viewport; update tests for the agreed number of eras.

## Source provenance

Generated session: `01a18d9f-ee16-7b71-88ff-414f753d7ec4` in Codex generated_images. Native scene outputs, in era order:

- `exec-bbea3e34-cddc-4816-b077-50a2c1096e9b.png`
- `exec-a4a35cfb-4651-4d55-b934-987ea99fdbf6.png`
- `exec-01ad6599-4b89-4696-b028-518b5bea1ca6.png`
- `exec-9872d863-bb5c-4361-8822-c388243aa0b8.png`
- `exec-a8c21d43-2bc7-449c-8ebb-e285052858a1.png`

Accepted transition outputs, left to right:

- `exec-72fc6f45-3dca-4708-a63d-deae58db9d08.png`
- `exec-3cfbf7c2-8e2c-4cf4-8c86-c52417ff7717.png` (house removal from `exec-f5e97aa6-19f8-41d5-a521-8166d5e6c89d.png`)
- `exec-aa599fea-52d8-4a74-8781-be00aeaee8de.png`
- `exec-f92a3206-681c-4f94-81fc-9bf0e37153f1.png`

## Generation prompts


## Transition edit prompts


### Remove the cropped house

Precise local edit of this game map transition. REMOVE the small cream house with orange tiled roof, green shutter and tiny chimney in LOWER CENTER, entirely. Remove all its roof and facade, no remaining half-wall or architectural stump. Replace it with a natural continuous bank of the existing blue creek: pale limestone rocks, reeds, low green shrubs, a little moss and flowering grass blending into the garden on right. Keep the bridge to lower left, the colonnade and orange pots at far lower right unchanged. The creek must pass smoothly into vegetation, with no vertical edge or straight cut. Preserve upper 65% of image EXACTLY, especially continuous walking path. Preserve exact original framing, resolution, overall geometry, all other architecture, colors and sharp painted detail. Outer leftmost and rightmost 15% must remain identical for seamless compositing. No new buildings, no blur, no text, no UI. Only remove that lower-center house and restore natural landscape there.

## Previous top-down panorama (superseded)

The following records describe the rejected low-resolution panorama and earlier v4 resources, not the active assets. The old world-topdown.webp is retained only in ignored local artifacts. Old tracked v4 assets remain recoverable in Git history.



## Superseded: one top-down world

The user request “Sophia — 2D Top-Down Philosophy World Map” (2026-10-31) replaces only the landscape. The active asset is **world-topdown.webp**, 3800 × 650 pixels. It is one hand-painted environment with five historical regions and a trail in the painting. No runtime image seams, masks, blur, or second SVG road are used. The existing 25 DOM buttons, labels, interactions and course content are unchanged.

Generated with the built-in image_gen tool for Sophia on 2026-10-31, using a project-created layout guide, without third-party reference artwork. Decorative artwork, not a historical source or geographic reconstruction. No text, user data, or lesson progress is embedded.

### Coordinates and export

- World: 3800 × 650; logical era width 760. Local node centers: (94,376), (229,285), (374,386), (518,292), (664,381), repeated with x + 760 × era index.
- The generation guide used the original Catmull-Rom route through these centers, with endpoints (-40,430) and (3840,430). Cubic control points use neighboring differences divided by 6. It is an authoring reference, not a runtime overlay.
- To preserve the unusually wide aspect ratio, the 3800 × 650 guide was padded with 325 black pixels above and below before image generation. These export-only margins never appear in the application.
- Accepted base output: exec-43db68f4-c3c2-4c74-9b25-674fd9394443.png; material edit: exec-6966870c-2a42-4e76-aa77-c8dec286db02.png; flat ancient foundations: exec-ce5fe061-a0d1-44e3-a87a-c39f29a00e8c.png; final organic transition correction: exec-71f1b4c7-8c97-4ad7-ba5e-4d425d3e74ee.png. Generated session directory: 01a18d9f-ee16-7b71-88ff-414f753d7ec4 under Codex generated_images.
- Final output 2142 × 734. Sharp export: extract left 0, top 182, width 2142, height 365; resize to 3800 × 650 with fit fill; WebP quality 92, effort 6. This removes the temporary margins and uniformly enlarges the painted band with only a small aspect correction. Native detail is that of the generated source, not a native 3800px painting.
- Rendering keeps the whole image and nodes in the same fixed coordinates on all viewports; only the scroll window changes. Future node-coordinate edits require a corresponding artwork edit and visual inspection. Automated coordinate checks do not independently prove a raster trail matches the controls.

### Accepted base prompt

Edit ONLY the colored central band of this guide. Preserve exact black top quarter and black bottom quarter. Preserve exact path shape and location. This is a precisely registered game background; do not move ANY path curves. Canvas 3800x1300 with landscape only in middle y325..975, black top/bottom padding intentionally kept for export cropping. Create premium hand-painted flat 2D world map in the colored band. Absolutely vertical orthographic roof-plan view, like an architect's colored landscape masterplan but painterly adventure-game art. All buildings drawn as flat roof footprints, NO vertical walls, NO facades, NO windows on walls, NO angled columns. Circular tree crowns, roof plans, rectangular garden beds, little rocks and mosaic ground. Crisp delicate brushwork, low contrast sage/mint/cream, detailed but airy. FIVE equal-width regions flow together across whole band: left20% warm sand olives ruined Greek temple floorplan with small column circles; next20% grassy forest medieval monastery roof plan and circular tower tops; middle20% red tiled early-modern town roof plans and ornamental garden; next20% muted lavender university roof quadrangles with stone gardens; last20% cool mint contemporary campus flat roof rectangles and park ponds. Whole separate small buildings max120px wide, no shared architecture between regions, no giant structures; built objects mostly in upper/lower margins of colored band. Keep 65px space around path clear. No competing paths. Existing cream line becomes worn narrow natural trail integrated into ground, same centerline, sand slowly blends cobbles to park pavement; lightly irregular textured edges. Smooth organic biome transitions with foliage and ground, never vertical boundaries, no panels. Artwork continuous left to right, calm lovely pastel illustrated environment. No text labels or UI. Top and bottom black bands stay EXACTLY intact. Most important preserve path geometry and band aspect ratio; use directly overhead plan view WITHOUT showing any sides of any objects.

### Material correction prompt

Precision localized material edit of the existing central winding cream path ONLY. Preserve full canvas size, same black padding, exact landscape framing, all roof plans and trees and ground. Do NOT move path or change its width or ANY of its bends. Make that overly smooth cream ribbon a real narrow worn footpath integrated in painted ground: at left fifth sandy grain, lightly mottled with worn footprints, rough softly feathered edges; gradually emerging irregular small grey tan cobbles at second fifth with sand between stones; third fifth tightly spaced little stone paving; fourth fifth fine grey lavender alley paving; fifth fifth light grey park paving. All transitions extremely gradual, individual stones no larger than 3-5 pixels at this image resolution, path lower contrast than now, gently uneven margins with occasional grass tufts but no trees on route. Not a plastic stripe, not a flat color overlay, not a road with markings. Everything else EXACTLY unchanged. Preserve top-down orthographic projection and all colors of surrounding landscape. Do not introduce vertical seams, text, UI or extra roads.

### Projection correction prompt

Localized precision correction ONLY to antiquity ruin foundations in LEFT FIFTH of this panorama. Replace ALL standing cylindrical pillars and low upright walls there with entirely FLAT ground-level archaeological floor mosaics and circular column FOOTPRINTS drawn as perfect circles on ground. No height, no pillar sides, no long shadows from pillars, no visible wall side edges. They are ruins excavated down to foundation plan, straight overhead. Preserve the rectangles of temples as simple flat ancient mosaic borders, filled with tasteful faded geometric Greek floor patterns. Leave every other pixel as unchanged as possible: all 5 regions, path shape and path stone textures, rooftops and trees, exact black padding and canvas dimensions and composition. NO new paths, NO movement of the existing winding path. No UI or lettering. This correction makes ancient architectural elements truly orthographic top-down.

### Organic transition correction prompt

Fix visible VERTICAL RECTANGULAR COLOR SEAMS in the landscape only. These are flaws, remove them entirely. At x40%,60%,80% there are obvious straight vertical boundaries between green/pink/purple/mint ground tints spanning the landscape. Repaint those ground transitions as ONE continuous NATURAL earth/grass environment with organically interlocking irregular meadows, foliage and garden patches. NO vertical tint boundaries anywhere, no panel color filters, no straight biome edges. Broaden transition zones 120px each side of the old seams and stagger their shape across y so they never line up vertically. At x60% specifically cobblestone path must not change from beige to purple at a straight line: blend individual stone colors gradually over 200px. Preserve all COMPLETE individual buildings as separate top-down roof plans, never blend/morph a building. Preserve all ancient FLAT floor mosaics no columns, exact path geometry and all bends and width, canvas dimensions and black top/bottom padding. Do not shift or change any landmark shapes. Only ground coloration, foliage in transition zones and path material variation. Additionally the very left part of path should be worn sand with sparse half-buried stones gradually becoming dense cobblestones toward the forest, not solid paving from the very start. No blur effects, no fake overlay gradients; paint natural irregular texture transitions with distinct grass tufts in sand and mixed shrubs. Keep all rest unchanged.

## Archived v4 provenance (superseded)

The nine assets described below are no longer shipped or used. Their originals remain in Git history and local ignored artifacts/previous-map-assets. The following historical generation records are retained for provenance; references to SVG routes, masks and runtime placement describe the previous version only.

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
