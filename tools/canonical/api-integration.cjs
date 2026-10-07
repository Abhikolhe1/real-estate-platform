require("reflect-metadata");
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  { randomUUID } = require("crypto");
require("dotenv").config({ path: ["apps/api/.env", ".env"], quiet: true });
const { DataSource } = require("typeorm"),
  { NestFactory } = require("@nestjs/core"),
  { Module, ValidationPipe } = require("@nestjs/common"),
  { TypeOrmModule } = require("@nestjs/typeorm"),
  { JwtModule, JwtService } = require("@nestjs/jwt");
const base = path.resolve(".cache/canonical-api"),
  load = (p) => require(path.join(base, p));
const entities = fs
  .readdirSync(`${base}/entities`)
  .filter((p) => p.endsWith(".entity.js"))
  .flatMap((p) =>
    Object.values(load(`entities/${p}`)).filter((v) => typeof v === "function"),
  );
const { FloorPlan } = load("entities/floorplan.entity"),
  { Project } = load("entities/project.entity"),
  { User } = load("entities/user.entity"),
  { Builder } = load("entities/builder.entity");
const { Tower } = load("entities/tower.entity"),
  { Floor } = load("entities/floor.entity"),
  { Flat } = load("entities/flat.entity"),
  { GeneratedStructure } = load("entities/generated-structure.entity");
const { InventoryController } = load("controllers/inventory.controller"),
  { InventoryService } = load("services/inventory.service");
const { TwinSourceAsset, TwinRevision, TwinReconstructionJob } = load(
  "entities/canonical-twin.entity",
);
const { CanonicalTwinService } = load("services/canonical-twin.service"),
  { CanonicalTwinController, CanonicalAdminController } = load(
    "controllers/canonical-twin.controller",
  );
const { TwinAccessGuard, TwinAdminGuard } = load("guards/twin-access.guard"),
  { JwtAuthGuard } = load("guards/auth.guard");
const { FloorPlanController } = load("controllers/floorplan.controller"),
  { ProjectsController } = load("controllers/projects.controller"),
  { AuthController } = load("controllers/auth.controller");
const { ProjectsService } = load("services/projects.service"),
  { BillingService } = load("services/billing.service"),
  { AuthService } = load("services/auth.service"),
  { TenantInterceptor } = load("interceptors/tenant.interceptor");
const { CanonicalTwins1791324000000 } = load(
  "migrations/1791324000000-CanonicalTwins",
);
const schema = `canonical_test_${Date.now()}`,
  secret = "canonical-integration-test-secret";
const options = {
  type: "postgres",
  url: process.env.CANONICAL_TEST_DATABASE_URL || process.env.DATABASE_URL,
  entities,
  synchronize: false,
  logging: false,
  schema,
  connectTimeoutMS: 5000,
  extra: {
    connectionTimeoutMillis: 5000,
    options: `-c search_path=${schema},public`,
  },
};
if (!options.url)
  throw new Error(
    "Configure CANONICAL_TEST_DATABASE_URL or DATABASE_URL for local integration tests",
  );
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(options.url).hostname))
  throw new Error("Integration tests require a local PostgreSQL server");
process.env.CAD_SERVICE_TOKEN = "canonical-local-test-token";
process.env.AI_SERVICE_URL = "http://127.0.0.1:8105";
process.env.CAD_WORKER_ENABLED = "false";
const db = new DataSource(options),
  results = [];
