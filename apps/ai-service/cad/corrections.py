"""Explicit correction intent. Always returns a new value; input snapshots stay immutable."""

import copy
import math
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union, split
from .common import evidence, footprint, stable_id, issue
from .schema import CanonicalTwinV1
from .validation import validate_geometry

DERIVED_CODES = {
    "INVALID_REFERENCE",
    "INVALID_ROOM_POLYGON",
    "INVALID_ROOM_SPAWN",
    "INVALID_WALL",
    "INVALID_OPENING_SPAN",
    "INVALID_TRAVERSAL",
    "INVALID_SLAB",
    "INVALID_FRAME",
    "INVALID_PROVENANCE",
}
REVIEW_CODES = {
    "AMBIGUOUS_WALL",
    "AMBIGUOUS_ROOM",
    "AMBIGUOUS_LABEL",
    "REPROCESS_CONFLICT",
}


def node_split_walls(twin):
    """Partition edits split existing hosts at real intersections, preserving lineage and offsets."""
    walls = twin["walls"]
    lines = {w["id"]: LineString([w["start"], w["end"]]) for w in walls}
    network = unary_union(list(lines.values()))
    segments = [network] if network.geom_type == "LineString" else list(network.geoms)
    next_walls = []
    replacements = {}
    for wall in walls:
        line = lines[wall["id"]]
        parts = [s for s in segments if line.buffer(1e-8).covers(s)]
        if len(parts) == 1 and parts[0].equals(line):
            next_walls.append(wall)
            continue
        pieces = []
        for p in sorted(parts, key=lambda s: line.project(Point(s.coords[0]))):
            a, b = list(p.coords)[0], list(p.coords)[-1]
            if line.project(Point(a)) > line.project(Point(b)):
                a, b = b, a
            piece = {
                **copy.deepcopy(wall),
                "id": stable_id("noded-wall", wall["id"], a, b),
                "start": list(a),
                "end": list(b),
                "predecessorIds": [wall["id"]],
                "openingIds": [],
            }
            piece["evidence"].update(method="manual", reviewState="corrected")
            next_walls.append(piece)
            pieces.append((piece, line.project(Point(a)), line.project(Point(b))))
        replacements[wall["id"]] = pieces
    for opening in twin["openings"]:
        pieces = replacements.get(opening["hostWallId"])
        if not pieces:
            continue
        matches = [
            (w, a)
            for w, a, b in pieces
            if opening["startOffsetM"] >= a - 1e-7
            and opening["startOffsetM"] + opening["widthM"] <= b + 1e-7
        ]
        if len(matches) != 1:
            raise ValueError(
                "Room split intersects a hosted opening; edit or reject that opening first"
            )
        host, start = matches[0]
        opening["hostWallId"] = host["id"]
        opening["startOffsetM"] -= start
    twin["walls"] = next_walls


