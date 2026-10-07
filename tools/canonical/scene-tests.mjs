import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";
import * as THREE from "three";
const dir = ".cache/canonical-scene";
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/package.json`, '{"type":"module"}');
for (const name of ["model", "Navigation", "CanonicalSceneAdapter"]) {
  let js = ts.transpileModule(
    fs.readFileSync(
      `apps/web/src/components/property-viewer/${name}.ts`,
      "utf8",
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ES2020,
      },
    },
  ).outputText;
  js = js.replace(/from ["']\.\/(\w+)["']/g, "from './$1.js'");
  fs.writeFileSync(`${dir}/${name}.js`, js);
}
const { canonicalScene } =
  await import("../../.cache/canonical-scene/CanonicalSceneAdapter.js");
const { SceneIndex, disposeTree } =
  await import("../../.cache/canonical-scene/model.js");
const { Navigation } =
  await import("../../.cache/canonical-scene/Navigation.js");
const twin = JSON.parse(
  fs.readFileSync("tools/canonical/fixtures/approved.json", "utf8"),
);
const { root, manifest } = canonicalScene(twin),
  index = new SceneIndex(root, manifest),
  nav = new Navigation(index);
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, result: "PASS" });
  } catch (e) {
    results.push({ name, result: "FAILED", reason: String(e) });
  }
}
test("Only approved canonical revisions compile", () => {
  const draft = structuredClone(twin);
  draft.revision.state = "draft";
  assert.throws(() => canonicalScene(draft));
});
test("Every rendered element retains canonical revision and source lineage", () => {
  assert.equal(manifest.revisionId, twin.revision.id);
  assert(
    index.meshes.every(
      (m) =>
        m.userData.revisionId === twin.revision.id &&
        m.userData.sourceRefs.length,
    ),
  );
  assert(
    manifest.elements.every(
      (e) => e.canonicalObjectId && e.revisionId === twin.revision.id,
    ),
  );
});
test("Actual triangle floor area equals independently specified 38 square metres", () => {
  let area = 0;
  for (const mesh of index.floors) {
    const g = mesh.geometry,
      positions = g.getAttribute("position"),
      ids = g.index;
    for (let i = 0; i < (ids?.count || positions.count); i += 3) {
      const v = [0, 1, 2].map((k) =>
        new THREE.Vector3().fromBufferAttribute(
          positions,
          ids ? ids.getX(i + k) : i + k,
        ),
      );
      area += new THREE.Triangle(...v).getArea();
    }
  }
  assert(Math.abs(area - 38) < 1e-7);
});
test("Concave missing floor receives no invented support", () => {
  assert.equal(nav.ground(2, 5, 0), undefined);
  assert(Math.abs(nav.ground(6, 5, 0)) < 1e-7);
});
test("Canonical room spawns stand on floor at 1.65 metre eye height", () => {
  for (const room of twin.rooms)
    assert(nav.fits(new THREE.Vector3(...room.spawn), 0));
});
test("Window geometry remains a collision obstacle", () => {
  assert.equal(
    index.walls.filter((m) => m.userData.type === "window").length,
    1,
  );
  assert(!nav.fits(new THREE.Vector3(7.95, 1.65, 3), 0));
});
test("Closed door blocks and open door permits traversal through actual wall cut", () => {
  const door = twin.openings.find(
      (o) => o.kind === "door" && o.adjacentRoomIds.length === 2,
    ),
    leaf = index.doors.find((m) => m.userData.canonicalObjectId === door.id);
  assert(leaf);
  const closed = new THREE.Vector3(3.6, 1.65, 1.5);
  for (let i = 0; i < 20; i++)
    nav.move(closed, new THREE.Vector3(0.05, 0, 0), 0);
  assert(closed.x < 4);
  leaf.visible = false;
  const opened = new THREE.Vector3(3.6, 1.65, 1.5);
  for (let i = 0; i < 20; i++)
    nav.move(opened, new THREE.Vector3(0.05, 0, 0), 0);
  assert(opened.x > 4.3);
});
test("Hosted window and door cuts use start offsets and real dimensions", () => {
  for (const o of twin.openings) {
    const w = twin.walls.find((w) => w.id === o.hostWallId),
      length = Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]),
      mesh = index.meshes.find((m) => m.userData.canonicalObjectId === o.id);
    const s = o.startOffsetM + o.widthM / 2;
    assert(
      Math.abs(
        mesh.position.x - (w.start[0] + ((w.end[0] - w.start[0]) * s) / length),
      ) < 1e-8,
    );
    assert.equal(mesh.geometry.parameters.width, o.widthM);
  }
});
test("Courtyard holes triangulate 84 square metres and provide no invented support", () => {
  const c = JSON.parse(
      fs.readFileSync(
        "tools/canonical/fixtures/courtyard-approved.json",
        "utf8",
      ),
    ),
    scene = canonicalScene(c),
    idx = new SceneIndex(scene.root, scene.manifest),
    navigation = new Navigation(idx);
  assert.equal(navigation.ground(5, 5, 0), undefined);
  assert(Math.abs(navigation.ground(2, 2, 0)) < 1e-6);
  let area = 0;
  for (const mesh of idx.floors) {
    const p = mesh.geometry.getAttribute("position"),
      ids = mesh.geometry.index;
    for (let i = 0; i < ids.count; i += 3) {
      const v = [0, 1, 2].map((k) =>
        new THREE.Vector3().fromBufferAttribute(p, ids.getX(i + k)),
      );
      area += new THREE.Triangle(...v).getArea();
    }
  }
  assert(Math.abs(area - 84) < 1e-6);
  disposeTree(scene.root);
});
test("Non-passable doors remain obstacles even when passable leaves open", () => {
  const c = structuredClone(twin),
    o = c.openings.find(
      (o) => o.kind === "door" && o.adjacentRoomIds.length === 2,
    );
  o.sillM = 0.1;
  o.passable = false;
  c.traversal = c.traversal.filter((t) => t.doorId !== o.id);
  const scene = canonicalScene(c),
    idx = new SceneIndex(scene.root, scene.manifest),
    navigation = new Navigation(idx);
  idx.doors.forEach((m) => (m.visible = false));
  assert(idx.walls.some((m) => m.userData.canonicalObjectId === o.id));
  const p = new THREE.Vector3(3.6, 1.65, 1.5);
  for (let i = 0; i < 20; i++)
    navigation.move(p, new THREE.Vector3(0.05, 0, 0), 0);
  assert(p.x < 4);
  disposeTree(scene.root);
});
disposeTree(root);
fs.mkdirSync("evidence/canonical", { recursive: true });
fs.writeFileSync(
  "evidence/canonical/scene-tests.json",
  JSON.stringify(results, null, 2),
);
console.log(results);
if (results.some((r) => r.result !== "PASS")) process.exitCode = 1;
