"""Authored exact tests, not a genuine architectural acceptance fixture."""

import io
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/ai-service"))
import ezdxf
from cad.pipeline import reconstruct
from cad.corrections import correct
from cad.validation import validate_geometry

OUT = ROOT / "tools/canonical/fixtures"
OUT.mkdir(parents=True, exist_ok=True)
d = ezdxf.new("R2010")
d.units = 6
for layer in ("WALL", "DOOR", "WINDOW", "ROOM"):
    d.layers.new(layer)
m = d.modelspace()
ring = [(0, 0), (8, 0), (8, 6), (5, 6), (5, 4), (0, 4)]
for a, b in zip(ring, ring[1:] + ring[:1]):
    m.add_line(a, b, dxfattribs={"layer": "WALL"})
m.add_line((4, 0), (4, 4), dxfattribs={"layer": "WALL"})
for a, b in [((1, 0), (2, 0)), ((4, 1), (4, 2))]:
    m.add_line(a, b, dxfattribs={"layer": "DOOR"})
m.add_line((8, 2), (8, 4), dxfattribs={"layer": "WINDOW"})
for name, p in [("Living", (2, 2)), ("Kitchen", (6, 2))]:
    m.add_text(name, dxfattribs={"layer": "ROOM", "insert": p})
# Freeze source bytes once. Re-run canonical output from the frozen fixture, not changing DXF timestamps.
source = OUT / "partitioned-concave.dxf"
if not source.exists():
    buffer = io.StringIO()
    d.write(buffer)
    source.write_bytes(buffer.getvalue().encode())
twin, timings = reconstruct(source.read_bytes(), "synthetic-fixture")
(OUT / "automatic.json").write_text(json.dumps(twin, indent=2) + "\n", encoding="utf8")
reviewed, changes = correct(
    twin,
    [
        {
            "type": "AcceptDefaults",
            "reason": "Synthetic truth specifies 0.15 m walls, 3 m height, default opening elevations",
        },
        {
            "type": "ConfirmCalibration",
            "reason": "Independent control dimension is 8.0 metres",
        },
    ],
)
assert not validate_geometry(reviewed)
assert not any(
    i["severity"] == "blocking" and not i["resolved"] for i in reviewed["issues"]
)
reviewed["revision"] = {
    "id": "synthetic-approved-v1",
    "baseId": twin["revision"]["id"],
    "state": "approved",
}
(OUT / "approved.json").write_text(
    json.dumps(reviewed, indent=2) + "\n", encoding="utf8"
)
print(
    json.dumps(
        {
            "source": str(source.relative_to(ROOT)),
            "sha256": twin["source"]["sha256"],
            "rooms": len(twin["rooms"]),
            "walls": len(twin["walls"]),
            "openings": len(twin["openings"]),
            "timings": timings,
        }
    )
)

# Independent 10 x 10 metre outline with a 4 x 4 metre courtyard: expected support area 84 m².
from tests.test_canonical import drawing, rectangle, as_bytes

courtyard_source = OUT / "courtyard.dxf"
if not courtyard_source.exists():
    doc = rectangle(drawing(), width=10, depth=10)
    doc.modelspace().add_lwpolyline(
        [(3, 3), (7, 3), (7, 7), (3, 7)], close=True, dxfattribs={"layer": "VOID"}
    )
    courtyard_source.write_bytes(as_bytes(doc))
courtyard, _ = reconstruct(courtyard_source.read_bytes(), "synthetic-courtyard")
courtyard, _ = correct(
    courtyard,
    [
        {
            "type": "AcceptDefaults",
            "reason": "Independent courtyard dimensions checked",
        },
        {
            "type": "ConfirmCalibration",
            "reason": "Independent ten metre control checked",
        },
    ],
)
assert not validate_geometry(courtyard)
courtyard["revision"]["state"] = "approved"
(OUT / "courtyard-approved.json").write_text(
    json.dumps(courtyard, indent=2) + "\n", encoding="utf8"
)
