# Asset credits and modification notices

## Minecraft Castle

- Title: Minecraft Castle
- Creator: patrix
- Creator page: https://sketchfab.com/patrix
- Original model: https://sketchfab.com/3d-models/minecraft-castle-4b63724d7eab47079f905369cf8a0f98
- Licence recorded in the supplied GLB: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- Licence: https://creativecommons.org/licenses/by-sa/4.0/
- Legal code: https://creativecommons.org/licenses/by-sa/4.0/legalcode.en

The licence permits sharing and adaptation under its terms. Retain attribution and licence information and indicate modifications; distribute adaptations under the applicable ShareAlike terms. This notice does not imply creator endorsement of CONTINUUM, NEXSUS or this preparation package.

## Prepared derivatives

The castle-derived GLBs and castle geometry previews in this package are offered under CC BY-SA 4.0. Original source metadata and attribution have been retained in the GLBs.

- `castle-safe.glb`: repacked 32-bit indices as verified 16-bit indices; preserved source vertex attributes, triangle order, texture, unlit material, scene hierarchy and transforms. Added preparation notice.
- `castle-unlit-web.glb`: removed normals for the existing unlit presentation; deduplicated exact position/UV records within each mesh; repacked indices to 16-bit. Preserved expanded triangle-corner positions/UVs, texture and scene. No triangle simplification.
- Any included Meshopt candidate: additional compression/quantisation as explicitly documented in the preparation reports. Do not describe it as a bit-identical reference. No intentional new castle artwork or animation is added by this preparation.
- `.glb.gz` files: gzip representations of their corresponding GLBs.
- Previews: orthographic projections of source geometry; per-face atlas colour sampling; illustrative shading, backgrounds, labels and credits. They are not full texture renders or final website screenshots.

The creative brief contains these attributed castle previews. This notice identifies the adapted castle material; it does not assert that unrelated website code or independent event branding has the castle asset's licence.

## Kytric nature assets supplied by the user and prepared here

- Creator: Kytric
- Pack: Voxel Path And Terrain
- Source: https://kytric.itch.io/voxel-path-and-terrain
- Creator-declared licence: CC0 / Creative Commons Zero v1.0 Universal
- Licence: https://creativecommons.org/publicdomain/zero/1.0/
- Local source: PathAndTerrain-GodotDemoScenes/assets
- Preparation: a curated subset repackaged from source glTF with companion buffers/textures into standalone GLBs; see assets/nature for exact files and validation. No entire Godot demo is bundled.

## Optional audio researched, not included

- Interface Sounds by Kenney: https://kenney.nl/assets/interface-sounds - creator lists CC0.
- Forest Ambience by TinyWorlds: https://opengameart.org/content/forest-ambience - creator-uploaded CC0 loop.

Verify and retain licence information with any eventual download. No optional audio is bundled. Five original event posters supplied by the user are preserved unchanged, and five raster adaptations were generated from them with built-in image_gen. The full prompts and references are recorded in screen-art/IMAGEGEN-PROMPTS.json. These adaptations do not reuse the castle GLB and are not assigned its ShareAlike licence by this notice. User-supplied brand/poster rights remain with their applicable owners; no new institutional endorsement or approval is asserted. Generative badge lettering is not a replacement for exact official logo artwork. The earlier SVG event-screen concepts are not included in the delivery package.

## Website distribution notes

The website serves the supplied Meshopt candidate as `models/castle.glb` and its exact gzip representation as `models/castle.glb.gz`. The adapted castle retains source attribution and is distributed under CC BY-SA 4.0. Preparation removed normals from its unlit material, deduplicated identical position/UV records, repacked indices, and applied 16-bit position/UV quantization and Meshopt compression; it did not simplify the 571,150 triangles. Meshopt is required for loading this file.

The `castle-fallback.webp` image is a cropped, resized WebP adaptation of the package's opposite-exterior geometry preview. Diagnostic labels were cropped away; the original attribution is retained here. This is an illustrative geometry preview with per-face atlas color and shading, rather than a full texture render. It is also distributed under CC BY-SA 4.0.

`castle-daylight.webp` and `castle-map.webp` are raster illustrations rendered from patrix's castle geometry and texture atlas. Both adaptations are distributed under CC BY-SA 4.0. `continuum-title.webp` is independently generated raster title artwork for this site.

Nine Kytric GLBs are copied without changes. The five generated raster event-screen adaptations are only resized and encoded as WebP at quality 88. The five user-supplied reference posters are only resized and encoded as WebP at quality 86 in `posters/originals`; their original PNG files in the preparation package remain unchanged. Full image-generation prompts remain in the supplied preparation package. Generative badge lettering is not a guarantee of official institutional logo fidelity. The raster site favicon is independent geometric artwork made for the website.

No optional audio is bundled. This asset notice applies to the named artwork and models; it does not assign the castle license to unrelated website code or independent branding.

## Locally bundled fonts

- Fraunces — Copyright 2018 The Fraunces Project Authors. Source: https://github.com/google/fonts/tree/main/ofl/fraunces. Unmodified variable font, renamed to `fonts/fraunces.ttf` for its public URL. License: SIL Open Font License 1.1; full copyright and license notice in `fonts/fraunces-OFL.txt`.
- DM Sans — Copyright 2014 The DM Sans Project Authors. Source: https://github.com/google/fonts/tree/main/ofl/dmsans. Unmodified variable font, renamed to `fonts/dm-sans.ttf` for its public URL. License: SIL Open Font License 1.1; full copyright and license notice in `fonts/dm-sans-OFL.txt`.
