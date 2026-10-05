# 3D MVP test report

Final validation date: 2026-10-04. All listed results are executed checks, not proposed tests. The current checkout also contains unrelated pre-existing/user changes; no database or schema operation was used to obtain these results.

## Functional checks

| Suite | Executed check | Result |
| --- | --- | --- |
| Geometry / navigation | Real GLB manifest references actual nodes | PASS |
| Geometry / navigation | Missing manifest node rejected | PASS |
| Geometry / navigation | Invalid manifest spawn rejected | PASS |
| Geometry / navigation | Semantic collision index excludes decorative furniture | PASS |
| Geometry / navigation | Living room supports human eye height | PASS |
| Geometry / navigation | Solid IFC wall blocks repeated movement | PASS |
| Geometry / navigation | No unsupported ground outside building | PASS |
| Geometry / navigation | Connected IFC rooms accessible through real openings | PASS |
| Imported browser | Actual architectural GLB loads | PASS |
| Imported browser | Floor isolation changes geometry without replacing renderer or GLB | PASS |
| Imported browser | Real unit and room mappings selectable | PASS |
| Imported browser | Room entry, human eye height and keyboard movement | PASS |
| Imported browser | Pointer lock and Escape | PASS |
| Imported browser | Sofa added on actual floor | PASS |
| Imported browser | Mouse placement and rotation change actual object transform | PASS |
| Imported browser | Saved furniture survives browser refresh | PASS |
| Imported browser | Exterior orbit and reset | PASS |
| Imported browser | Repeated unload/reload releases model resources | PASS |
| Imported browser | 404, invalid extension and corrupt model give recoverable errors | PASS |
| Imported browser | Procedural ten-floor source uses same renderer | PASS |
| Imported browser | Rapid source switching cannot attach stale GLB | PASS |
| Additional browser | Furniture reset, delete and persisted deletion | PASS |
| Additional browser | Corrupt saved furniture fails safely with notice | PASS |
| Additional browser | Existing embed mode controls drive imported runtime | PASS |

A final unmocked local demo check also passes: 277 model meshes, one viewer canvas and no viewer error (`evidence/3d/live-demo.json`, `final-live.png`).

The imported browser suite has **13 passing checks and zero uncaught page errors**, executed on the isolated production preview with Chromium 153 / Intel Direct3D11. Eight independent geometry checks parse and raycast the actual GLB. Additional production tests verify reset/deletion, corrupt saved data and external embed mode controls. `evidence/3d/browser-tests.json`, `core-tests.json` and `additional-tests.json` contain the raw results.

The earlier broad development run encountered stale Next chunks. A subsequent production run replaced that result. An early error-test assertion also matched Next's own alert element; the corrected test waits for the viewer's actual error state. Focused missing-file, unsupported-extension, corrupt-file and successful-recovery checks all pass in `error-tests.json`; the final full browser suite also passes these paths.

## DXF and architecture asset

- PASS: Both existing DXF files parse through the existing CADParser/GeometryEngine without API or database writes. The root fixture produced 8 rooms, 27 walls and 4 apertures; the AI-service fixture produced 4 rooms, 41 walls and 16 apertures. Input hashes and counts are in `evidence/3d/dxf.json`.
- PASS: Parsed root DXF renders through SceneCompiler as a single layout.
- PASS: Ten explicitly repeated levels render through TowerCompiler; selecting 0, 9, 4 and 0 changes real visibility while preserving model/renderer identity. This validates stacking and rendering, not automated detection of ten distinct storeys.
- PASS: Real IFC source header/hash, 277 GLB mesh nodes, 26,348 source triangles, Y-up metre bounds, named storeys and actual node references validated. Independent GLTFLoader visualization was inspected before integration.
- PASS: Exterior, cutaway, interior and user-furniture screenshots were visually inspected. The asset retains BIM source finishes and does not contain photographic PBR textures.

Evidence: `hardware-performance.json`, `regression-performance.json`, `dxf-single.png`, `dxf-tower.png`, `independent.png`, and the `final-*.png` images.

## Legacy regression

Final targeted results are recorded separately in `evidence/3d/legacy-tests.json`. The broad `additional-tests.json` retains the initial failures for traceability: an initial geometry-cache assertion, toolbar overlap blocking submode controls, and tour state resetting during metadata loading. The room carousel and toolbars were separated, the test tour dwell made long enough to inspect pause, and the camera-switch code now targets the correct camera. Stale metadata requests are cancelled and cannot reset an active tour. Wall and room-node picking were corrected to respect a nearer door.

| Targeted legacy check | Final result |
| --- | --- |
| Legacy floors preserve renderer and cached building | PASS |
| Legacy dollhouse and floorplan preserve renderer and escape eye-height clamp | PASS |
| Legacy hotspot fixture is mounted | PASS |
| Legacy guided tour changes camera and can pause | PASS |
| Procedural door click animates its actual hinge | PASS |

The final five checks pass with zero uncaught page errors. These use real procedural meshes and local read-only hotspot/tour fixtures. The door test clicks the rendered scene and checks a hinge angle change, rather than changing a synthetic flag. Initial broad-suite legacy failures are superseded by this targeted run. PASS (visual): `evidence/3d/inventory-fixture.png` was inspected after the final cutaway fix. The read-only AVAILABLE inventory fixture tints actual room-floor materials green; generated beds/tables and room labels remain visible, and exterior context no longer occludes the floor plan. This does not validate real tenant authorization or inventory write endpoints.

## Type check, lint and build

- PASS: `tsc -p apps/web/tsconfig.json --noEmit --incremental false` after the imported runtime and navigation adapter were added.
- PASS: Focused ESLint over the viewer, scene compiler and explorer: zero errors, eight warnings in the large legacy component (hook dependencies and an existing image element). Raw output: `evidence/3d/lint.json`.
- PASS: Next production build, including type validation and generation of all 12 routes. It uses a staged source copy under `.cache/3d-build` with one build worker to avoid modifying the active development server or production configuration. Lint is executed separately. `evidence/3d/build.log` and `build-result.json` preserve the output. `.env.local` is not copied into this isolated compilation check.

## Acceptance and limits

| Essential item | Status / evidence |
| --- | --- |
| Existing app, routes and procedural producer retained | PASS: production build, source switches and DXF rendering |
| Real GLB / correct scale and orientation | PASS: actual IFC conversion, manifest and independent view |
| Credible materials and usable interior lighting | PASS within BIM visualization scope; source has no photo textures |
| Exterior orbit / reset | PASS: camera transform assertion |
| Real floor isolation / room-unit mapping | PASS: mesh count/root identity and IFC room IDs |
| Interior entry / movement / collision | PASS: UI movement plus real-wall and connected-room raycast tests |
| Furniture add/move/rotate/reset/delete and refresh persistence | PASS: actual transforms and browser storage checks |
| Renderer reuse and bounded observed resources | PASS for imported source and targeted legacy floor/mode checks |
| Measured performance | PASS: real software and hardware measurements; see separate report |
| Database/schema preservation | PASS: no writes or migrations performed |
| Build and checks truthfully reported | PASS: raw logs/results retained |

Not claimed: stair traversal, a general physics solver, server/shared furniture persistence, arbitrary CAD reconstruction, imported-model tours/inventory, codec decoder support, full physical-device touch validation, accessibility audit, or long-duration heap-leak proof. Authored BIM furniture is not editable or used as an obstacle. Imported door assemblies are shown/hidden, while procedural doors use hinge animation. Hardware performance is configuration-dependent; software-only rendering is not smooth.
