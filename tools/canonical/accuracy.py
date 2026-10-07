"""Independent synthetic annotations. Never substitutes generated geometry for truth."""

import json, math, statistics, time, platform, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/ai-service"))
from shapely.geometry import Polygon, Point, LineString
from cad.pipeline import reconstruct

truth = json.loads((ROOT / "tools/canonical/fixtures/annotations.json").read_text())
data = (ROOT / "tools/canonical/fixtures/partitioned-concave.dxf").read_bytes()
pred, timings = reconstruct(data, "accuracy-fixture")
rooms = []
for actual in truth["rooms"]:
    found = next(r for r in pred["rooms"] if r["name"] == actual["name"])
    p = Polygon(found["footprint"]["outer"], found["footprint"]["holes"])
    q = Polygon(actual["footprint"]["outer"], actual["footprint"]["holes"])
    rooms.append(
        {
            "name": actual["name"],
            "truthAreaM2": actual["areaM2"],
            "predictedAreaM2": p.area,
            "areaRelativeError": abs(p.area - q.area) / q.area,
            "intersectionOverUnion": p.intersection(q).area / p.union(q).area,
            "boundaryHausdorffM": p.boundary.hausdorff_distance(q.boundary),
            "spawnValid": p.contains(Point(found["spawn"][0], found["spawn"][2])),
        }
    )
wall_errors = []
for line in truth["walls"]:
    p = LineString(line)
    wall_errors.append(
        min(
            p.hausdorff_distance(LineString([w["start"], w["end"]]))
            for w in pred["walls"]
        )
    )
openings = []
names = {r["id"]: r["name"] for r in pred["rooms"]}
for expected in truth["openings"]:
    span = LineString(expected["span"])
    candidates = []
    for o in pred["openings"]:
        if o["kind"] != expected["kind"]:
            continue
        w = next(w for w in pred["walls"] if w["id"] == o["hostWallId"])
        host = LineString([w["start"], w["end"]])
        a = host.interpolate(o["startOffsetM"])
        b = host.interpolate(o["startOffsetM"] + o["widthM"])
        candidates.append((span.hausdorff_distance(LineString([a, b])), o, host))
    error, o, host = min(candidates, key=lambda v: v[0])
    openings.append(
        {
            "kind": o["kind"],
            "spanHausdorffM": error,
            "widthErrorM": abs(o["widthM"] - span.length),
            "hostCorrect": host.equals(LineString(expected["host"])),
            "adjacencyCorrect": sorted(names[i] for i in o["adjacentRoomIds"])
            == sorted(expected["rooms"]),
        }
    )
durations = []
for _ in range(25):
    _, stamp = reconstruct(data, "accuracy-fixture")
    durations.append(stamp["totalMs"])
result = {
    "status": "PASS",
    "fixtureKind": truth["kind"],
    "sourceSha256": pred["source"]["sha256"],
    "groundTruth": "tools/canonical/fixtures/annotations.json",
    "parserVersion": pred["source"]["parserVersion"],
    "algorithmVersion": pred["source"]["algorithmVersion"],
    "rooms": rooms,
    "wallPrecision": (
        1
        if len(pred["walls"]) == len(truth["walls"]) and max(wall_errors) < 1e-6
        else None
    ),
    "wallRecall": 1 if max(wall_errors) < 1e-6 else None,
    "maxWallBoundaryErrorM": max(wall_errors),
    "openingMetrics": openings,
    "timing": {
        "runs": 25,
        "meanMs": statistics.mean(durations),
        "p95Ms": sorted(durations)[23],
        "maxMs": max(durations),
        "environment": platform.platform(),
        "processor": platform.processor(),
    },
    "genuineArchitecturalAcceptance": "BLOCKED: authored tests are synthetic; no verified supported architectural drawing with independent annotations",
}
assert all(r["intersectionOverUnion"] >= 0.999999 and r["spawnValid"] for r in rooms)
assert max(wall_errors) < 1e-6 and all(
    o["hostCorrect"] and o["adjacencyCorrect"] and o["spanHausdorffM"] < 1e-6
    for o in openings
)
(ROOT / "evidence/canonical/accuracy.json").write_text(
    json.dumps(result, indent=2), encoding="utf8"
)
print(json.dumps(result, indent=2))
