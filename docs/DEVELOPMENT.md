# Development and verification

## Setup

Use Node.js 22 and Python 3.12 or later. The verified environment used Node 22.23.2, Python 3.12, local PostgreSQL and Chromium 153. Run npm commands from the repository root so workspace packages resolve.

```powershell
npm ci
python -m venv apps/ai-service/.venv
& apps/ai-service/.venv/Scripts/python.exe -m pip install -r apps/ai-service/requirements.txt
Copy-Item .env.example .env
```

Copy the example only when no local `.env` exists. Preserve existing secrets. Set `DATABASE_URL`, `JWT_SECRET` and one randomly generated private `CAD_SERVICE_TOKEN` shared by API and CAD worker. Use at least 32 random bytes for credentials. Configure `AI_SERVICE_URL` to the private worker, `CORS_ORIGINS` to the deployed portal origins, and each Next application's `NEXT_PUBLIC_API_URL` before building. Builder uses `NEXT_PUBLIC_VIEWER_URL` for the approved viewer link. Existing process values take precedence; API-local `.env` takes precedence over root `.env`.

Defaults: API 3001, Web 3000, Admin 3002, Builder 3003, worker 8000 on loopback. Never expose the worker token through a `NEXT_PUBLIC_*` variable. Upload source CAD stays in private PostgreSQL bytes, separate from public image/model uploads.

## Database

The canonical migration upgrades the existing legacy schema, including `projects`, `floorplans` and `users`. The verified local development database already had those tables; the canonical migration has been applied to its `public` schema. It does not fabricate inventory or rewrite user rows.

```powershell
npm run migration:run --workspace=apps/api
```

`synchronize` is disabled. **A fresh empty database requires a separately managed legacy baseline; the repository does not yet include a complete initial migration for every historical entity.** Do not enable synchronization as a deployment workaround. Back up and inspect the migration before deployment. Immutable records intentionally restrict deletion; ordinary project/floorplan deletion must not silently erase architectural history.

## Run

```powershell
npm run dev:api
npm run dev:ai
npm run dev:web
npm run dev:builder
npm run dev:admin
```

The worker launcher chooses the Python virtual environment and passes only service settings and OS runtime variables. Each reconstruction child receives OS runtime variables, not database/JWT/provider/service credentials.

Sign in to Builder with active builder membership. Open Validation Studio, choose/create a project floorplan identity, upload a supported DXF, inspect units/source overlay/issues, queue corrections, save, validate and approve. Open the approved viewer and sign in separately. The viewer fetches the explicit approved revision with authenticated API requests; its link contains project/floorplan IDs, never a token. Super admins see job status under CAD Processing.

## Core and production builds

```powershell
npm run test:canonical
npm run build:verify
```

Core checks run Python geometry/corrections, regenerate canonical fixture outputs from frozen synthetic DXF bytes, measure independent synthetic accuracy, validate the schema and test scene/collision behavior. Builds are isolated under `.cache/canonical-build` and `.cache/canonical-api-build` so existing IDE/server output is not overwritten.

## Isolated integration and browser checks

Start a test worker on 8105 with a test-only token:

```powershell
$env:CAD_SERVICE_TOKEN='canonical-local-test-token'
& apps/ai-service/.venv/Scripts/python.exe -B -m uvicorn main:app --app-dir apps/ai-service --host 127.0.0.1 --port 8105
```

In another terminal, provide local `CANONICAL_TEST_DATABASE_URL` (or use configured local `DATABASE_URL`):

```powershell
npm run test:canonical:api
```

The harness refuses remote databases, creates a uniquely named test schema and drops it when finished. To retain its API for browser checks:

```powershell
$env:CANONICAL_KEEP_TEST_SERVER='true'
npm run test:canonical:api
```

Test JWTs remain only in ignored `.cache/canonical-api-session.json`. Serve the isolated production builds with the root Next CLI on Web 3191, Builder 3192 and Admin 3193. Their verification build embeds API 3195. Install Playwright Chromium if necessary, then run `npm run test:canonical:browser`. The canonical suite uses actual worker, API and PostgreSQL persistence. Historical imported/legacy regressions use controlled API fixtures.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/browsers"
npx playwright install chromium
$env:BASE_URL='http://localhost:3191'
$env:EVIDENCE_DIR='evidence/canonical/after'
node tools/3d/core-tests.mjs
node tools/3d/browser-tests.cjs
node tools/3d/legacy-tests.cjs
```

`tools/canonical/worker-tests.py` requires the test worker on 8105. `app-smoke.cjs` verifies the actual compiled AppModule against the local configured database without writing user data. Tests assume the reserved ports are available. Stop retained servers and remove their uniquely named test schemas after interactive verification; never drop `public` or another application's schema.

## Optional demonstrations

Production reconstruction needs only `requirements.txt`. The separate `requirements-legacy-demo.txt` enables historical OCR/PDF/style experiments. That optional installation and external model/service availability are **UNVERIFIED**. Keep both legacy demo flags false in production. Use authored fixtures only as synthetic evidence.

## Formatting

Python uses pinned [Black 25.1.0](https://pypi.org/project/black/25.1.0/) in `requirements-dev.txt` and `pyproject.toml`; install development requirements when formatting. TypeScript/JavaScript use the workspace Prettier. Formatting retained identical Python ASTs, recorded in `evidence/canonical/format-verification.json`. Production reconstruction does not need the formatter.
