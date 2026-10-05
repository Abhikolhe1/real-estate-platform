# 3D MVP performance report

**Imported-sample hardware target: PASS on the tested Intel Direct3D11 configuration.** Three 60-second production runs sustained approximately 60 FPS. Software-only SwiftShader rendering remains slow, and the legacy before/after software runs do not establish an FPS improvement. These are separate results, not a percentage optimization claim.

## Conditions and measurement limits

Baseline was captured before this implementation; after measurements were captured on 2026-10-03. Both use Windows, Playwright Chromium 153.0.8010.12, headless SwiftShader, 1280x900 viewport, development Next server and five-second requested sampling windows. The host has an Intel Core 5 210H, NVIDIA RTX 4050 Laptop GPU and Intel graphics, but those initial software runs explicitly report **ANGLE / Vulkan / SwiftShader Device (Subzero)**. A later Direct3D11 probe successfully enabled the Intel adapter without changing system settings.

The workstation was shared with other running processes and development compilation. CPU contention, paging, HMR and short windows prevent treating these runs as a controlled GPU benchmark. Some windows contain only a few frames: p95 is then essentially the maximum observed delay, not a robust percentile estimate. No percentage FPS gain is claimed, and the short software runs cannot predict hardware performance. Final hardware validation below was captured on 2026-10-04.

## Comparable legacy scene

The baseline uses the pre-existing default procedural tower, not the parsed DXF fixture. The same source and API fallback fixture are used after repair. Draw/triangle counts below are WebGL-call instrumentation averaged over the sampling RAF window; they can include shadow passes and frame alignment effects. They are not identical to `renderer.info.render` main-pass counters.

| Run | Mode | FPS | p50 ms | p95 ms | Contexts created cumulatively | Draw calls/frame | Triangles/frame |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Before | exterior | 2.56 | 366.7 | 899.9 | 2 | 5889 | 106653 |
| Before | floor-change | 2.30 | 283.2 | 1533.2 | 3 | 5889 | 106653 |
| Before | walkthrough | 4.32 | 49.9 | 966.6 | 6 | 339 | 6287 |
| After | exterior | 0.48 | 3666.5 | 4299.9 | 3 | 4775 | 96350 |
| After | floor-change | 1.40 | 733.4 | 1550.0 | 3 | 3820 | 77080 |
| After | walkthrough | 0.28 | 4183.2 | 4183.2 | 3 | 252 | 5418 |

Before, cumulative contexts increased on floor and mode changes. After, they remain at 3 throughout. That initial count includes development Strict Mode and the route's temporary default viewer while reading `?legacy=1`; it does not mean three live canvases. There is one active WebGL canvas; walkthrough also uses a 2D minimap canvas. Repeated floor changes retain the renderer and cached building object. The raw evidence is `evidence/3d/baseline.json` and `legacy-after.json`.

## Imported sample and DXF regression

These are separate workloads, not a before/after claim. Four-second requested steady windows were measured after a short warm-up. All used the same explicitly identified SwiftShader renderer. Load time measures download/parse/scene setup until attachment; first shader compilation can occur afterward.

| Scene | FPS | p50 ms | p95 ms | Sampled frames | Main-pass calls | Main-pass triangles | Model load ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| imported-balanced | 1.01 | 977.1 | 2099.9 | 5 | 313 | 27036 | 1484 |
| imported-low | 1.07 | 750.0 | 2466.6 | 6 | 313 | 27036 | 1484 |
| dxf-tower-selected-floor | 4.83 | 199.9 | 466.7 | 20 | 236 | 5180 | 1070 |

The real GLB is 2,051,496 bytes and 26,348 source triangles. Renderer counters may include additional helper/furniture geometry. `regression-performance.json` preserves raw samples, GPU string and full snapshots. The on-screen Metrics panel uses a rolling 600-frame window including transitions; its FPS is not substituted for these isolated measurements.

