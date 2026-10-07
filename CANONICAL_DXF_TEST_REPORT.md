# Canonical DXF executed test report

Date: 2026-10-07. Results below are actual executions; generated/synthetic geometry is not a genuine architectural acceptance fixture.

## Final status

| Area | Result |
| --- | --- |
| Python geometry/corrections | PASS, 31/31 |
| Shared JSON Schema | PASS, 11/11 |
| Canonical scene/collision | PASS, 10/10 |
| Private worker HTTP | PASS, 7/7 |
| API/PostgreSQL integration | PASS, 24/24 |
| Actual production AppModule smoke | PASS, 4/4 |
| Canonical production browser workflow | PASS, 13/13 |
| Configured local worker launcher | PASS, 3/3 |
| Imported GLB core | PASS, 8/8 before and after |
| Imported GLB browser | PASS, 13/13 before and after |
| Advanced legacy browser | PARTIAL: 3 PASS, 2 FAILED before and after |
| Web / Builder / Admin / API production build | PASS, all four |
| Exact synthetic accuracy | PASS |
| Genuine architectural accuracy | BLOCKED |
| Hardware FPS and production load | UNVERIFIED |
| Fresh empty database deployment | PARTIAL: canonical upgrade verified; full historical baseline not provided |

Final canonical checks total 103 passing cases including the configured local launcher. This is functional verification against the supported input contract, not general drawing coverage or production certification.

## Environment and commands

Windows 11, Python 3.12.14, Node 22.23.2, Chromium 153.0.8010.12. PostgreSQL was local. Canonical browser tests use real isolated PostgreSQL, API 3195, private worker 8105, and actual production Web/Builder/Admin builds on 3191/3192/3193. Credentials are in ignored test cache only. No canonical API route is mocked. Imported/legacy browser suites use controlled historical API fixtures.

Executed: `tools/canonical/python-tests.py`, fixture generator and `accuracy.py`, schema/scene tests, `worker-tests.py`, API compiler/integration harness, actual Nest build/AppModule smoke, three isolated Next production builds, canonical browser tests and `tools/3d` core/imported/legacy regressions. Root aliases and prerequisites are in [development instructions](docs/DEVELOPMENT.md).

Baseline imported browser used SwiftShader. Final full imported browser used Direct3D11; canonical browser used SwiftShader and legacy used Direct3D11. Thus functional results are compared, not equal-GPU performance measurements. Recorded FPS includes shader/startup and machine load. Canonical final snapshot: 23 draw calls, 240 triangles, 162.3 ms model load, approximately 3.51 sampled FPS, p50 33.3 ms, p95 1966.6 ms; this does not pass a hardware FPS target. Reload counts stabilized at 30 geometries / 4 textures / 5 programs across three runs. These are samples, not a long-run leak/load certification.

## Failures and investigation

The final legacy tour reaches a playing camera state but pause fails because of the legacy UI interaction/state behavior. The door-click test finds no visible door that opens from its tested camera. Both were observed in the preserved baseline and remain FAILED; the legacy feature was not represented as repaired.

The first final imported run passed 12 cases and sampled room eye height before camera entry settled; its archived JSON is below. First legacy run sampled a root before asynchronous project/amenity/tour fixtures settled, causing an extra cache assertion failure. Readiness waits now require the expected camera/fixture state while retaining the same height, movement and root assertions. A subsequent SwiftShader attempt stopped after a 30 second screenshot timeout; it did not complete or overwrite the first attempt's JSON. Final full imported run completed on Direct3D11 with bounded screenshot capture; final legacy returned the baseline 3/2 result. No product Runtime workaround was applied to mask those assertions.

During implementation, corrected issues included source text intercepting room selection, stale production chunks when rebuilding under a running server, split-wall noding and hosted offsets, window/non-passable door collision, test-schema UUID defaults, child environment missing required home variables, and a Windows TypeScript include glob that initially selected no files. The final build helper rejects empty source selections; actual emitted API modules were booted and tested. Earlier failed development checks were rerun after correction. Optional legacy dependency installation and external OCR/model availability were not executed and remain UNVERIFIED.

## Build and evidence

Build timing/output records: [builds.json](evidence/canonical/builds.json). Exact synthetic metrics: [accuracy.json](evidence/canonical/accuracy.json). Migration state: [migration verification](evidence/canonical/migration-verification.json). Formatting retained exact Python AST equality: [format verification](evidence/canonical/format-verification.json). Source overlay, approved exterior/interior and protected admin screenshots are under `evidence/canonical`. Existing audit/baseline evidence was preserved separately.

