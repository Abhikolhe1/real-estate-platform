# Code cleanup record

The user authorized removal and production-oriented organization using `C:/Projects/Valarian-codebase` as a reference. That reference was read only. Existing development source, imported GLB behavior, furniture workflows and advanced walkthrough features were preserved.

| Previous location/behavior | Maintained location/behavior |
| --- | --- |
| Eighteen large Next page components | Feature views in `src/sections`, thin route exports; exact mapping in `evidence/canonical/view-organization.json` |
| Inventory transport plus database logic in one controller | Thin `InventoryController` and injectable `InventoryService` |
| Canonical providers mixed into root module | `CanonicalTwinModule` feature boundary |
| Repeated database configuration/implicit schema sync | Shared entity registry/environment/migration options; synchronization disabled |
| Old Python parse/OCR/style/PDF modules at service root | Explicit optional `legacy` package |
| Simulated Builder generator at primary route | Preserved `sections/legacy-floorplan` and opt-in `/demo/floorplans`; primary route opens Validation Studio |
| Large Web viewer mixing public dispatch and legacy implementation | Small stable dispatcher and `components/legacy/LegacyBuildingViewer.tsx` |
| Competing unused API `utils/dxf-parser.ts` | Removed; bounded Python pipeline owns canonical geometry |
| Old global validation store/geometry helper | Moved inside legacy feature; canonical store queues commands against server revisions |
| Tracked bytecode/incremental caches | Nine generated files removed and ignored |
| Ignored root dependency lock | Root `package-lock.json` retained for reproducible workspace installs |
| One-time restructuring scripts and duplicate baseline test copies | Removed after organization; maintained build/test/fixture tools remain |
| README describing obsolete directories | Accurate monorepo guide and development/architecture documentation |

Local scratch experiments, existing audit evidence and user files were preserved. No bulk deletion, Git reset, branch rewrite, framework replacement or deployment occurred during cleanup. Optional demonstrations remain isolated rather than being confused with canonical reconstruction. Unrelated product features were retained; this is not a claim that every historical feature has been refactored.

## Shared-package cleanup

The two packages remain because application imports use both. The follow-up cleanup moved the twin runtime/declarations into `packages/twin-schema/src` and the generated contract into `schema`; the Python exporter and package entry points follow those paths. Application imports remain `@aether/twin-schema` and `@aether/ui`. `PremiumButton.tsx` and its props/styles were preserved.

The root now pins Ajv 6.12.6 for development tooling, matching the shared validator and repairing an existing invalid peer dependency. npm deduplicated that validator to the root; the empty package dependency folder was removed. Other tool versions retain their own npm-managed placement. The root lockfile remains required for reproducible installation.

Five unreferenced historical files (`verify_render.js`, `verify_render.ts`, `verify_web_render.js`, `generate_test_dxf.py` and `test_tower_10_floors.dxf`) moved unchanged into `tools/legacy`. Current checks remain in `tools/canonical` and `tools/3d`. Workspace editor settings hide generated dependencies, build output and Python caches; they do not hide application source. Package READMEs explain roles, exports and maintenance.

No account, tenant, website content, project, inventory, authentication or database behavior was removed in this follow-up. Verification results are recorded in `evidence/package-cleanup/checks.json`.
