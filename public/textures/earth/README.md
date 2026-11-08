# Earth satellite textures

| File | Resolution | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `earth-day-8k.jpg` | 8192 × 4096 | 8225106 | `263a20c7829d804ac25851942dbe1046c469a5c96906cfa11323bce7b6e4855e` |
| `earth-day.jpg` | 4096 × 2048 | 2499682 | `033150d2820d54585f0c6648883117a71795cd194afdb7a076118a653d510570` |

Both files are downsampled from a **21600 × 10800** original, not upscaled from 4K. No generative editing, recolouring, sharpening, labels or clouds were added; original equirectangular geographic coordinates are retained.

## Source and use

- **NASA Earth Observatory**, Blue Marble: Next Generation, July 2004, with topography and bathymetry. Produced by Reto Stöckli, NASA Goddard Space Flight Center.
- Dataset: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/
- Original JPEG: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/july/world.topo.bathy.200407.3x21600x10800.jpg
- Usage guidelines checked 2026-11-08: https://www.nasa.gov/nasa-brand-center/images-and-media/
- NASA permits educational/informational use under these guidelines, with source acknowledgment and without suggesting endorsement. No third-party copyright notice is attached to this map. No logos or identifiable people are included. Do not claim NASA endorsement or exclusive rights to its source imagery.
- This is a monthly composite with shaded topography/bathymetry; ocean-floor relief is part of NASA's visualization, not a literal photograph of the ocean surface or live imagery.

## Export and runtime

Exported using the existing `sharp` installation: Lanczos3 downsampling, JPEG quality 94, 4:4:4 chroma, mozjpeg. The 21600px download is kept only in ignored `artifacts/atlas-quality/`, outside runtime assets.

8K is selected when the renderer supports at least 8192px textures, the pointer is not coarse and the optional `navigator.deviceMemory` hint is greater than 4 GiB (or absent). Otherwise only 4K is fetched. An 8K fetch/decode/upload failure retries with 4K. No duplicate 4K/8K textures are retained after success.

The uncompressed GPU budget including mipmaps is approximately **171 MiB for 8K** or **43 MiB for 4K**, plus render buffers and transient decoded-image memory. Compressed JPEG size is not GPU-memory cost. DPR is capped at 2 for high quality and 1.5 for fallback, passed declaratively to Canvas. Texture settings: sRGB, generated mipmaps, trilinear minification, linear magnification, repeat horizontally/clamp at poles, anisotropy up to 16 (8K) / 4 (4K), bounded by GPU support.

`MeshStandardMaterial` uses `earth-palette.ts` to harmonize the whole globe with Sophia's pastel UI: desaturated sage and sand on land, softer forest shadows and desert highlights, and muted blue-grey water with gentler bathymetric contrast. This is an artistic display treatment in linear RGB before lighting; the JPEG files and geography are unchanged. The blue-water mask is a colour heuristic, not a land/water classification dataset. It adds no extra texture samples, blur or sharpening. Ambient light 1.8, directional light 1.5 and ACES exposure 1.05 retain volume with softer contrast. No tiles are loaded; city-scale detail is outside the source resolution. Runtime requests only local images; the attribution link does not load remote textures.