## Every recorded case

### Python geometry and corrections

[Raw execution](evidence/canonical/python-tests.json)

| Test | Result |
| --- | --- |
| test_canonical.CanonicalGeometryTests.test_ambiguous_host_blocks | PASS |
| test_canonical.CanonicalGeometryTests.test_bulge_preserved_as_reviewed_approximation | PASS |
| test_canonical.CanonicalGeometryTests.test_concave_room | PASS |
| test_canonical.CanonicalGeometryTests.test_corrupt_and_oversized_rejected | PASS |
| test_canonical.CanonicalGeometryTests.test_courtyard_hole | PASS |
| test_canonical.CanonicalGeometryTests.test_cyclic_insert_bounded | PASS |
| test_canonical.CanonicalGeometryTests.test_determinism_and_reprocess | PASS |
| test_canonical.CanonicalGeometryTests.test_door_gap_not_hallucinated | PASS |
| test_canonical.CanonicalGeometryTests.test_duplicates_and_overlap | PASS |
| test_canonical.CanonicalGeometryTests.test_large_origin_roundtrip | PASS |
| test_canonical.CanonicalGeometryTests.test_line_rectangle | PASS |
| test_canonical.CanonicalGeometryTests.test_lwpolyline_rectangle | PASS |
| test_canonical.CanonicalGeometryTests.test_metric_equivalence | PASS |
| test_canonical.CanonicalGeometryTests.test_native_label | PASS |
| test_canonical.CanonicalGeometryTests.test_nested_block_transform_lineage | PASS |
| test_canonical.CanonicalGeometryTests.test_opening_start_span_and_adjacency | PASS |
| test_canonical.CanonicalGeometryTests.test_polyline_rectangle | PASS |
| test_canonical.CanonicalGeometryTests.test_snap_only_within_metric_tolerance | PASS |
| test_canonical.CanonicalGeometryTests.test_t_junction | PASS |
| test_canonical.CanonicalGeometryTests.test_unknown_units_block | PASS |
| test_canonical.CanonicalGeometryTests.test_unsupported_reported | PASS |
| test_canonical.CanonicalGeometryTests.test_x_junction | PASS |
| test_corrections.CorrectionTests.test_calibration_and_defaults_gate | PASS |
| test_corrections.CorrectionTests.test_empty_unknown_and_mass_assignment_commands_rejected | PASS |
| test_corrections.CorrectionTests.test_geometry_issue_cannot_be_dismissed | PASS |
| test_corrections.CorrectionTests.test_immutable_rename_history | PASS |
| test_corrections.CorrectionTests.test_invalid_matrix_provenance_and_graph_block | PASS |
| test_corrections.CorrectionTests.test_opening_host_edits_and_rejection | PASS |
| test_corrections.CorrectionTests.test_rebase_exact_and_conflicting_configuration | PASS |
| test_corrections.CorrectionTests.test_split_then_merge_roundtrip | PASS |
| test_corrections.CorrectionTests.test_vertex_move_updates_walls_support_area | PASS |

### Shared schema

[Raw execution](evidence/canonical/schema-tests.json)

| Test | Result |
| --- | --- |
| Python fixture passes shared JSON Schema and approved gate | PASS |
| Reject unknown fields | PASS |
| Reject nonfinite coordinates | PASS |
| Reject unknown schema version | PASS |
| Reject opening outside host | PASS |
| Reject window traversal | PASS |
| Reject draft cannot render approved | PASS |
| Reject unknown units | PASS |
| Reject blocking issues | PASS |
| Reject duplicate ids | PASS |
| Reject outside spawn | PASS |

### Canonical scene and collision

[Raw execution](evidence/canonical/scene-tests.json)

| Test | Result |
| --- | --- |
| Only approved canonical revisions compile | PASS |
| Every rendered element retains canonical revision and source lineage | PASS |
| Actual triangle floor area equals independently specified 38 square metres | PASS |
| Concave missing floor receives no invented support | PASS |
| Canonical room spawns stand on floor at 1.65 metre eye height | PASS |
| Window geometry remains a collision obstacle | PASS |
| Closed door blocks and open door permits traversal through actual wall cut | PASS |
| Hosted window and door cuts use start offsets and real dimensions | PASS |
| Courtyard holes triangulate 84 square metres and provide no invented support | PASS |
| Non-passable doors remain obstacles even when passable leaves open | PASS |

### Worker HTTP

[Raw execution](evidence/canonical/worker-tests.json)