DXF floor-selector wall-clock interactions measured 11,365 ms for the first switch and 305, 758 and 1,094 ms thereafter. These include Playwright/UI/renderer delays, not just the JavaScript visibility loop. Initial compilation and shader warm-up remain visible costs. No precise pre/post scene-build-duration comparison was available in the original baseline.

## Final hardware production benchmark

Windows, Chromium 153.0.8010.12, 1280x900, DPR 1, explicitly selected `--use-angle=d3d11`. WebGL reports **ANGLE (Intel, Intel(R) Graphics (0x0000A7AB) Direct3D11 vs_5_0 ps_5_0, D3D11)**. This uses the isolated Next production preview on port 3100. Each scene receives a three-second warm-up followed by a full 60-second window; no other browser benchmark runs concurrently. The exterior remains stationary during sampling, and the interior sample is stationary after entering the actual ground-floor living room. Movement correctness is tested separately; these are not a 60-second moving-camera path benchmark.

| Scene | Seconds | Frames | FPS | p50 ms | p95 ms | p99 ms | Frames >50 ms | Main-pass calls | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| imported-balanced | 60.00 | 3601 | 60.01 | 16.7 | 16.7 | 16.8 | 0 | 313 | 27036 |
| imported-low | 60.01 | 3601 | 60.01 | 16.7 | 16.7 | 16.8 | 0 | 313 | 27036 |
| ground-interior-low | 60.01 | 3601 | 60.00 | 16.7 | 16.7 | 16.8 | 0 | 13 | 732 |

The bundled model meets the aspirational 45-60 FPS average target on this tested configuration. A few timing samples can slightly exceed 60 FPS because RAF windows do not align exactly with refresh boundaries; this is not a claim of a faster display. Results do not promise 60 FPS on other models, GPUs or mobile devices. `tools/3d/hardware-benchmark.cjs` and `evidence/3d/hardware-benchmark.json` preserve the measurement. Earlier short GPU samples in `hardware-performance.json` measured 48.83 FPS balanced, 60.18 FPS low and 58.49 FPS for the selected DXF tower floor on the development server.

## Confirmed lifecycle and resource results

- One intended RAF loop per runtime; minimap/hotspot work is throttled inside the legacy loop.
- Floor selection changes actual visibility without replacing the imported root or renderer.
- Legacy mode/floor changes reuse the renderer, confirmed again in the final five-test legacy suite. Generated floor groups are cached once per visited floor and removed/disposed when inputs change or the viewer unmounts.
- Collision wall/floor/ceiling/node indexes are constructed on content changes. No avoidable full-scene traversal remains in the steady animation path; event-driven indexing and visibility changes still visit relevant meshes.
- Three imported unload/reload cycles with saved sofa placement produced the same counters: **283 geometries, 4 textures, 6 programs** each time. No increasing retained renderer-resource count was observed. This is not a proof of zero JavaScript heap leaks or a long-duration soak test.
- Shared materials/textures remain application-owned; imported subtrees, inventory material clones and obsolete loads are disposed. Duplicate obsolete loads cannot attach after a newer source selection.
- Balanced mode caps DPR at 1.5 with 1024 shadows. Performance mode caps DPR at 1 and disables shadows. The measured low-cost mode was still slow under SwiftShader; a substantial gain is not claimed.

## Remaining bottlenecks and release gate

The default procedural building still emits thousands of draws. The GLB emits hundreds and uses unbatched element meshes to preserve semantics. Future optimization should first profile the target hardware, then consider material/floor batching with separate semantic collision data, instancing repeated elements, and a supported on-demand idle-render strategy. Do not remove room geometry just to inflate FPS.

The imported sample now has a warm 60-second production trace for each tested mode on Intel graphics. Release validation still needs a moving-camera trace on each intended GPU, a sustained legacy-tower workload, and physical mobile testing. Record WebGL renderer, viewport/DPR, quality, browser, load and switch latencies, p50/p95, slow-frame count and repeated replacement resource counters. Repeat on the same source/configuration without background builds. The exact commands and guide are in `3D_MVP_MANUAL_TEST_GUIDE.md`.
