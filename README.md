# CONTINUUM 2027

A responsive event website built with the Next.js 16 App Router, React, TypeScript, React Three Fiber, and Three.js. The opening frames an illustrated castle beneath the stone-and-gold CONTINUUM 2027 title. Scrolling brings the camera down behind an original voxel guide, then moves the guide through both castle gates to five noticeboards. The minimap tracks the guide and links to each stop.

## Run locally

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Next.js. For a production build:

```sh
npm run build
npm start
```

Run the bundled asset integrity checks with `npm test`, and TypeScript checks with `npm run typecheck`.

The compiled site uses a Node.js server. The opening castle is an illustrated cutout. Scrolling starts the 3D scene and blends it into the opening once it is ready. The castle is served by `/api/castle`, which selects the bundled gzip representation when the client accepts gzip. The full GLB remains available at `/assets/models/castle.glb`. Meshopt decoding is configured by the 3D scene. The event posters remain usable when WebGL is unavailable.

## Assets

The hero uses optimized WebP layers made from the supplied PNGs. The sky, three cloud crops, mountain panorama, and river valley sit behind the transparent castle canvas. The stone approach, foreground tree crops, and lantern light sit in front. Scroll progress reveals the walk environment as the illustrated foreground fades. The official Continuum emblem supplies the infinity mark in the glass navigation and browser tab.

The repository includes the optimized assets needed to run the site. The original design packs and model source are separate. To regenerate the hero WebPs, first put the original PNG set in `public/assets/Hero-Assets` and the supplied emblem at `public/assets/Futuristic Chrome Continuum Emblem.png`, then run:

```sh
node scripts/prepare-hero-assets.mjs
```

`components/HeroEnvironment.tsx` and its CSS module handle composition and ambient motion. `components/JourneyHome.tsx` feeds them the existing scroll state, and `components/CastleWorld.tsx` frames the gate and composites its live renderer. `app/walkthrough.css` aligns the Lite fallback and title. `app/layout.tsx` supplies the official browser icon, and `tests/assets.test.mjs` verifies the added public asset URLs.

Production assets are bundled in `public/assets`. To rebuild the optimized models and event posters from the supplied preparation package:

```sh
npm run prepare:assets -- --source "path/to/CONTINUUM-2027-preparation"
```

The script also discovers a sibling preparation package or one in the original workspace's `outputs` directory, and accepts `CONTINUUM_ASSET_SOURCE`. It needs Sharp. It reads the preparation package, checks every recorded SHA-256 digest, copies the optimized model and nine small nature models, converts the raster images to WebP, and records sizes, dimensions, source hashes, and output hashes in `lib/asset-manifest.json`. It verifies every source file again after processing. The original assets and the user's original source project are not edited by this script.

The supplied castle is 7,022,148 bytes before gzip and 2,302,615 bytes in its gzip representation. Quantization and Meshopt compression preserve all 571,150 triangles. Generated event artwork is at most 1,600 px wide and the reference posters are at most 1,000 px wide. The bundled title, minimap, and daylight fallback are WebP images. The map and fallback are rendered from the supplied castle geometry.

Read [`public/assets/CREDITS.md`](public/assets/CREDITS.md) for model attribution, CC BY-SA 4.0 and CC0 terms, modification notices, and poster provenance. The castle and its adapted preview are by patrix, under CC BY-SA 4.0. Nature assets are by Kytric, under CC0. Rights in supplied event posters remain with their applicable owners. Generative badge lettering should be checked against official logos before institutional publication.

Fraunces gives headings a softer, storybook feel, with restrained sizes and semibold weights. DM Sans is used for reading text, navigation, and controls. Both variable fonts are served locally from `public/assets/fonts` with their SIL Open Font License 1.1 notices.

## Content and registration

Castle posters, the E shortcut, and event gallery cards open the same themed dialog through the intercepted event route. Minimap pins take you to the corresponding poster stop. The dialog includes keyboard-accessible Overview, Format, Rules, Timeline, and Prizes tabs. Explore details opens the shareable event page. The castle remains mounted while the dialog is open.

The dialog, tab navigation, and world settings live in `components/EventModal.tsx`, `components/EventTabs.tsx`, and `lib/event-worlds.ts`. `app/event-details.css` styles the modal and the standalone event page. The existing `lib/events.ts` supplies the facts and registration links for both. Runtime art is under `public/continuum/events`. See `docs/event-modal-art.md` for the supplied assets and the generated artwork for Neural Nexsus and Battleforge.

`app/site-chrome.css` applies the decorative navbar and minimap bezels, the Quest Hall backdrop for the event gallery, and the dusk terrace backdrop in the footer. Both scene illustrations use responsive WebP versions and load as the reader approaches them. The footer uses the supplied official emblem. See `docs/site-art.md` for the generated assets and prompts.

Registration buttons open the event's Unstop page. Neural Nexsus and Battleforge display a pending state until their confirmed registration links are available. Update event content and destinations in `lib/events.ts`.

Scroll, use Previous and Next, or choose Play tour to follow the guide automatically. Wheel, touch scroll, and page navigation keys pause playback. At a stop, click the artwork, press E, or choose Open poster. The map is open on desktop and expands from the Castle map button on mobile. The route and stops are configured in `lib/journey.ts`.

**Explore freely** opens the separate Castle Relic Hunt at `/explore`. Move with WASD or the arrow keys, drag to look, use Space to jump, C to crouch, and E to vault. Touch devices get movement and action buttons. Find five relics around the gate, village road, and courtyard. The game tests movement against the same castle geometry as the guided tour.

Keep the credits and asset notices with any distributed copy. Publication and hosting are separate from this local implementation.

## Verification and hosting

To activate Google and email-code sign-in, follow the [authentication setup](docs/authentication.md).

Run npm run test:http while the local site is running to check same-origin compressed model delivery, direct event pages, and genuine 404 responses. Next 16.4 filters Content-Encoding from route-handler responses, so /api/castle redirects gzip-capable clients to a statically served .glb.gz with explicit configured headers. Version queries are preserved to prevent stale model representations.

Set NEXT_PUBLIC_SITE_URL to your final public origin before deploying so social metadata uses the correct domain. The application runs locally without that setting. This local implementation does not publish a site or collect attendee data.


## Castle destinations

- `/sponsors` has three ways to partner; add the sponsor roster only when the organizer confirms names and supplies approved logos.
- `/about` introduces Nexsus, the faculty directory, and five festival paths.
- `/team` lists the student leadership and published team roster.
- `/contact` has organizer channels, directions, and an official registration and rulebook directory. Use `/contact#partnerships` for sponsor inquiries.
- The castle gate unlatches, opens, and reveals the next destination over at least 2.1 seconds. Hash jumps and in-castle event dialogs remain immediate. Reduced-motion visitors get a static gate view.
- [Destination artwork and prompts](docs/destination-art.md)
- [Castle opening and gate artwork](docs/gate-art.md)

