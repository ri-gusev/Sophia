# Earth surface texture

- Runtime file: `earth-day.jpg`, 4096 × 2048 JPEG, 654975 bytes.
- SHA-256: `655de915e5f55944834c6971eaee5f41cbda52f4ff101b4d0c6d24d8d9f3fa4e`.
- Credit: **NASA Earth Observatory**. Blue Marble: Next Generation, produced by Reto Stöckli (NASA Goddard Space Flight Center).
- Dataset: July 2004 global base map, equirectangular, no added clouds or labels. This is a monthly satellite composite, not a live image.
- Source page: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- Original JPEG (5400 × 2700): https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg
- Usage guidelines checked 2026-11-08: https://www.nasa.gov/nasa-brand-center/images-and-media/
- NASA permits educational/informational use of its imagery under these guidelines, with source acknowledgment and without suggesting endorsement. This dataset credits NASA Earth Observatory; no third-party copyright notice is attached to this map. No NASA logos or identifiable people are included. Do not describe this as a NASA endorsement or apply a separate exclusive license to NASA's source imagery.
- Processing: resized with the already-installed `sharp` to 4096 × 2048, JPEG quality 88, mozjpeg. This caps GPU texture memory (about 43 MiB with mipmaps) and keeps the network asset below 640 KiB. No generative editing or geographic alteration.
- The application requests only `/textures/earth/earth-day.jpg`; external attribution links do not load any remote texture.
