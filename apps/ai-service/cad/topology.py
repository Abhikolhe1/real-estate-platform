"""Metric snapping, GEOS noding and planar face polygonization. No cycle basis."""

import math
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union, polygonize_full
from shapely.strtree import STRtree
from .common import issue, refs_unique


def reconstruct_topology(entities, config):
    segments = []
    issues = []
    voids = []
    for e in entities:
        pts = e["localPoints"]
        if e["role"] == "voids" and len(pts) >= 4 and pts[0] == pts[-1]:
            poly = Polygon(pts)
            if poly.is_valid:
                voids.append(poly)
        if e["role"] not in ("walls", "voids"):
            continue
        if e["curved"]:
            issues.append(
                issue(
                    "AMBIGUOUS_WALL",
                    {
                        "reason": "Curved source is a chord approximation; review required"
                    },
                    [e["id"]],
                    e["sourceRefs"],
                )
            )
        for a, b in zip(pts, pts[1:]):
            if a != b:
                segments.append((tuple(a), tuple(b), e["sourceRefs"]))
    if not segments:
        return (
            [],
            [],
            [issue("INCOMPLETE_TOPOLOGY", {"reason": "No supported wall linework"})],
        )
    tolerance = config.endpointSnapToleranceM
    # Deterministic endpoint representatives; no transitive chains beyond tolerance.
    lookup, buckets = {}, {}
    for p in sorted({p for a, b, _ in segments for p in (a, b)}):
        if tolerance == 0:
            lookup[p] = p
            continue
        key = tuple(math.floor(v / tolerance) for v in p)
        candidates = [
            q
            for dx in (-1, 0, 1)
            for dy in (-1, 0, 1)
            for q in buckets.get((key[0] + dx, key[1] + dy), [])
            if math.dist(p, q) <= tolerance
        ]
        lookup[p] = min(candidates) if candidates else p
        if not candidates:
            buckets.setdefault(key, []).append(p)
    lines = [
        LineString([lookup[a], lookup[b]])
        for a, b, _ in segments
        if lookup[a] != lookup[b]
    ]
    tree = STRtree(lines)

    # Endpoint-to-interior snapping handles a near T-junction without closing larger gaps.
    def snap_endpoint(p):
        point = Point(p)
        options = []
        for idx in tree.query(point.buffer(tolerance or 1e-12)):
            line = lines[int(idx)]
            t = line.project(point)
            if 1e-9 < t < line.length - 1e-9:
                projection = line.interpolate(t)
                if 0 < point.distance(projection) <= tolerance:
                    options.append(
                        (point.distance(projection), (projection.x, projection.y))
                    )
        return min(options)[1] if options else p

    adjusted = [
        LineString([snap_endpoint(l.coords[0]), snap_endpoint(l.coords[-1])])
        for l in lines
    ]
    adjusted = [l for l in adjusted if l.length > config.intersectionToleranceM]
    network = unary_union(
        adjusted
    )  # Nodes T/X and overlap boundaries, removes duplicate spans.
    noded = [network] if network.geom_type == "LineString" else list(network.geoms)
    polygons, cuts, dangles, invalid = polygonize_full(noded)
    if not cuts.is_empty or not dangles.is_empty or not invalid.is_empty:
        issues.append(
            issue(
                "INCOMPLETE_TOPOLOGY",
                {
                    "cutLengthM": cuts.length,
                    "dangleLengthM": dangles.length,
                    "invalidRingCount": len(invalid.geoms),
                },
            )
        )
    edges = []
    # Keep lineage from original geometry (including duplicate/reversed source strokes).
    original = [LineString([lookup[a], lookup[b]]) for a, b, _ in segments]
    lineage_tree = STRtree(original)
    for line in noded:
        for a, b in zip(line.coords, list(line.coords)[1:]):
            edge = LineString([a, b])
            refs = []
            for idx in lineage_tree.query(edge.buffer(tolerance + 1e-8)):
                candidate = original[int(idx)]
                if candidate.buffer(tolerance + 1e-8).covers(edge):
                    refs.extend(segments[int(idx)][2])
            edges.append(
                {
                    "start": list(min(a, b)),
                    "end": list(max(a, b)),
                    "sourceRefs": refs_unique(refs),
                }
            )
    faces = sorted(
        [
            p
            for p in polygons.geoms
            if p.area > 1e-8
            and not any(v.covers(p.representative_point()) for v in voids)
        ],
        key=lambda p: (p.bounds, p.area),
    )
    for p in faces:
        for h in p.interiors:
            if not any(v.equals(Polygon(h)) for v in voids):
                issues.append(
                    issue(
                        "AMBIGUOUS_ROOM",
                        {
                            "reason": "Enclosed ring needs courtyard/room classification",
                            "ring": list(h.coords),
                        },
                    )
                )
    if not faces:
        issues.append(
            issue(
                "INCOMPLETE_TOPOLOGY",
                {"reason": "No closed room face; gaps are not automatically filled"},
            )
        )
    return sorted(edges, key=lambda e: (e["start"], e["end"])), faces, issues