def refresh(twin):
    """Recompute memberships, support, safe spawns and traversal after a correction."""
    floor = twin["floors"][0]
    rooms = twin["rooms"]
    polygons = {
        r["id"]: Polygon(r["footprint"]["outer"], r["footprint"]["holes"])
        for r in rooms
    }
    for wall in twin["walls"]:
        line = LineString([wall["start"], wall["end"]])
        if line.length <= 1e-8:
            continue
        dx, dy = wall["end"][0] - wall["start"][0], wall["end"][1] - wall["start"][1]
        mid = line.interpolate(0.5, normalized=True)
        for name, sign in [("leftRoomId", 1), ("rightRoomId", -1)]:
            p = Point(
                mid.x - sign * dy / line.length * 1e-5,
                mid.y + sign * dx / line.length * 1e-5,
            )
            matches = [
                rid
                for rid, poly in polygons.items()
                if poly.is_valid and poly.contains(p)
            ]
            wall[name] = matches[0] if len(matches) == 1 else None
        wall["openingIds"] = sorted(
            o["id"] for o in twin["openings"] if o["hostWallId"] == wall["id"]
        )
    obstacles = unary_union(
        [
            LineString([w["start"], w["end"]]).buffer(w["thicknessM"] / 2 + 0.25)
            for w in twin["walls"]
        ]
    )
    for r in rooms:
        p = polygons[r["id"]]
        if not p.is_valid or p.area <= 0:
            continue
        r["areaM2"], r["perimeterM"] = p.area, p.length
        r["boundaryWallIds"] = sorted(
            w["id"]
            for w in twin["walls"]
            if p.boundary.intersection(LineString([w["start"], w["end"]])).length > 1e-7
        )
        safe = p.buffer(-0.25).difference(obstacles)
        pt = safe.representative_point() if not safe.is_empty else None
        r["spawn"] = [pt.x, floor["elevationM"] + 1.65, pt.y] if pt else None
    twin["slabs"] = [
        {
            "id": stable_id(role, r["id"]),
            "floorId": floor["id"],
            "roomId": r["id"],
            "footprint": copy.deepcopy(r["footprint"]),
            "role": role,
            "elevationM": floor["elevationM"]
            + (floor["heightM"] if role == "ceiling" else 0),
            "thicknessM": 0.15,
            "sourceRefs": r["sourceRefs"],
            "evidence": evidence("inferred", ["thicknessM"]),
            "predecessorIds": [],
        }
        for r in rooms
        for role in ("floor", "ceiling")
    ]
    for o in twin["openings"]:
        wall = next((w for w in twin["walls"] if w["id"] == o["hostWallId"]), None)
        o["adjacentRoomIds"] = (
            sorted(r for r in (wall["leftRoomId"], wall["rightRoomId"]) if r)
            if wall
            else []
        )
        o["passable"] = (
            o["kind"] == "door"
            and o["widthM"] >= 0.5
            and o["heightM"] >= 1.8
            and o["sillM"] <= 0.02
        )
    twin["traversal"] = [
        {
            "doorId": o["id"],
            "roomIds": o["adjacentRoomIds"],
            "exterior": len(o["adjacentRoomIds"]) == 1,
        }
        for o in twin["openings"]
        if o["passable"]
    ]


