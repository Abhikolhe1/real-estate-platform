"""Publication gates are recomputed from geometry; resolving a checkbox cannot bypass them."""

import math
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from .common import issue
from .schema import CanonicalTwinV1


def validate_geometry(twin):
    CanonicalTwinV1.model_validate(twin)
    issues = []
    objects = [
        twin["building"],
        *twin["floors"],
        *twin["rooms"],
        *twin["walls"],
        *twin["openings"],
        *twin["slabs"],
    ]
    if len({o["id"] for o in objects}) != len(objects):
        issues.append(issue("INVALID_REFERENCE", {"reason": "Duplicate object ID"}))
    floor = twin["floors"][0]
    walls = {w["id"]: w for w in twin["walls"]}
    rooms = {r["id"]: r for r in twin["rooms"]}
    if (
        twin["building"]["floorIds"] != [floor["id"]]
        or floor["buildingId"] != twin["building"]["id"]
    ):
        issues.append(
            issue("INVALID_REFERENCE", {"reason": "Building/floor references disagree"})
        )
    frame = twin["frame"]
    a, b = frame["sourceToLocalMatrix"], frame["localToSourceMatrix"]
    if any(
        abs(
            sum(a[row + 4 * k] * b[k + 4 * col] for k in range(4))
            - (1 if row == col else 0)
        )
        > 1e-5
        for row in range(4)
        for col in range(4)
    ):
        issues.append(
            issue("INVALID_FRAME", {"reason": "Source transforms are not inverses"})
        )
    for obj in objects[1:] + twin["sourceEntities"]:
        if not obj["sourceRefs"] or any(
            ref["assetId"] != twin["source"]["assetId"] for ref in obj["sourceRefs"]
        ):
            issues.append(
                issue(
                    "INVALID_PROVENANCE",
                    {"reason": "Missing or foreign source asset reference"},
                    [obj["id"]],
                )
            )
    if twin["frame"]["scaleToMeters"] is None:
        issues.append(issue("UNKNOWN_UNITS", {"reason": "Metric calibration required"}))
    if not rooms or not walls:
        issues.append(
            issue(
                "INCOMPLETE_TOPOLOGY",
                {"reason": "At least one room and its walls are required"},
            )
        )
    polygons = {}
    for obj in [*twin["rooms"], *twin["walls"], *twin["openings"], *twin["slabs"]]:
        if obj["floorId"] != floor["id"]:
            issues.append(
                issue("INVALID_REFERENCE", {"reason": "Unknown floor"}, [obj["id"]])
            )
    for room in rooms.values():
        fp = room["footprint"]
        p = Polygon(fp["outer"], fp["holes"])
        polygons[room["id"]] = p
        if not p.is_valid or p.area <= 1e-8:
            issues.append(
                issue(
                    "INVALID_ROOM_POLYGON",
                    {"reason": "Invalid ring or hole"},
                    [room["id"]],
                )
            )
            continue
        if abs(p.area - room["areaM2"]) > 1e-5:
            issues.append(
                issue(
                    "INVALID_ROOM_POLYGON", {"reason": "Stale room area"}, [room["id"]]
                )
            )
        if (
            not p.exterior.is_ccw
            or any(ring.is_ccw for ring in p.interiors)
            or abs(p.length - room["perimeterM"]) > 1e-5
        ):
            issues.append(
                issue(
                    "INVALID_ROOM_POLYGON",
                    {"reason": "Ring winding or perimeter disagrees"},
                    [room["id"]],
                )
            )
        spawn = room["spawn"]
        if (
            not spawn
            or not p.contains(Point(spawn[0], spawn[2]))
            or abs(spawn[1] - (floor["elevationM"] + 1.65)) > 0.001
        ):
            issues.append(
                issue(
                    "INVALID_ROOM_SPAWN",
                    {"reason": "Spawn outside valid floor"},
                    [room["id"]],
                )
            )
        elif any(
            LineString([w["start"], w["end"]]).distance(Point(spawn[0], spawn[2]))
            < w["thicknessM"] / 2 + 0.22
            for w in walls.values()
        ):
            issues.append(
                issue(
                    "INVALID_ROOM_SPAWN",
                    {"reason": "Body intersects wall"},
                    [room["id"]],
                )
            )
        if any(w not in walls for w in room["boundaryWallIds"]):
            issues.append(
                issue(
                    "INVALID_REFERENCE",
                    {"reason": "Room references missing wall"},
                    [room["id"]],
                )
            )
        else:
            boundary = unary_union(
                [
                    LineString([walls[wid]["start"], walls[wid]["end"]])
                    for wid in room["boundaryWallIds"]
                ]
            )
            if not boundary.buffer(1e-6).covers(p.boundary):
                issues.append(
                    issue(
                        "INVALID_WALL",
                        {
                            "reason": "Room boundary is not supported by its referenced walls"
                        },
                        [room["id"]],
                    )
                )
    for i, (rid, p) in enumerate(polygons.items()):
        for sid, q in list(polygons.items())[i + 1 :]:
            if p.is_valid and q.is_valid and p.intersection(q).area > 1e-7:
                issues.append(
                    issue(
                        "INVALID_ROOM_POLYGON",
                        {"reason": "Overlapping rooms"},
                        [rid, sid],
                    )
                )
    for w in walls.values():
        if math.dist(w["start"], w["end"]) < 1e-7 or any(
            r is not None and r not in rooms
            for r in (w["leftRoomId"], w["rightRoomId"])
        ):
            issues.append(
                issue(
                    "INVALID_WALL",
                    {"reason": "Zero-length wall or stale adjacency"},
                    [w["id"]],
                )
            )
        if (
            abs(w["baseElevationM"] - floor["elevationM"]) > 1e-6
            or w["heightM"] > floor["heightM"] + 1e-6
        ):
            issues.append(
                issue(
                    "INVALID_WALL",
                    {"reason": "Wall elevation or head exceeds its floor"},
                    [w["id"]],
                )
            )
        if set(w["openingIds"]) != {
            o["id"] for o in twin["openings"] if o["hostWallId"] == w["id"]
        }:
            issues.append(
                issue(
                    "INVALID_REFERENCE",
                    {"reason": "Wall opening references disagree"},
                    [w["id"]],
                )
            )
    for o in twin["openings"]:
        w = walls.get(o["hostWallId"])
        if (
            not w
            or o["startOffsetM"] + o["widthM"] > math.dist(w["start"], w["end"]) + 1e-7
            or o["sillM"] + o["heightM"] > w["heightM"] + 1e-7
        ):
            issues.append(
                issue(
                    "INVALID_OPENING_SPAN",
                    {"reason": "Opening outside host bounds"},
                    [o["id"]],
                )
            )
        if o["kind"] == "window" and o["passable"]:
            issues.append(
                issue(
                    "INVALID_TRAVERSAL",
                    {"reason": "Windows cannot be traversable"},
                    [o["id"]],
                )
            )
        if not o["adjacentRoomIds"] or any(
            r not in rooms for r in o["adjacentRoomIds"]
        ):
            issues.append(
                issue(
                    "UNRESOLVED_OPENING_HOST",
                    {"reason": "Opening has no valid adjacent space"},
                    [o["id"]],
                )
            )
        if w and set(o["adjacentRoomIds"]) != {
            r for r in (w["leftRoomId"], w["rightRoomId"]) if r
        }:
            issues.append(
                issue(
                    "INVALID_TRAVERSAL",
                    {"reason": "Opening and wall space adjacency disagree"},
                    [o["id"]],
                )
            )
        passable = (
            o["kind"] == "door"
            and o["widthM"] >= 0.5
            and o["heightM"] >= 1.8
            and o["sillM"] <= 0.02
        )
        if o["passable"] != passable:
            issues.append(
                issue(
                    "INVALID_TRAVERSAL",
                    {"reason": "Passability disagrees with opening dimensions"},
                    [o["id"]],
                )
            )
        for other in twin["openings"]:
            if other["id"] <= o["id"] or o["hostWallId"] != other["hostWallId"]:
                continue
            if (
                min(
                    o["startOffsetM"] + o["widthM"],
                    other["startOffsetM"] + other["widthM"],
                )
                > max(o["startOffsetM"], other["startOffsetM"]) + 1e-7
            ):
                issues.append(
                    issue(
                        "INVALID_OPENING_SPAN",
                        {"reason": "Overlapping openings"},
                        [o["id"], other["id"]],
                    )
                )
    for slab in twin["slabs"]:
        room = rooms.get(slab["roomId"])
        if not room or slab["footprint"] != room["footprint"]:
            issues.append(
                issue(
                    "INVALID_SLAB",
                    {"reason": "Room support and footprint disagree"},
                    [slab["id"]],
                )
            )
        expected = floor["elevationM"] + (
            floor["heightM"] if slab["role"] == "ceiling" else 0
        )
        if abs(slab["elevationM"] - expected) > 1e-6:
            issues.append(
                issue(
                    "INVALID_SLAB",
                    {"reason": "Support elevation disagrees with floor"},
                    [slab["id"]],
                )
            )
    for room in rooms.values():
        if {s["role"] for s in twin["slabs"] if s["roomId"] == room["id"]} != {
            "floor",
            "ceiling",
        }:
            issues.append(
                issue(
                    "INVALID_SLAB",
                    {"reason": "Missing floor or ceiling support"},
                    [room["id"]],
                )
            )
    expected_traversal = sorted(
        (o["id"], tuple(sorted(o["adjacentRoomIds"])), len(o["adjacentRoomIds"]) == 1)
        for o in twin["openings"]
        if o["passable"]
    )
    try:
        actual = sorted(
            (t["doorId"], tuple(sorted(t["roomIds"])), t["exterior"])
            for t in twin["traversal"]
        )
        if actual != expected_traversal:
            raise ValueError()
    except (KeyError, TypeError, ValueError):
        issues.append(
            issue(
                "INVALID_TRAVERSAL",
                {"reason": "Traversal graph disagrees with hosted doors"},
            )
        )
    return issues