| Test | Result |
| --- | --- |
| Worker requires authenticated service identity | PASS |
| Worker rejects path injection fields | PASS |
| Worker rejects unsupported operation | PASS |
| Worker rejects malformed DXF without geometry | PASS |
| Bounded worker reconstructs source in a separate process | PASS |
| Worker applies immutable corrections | PASS |
| Worker validates canonical geometry | PASS |

### API/database integration

[Raw execution](evidence/canonical/api-integration.json)

| Test | Result |
| --- | --- |
| Canonical migration applies to an isolated legacy schema | PASS |
| Anonymous source/status access denied | PASS |
| Spoofed tenant header denied | PASS |
| Foreign authenticated tenant denied before upload | PASS |
| Sales role cannot approve or change geometry | PASS |
| Inactive membership cannot use a valid JWT | PASS |
| Administrative status is restricted to server-side super admins | PASS |
| Unknown DTO fields and path traversal rejected | PASS |
| Production floorplan creation cannot assign source, approval or fabricated geometry | PASS |
| DXF source persists privately and reconstruction queues | PASS |
| Concurrent duplicate jobs are rejected | PASS |
| Claimed job stores canonical immutable draft and measured stages | PASS |
| Source and revision SQL updates/deletes are blocked | PASS |
| Unreviewed inferred dimensions cannot be approved | PASS |
| Database rejects draft approval pointers and cross-scope sources | PASS |
| Corrections save history and survive a fresh DB connection | PASS |
| Approval atomically moves explicit immutable pointer | PASS |
| Inventory returns the exact approved revision and canonical floor height | PASS |
| Inventory blocks cross-project source links and unbounded unit seeding | PASS |
| Stale corrections and stale approval cannot overwrite pointer | PASS |
| Reprocess transfers exact intent and keeps previous approval | PASS |
| Changed calibration/configuration emits explicit rebase conflicts | PASS |
| Failed worker job cannot change approval | PASS |
| Cancellation is durable and does not publish a queued job | PASS |

### Actual production AppModule

[Raw execution](evidence/canonical/app-smoke.json)

| Test | Result |
| --- | --- |
| Actual production module starts and reports health | PASS |
| Actual production module rejects anonymous canonical access | PASS |
| Actual production module verifies membership from the database | PASS |
| Actual production admin monitor rejects anonymous users | PASS |

### Canonical production browser

[Raw execution](evidence/canonical/browser-tests.json)

| Test | Result |
| --- | --- |
| Production studio loads authenticated project/floor identity | PASS |
| Upload persists source and real job reaches source-overlay review | PASS |
| Source overlay has independent toggles, zoom and original handles | PASS |
| Rename queue, undo and save persist a new immutable revision | PASS |
| Boundary vertex drag queues geometry intent and undo leaves source intact | PASS |
| Explicit dimension/calibration review enables server validation and approval | PASS |
| Immutable source download matches independently known file checksum | PASS |
| Historical revisions remain visible while polling continues | PASS |
| Approved viewer fetches the explicit canonical revision and uses one canvas | PASS |
| Canonical room selection and entry preserve renderer and eye height | PASS |
| Furniture stands on canonical floor and persists by immutable revision | PASS |
| Canonical unload/reload releases resources and retains one renderer | PASS |
| Super-admin sees measured reconstruction stages and approval status | PASS |

### Baseline GLB core

[Raw execution](evidence/canonical/baseline/core-tests.json)

| Test | Result |
| --- | --- |
| Real GLB manifest references actual nodes | PASS |
| Missing manifest node rejected | PASS |
| Invalid manifest spawn rejected | PASS |
| Semantic collision index excludes decorative furniture | PASS |
| Living room supports human eye height | PASS |
| Solid IFC wall blocks repeated movement | PASS |
| No unsupported ground outside building | PASS |
| Connected IFC rooms accessible through real openings | PASS |

### Baseline imported browser

[Raw execution](evidence/canonical/baseline/browser-tests.json)

| Test | Result |
| --- | --- |
| Actual architectural GLB loads | PASS |
| Floor isolation changes geometry without replacing renderer or GLB | PASS |
| Real unit and room mappings selectable | PASS |
| Room entry, human eye height and keyboard movement | PASS |
| Pointer lock and Escape | PASS |
| Sofa added on actual floor | PASS |
| Mouse placement and rotation change actual object transform | PASS |
| Saved furniture survives browser refresh | PASS |
| Exterior orbit and reset | PASS |
| Repeated unload/reload releases model resources | PASS |
| 404, invalid extension and corrupt model give recoverable errors | PASS |
| Procedural ten-floor source uses same renderer | PASS |
| Rapid source switching cannot attach stale GLB | PASS |

