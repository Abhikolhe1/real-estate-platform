# Canonical DXF implementation

Date: 2026-10-07. Base: `dev` at `c1c1edcc9f268a034c3932d04594fbb13afc2a27`.

**PASS:** supported single-floor canonical pipeline, durable private source/revision/job persistence, review/approval, explicit approved inventory/viewer consumption and protected admin monitoring. **BLOCKED:** genuine architectural accuracy acceptance. **PARTIAL:** advanced legacy viewer regressions have known failures; production performance and clean-database provisioning are not certified.

## Architecture and schema

The API owns tenant/project/floorplan authority and immutable source bytes. Durable jobs invoke a private Python worker. `CanonicalTwinV1` (`aether-twin/1`) contains source SHA-256, parser/algorithm versions, revision state, coordinate frame, building/floor, true room polygons with holes, wall centerlines, hosted opening spans, floor/ceiling slabs, traversal adjacency, source inventory, issues and evidence. Evidence retains DXF handle/layer/type/block instance path, method, nullable confidence, review state and predecessors. Default dimensions are explicit assumptions requiring review.

Python Pydantic models generate the shared JSON Schema. `packages/twin-schema` supplies declarations, checks and sorted-key canonical serialization; hashes survive PostgreSQL JSONB key reordering. Python validates references, provenance, frame round trips, room overlap/boundaries/area/spawns, wall adjacency, opening host/span/head/overlap, slab footprints and traversal. TypeScript validates structure and critical relationships at boundaries, without replacing server geometry validation.

## Extraction and normalization

Supported input is clean layered **ASCII single-floor DXF with wall centerlines and explicit opening spans**. Primitives: LINE, LWPOLYLINE, planar 2D POLYLINE, ARC, supported non-rational spline paths, native TEXT/MTEXT. Nested INSERTs preserve original handles and instance paths through bounded WCS transforms. XREFs, arrays, clipped/cyclic inserts, unsupported geometry and nonplanar entities are blocked or reported for explicit source-role review. The parser does not explode away provenance or fetch external references.

`$INSUNITS` handles millimeters, centimeters, meters, inches and feet. Unknown/unitless sources produce calibration blockers, not guessed metric geometry. Explicit scale/origin/layer roles can be reprocessed. Coordinates are rebased in metres; DXF XY maps to local XZ with **Y up**. Column-major source-to-local/inverse matrices and original origin/units are retained. Native text is evidence, never generated coordinates.

## Topology and semantics

Metric endpoint clustering is deterministic and avoids transitive drift beyond tolerance. Near-T endpoints are snapped to wall interiors only within tolerance. Noding handles T/X intersections, duplicates and collinear overlap. `polygonize_full` retains concavity and holes. Explicit void/courtyard roles exclude empty faces. Gaps, cuts, dangling geometry and ambiguous nesting emit issues instead of invented closure or AABB rooms.

Wall/source lineage follows noded edges. Rooms retain exact area/perimeter and valid interior spawns with wall/body clearance. Hosted openings use **start offset plus width**, never midpoint offsets. Ambiguous hosts, dimension assumptions and parallel double-wall ambiguity block approval. Adjacency derives from actual rooms. Windows never create traversal; only passable doors do.

| Tolerance | Default | Purpose |
| --- | --- | --- |
| Endpoint snap | 0.001 m | Near endpoint/T repair; maximum configurable 0.01 m |
| Intersection comparison | 0.0000001 m | Noded edge/source checks |
| Opening host | 0.03 m | Span-to-host compatibility; maximum configurable 0.1 m |
| Curve sagitta | 0.001 m | Bounded reviewed curve approximation |
| Body clearance | 0.25 m | Spawn/navigation assumptions |

These operate after metric conversion. Wall thickness 0.15 m, floor height 3 m and opening vertical dimensions are defaults, not measurements; they require review.

## Correction and approval lifecycle

PostgreSQL stores private source bytes, append-only revisions and durable jobs. Composite scope foreign keys and identity checks prevent foreign source/base/pointer links. Triggers block ordinary UPDATE/DELETE of source/revision records and restrict approved pointers to approved same-scope revisions.

Corrections are allowlisted intent commands with reason and before/after history: room rename, shared boundary vertex movement, wall thickness, floor height, opening dimensions/type/host (with derived passability), candidate acceptance/rejection, adjacent room merge, simple room split, explicit source assignment/ignoring through reprocessing, defaults/calibration review and limited issue resolution/reopening. Splits node affected walls and preserve hosted offsets; conflicting openings must be resolved explicitly. Derived geometry errors cannot be dismissed with a reason alone.

Every save creates a revision and checks its base against the draft. Approval validates again, atomically creates an approved revision and moves the explicit pointer. Stale requests return conflicts. Reprocessing preserves approval; exact source/config/target compatibility transfers intent, otherwise `REPROCESS_CONFLICT` requires review. Jobs record real queued/reconstructing/review-required/failed/cancelled states and durations, leasing and cancellation.

## Portals and viewer

Builder Validation Studio offers source/ignored/room/wall/opening/label toggles, fitted pan/zoom overlay, selectable provenance, calibration/layer controls, shared vertex drag previews, object editors, issues, queued undo, immutable history, private download, validation and approval. Polling does not replace a historical selection; downloads follow that revision's source.

Web requires signed-in active membership and fetches `/approved`. `CanonicalSceneAdapter` consumes that exact JSON through existing `loadModel` -> `Runtime`/`Surface`. It triangulates polygon floors/ceilings with holes and creates wall cells cut by opening spans. Mesh metadata retains revision/object/source evidence. Closed passable leaves block; opened leaves permit actual passage. Windows/non-passable doors remain obstacles. Furniture respects boundaries/holes and saves against immutable revision identity. Imported GLB and procedural producer contracts remain available.

Admin shows measured job stages, failures, source/draft/approval pointers and timing under current database super-admin authorization. Progress is not simulated.

## Maintainability and limits

See [architecture](docs/ARCHITECTURE.md), [setup](docs/DEVELOPMENT.md) and [cleanup](docs/CODE_CLEANUP.md). Valarian informed feature organization and was not modified.

Automatic double-face-to-centerline inference, raster/PDF/DWG geometry, arbitrary layers, multistorey classification, stairs/lifts, BIM, structural/MEP analysis and AI coordinate guessing are outside scope. Deployment, full historical-schema initial migration, hardware FPS targets and broad penetration/load testing are unverified. Genuine architectural acceptance remains blocked; authored data is synthetic.
