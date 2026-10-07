import math
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
from .common import stable_id, issue, evidence, footprint, refs_unique


def derive(entities, edges, polygons, source_sha, floor_id, config):
    walls, rooms, openings, slabs, issues = [], [], [], [], []
    for edge in edges:
        wall_id = stable_id(
            "wall",
            source_sha,
            edge["start"],
            edge["end"],
            [(r["handle"], r["instancePath"]) for r in edge["sourceRefs"]],
        )
        walls.append(
            {
                "id": wall_id,
                "floorId": floor_id,
                **edge,
                "thicknessM": config.wallThicknessM,
                "heightM": config.floorHeightM,
                "baseElevationM": 0,
                "leftRoomId": None,
                "rightRoomId": None,
                "openingIds": [],
                "predecessorIds": [],
                "evidence": evidence("rule", ["thicknessM", "heightM"]),
            }
        )
    lines = [LineString([w["start"], w["end"]]) for w in walls]
    tree = STRtree(lines)
    # Parallel near wall strokes may be wall faces, never silently accepted as two centerlines.
    ambiguous = set()
    for i, line in enumerate(lines):
        a, b = line.coords
        dx, dy = b[0] - a[0], b[1] - a[1]
        for j in tree.query(line.buffer(0.5)):
            j = int(j)
            if j <= i:
                continue
            other = lines[j]
            c, d = other.coords
            if (
                abs(dx * (d[1] - c[1]) - dy * (d[0] - c[0]))
                > 1e-7 * line.length * other.length
            ):
                continue
            distance = line.distance(other)
            projections = sorted(
                ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / line.length for p in (c, d)
            )
            overlap = min(line.length, projections[1]) - max(0, projections[0])
            if config.endpointSnapToleranceM < distance <= 0.5 and overlap > 0.3:
                ambiguous.update([walls[i]["id"], walls[j]["id"]])
    if ambiguous:
        issues.append(
            issue(
                "AMBIGUOUS_WALL",
                {
                    "reason": "Nearby parallel strokes may be wall faces. Confirm centerlines or correct/ignore faces."
                },
                sorted(ambiguous),
            )
        )
    obstacles = unary_union(
        [l.buffer(config.wallThicknessM / 2 + config.bodyClearanceM) for l in lines]
    )
    for poly in polygons:
        fp = footprint(poly)
        boundary = [
            w
            for w, l in zip(walls, lines)
            if poly.boundary.intersection(l).length > config.intersectionToleranceM
        ]
        refs = refs_unique([r for w in boundary for r in w["sourceRefs"]])
        room_id = stable_id(
            "room", source_sha, fp, [(r["handle"], r["instancePath"]) for r in refs]
        )
        labels = sorted(
            [
                e
                for e in entities
                if e["role"] == "annotations"
                and e["text"]
                and e["localPoints"]
                and poly.contains(Point(e["localPoints"][0]))
            ],
            key=lambda e: (e["text"], e["id"]),
        )
        if len(labels) > 1:
            issues.append(
                issue(
                    "AMBIGUOUS_LABEL",
                    {"labels": [e["text"] for e in labels]},
                    [room_id],
                )
            )
        usable = poly.buffer(-config.bodyClearanceM).difference(obstacles)
        spawn = None
        if not usable.is_empty:
            p = usable.representative_point()
            spawn = [p.x, 1.65, p.y]
        else:
            issues.append(
                issue(
                    "INVALID_ROOM_SPAWN",
                    {"reason": "No floor-supported point with body clearance"},
                    [room_id],
                )
            )
        rooms.append(
            {
                "id": room_id,
                "floorId": floor_id,
                "name": labels[0]["text"] if labels else "Unnamed room",
                "footprint": fp,
                "boundaryWallIds": sorted(w["id"] for w in boundary),
                "spawn": spawn,
                "areaM2": poly.area,
                "perimeterM": poly.length,
                "sourceRefs": refs_unique(
                    refs + [r for e in labels for r in e["sourceRefs"]]
                ),
                "evidence": evidence(),
                "predecessorIds": [],
            }
        )
        for role, elevation in [("floor", 0), ("ceiling", config.floorHeightM)]:
            slabs.append(
                {
                    "id": stable_id(role, room_id),
                    "roomId": room_id,
                    "floorId": floor_id,
                    "footprint": fp,
                    "elevationM": elevation,
                    "thicknessM": 0.15,
                    "role": role,
                    "sourceRefs": refs,
                    "evidence": evidence("inferred", ["thicknessM"]),
                    "predecessorIds": [],
                }
            )
    for w, l in zip(walls, lines):
        dx, dy = w["end"][0] - w["start"][0], w["end"][1] - w["start"][1]
        mid = l.interpolate(0.5, normalized=True)
        for name, sign in [("leftRoomId", 1), ("rightRoomId", -1)]:
            probe = Point(
                mid.x - sign * dy / l.length * 0.00001,
                mid.y + sign * dx / l.length * 0.00001,
            )
            matches = [r["id"] for r, p in zip(rooms, polygons) if p.contains(probe)]
            w[name] = matches[0] if len(matches) == 1 else None
    for e in entities:
        if e["role"] not in ("doors", "windows"):
            continue
        pts = e["localPoints"]
        opening_id = stable_id("opening", source_sha, e["id"])
        hosts = []
        if not e["curved"] and len(pts) == 2 and pts[0] != pts[1]:
            a, b = map(Point, pts)
            for idx in tree.query(LineString(pts).buffer(config.openingHostToleranceM)):
                l = lines[int(idx)]
                if max(l.distance(a), l.distance(b)) > config.openingHostToleranceM:
                    continue
                offsets = sorted([l.project(a), l.project(b)])
                width = offsets[1] - offsets[0]
                if width > 0.01 and width / a.distance(b) > 0.995:
                    hosts.append((int(idx), offsets[0], width))
        if len(hosts) != 1:
            issues.append(
                issue(
                    "UNRESOLVED_OPENING_HOST",
                    {
                        "candidateId": e["id"],
                        "candidateWallIds": [walls[i]["id"] for i, _, _ in hosts],
                        "reason": "One straight span and one compatible host are required",
                    },
                    [e["id"]],
                    e["sourceRefs"],
                )
            )
            continue
        idx, start, width = hosts[0]
        wall = walls[idx]
        kind = "door" if e["role"] == "doors" else "window"
        adjacent = sorted(r for r in [wall["leftRoomId"], wall["rightRoomId"]] if r)
        op = {
            "id": opening_id,
            "floorId": floor_id,
            "hostWallId": wall["id"],
            "kind": kind,
            "startOffsetM": round(start, 9),
            "widthM": round(width, 9),
            "heightM": 2.1 if kind == "door" else 1.2,
            "sillM": 0 if kind == "door" else 0.9,
            "adjacentRoomIds": adjacent,
            "passable": kind == "door" and width >= config.bodyClearanceM * 2,
            "sourceRefs": e["sourceRefs"],
            "evidence": evidence("rule", ["heightM", "sillM"]),
            "predecessorIds": [],
        }
        duplicate = next(
            (
                o
                for o in openings
                if o["hostWallId"] == op["hostWallId"]
                and o["kind"] == kind
                and abs(o["startOffsetM"] - start) < 1e-7
                and abs(o["widthM"] - width) < 1e-7
            ),
            None,
        )
        if duplicate:
            duplicate["sourceRefs"] = refs_unique(
                duplicate["sourceRefs"] + op["sourceRefs"]
            )
        else:
            openings.append(op)
            wall["openingIds"].append(opening_id)
    if walls:
        issues.append(
            issue(
                "MISSING_DIMENSION",
                {
                    "reason": "Review default wall thickness, floor height, slab thickness and opening heights/sills",
                    "decision": "AcceptDefaults or edit dimensions",
                },
            )
        )
    return walls, rooms, openings, slabs, issues
