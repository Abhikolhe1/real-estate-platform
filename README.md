# Aether real estate platform

One codebase for the main platform Admin, each builder's dashboard, their public websites and the common backend. Builder accounts, projects and website content are tenant data; creating a website does not require duplicating these source folders. The Python service supports DXF validation and interactive property viewing.

| Directory | Responsibility |
| --- | --- |
| `apps/api` | NestJS API, tenant authorization, PostgreSQL inventory and immutable canonical revisions |
| `apps/ai-service` | Private deterministic DXF worker; optional legacy demonstrations |
| `apps/builder` | Next.js Builder portal and Validation Studio |
| `apps/admin` | Next.js administration and reconstruction monitoring |
| `apps/web` | Next.js public website and existing Three.js property viewer |
| `packages/twin-schema` | Shared canonical JSON Schema, TypeScript types and boundary validation |
| `packages/ui` | Shared UI components |
| `tools/canonical` | Reproducible geometry, API, browser and build checks |
| `evidence/canonical` | Recorded Phase 2 results and screenshots |

`packages/ui` contains shared React components. `packages/twin-schema` contains the shared digital-twin contract used by the API, Builder editor and viewer. Both libraries are actively used. See the [application and package guide](packages/README.md) for the folder layout and an explanation of generated dependencies.

Start with [development setup](docs/DEVELOPMENT.md) and [architecture](docs/ARCHITECTURE.md). Large portal views live in `src/sections`; App Router pages select views. API controllers call services. Canonical reconstruction has one Python geometry pipeline and one approved JSON contract across the portals.

The supported workflow is layered single-floor ASCII DXF -> immutable source -> metric canonical draft -> reviewed correction revision -> explicit approval -> existing viewer Runtime/Surface. Generated test drawings demonstrate exact synthetic geometry. Genuine architectural acceptance remains **BLOCKED** until a supported licensed drawing has independent annotations.

## Verification

```sh
npm ci
npm run test:canonical
npm run build:verify
```

Python setup and database/browser prerequisites are in [DEVELOPMENT.md](docs/DEVELOPMENT.md). `test:canonical:api` requires local PostgreSQL and the private worker. `test:canonical:browser` requires the isolated integration API and the three built portals.

## Phase 2 records

- [Implementation](CANONICAL_DXF_IMPLEMENTATION.md)
- [Executed tests and regressions](CANONICAL_DXF_TEST_REPORT.md)
- [Automatic and reviewed accuracy](CANONICAL_DXF_ACCURACY_REPORT.md)
- [Authorization and resource limits](CANONICAL_DXF_SECURITY_REPORT.md)
- [Cleanup scope](docs/CODE_CLEANUP.md)

Historical roadmap documents remain in `docs/MD`; their planned features are not evidence of implemented behavior. No deployment was performed.