let app;
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, result: "PASS" });
  } catch (e) {
    results.push({ name, result: "FAILED", reason: String(e.message || e) });
  }
}
(async () => {
  await db.initialize();
  await db.query(`CREATE SCHEMA "${schema}"`);
  // Only this uniquely named test schema receives baseline tables. Existing application tables are never altered.
  for (const meta of db.entityMetadatas.filter((m) =>
    [
      FloorPlan,
      Project,
      User,
      Builder,
      Tower,
      Floor,
      Flat,
      GeneratedStructure,
    ].includes(m.target),
  )) {
    const columns = meta.columns
      .filter(
        (c) =>
          !c.propertyName.includes("Canonical") &&
          !c.propertyName.startsWith("canonical"),
      )
      .map((c) => {
        const type = db.driver.normalizeType(c),
          sqlType =
            type === "character varying" || type === "varchar"
              ? `varchar(${c.length || 255})`
              : type === "numeric"
                ? `numeric(${c.precision || 10},${c.scale || 2})`
                : type;
        const def = c.isPrimary
          ? " PRIMARY KEY DEFAULT gen_random_uuid()"
          : c.isNullable
            ? ""
            : ` NOT NULL${c.default !== undefined ? " DEFAULT " + db.driver.normalizeDefault(c) : c.isCreateDate || c.isUpdateDate ? " DEFAULT now()" : ""}`;
        return `"${c.databaseName}" ${sqlType}${def}`;
      });
    await db.query(
      `CREATE TABLE "${schema}"."${meta.tableName}" (${columns.join(",")})`,
    );
  }
  await test("Canonical migration applies to an isolated legacy schema", async () => {
    await new CanonicalTwins1791324000000().up(db.createQueryRunner());
    const rows = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema=$1",
      [schema],
    );
    assert(rows.some((r) => r.table_name === "twin_revisions"));
  });
  const tenant = randomUUID(),
    otherTenant = randomUUID(),
    project = randomUUID(),
    floorplan = randomUUID(),
    actor = randomUUID(),
    otherActor = randomUUID(),
    sales = randomUUID(),
    admin = randomUUID();
  await db.getRepository(Builder).insert([
    { id: tenant, name: "Canonical tests", slug: tenant },
    { id: otherTenant, name: "Foreign", slug: otherTenant },
  ]);
  await db.getRepository(Project).insert({
    id: project,
    tenantId: tenant,
    name: "Single-floor test",
    slug: project,
  });
  await db.getRepository(FloorPlan).insert({
    id: floorplan,
    tenantId: tenant,
    projectId: project,
    name: "Ground floor",
  });
  await db.getRepository(User).insert([
    {
      id: actor,
      tenantId: tenant,
      email: `${actor}@test.invalid`,
      passwordHash: "test-only",
      role: "BUILDER_ADMIN",
      isActive: true,
    },
    {
      id: otherActor,
      tenantId: otherTenant,
      email: `${otherActor}@test.invalid`,
      passwordHash: "test-only",
      role: "BUILDER_ADMIN",
      isActive: true,
    },
    {
      id: sales,
      tenantId: tenant,
      email: `${sales}@test.invalid`,
      passwordHash: "test-only",
      role: "SALES_USER",
      isActive: true,
    },
    {
      id: admin,
      email: `${admin}@test.invalid`,
      passwordHash: "test-only",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  ]);
  class TestModule {}
  Module({
    imports: [
      TypeOrmModule.forRoot({ ...options, name: "default" }),
      TypeOrmModule.forFeature(entities),
      JwtModule.register({ secret }),
    ],
    controllers: [
      CanonicalTwinController,
      CanonicalAdminController,
      FloorPlanController,
      ProjectsController,
      AuthController,
      InventoryController,
    ],
    providers: [
      CanonicalTwinService,
      TwinAccessGuard,
      TwinAdminGuard,
      JwtAuthGuard,
      ProjectsService,
      BillingService,
      AuthService,
      InventoryService,
    ],
  })(TestModule);
  app = await NestFactory.create(TestModule, { logger: false });
  app.enableCors({
    origin: [
      "http://localhost:3191",
      "http://localhost:3192",
      "http://localhost:3193",
    ],
    credentials: true,
  });
  app.useGlobalInterceptors(new TenantInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3195, "127.0.0.1");
  const jwt = app.get(JwtService),
    token = jwt.sign({ sub: actor, tenantId: tenant, role: "BUILDER_ADMIN" }),
    other = jwt.sign({
      sub: otherActor,
      tenantId: otherTenant,
      role: "BUILDER_ADMIN",
    }),
    salesToken = jwt.sign({ sub: sales, tenantId: tenant, role: "SALES_USER" }),
    adminToken = jwt.sign({ sub: admin, role: "SUPER_ADMIN" });
  const route = `/canonical/projects/${project}/floorplans/${floorplan}`,
    scope = { tenantId: tenant, projectId: project, floorplanId: floorplan },
    service = app.get(CanonicalTwinService);
  async function req(url, body, auth = token, headers = {}) {
    const res = await fetch(`http://127.0.0.1:3195${url}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  }
  async function expect(code, url, body, auth = token, headers = {}) {
    const r = await req(url, body, auth, headers);
    assert.equal(r.status, code, JSON.stringify(r.data));
    return r.data;
  }
  await test("Anonymous source/status access denied", () =>
    expect(401, route, undefined, null));
  await test("Spoofed tenant header denied", () =>
    expect(403, route, undefined, token, { "x-tenant-id": otherTenant }));
  await test("Foreign authenticated tenant denied before upload", async () => {
    const f = new FormData();
    f.append("plan", new Blob(["bad"]), "x.dxf");
    await expect(403, route + "/source", f, other);
  });
  await test("Sales role cannot approve or change geometry", () =>
    expect(
      403,
      route + "/approve",
      { baseRevisionId: randomUUID() },
      salesToken,
    ));
  await test("Inactive membership cannot use a valid JWT", async () => {
    await db.getRepository(User).update(actor, { isActive: false });
    try {
      await expect(403, route);
    } finally {
      await db.getRepository(User).update(actor, { isActive: true });
    }
  });
  await test("Administrative status is restricted to server-side super admins", async () => {
    await expect(403, "/canonical-admin/status");
    await expect(200, "/canonical-admin/status", undefined, adminToken);
  });
  await test("Unknown DTO fields and path traversal rejected", async () => {
    await expect(400, route + "/approve", {
      baseRevisionId: randomUUID(),
      tenantId: otherTenant,
    });
    await expect(404, route + "/sources/not-a-uuid");
  });
  await test("Production floorplan creation cannot assign source, approval or fabricated geometry", async () => {
    await expect(400, "/floorplans", {
      name: "bad",
      projectId: project,
      approvedCanonicalRevisionId: randomUUID(),
    });
    await expect(404, "/floorplans", { name: "bad", projectId: randomUUID() });
    const created = await expect(201, "/floorplans", {
      name: "Empty real floorplan",
      projectId: project,
    });
    assert.equal(created.floorPlan.layoutData, null);
    assert(!created.floorPlan.approvedCanonicalRevisionId);
  });
  let upload, draft, approved;
  await test("DXF source persists privately and reconstruction queues", async () => {
    const f = new FormData();
    f.append(
      "plan",
      new Blob([
        fs.readFileSync("tools/canonical/fixtures/partitioned-concave.dxf"),
      ]),
      "single-floor.dxf",
    );
    upload = await expect(201, route + "/source", f);
    assert.equal(upload.stage, "queued");
    const s = await service.source(scope, upload.assetId);
    assert.equal(s.byteLength, s.bytes.length);
    assert.equal(s.sha256, upload.sha256);
  });
  await test("Concurrent duplicate jobs are rejected", async () => {
    const f = new FormData();
    f.append(
      "plan",
      new Blob([
        fs.readFileSync("tools/canonical/fixtures/partitioned-concave.dxf"),
      ]),
      "single-floor.dxf",
    );
    await expect(409, route + "/source", f);
  });
  await test("Claimed job stores canonical immutable draft and measured stages", async () => {
    await service.runNext();
    const s = await service.status(scope);
    const job = s.jobs.find((j) => j.id === upload.jobId);
    assert.equal(job.stage, "review_required", JSON.stringify(job.failure));
    draft = await service.revision(scope, s.draftRevisionId);
    assert.equal(draft.canonical.rooms.length, 2);
    assert.equal(draft.sourceSha256, upload.sha256);
    assert(job.timings.totalMs > 0);
  });
  await test("Source and revision SQL updates/deletes are blocked", async () => {
    for (const [table, id] of [
      ["twin_source_assets", upload.assetId],
      ["twin_revisions", draft.id],
    ]) {
      await assert.rejects(
        db.query(`UPDATE ${table} SET "createdBy"=$1 WHERE id=$2`, [actor, id]),
        /immutable/,
      );
      await assert.rejects(
        db.query(`DELETE FROM ${table} WHERE id=$1`, [id]),
        /immutable/,
      );
    }
  });
  await test("Unreviewed inferred dimensions cannot be approved", () =>
    expect(400, route + "/approve", { baseRevisionId: draft.id }));
  await test("Database rejects draft approval pointers and cross-scope sources", async () => {
    await assert.rejects(
      db.query(
        'UPDATE floorplans SET "approvedCanonicalRevisionId"=$1 WHERE id=$2',
        [draft.id, floorplan],
      ),
      /approved revision/,
    );
    const foreignFp = randomUUID();
    await db.getRepository(FloorPlan).insert({
      id: foreignFp,
      tenantId: otherTenant,
      projectId: project,
      name: "foreign",
    });
    await assert.rejects(
      db.query(
        'UPDATE floorplans SET "canonicalSourceAssetId"=$1 WHERE id=$2',
        [upload.assetId, foreignFp],
      ),
      /foreign key/,
    );
  });
  await test("Corrections save history and survive a fresh DB connection", async () => {
    const r = await expect(201, route + "/corrections", {
      baseRevisionId: draft.id,
      commands: [
        {
          type: "RenameRoom",
          targetId: draft.canonical.rooms[0].id,
          value: "Reviewed Living",
          reason: "Source name reviewed",
        },
        {
          type: "AcceptDefaults",
          reason: "Independent synthetic dimensions checked",
        },
        {
          type: "ConfirmCalibration",
          reason: "Known 8 metre dimension checked",
        },
      ],
    });
    assert.notEqual(r.id, draft.id);
    draft = r;
    const fresh = new DataSource(options);
    try {
      await fresh.initialize();
      const saved = await fresh
        .getRepository(TwinRevision)
        .findOneByOrFail({ id: draft.id });
      assert.equal(saved.corrections.length, 3);
      assert.equal(saved.canonical.rooms[0].name, "Reviewed Living");
    } finally {
      if (fresh.isInitialized) await fresh.destroy();
    }
  });
  await test("Approval atomically moves explicit immutable pointer", async () => {
    approved = await expect(201, route + "/approve", {
      baseRevisionId: draft.id,
    });
    const active = await expect(200, route + "/approved");
    assert.equal(active.id, approved.id);
    assert.equal(active.canonical.revision.state, "approved");
  });
  await test("Inventory returns the exact approved revision and canonical floor height", async () => {
    const created = await expect(201, "/inventory/towers", {
      name: "Canonical tower",
      projectId: project,
    });
    const towerId = created.tower.id;
    await expect(201, "/inventory/floors", {
      towerId,
      floorNumber: 1,
      floorplanId: floorplan,
      floorHeight: 9,
    });
    const rows = await expect(200, `/inventory/towers/${towerId}/floors`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].canonicalRevisionId, approved.id);
    assert.deepEqual(rows[0].canonicalTwin, approved.canonical);
    assert.equal(rows[0].floorHeight, approved.canonical.floors[0].heightM);
    assert.equal(rows[0].structureJson, null);
    await expect(401, `/inventory/towers/${towerId}/floors`, undefined, null);
    await expect(404, `/inventory/towers/${towerId}/floors`, undefined, other);
  });
  await test("Inventory blocks cross-project source links and unbounded unit seeding", async () => {
    const p = randomUUID(),
      fp = randomUUID();
    await db
      .getRepository(Project)
      .insert({ id: p, tenantId: tenant, name: "Other project", slug: p });
    await db.getRepository(FloorPlan).insert({
      id: fp,
      tenantId: tenant,
      projectId: p,
      name: "Other floorplan",
    });
    const t = await expect(201, "/inventory/towers", {
      name: "Other tower",
      projectId: project,
    });
    await expect(404, "/inventory/floors", {
      towerId: t.tower.id,
      floorNumber: 1,
      floorplanId: fp,
    });
    await expect(400, "/inventory/floors", {
      towerId: t.tower.id,
      floorNumber: 1,
      flatsCount: 100000,
    });
  });
  await test("Stale corrections and stale approval cannot overwrite pointer", async () => {
    await expect(409, route + "/approve", { baseRevisionId: draft.id });
    await expect(409, route + "/corrections", {
      baseRevisionId: draft.id,
      commands: [
        {
          type: "RenameRoom",
          targetId: draft.canonical.rooms[0].id,
          value: "Stale",
          reason: "stale",
        },
      ],
    });
    assert.equal((await service.approved(scope)).id, approved.id);
  });
  await test("Reprocess transfers exact intent and keeps previous approval", async () => {
    const j = await expect(201, route + "/reprocess", {
      baseRevisionId: approved.id,
      config: {},
    });
    await service.runNext();
    const s = await service.status(scope);
    draft = await service.revision(scope, s.draftRevisionId);
    assert.equal(draft.canonical.rooms[0].name, "Reviewed Living");
    assert.equal(s.approvedRevisionId, approved.id);
    assert.notEqual(s.draftRevisionId, approved.id);
  });
  await test("Changed calibration/configuration emits explicit rebase conflicts", async () => {
    await expect(201, route + "/reprocess", {
      baseRevisionId: draft.id,
      config: { wallThicknessM: 0.2 },
    });
    await service.runNext();
    const s = await service.status(scope);
    draft = await service.revision(scope, s.draftRevisionId);
    assert(
      draft.canonical.issues.some(
        (i) => i.code === "REPROCESS_CONFLICT" && !i.resolved,
      ),
    );
    assert.equal((await service.approved(scope)).id, approved.id);
  });
  await test("Failed worker job cannot change approval", async () => {
    const f = new FormData();
    f.append(
      "plan",
      new Blob(["0\nSECTION\n2\nENTITIES\n0\nnot-a-real-entity\n0\nEOF\n"]),
      "bad.dxf",
    );
    const j = await expect(201, route + "/source", f);
    await service.runNext();
    const s = await service.status(scope);
    assert.equal(s.jobs.find((x) => x.id === j.jobId).stage, "failed");
    assert.equal(s.approvedRevisionId, approved.id);
  });
  await test("Cancellation is durable and does not publish a queued job", async () => {
    const f = new FormData();
    f.append(
      "plan",
      new Blob([
        fs.readFileSync("tools/canonical/fixtures/partitioned-concave.dxf"),
      ]),
      "queued.dxf",
    );
    const j = await expect(201, route + "/source", f);
    await expect(201, route + `/jobs/${j.jobId}/cancel`, {});
    await service.runNext();
    assert.equal(
      (await service.status(scope)).jobs.find((x) => x.id === j.jobId).stage,
      "cancelled",
    );
  });
  fs.mkdirSync("evidence/canonical", { recursive: true });
  fs.writeFileSync(
    "evidence/canonical/api-integration.json",
    JSON.stringify({ schema, results }, null, 2),
  );
  console.log(results);
  if (
    process.env.CANONICAL_KEEP_TEST_SERVER === "true" &&
    results.every((r) => r.result === "PASS")
  ) {
    process.env.CAD_WORKER_ENABLED = "true";
    service.onModuleInit();
    // Test-only session data stays in ignored cache, never evidence or git.
    fs.writeFileSync(
      ".cache/canonical-api-session.json",
      JSON.stringify({
        token,
        adminToken,
        tenantId: tenant,
        projectId: project,
        floorplanId: floorplan,
        approvedRevisionId: approved?.id,
      }),
    );
    console.log("Isolated canonical test API ready on 3195");
    return;
  }
  await app.close();
  await db.query(`DROP SCHEMA "${schema}" CASCADE`);
  await db.destroy();
  if (results.some((r) => r.result !== "PASS")) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e.message);
  if (app) await app.close();
  if (db.isInitialized) {
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.destroy();
  }
  process.exitCode = 1;
});
