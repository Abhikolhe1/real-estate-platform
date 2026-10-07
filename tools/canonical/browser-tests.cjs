const { chromium } = require("playwright"),
  fs = require("fs"),
  assert = require("assert/strict"),
  crypto = require("crypto");
const session = JSON.parse(
    fs.readFileSync(".cache/canonical-api-session.json", "utf8"),
  ),
  api = "http://localhost:3195";
let activeBrowser;
const results = [],
  errors = [],
  metrics = [];
const headers = {
  Authorization: `Bearer ${session.token}`,
  "x-tenant-id": session.tenantId,
};
(async () => {
  const browser = (activeBrowser = await chromium.launch({
      headless: true,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    })),
    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ session }) => {
      if (location.port === "3192")
        sessionStorage.setItem(
          "aether-builder-auth",
          JSON.stringify({
            state: {
              token: session.token,
              user: {
                id: "test",
                email: "browser@test.invalid",
                role: "BUILDER_ADMIN",
                tenantId: session.tenantId,
              },
            },
            version: 0,
          }),
        );
      if (location.port === "3191")
        sessionStorage.setItem(
          "aether-viewer-session",
          JSON.stringify({ token: session.token, tenantId: session.tenantId }),
        );
      if (location.port === "3193")
        sessionStorage.setItem(
          "aether-admin-auth",
          JSON.stringify({
            state: {
              token: session.adminToken,
              user: {
                id: "test-admin",
                email: "admin@test.invalid",
                role: "SUPER_ADMIN",
              },
            },
            version: 0,
          }),
        );
    },
    { session },
  );
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, result: "PASS" });
    } catch (e) {
      results.push({ name, result: "FAILED", reason: String(e) });
      await page
        .screenshot({
          path: `evidence/canonical/browser-failure-${results.length}.png`,
          fullPage: true,
        })
        .catch(() => {});
    }
    console.log(results.at(-1));
  };
  let floorId, route, approved;
  await page.goto("http://localhost:3192/validation-studio", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await test("Production studio loads authenticated project/floor identity", async () => {
    await page
      .getByLabel("Project", { exact: true })
      .selectOption(session.projectId);
    await page
      .getByLabel("New floorplan name")
      .fill("Browser acceptance floor");
    await page
      .getByRole("button", { name: "Create floorplan", exact: true })
      .click();
    await page.waitForFunction(
      () => !!document.querySelector('select[aria-label="Floorplan"]')?.value,
    );
    floorId = await page.getByLabel("Floorplan", { exact: true }).inputValue();
    route = `/canonical/projects/${session.projectId}/floorplans/${floorId}`;
    assert(floorId);
  });
  await test("Upload persists source and real job reaches source-overlay review", async () => {
    await page
      .getByLabel("DXF file")
      .setInputFiles("tools/canonical/fixtures/partitioned-concave.dxf");
    await page.locator("[data-room-id]").first().waitFor({ timeout: 60000 });
    const status = await (await fetch(api + route, { headers })).json();
    assert(status.sourceAssetId && status.draftRevisionId);
    assert.equal(status.jobs[0].stage, "review_required");
    assert.equal(await page.locator("[data-room-id]").count(), 2);
  });
  await page.screenshot({
    path: "evidence/canonical/studio-source-overlay.png",
    fullPage: true,
  });
  await test("Source overlay has independent toggles, zoom and original handles", async () => {
    await page.getByLabel("source", { exact: true }).uncheck();
    await page.getByLabel("source", { exact: true }).check();
    const svg = page.getByRole("img", {
        name: "Source and canonical geometry",
      }),
      before = await svg.getAttribute("viewBox");
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.notEqual(await svg.getAttribute("viewBox"), before);
    await page
      .getByRole("button", { name: "Fit drawing", exact: true })
      .click();
    await page.locator("[data-room-id]").first().click();
    await page
      .getByText(/Handle /)
      .first()
      .waitFor();
  });
  await test("Rename queue, undo and save persist a new immutable revision", async () => {
    await page.getByLabel("Room name").fill("Browser reviewed room");
    await page
      .getByRole("button", { name: "Queue rename", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Undo queued edit", exact: true })
      .click();
    assert(
      await page
        .getByRole("button", { name: "Save corrections", exact: true })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "Queue rename", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save corrections", exact: true })
      .click();
    await page
      .getByText("Corrections saved as a new immutable revision.")
      .waitFor();
    const s = await (await fetch(api + route, { headers })).json(),
      r = await (
        await fetch(api + route + `/revisions/${s.draftRevisionId}`, {
          headers,
        })
      ).json();
    assert(r.canonical.rooms.some((r) => r.name === "Browser reviewed room"));
    assert(r.corrections.some((c) => c.command.type === "RenameRoom"));
  });
  await test("Boundary vertex drag queues geometry intent and undo leaves source intact", async () => {
    await page.locator("[data-room-id]").first().click();
    const vertex = page.getByLabel("Boundary vertex 1"),
      box = await vertex.boundingBox();
    assert(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 8,
      box.y + box.height / 2 + 5,
      { steps: 4 },
    );
    await page.mouse.up();
    assert(
      !(await page
        .getByRole("button", { name: "Save corrections", exact: true })
        .isDisabled()),
    );
    await page
      .getByRole("button", { name: "Undo queued edit", exact: true })
      .click();
  });
  await test("Explicit dimension/calibration review enables server validation and approval", async () => {
    await page
      .getByRole("button", { name: "Accept reviewed default dimensions" })
      .click();
    await page
      .getByText("Units, calibration and layer roles", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm checked calibration" })
      .click();
    await page
      .getByRole("button", { name: "Save corrections", exact: true })
      .click();
    await page
      .getByText("Corrections saved as a new immutable revision.")
      .waitFor();
    await page.waitForFunction(
      () => !document.querySelector("button")?.disabled,
    );
    await page
      .getByRole("button", { name: "Validate revision", exact: true })
      .click();
    await page
      .getByText("Validation passed; revision is ready for approval.")
      .waitFor();
    await page
      .getByRole("button", { name: "Approve revision", exact: true })
      .click();
    await page
      .getByText("Revision approved. The viewer now uses this exact revision.")
      .waitFor();
    approved = await (
      await fetch(api + route + "/approved", { headers })
    ).json();
    assert.equal(approved.canonical.revision.state, "approved");
  });
  await test("Immutable source download matches independently known file checksum", async () => {
    const res = await fetch(
        api + route + `/sources/${approved.sourceAssetId}`,
        { headers },
      ),
      bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      crypto
        .createHash("sha256")
        .update(
          fs.readFileSync("tools/canonical/fixtures/partitioned-concave.dxf"),
        )
        .digest("hex"),
    );
    assert.equal(res.headers.get("cache-control"), "private, no-store");
  });
  await test("Historical revisions remain visible while polling continues", async () => {
    const options = await page
      .getByLabel("Revision history")
      .locator("option")
      .all();
    assert(options.length > 3);
    const old = await options.at(-1).getAttribute("value");
    await page.getByLabel("Revision history").selectOption(old);
    await page.waitForTimeout(2500);
    assert.equal(await page.getByLabel("Revision history").inputValue(), old);
    await page.getByLabel("Revision history").selectOption(approved.id);
  });
  await page.screenshot({
    path: "evidence/canonical/studio-approved.png",
    fullPage: true,
  });
  await page.goto(
    `http://localhost:3191/twin?projectId=${session.projectId}&floorplanId=${floorId}`,
    { waitUntil: "domcontentloaded" },
  );
  const ready = () =>
    page.waitForFunction(
      () => {
        const s = document
          .querySelector("[data-testid=property-canvas]")
          ?.getViewerSnapshot?.();
        return s?.state.manifest && !s.state.loading;
      },
      undefined,
      { timeout: 60000 },
    );
  await ready();
  const snapshot = () =>
    page
      .locator("[data-testid=property-canvas]")
      .evaluate((el) => el.getViewerSnapshot());
  let initial = await snapshot(),
    renderer = initial.stats.rendererId;
  await test("Approved viewer fetches the explicit canonical revision and uses one canvas", async () => {
    assert.equal(initial.state.manifest.revisionId, approved.id);
    assert.equal(initial.state.manifest.sourceAssetId, approved.sourceAssetId);
    assert.equal(
      await page.locator("[data-testid=property-canvas] canvas").count(),
      1,
    );
    assert.equal(initial.state.manifest.floors.length, 1);
  });
  metrics.push({
    name: "canonical-exterior",
    ...initial.stats,
    loadMs: initial.state.loadMs,
  });
  await page.screenshot({
    path: "evidence/canonical/approved-exterior.png",
    fullPage: true,
  });
  await test("Canonical room selection and entry preserve renderer and eye height", async () => {
    const room = approved.canonical.rooms[0];
    await page
      .getByLabel("Floor", { exact: true })
      .selectOption(approved.canonical.floors[0].id);
    await page.getByLabel("Room", { exact: true }).selectOption(room.id);
    await page.getByRole("button", { name: "Enter room", exact: true }).click();
    await page.waitForTimeout(1200);
    const s = await snapshot();
    assert.equal(s.state.roomId, room.id);
    assert.equal(s.stats.rendererId, renderer);
    assert(Math.abs(s.camera[1] - 1.65) < 0.001);
  });
  await page.screenshot({
    path: "evidence/canonical/approved-interior.png",
    fullPage: true,
  });
  await test("Furniture stands on canonical floor and persists by immutable revision", async () => {
    await page
      .getByRole("button", { name: "Furnish room", exact: true })
      .click();
    await page.getByRole("button", { name: "Add sofa", exact: true }).click();
    let s = await snapshot();
    assert.equal(s.state.furniture.length, 1);
    assert(Math.abs(s.state.furniture[0].position[1]) < 1e-6);
    await page
      .getByRole("button", { name: "Save configuration", exact: true })
      .click();
    const saved = s.state.furniture;
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready();
    s = await snapshot();
    assert.deepEqual(s.state.furniture, saved);
  });
  await test("Canonical unload/reload releases resources and retains one renderer", async () => {
    await page.getByText("Load another asset", { exact: true }).click();
    const counts = [];
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole("button", { name: "Unload model", exact: true })
        .click();
      assert.equal((await snapshot()).meshCount, 0);
      await page
        .getByRole("button", { name: "Reload model", exact: true })
        .click();
      await ready();
      await page.waitForTimeout(200);
      const s = await snapshot();
      counts.push([s.stats.geometries, s.stats.textures, s.stats.programs]);
    }
    assert.deepEqual(counts[2], counts[1]);
    metrics.push({ name: "canonical-reload", counts });
  });
  await page.goto("http://localhost:3193/cad-processing", {
    waitUntil: "domcontentloaded",
  });
  await test("Super-admin sees measured reconstruction stages and approval status", async () => {
    await page
      .getByText(floorId, { exact: true })
      .first()
      .waitFor({ timeout: 15000 });
    assert((await page.getByText(approved.id, { exact: true }).count()) > 0);
  });
  await page.screenshot({
    path: "evidence/canonical/admin-cad-status.png",
    fullPage: true,
  });
  assert.equal(errors.length, 0, errors.join("\n"));
  fs.writeFileSync(
    "evidence/canonical/browser-tests.json",
    JSON.stringify(
      {
        browser: browser.version(),
        gpu: "SwiftShader",
        results,
        metrics,
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (results.some((r) => r.result !== "PASS")) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e);
  fs.writeFileSync(
    "evidence/canonical/browser-tests.json",
    JSON.stringify({ results, errors, metrics, fatal: String(e) }, null, 2),
  );
  await activeBrowser?.close();
  process.exitCode = 1;
});
