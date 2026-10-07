const fs = require("fs"),
  assert = require("assert/strict");
const { assertCanonicalTwin } = require("@aether/twin-schema");
const twin = JSON.parse(
  fs.readFileSync("tools/canonical/fixtures/approved.json", "utf8"),
);
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: "PASS" });
  } catch (e) {
    results.push({ name, status: "FAILED", error: String(e) });
  }
}
test("Python fixture passes shared JSON Schema and approved gate", () =>
  assertCanonicalTwin(twin, true));
for (const [name, mutate] of [
  ["unknown fields", (t) => (t.tenantId = "spoof")],
  ["nonfinite coordinates", (t) => (t.walls[0].start[0] = NaN)],
  ["unknown schema version", (t) => (t.schemaVersion = "1")],
  ["opening outside host", (t) => (t.openings[0].startOffsetM = 999)],
  [
    "window traversal",
    (t) => {
      const o = t.openings.find((o) => o.kind === "window");
      o.passable = true;
    },
  ],
  ["draft cannot render approved", (t) => (t.revision.state = "draft")],
  ["unknown units", (t) => (t.frame.scaleToMeters = null)],
  [
    "blocking issues",
    (t) =>
      t.issues.push({
        ...t.issues[0],
        id: "blocking",
        resolved: false,
        severity: "blocking",
      }),
  ],
  ["duplicate ids", (t) => (t.walls[1].id = t.walls[0].id)],
  ["outside spawn", (t) => (t.rooms[0].spawn = [999, 1.65, 999])],
])
  test(`Reject ${name}`, () => {
    const copy = structuredClone(twin);
    mutate(copy);
    assert.throws(() => assertCanonicalTwin(copy, true));
  });
fs.mkdirSync("evidence/canonical", { recursive: true });
fs.writeFileSync(
  "evidence/canonical/schema-tests.json",
  JSON.stringify(results, null, 2),
);
console.log(results);
if (results.some((r) => r.status !== "PASS")) process.exitCode = 1;
