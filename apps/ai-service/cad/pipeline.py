import hashlib
import io
import time
import ezdxf
from .config import ReconstructionConfig, MAX_BYTES, PARSER_VERSION, ALGORITHM_VERSION
from .common import stable_id, evidence, issue, refs_unique
from .raw_entities import extract
from .normalize import normalize
from .topology import reconstruct_topology
from .semantics import derive
from .schema import CanonicalTwinV1
from .validation import validate_geometry


def reconstruct(data: bytes, asset_id: str, config=None):
    if not 0 < len(data) <= MAX_BYTES:
        raise ValueError("SOURCE_BYTE_LIMIT")
    if b"SECTION" not in data[:4096] or b"EOF" not in data[-4096:]:
        raise ValueError("INVALID_ASCII_DXF_SIGNATURE")
    cfg = ReconstructionConfig.model_validate(config or {})
    sha = hashlib.sha256(data).hexdigest()
    timings = {}
    start = time.perf_counter()
    # This milestone accepts ASCII DXF. ezdxf decodes escaped Unicode in text fields.
    doc = ezdxf.read(io.StringIO(data.decode("utf-8-sig", errors="replace")))
    raw, inventory, issues = extract(doc, asset_id, sha, cfg)
    timings["extractionMs"] = (time.perf_counter() - start) * 1000
    stamp = time.perf_counter()
    frame, more = normalize(raw, doc.units, cfg)
    issues += more
    timings["normalizationMs"] = (time.perf_counter() - stamp) * 1000
    building_id, floor_id = stable_id("building", sha), stable_id("floor", sha)
    stamp = time.perf_counter()
    edges, polygons = [], []
    if frame["scaleToMeters"] is not None:
        edges, polygons, more = reconstruct_topology(raw, cfg)
        issues += more
    timings["topologyMs"] = (time.perf_counter() - stamp) * 1000
    walls, rooms, openings, slabs, more = derive(
        raw, edges, polygons, sha, floor_id, cfg
    )
    issues += more
    unknown = [e for e in raw if e["role"] == "unknown"]
    if unknown:
        issues.append(
            issue(
                "UNMAPPED_SOURCE",
                {
                    "layers": sorted(
                        {r["layer"] for e in unknown for r in e["sourceRefs"]}
                    ),
                    "decision": "Map or explicitly ignore unclassified source layers",
                },
                [e["id"] for e in unknown],
            )
        )
    if not frame["calibrated"]:
        issues.append(
            issue(
                "CALIBRATION_REVIEW",
                {"reason": "Verify INSUNITS against a known drawing dimension"},
            )
        )
    twin = {
        "schemaVersion": "aether-twin/1",
        "source": {
            "assetId": asset_id,
            "sha256": sha,
            "format": "dxf",
            "parserVersion": PARSER_VERSION,
            "algorithmVersion": ALGORITHM_VERSION,
        },
        "revision": {
            "id": stable_id("draft", sha, cfg.model_dump(), ALGORITHM_VERSION),
            "baseId": None,
            "state": "review_required",
        },
        "frame": frame,
        "building": {
            "id": building_id,
            "name": "Single-floor building",
            "floorIds": [floor_id],
        },
        "floors": [
            {
                "id": floor_id,
                "buildingId": building_id,
                "name": "Ground floor",
                "elevationM": 0,
                "heightM": cfg.floorHeightM,
                "sourceRefs": refs_unique(
                    [ref for e in raw for ref in e["sourceRefs"]]
                ),
                "evidence": evidence("inferred", ["heightM"]),
                "predecessorIds": [],
            }
        ],
        "walls": walls,
        "rooms": rooms,
        "openings": openings,
        "slabs": slabs,
        "issues": issues,
        "sourceEntities": raw,
        "entityInventory": inventory,
        "config": cfg.model_dump(),
        "traversal": [
            {
                "doorId": o["id"],
                "roomIds": o["adjacentRoomIds"],
                "exterior": len(o["adjacentRoomIds"]) == 1,
            }
            for o in openings
            if o["kind"] == "door" and o["passable"]
        ],
    }
    twin = CanonicalTwinV1.model_validate(twin).model_dump(mode="json")
    twin["issues"] += validate_geometry(twin)
    twin["issues"] = sorted(
        {i["id"]: i for i in twin["issues"]}.values(), key=lambda i: i["id"]
    )
    timings["totalMs"] = (time.perf_counter() - start) * 1000
    return twin, timings
