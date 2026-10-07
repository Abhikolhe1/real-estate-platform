# Canonical DXF security and bounds

Date: 2026-10-07. **PASS:** executed canonical authorization, scope, immutability and bounded worker checks. **PARTIAL:** not a platform-wide penetration test or load certification.

## Authority and persistence

JWT establishes identity; a current database user must be active, belong to the claimed tenant and have an allowed server-side role. Headers cannot grant membership. Builder admin/staff may mutate canonical geometry; sales users may not. Guards check project/floorplan ownership before Multer buffers uploads; services recheck it. Sources, revisions and approved data require scoped access. Admin status requires current database `SUPER_ADMIN` role.

Private DXF uses database bytea, with SHA-256 checked before reads/processing. Downloads are scoped and `private, no-store`; bytes never enter public `/uploads`. Filenames are sanitized metadata, not filesystem paths. Workers accept JSON bytes, not caller paths/URLs, and do not follow XREFs. API calls authenticate with a private service token. Worker children receive OS runtime variables, not database/JWT/provider/service credentials.

DTOs forbid unknown fields. Floorplan creation cannot mass-assign source/approval pointers or fabricated geometry. Legacy digital-twin mutations use allowlists; simulated geometry endpoints are protected opt-in demos. Inventory mutations require active membership and owned parents; canonical consumption checks tenant/project links. Public registration cannot join an existing tenant through a header. Historical public marketing/CRM reads are outside this security certification.

SQL triggers reject source/revision UPDATE and DELETE. Composite tenant/project/floorplan foreign keys constrain source, base and pointers. Approved-pointer triggers reject drafts/foreign revisions. Sorted-key hashes detect corruption independently of JSONB ordering. Corrections/approval use base checks and transactions. Source/reprocessing failure and cancellation do not overwrite previous approval.

## Configured limits

| Boundary | Limit / behavior |
| --- | --- |
| Authenticated upload | One nonempty ASCII DXF, maximum 10 MiB |
| Worker input/output | Streaming 32 MiB JSON input and 32 MiB output caps |
| Expansion | 20,000 entities including expanded blocks |
| Path flattening | 100,000 accumulated points |
| Blocks | Depth 16; cycles rejected; XREF/array/clipping unsupported |
| Coordinates | Finite values, bounded magnitude |
| Child runtime | 30 second deadline; kill on timeout or cancelled worker task |
| Child memory | 768 MiB Linux address limit / Windows Job Object process limit |
| Worker concurrency | Two slots; one second capacity wait then 429 |
| API queue | One active job per floorplan; maximum eight per tenant |
| Job claiming | Transactional SKIP LOCKED claims and expiry handling |
| Corrections | Bounded DTO/request; allowlisted operations with reasons |
| API worker call | Bounded timeout; failures persisted |
| Inventory seeding | Maximum 200 flats per requested floor; cross-project source rejection |

Configured CORS origins, configured JWT secret and disabled schema synchronization replace permissive boot defaults. Secrets and test JWTs stay ignored. Public image/model uploads retain historical behavior and are not CAD storage.

## Executed evidence

[API integration](evidence/canonical/api-integration.json): anonymous/header-spoof/cross-tenant/sales/inactive/admin rejection; unknown fields/path rejection; restricted production floorplan fields; queue conflicts; immutable SQL triggers; cross-scope foreign keys; draft-pointer rejection; history surviving fresh DB connection; stale writes; exact inventory revision/height; cross-project links; bounded unit seeding; failed-job approval preservation; durable cancellation.

[Worker HTTP](evidence/canonical/worker-tests.json): service identity, path injection fields, unsupported operation, malformed DXF, actual separate-process reconstruction under its memory limit, correction and validation. [Python tests](evidence/canonical/python-tests.json): oversized/corrupt DXF, cyclic inserts, unsupported issues, unknown units, invalid reference/matrix/graph and forbidden corrections/mass assignment. [Actual AppModule smoke](evidence/canonical/app-smoke.json): real module boot, anonymous canonical/admin rejection, signed JWT without current database membership rejection.

Configured limits have enforcement and bounded functional tests. Exhaustive maximum-size hostile-input stress, memory-exhaustion kills, hard timeout/capacity saturation at production load, OS-level network isolation, retention/quota billing, malware scanning, secret rotation, token theft/XSS defenses, backup restoration and unrelated product endpoints remain **UNVERIFIED**. Focused checks are not a security certification.

## Deployment

Use a private worker interface, shared service credentials and OS-appropriate process isolation. Apply migrations to a backed-up compatible legacy schema, configure CORS/public API URLs and preserve history through controlled retention. Python performs no external retrieval, but network egress isolation remains a deployment responsibility. No remote deployment occurred.

An already-running durable job can be marked cancelled and its result will not be published. The current implementation does not immediately interrupt its remote in-flight reconstruction; the hard child deadline still applies. Queued cancellation is executed in the integration suite; running cancellation stress is UNVERIFIED.
