"""Bounded non-destructive WCS extraction, retaining original block handles."""

import math
from collections import Counter
from ezdxf.math import Matrix44
from ezdxf.path import make_path
from .common import stable_id, issue
from .config import MAX_ENTITIES, MAX_DEPTH, MAX_POINTS, UNITS


class CadLimitError(ValueError):
    pass


def extract(doc, asset_id, source_sha, config):
    inventory, entities, issues = Counter(), [], []
    count = point_count = 0
    factor = config.scaleToMeters or UNITS.get(doc.units, (None, 1))[1]
    roles = {"walls", "doors", "windows", "annotations", "voids", "ignore", "unknown"}
    mapping = {k.lower(): v for k, v in config.layerMapping.items()}
    if any(v not in roles for v in mapping.values()):
        raise ValueError("Layer mapping values must be explicit roles")

    def classify(layer):
        if layer.lower() in mapping:
            return mapping[layer.lower()]
        words = layer.lower().replace("_", "-").split("-")
        for role, names in [
            ("walls", ("wall", "walls")),
            ("doors", ("door", "doors")),
            ("windows", ("window", "windows")),
            ("voids", ("void", "courtyard")),
            ("annotations", ("text", "label", "labels", "room", "rooms")),
        ]:
            if any(n in words for n in names):
                return role
        return "unknown"

    def visit(items, matrix, lineage, block_stack, inherited_layer="0"):
        nonlocal count, point_count
        for entity in sorted(items, key=lambda e: e.dxf.get("handle", "")):
            count += 1
            if count > MAX_ENTITIES:
                raise CadLimitError("EXPANDED_ENTITY_LIMIT")
            typ = entity.dxftype()
            inventory[typ] += 1
            layer = entity.dxf.get("layer", "0")
            effective_layer = inherited_layer if layer == "0" and lineage else layer
            ref = {
                "assetId": asset_id,
                "handle": entity.dxf.get("handle"),
                "layer": layer,
                "entityType": typ,
                "instancePath": list(lineage),
            }
            identity = stable_id("source", source_sha, ref["handle"], lineage, typ)
            role = (
                "ignore"
                if identity in config.ignoredSourceIds
                else classify(effective_layer)
            )
            if typ == "INSERT":
                name = entity.dxf.name
                if len(lineage) >= MAX_DEPTH or name in block_stack:
                    raise CadLimitError("BLOCK_RECURSION_LIMIT")
                block = doc.blocks.get(name)
                if block is None or block.block.is_xref or entity.mcount > 1:
                    issues.append(
                        issue(
                            "UNSUPPORTED_ENTITY",
                            {
                                "type": typ,
                                "reason": "missing block, XREF or array insert",
                            },
                            [identity],
                            [ref],
                        )
                    )
                    continue
                # ezdxf uses row-vector composition: child placement then ancestor placement.
                placement = entity.matrix44() @ matrix
                if entity.has_extension_dict:
                    issues.append(
                        issue(
                            "UNSUPPORTED_ENTITY",
                            {
                                "type": typ,
                                "reason": "INSERT extension/clipping requires review",
                            },
                            [identity],
                            [ref],
                        )
                    )
                visit(
                    block,
                    placement,
                    lineage + [ref["handle"] or name],
                    block_stack + [name],
                    effective_layer,
                )
                continue
            points, text, curved = [], None, False
            try:
                if typ in ("TEXT", "MTEXT"):
                    text = entity.plain_text().strip()
                    pt = (
                        entity.ocs().to_wcs(entity.dxf.insert)
                        if typ == "TEXT"
                        else entity.dxf.insert
                    )
                    points = [matrix.transform(pt)]
                    if role == "unknown":
                        role = "annotations"
                elif typ in ("LINE", "LWPOLYLINE", "POLYLINE", "ARC", "SPLINE"):
                    if typ == "POLYLINE" and not entity.is_2d_polyline:
                        raise ValueError("Only 2D POLYLINE is supported")
                    if typ == "SPLINE" and (entity.dxf.degree != 3 or entity.weights):
                        raise ValueError("Only non-rational cubic SPLINE is supported")
                    curved = typ in ("ARC", "SPLINE") or bool(
                        getattr(entity, "has_arc", False)
                    )
                    path = make_path(entity).transform(matrix)
                    for pt in path.flattening(config.curveSagittaM / factor):
                        point_count += 1
                        if point_count > MAX_POINTS:
                            raise CadLimitError("FLATTENED_POINT_LIMIT")
                        points.append(pt)
                else:
                    raise ValueError(
                        "Entity retained in inventory but not reconstructed"
                    )
            except CadLimitError:
                raise
            except Exception as exc:
                inventory["UNSUPPORTED_" + typ] += 1
                issues.append(
                    issue(
                        "UNSUPPORTED_ENTITY",
                        {"type": typ, "reason": str(exc)},
                        [identity],
                        [ref],
                        "warning" if role in ("annotations", "ignore") else "blocking",
                    )
                )
            source_points = [[float(p.x), float(p.y), float(p.z)] for p in points]
            if any(
                not math.isfinite(v) or abs(v) > 1e12 for p in source_points for v in p
            ):
                raise ValueError("Non-finite or out-of-range CAD coordinate")
            entities.append(
                {
                    "id": identity,
                    "sourceRefs": [ref],
                    "role": role,
                    "sourcePoints": source_points,
                    "localPoints": [],
                    "transform": list(matrix),
                    "text": text,
                    "curved": curved,
                }
            )

    visit(doc.modelspace(), Matrix44(), [], [])
    return (
        sorted(entities, key=lambda e: e["id"]),
        dict(sorted(inventory.items())),
        issues,
    )
