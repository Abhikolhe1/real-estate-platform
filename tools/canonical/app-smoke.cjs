require("reflect-metadata");
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict");
require("dotenv").config({ path: ["apps/api/.env", ".env"], quiet: true });
process.env.CAD_WORKER_ENABLED = "false";
const { NestFactory } = require("@nestjs/core"),
  { JwtService } = require("@nestjs/jwt"),
  { ValidationPipe } = require("@nestjs/common");
const {
  AppModule,
} = require("../../.cache/canonical-api-build/dist/app.module");
(async () => {
  let app;
  const results = [];
  try {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(3196, "127.0.0.1");
    const token = app
      .get(JwtService)
      .sign({
        sub: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
        role: "BUILDER_ADMIN",
      });
    for (const [name, url, code, bearer] of [
      [
        "Actual production module starts and reports health",
        "/api/health",
        200,
        null,
      ],
      [
        "Actual production module rejects anonymous canonical access",
        "/canonical/projects/00000000-0000-4000-8000-000000000003/floorplans/00000000-0000-4000-8000-000000000004",
        401,
        null,
      ],
      [
        "Actual production module verifies membership from the database",
        "/floorplans",
        403,
        token,
      ],
      [
        "Actual production admin monitor rejects anonymous users",
        "/canonical-admin/status",
        401,
        null,
      ],
    ]) {
      const res = await fetch("http://127.0.0.1:3196" + url, {
        headers: bearer ? { Authorization: "Bearer " + bearer } : {},
      });
      assert.equal(res.status, code, name);
      results.push({ name, result: "PASS" });
    }
    fs.writeFileSync(
      "evidence/canonical/app-smoke.json",
      JSON.stringify(results, null, 2),
    );
    console.log(results);
  } finally {
    if (app) await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
