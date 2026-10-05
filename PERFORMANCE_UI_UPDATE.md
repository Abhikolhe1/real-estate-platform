# Website performance and UI update

The public website, admin portal, and builder portal are running locally from production builds. The API and AI service are also running.

## Review

| Application | URL | Login | Password |
| --- | --- | --- | --- |
| Public 3D explorer | http://localhost:3000/explorer | No login | — |
| Admin portal | http://localhost:3002/login | admin@platform.com | password |
| Builder portal | http://localhost:3003/login | admin@aethelgard.com | password |
| Second builder | http://localhost:3003/login | admin@omniestate.com | password |

These are existing local review accounts. Their credentials were checked through browser sign-in.

## Changes

- Desktop navigation opens by default, collapses on click, and remembers its state. Hovering no longer changes the layout or repeatedly resizes the 3D canvas. The explorer hides the website logo/header and footer. Phones have a navigation drawer with Escape handling.
- The explorer loads its standard viewer separately from the advanced procedural viewer. Model geometry and its manifest load in parallel. Optional HDR lighting follows the model; daylight is usable immediately. Rendering pauses while the viewer is offscreen or the tab is hidden.
- Initial camera framing accounts for the screen aspect ratio. The actual building fits within phone and desktop viewports.
- Shared public request caching removes duplicate builder/theme requests. Inventory loads when the page needs it. Skeletons, error states, and retry controls cover public and portal loading. The hero appears immediately, and below-fold media loads later.
- Public inventory and home details use the selected builder's API records, including actual status, price, area, tower, and floor. Unknown units and empty inventories have explicit states. Location uses the stored project address. Navigation and enquiry links retain the builder selection.
- Portal login waits for persisted session hydration, fixing redirects to login on refresh. AI floor-plan requests use the signed-in builder's tenant. Hard-coded tenant fallbacks were removed from affected builder pages. Dashboard visitor counts use recorded events, and price updates accept zero.
- Admin and builder navigation, grids, page controls, and the amenities editor adapt to phone widths. Wide data tables scroll within their containers.

## Measured performance

Three fresh browser contexts per version, median results. Both versions used local production builds, a 4 Mbps download limit, 40 ms simulated latency, disabled HTTP cache, a 1440 × 1000 viewport, and Direct3D11 on this machine. CPU speed was not throttled.

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Explorer ready | 2,799 ms | 1,889 ms | 32.5% shorter |
| First contentful paint | 960 ms | 452 ms | 52.9% shorter |
| Model loading | 1,417 ms | 706 ms | 50.2% shorter |
| Explorer initial route JavaScript | 358 kB | 98.9 kB | 72.4% smaller |
| Home initial route JavaScript | 145 kB | 110 kB | 24.1% smaller |
| Builder/theme requests | 2 | 1 | Duplicate removed |

“Ready” means the actual model manifest is attached and two animation frames have elapsed. All 277 architectural meshes were loaded in each trial. Route JavaScript values are Next.js build estimates; they exclude the later dynamically loaded viewer. Lab timings are specific to this device and test setup, rather than a guarantee for every network or device.

Raw measurements: [before](evidence/performance/before.json), [after](evidence/performance/after.json).

## Verification

- Web, admin, and builder production builds passed Next.js type validation. API compilation completed without errors.
- [27-route audit](evidence/performance/audit-production.json): HTTP 200, loaded page headings, no browser errors, no failed local API requests, and no desktop page overflow.
- [18 portal phone routes](evidence/performance/mobile-audit.json): document width stayed within the 390 px screen. Wide tables retain contained horizontal scrolling.
- [10 interaction checks](evidence/performance/verification.json): sidebar persistence, stable renderer during navigation changes, real inventory, builder isolation, request retry, unknown records, mobile navigation, session refresh/sign-out, and AI tenant headers.
- [13 standard 3D checks](evidence/3d/browser-tests.json): actual GLB, floor/room selection, walking, pointer lock, furniture placement/rotation/persistence, orbit/reset, cleanup, recoverable asset errors, procedural source switching, and stale-request cancellation.
- [5 advanced viewer checks](evidence/3d/legacy-tests.json): stable renderer/cache, floorplan/dollhouse, hotspots, guided tours, and door animation.
- [Camera fit](evidence/performance/camera-fit.json): actual GLB bounds project fully inside 390 px, 360 px, and desktop viewports.
- [Read-only data checks](evidence/performance/data-checks.json): inventory and event counts match the database for both builders. Aethelgard currently has 9 homes and OmniEstate has none; empty states reflect those records.

Desktop screenshot: [explorer](evidence/performance/final-desktop-ready.png). Phone screenshot: [explorer](evidence/performance/final-explorer-mobile.png).

## Rebuild and run

From the project root, with Node.js and the existing AI virtual environment available:

```powershell
node tools/build-review.cjs web
node tools/build-review.cjs admin
node tools/build-review.cjs builder
./tools/start-review.ps1 -Mode Production -Restart
```

Builds are isolated under `.cache/review-build`. Logs and tracked process IDs are under `.cache/review`. The start script restarts tracked frontend processes and keeps an already-running API and AI service. PostgreSQL must be running. Database synchronization is disabled for review; no schema changes or reseeding were required.

The available website and portal routes were checked; this does not establish that every possible CMS configuration or uploaded model is bug-free. The advanced procedural viewer retains its larger scene and is loaded on demand. The measured load improvements above apply to the standard explorer.