### Baseline legacy browser

[Raw execution](evidence/canonical/baseline/legacy-tests.json)

| Test | Result |
| --- | --- |
| Legacy floors preserve renderer and cached building | PASS |
| Legacy dollhouse and floorplan preserve renderer and escape eye-height clamp | PASS |
| Legacy hotspot fixture is mounted | PASS |
| Legacy guided tour changes camera and can pause | FAILED |
| Procedural door click animates its actual hinge | FAILED |

### Final GLB core

[Raw execution](evidence/canonical/after/core-tests.json)

| Test | Result |
| --- | --- |
| Real GLB manifest references actual nodes | PASS |
| Missing manifest node rejected | PASS |
| Invalid manifest spawn rejected | PASS |
| Semantic collision index excludes decorative furniture | PASS |
| Living room supports human eye height | PASS |
| Solid IFC wall blocks repeated movement | PASS |
| No unsupported ground outside building | PASS |
| Connected IFC rooms accessible through real openings | PASS |

### Final imported browser

[Raw execution](evidence/canonical/after/browser-tests.json)

| Test | Result |
| --- | --- |
| Actual architectural GLB loads | PASS |
| Floor isolation changes geometry without replacing renderer or GLB | PASS |
| Real unit and room mappings selectable | PASS |
| Room entry, human eye height and keyboard movement | PASS |
| Pointer lock and Escape | PASS |
| Sofa added on actual floor | PASS |
| Mouse placement and rotation change actual object transform | PASS |
| Saved furniture survives browser refresh | PASS |
| Exterior orbit and reset | PASS |
| Repeated unload/reload releases model resources | PASS |
| 404, invalid extension and corrupt model give recoverable errors | PASS |
| Procedural ten-floor source uses same renderer | PASS |
| Rapid source switching cannot attach stale GLB | PASS |

### Final legacy browser

[Raw execution](evidence/canonical/after/legacy-tests.json)

| Test | Result |
| --- | --- |
| Legacy floors preserve renderer and cached building | PASS |
| Legacy dollhouse and floorplan preserve renderer and escape eye-height clamp | PASS |
| Legacy hotspot fixture is mounted | PASS |
| Legacy guided tour changes camera and can pause | FAILED |
| Procedural door click animates its actual hinge | FAILED |

### First final imported attempt

[Raw execution](evidence/canonical/after/browser-first-attempt.json)

| Test | Result |
| --- | --- |
| Actual architectural GLB loads | PASS |
| Floor isolation changes geometry without replacing renderer or GLB | PASS |
| Real unit and room mappings selectable | PASS |
| Room entry, human eye height and keyboard movement | FAILED |
| Pointer lock and Escape | PASS |
| Sofa added on actual floor | PASS |
| Mouse placement and rotation change actual object transform | PASS |
| Saved furniture survives browser refresh | PASS |
| Exterior orbit and reset | PASS |
| Repeated unload/reload releases model resources | PASS |
| 404, invalid extension and corrupt model give recoverable errors | PASS |
| Procedural ten-floor source uses same renderer | PASS |
| Rapid source switching cannot attach stale GLB | PASS |

### First final legacy attempt

[Raw execution](evidence/canonical/after/legacy-first-attempt.json)

| Test | Result |
| --- | --- |
| Legacy floors preserve renderer and cached building | FAILED |
| Legacy dollhouse and floorplan preserve renderer and escape eye-height clamp | PASS |
| Legacy hotspot fixture is mounted | PASS |
| Legacy guided tour changes camera and can pause | FAILED |
| Procedural door click animates its actual hinge | FAILED |


### Configured local worker launcher

[Raw execution](evidence/canonical/local-launcher.json)

| Test | Result |
| --- | --- |
| Workspace launcher starts configured private worker | PASS |
| Workspace launcher still rejects anonymous worker requests | PASS |
| Configured private credential reconstructs original bytes in bounded child | PASS |

## Final source checks and cleanup

Final API TypeScript compilation with `--noEmit --incremental false` passed after formatting. `git diff --check` passed. Next verification builds run production compilation and TypeScript checks with ESLint skipped; repository-wide lint is UNVERIFIED. Local documentation links were verified. [Cleanup evidence](evidence/canonical/test-cleanup.json) records seven stopped test server ports, removal of four verified task-created test schemas and deletion of the ignored temporary test session. The application public schema and applied migration remain in place.