def correct(twin, commands):
    result = copy.deepcopy(twin)
    changes = []
    if not 1 <= len(commands) <= 100:
        raise ValueError("1 to 100 correction commands required")
    for command in commands:
        if (
            set(command) - {"type", "targetId", "value", "reason"}
            or not str(command.get("reason", "")).strip()
        ):
            raise ValueError("Correction requires a reason and allowlisted fields")
        typ, target, value = (
            command["type"],
            command.get("targetId"),
            command.get("value"),
        )
        all_objects = [
            *result["rooms"],
            *result["walls"],
            *result["openings"],
            *result["floors"],
            *result["issues"],
        ]
        obj = next((o for o in all_objects if o["id"] == target), None)
        before = copy.deepcopy(obj) if obj else None
        if typ == "RenameRoom":
            room = next(r for r in result["rooms"] if r["id"] == target)
            if not isinstance(value, str) or not 1 <= len(value.strip()) <= 200:
                raise ValueError("Invalid room name")
            room["name"] = value.strip()
        elif typ == "SetWallThickness":
            wall = next(w for w in result["walls"] if w["id"] == target)
            wall["thicknessM"] = float(value)
        elif typ == "SetFloorHeight":
            result["floors"][0]["heightM"] = float(value)
            for w in result["walls"]:
                w["heightM"] = float(value)
        elif typ in ("AdjustOpeningSpan", "AssignOpeningHost", "ChangeOpeningType"):
            o = next(o for o in result["openings"] if o["id"] == target)
            keys = {"hostWallId", "startOffsetM", "widthM", "heightM", "sillM", "kind"}
            if not isinstance(value, dict) or set(value) - keys:
                raise ValueError("Unsupported opening edit")
            o.update(value)
        elif typ == "AssignSourceOpening":
            source = next(e for e in result["sourceEntities"] if e["id"] == target)
            keys = {"hostWallId", "startOffsetM", "widthM", "heightM", "sillM", "kind"}
            if set(value) != keys:
                raise ValueError(
                    "Explicit host, kind and all opening dimensions required"
                )
            op = {
                "id": stable_id("manual-opening", target),
                "floorId": result["floors"][0]["id"],
                **value,
                "adjacentRoomIds": [],
                "passable": False,
                "sourceRefs": source["sourceRefs"],
                "evidence": evidence("manual"),
                "predecessorIds": [],
            }
            result["openings"].append(op)
            for i in result["issues"]:
                if i["code"] == "UNRESOLVED_OPENING_HOST" and target in i["objectIds"]:
                    i.update(resolved=True, resolution=command["reason"])
        elif typ == "RejectOpening":
            result["openings"] = [o for o in result["openings"] if o["id"] != target]
        elif typ == "AdjustRoomBoundary":
            r = next(r for r in result["rooms"] if r["id"] == target)
            p = Polygon(value["outer"], value["holes"])
            if not p.is_valid or p.area <= 0:
                raise ValueError("Invalid room boundary")
            old, new = r["footprint"]["outer"], value["outer"]
            if len(old) != len(new) or value["holes"] != r["footprint"]["holes"]:
                raise ValueError(
                    "Vertex movement preserves ring topology; use explicit merge/split for topology changes"
                )
            moves = {tuple(a): b for a, b in zip(old, new) if a != b}
            for wall in result["walls"]:
                wall["start"] = moves.get(tuple(wall["start"]), wall["start"])
                wall["end"] = moves.get(tuple(wall["end"]), wall["end"])
            for room in result["rooms"]:
                for name in ["outer"]:
                    room["footprint"][name] = [
                        moves.get(tuple(a), a) for a in room["footprint"][name]
                    ]
                room["footprint"]["holes"] = [
                    [moves.get(tuple(a), a) for a in h]
                    for h in room["footprint"]["holes"]
                ]
        elif typ == "MergeRooms":
            first = next(r for r in result["rooms"] if r["id"] == target)
            second = next(r for r in result["rooms"] if r["id"] == value)
            shared = set(first["boundaryWallIds"]) & set(second["boundaryWallIds"])
            if any(o["hostWallId"] in shared for o in result["openings"]):
                raise ValueError(
                    "Reject hosted openings on the removed partition before merging"
                )
            a, b = [
                Polygon(r["footprint"]["outer"], r["footprint"]["holes"])
                for r in (first, second)
            ]
            union = a.union(b)
            if union.geom_type != "Polygon" or not union.is_valid or not shared:
                raise ValueError("Only adjacent rooms can merge")
            new = {
                **copy.deepcopy(first),
                "id": stable_id("merge", sorted([target, value])),
                "predecessorIds": [target, value],
                "footprint": footprint(union),
            }
            new["evidence"].update(method="manual", reviewState="corrected")
            result["rooms"] = [
                r for r in result["rooms"] if r["id"] not in (target, value)
            ] + [new]
            result["walls"] = [w for w in result["walls"] if w["id"] not in shared]
        elif typ == "SplitRoom":
            r = next(r for r in result["rooms"] if r["id"] == target)
            poly = Polygon(r["footprint"]["outer"], r["footprint"]["holes"])
            if poly.interiors:
                raise ValueError(
                    "Split rooms with holes requires a dedicated CAD review"
                )
            line = LineString(value)
            parts = list(split(poly, line).geoms)
            cut = poly.intersection(line)
            if len(parts) != 2 or cut.geom_type != "LineString":
                raise ValueError(
                    "Split must cross one simple room into exactly two polygons"
                )
            start, end = list(cut.coords)[0], list(cut.coords)[-1]
            wall = {
                "id": stable_id("split-wall", target, start, end),
                "floorId": r["floorId"],
                "start": list(start),
                "end": list(end),
                "thicknessM": 0.15,
                "heightM": result["floors"][0]["heightM"],
                "baseElevationM": 0,
                "leftRoomId": None,
                "rightRoomId": None,
                "openingIds": [],
                "sourceRefs": r["sourceRefs"],
                "evidence": {**evidence("manual"), "reviewState": "corrected"},
                "predecessorIds": [],
            }
            result["walls"].append(wall)
            node_split_walls(result)
            result["rooms"] = [o for o in result["rooms"] if o["id"] != target] + [
                {
                    **copy.deepcopy(r),
                    "id": stable_id("split-room", target, footprint(p)),
                    "footprint": footprint(p),
                    "predecessorIds": [target],
                    "evidence": {**evidence("manual"), "reviewState": "corrected"},
                }
                for p in parts
            ]
        elif typ in ("AcceptDefaults", "ConfirmCalibration"):
            code = (
                "MISSING_DIMENSION" if typ == "AcceptDefaults" else "CALIBRATION_REVIEW"
            )
            if typ == "ConfirmCalibration" and result["frame"]["scaleToMeters"] is None:
                raise ValueError("Unknown units require calibration")
            if typ == "ConfirmCalibration":
                result["frame"]["calibrated"] = True
            for i in result["issues"]:
                if i["code"] == code:
                    i.update(resolved=True, resolution=command["reason"])
        elif typ in ("ResolveIssue", "ReopenIssue"):
            i = next(i for i in result["issues"] if i["id"] == target)
            if (
                typ == "ResolveIssue"
                and i["severity"] == "blocking"
                and i["code"] not in REVIEW_CODES
            ):
                raise ValueError(
                    "This issue must be fixed at its source, not dismissed"
                )
            i.update(
                resolved=typ == "ResolveIssue",
                resolution=command["reason"] if typ == "ResolveIssue" else None,
            )
        elif typ == "AcceptCandidate":
            if not obj or "evidence" not in obj:
                raise ValueError("Unknown candidate")
            obj["evidence"]["reviewState"] = "accepted"
        else:
            raise ValueError("Unsupported correction command")
        if obj and "evidence" in obj and typ != "AcceptCandidate":
            obj["evidence"].update(method="manual", reviewState="corrected")
        changes.append(
            {
                "command": command,
                "before": before,
                "after": copy.deepcopy(obj) if obj else copy.deepcopy(value),
            }
        )
    refresh(result)
    result = CanonicalTwinV1.model_validate(result).model_dump(mode="json")
    result["issues"] = [i for i in result["issues"] if i["code"] not in DERIVED_CODES]
    result["issues"] += validate_geometry(result)
    result["issues"] = sorted(
        {i["id"]: i for i in result["issues"]}.values(), key=lambda i: i["id"]
    )
    result["revision"]["state"] = (
        "review_required"
        if any(
            i["severity"] == "blocking" and not i["resolved"] for i in result["issues"]
        )
        else "draft"
    )
    return result, changes


def rebase(twin, previous, history):
    """Replay only with exact before-target match. All other intent becomes an explicit conflict."""
    rebased = copy.deepcopy(twin)
    applied = []
    for record in history:
        command = record["command"]
        target = command.get("targetId")
        objects = [
            *rebased["rooms"],
            *rebased["walls"],
            *rebased["openings"],
            *rebased["floors"],
            *rebased["issues"],
        ]
        current = next((o for o in objects if o["id"] == target), None)
        same_source = (
            previous["source"]["sha256"] == twin["source"]["sha256"]
            and previous["config"] == twin["config"]
        )
        # Defaults/calibration apply only to the same bytes+configuration; geometric intent needs exact target equality.
        if same_source and (
            current == record["before"]
            if target
            else command["type"] in ("AcceptDefaults", "ConfirmCalibration")
        ):
            try:
                rebased, changes = correct(rebased, [command])
                applied.extend(changes)
                continue
            except (ValueError, StopIteration):
                pass
        rebased["issues"].append(
            issue(
                "REPROCESS_CONFLICT",
                {
                    "command": command,
                    "reason": "Target/source/configuration changed; correction not transferred",
                },
                [target] if target else [],
            )
        )
    return rebased, applied
