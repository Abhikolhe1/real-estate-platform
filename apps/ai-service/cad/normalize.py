from .common import issue
from .config import UNITS


def normalize(entities, insunits, config):
    name, scale = UNITS.get(insunits, ("unknown", None))
    calibrated = config.scaleToMeters is not None
    if calibrated:
        scale = config.scaleToMeters
        name = config.sourceUnits or "unknown"
    relevant = [
        p
        for e in entities
        if e["role"] in ("walls", "voids")
        for p in e["sourcePoints"]
    ]
    points = relevant or [p for e in entities for p in e["sourcePoints"]]
    origin = list(
        config.sourceOrigin
        or ([min(p[i] for p in points) for i in range(3)] if points else [0, 0, 0])
    )
    s = scale or 1.0
    x, y, z = origin
    # Column-major matrices; horizontal handedness is explicitly DXF XY -> local XZ.
    forward = [s, 0, 0, 0, 0, 0, s, 0, 0, s, 0, 0, -s * x, -s * z, -s * y, 1]
    inverse = [1 / s, 0, 0, 0, 0, 0, 1 / s, 0, 0, 1 / s, 0, 0, x, y, z, 1]
    frame = {
        "canonicalUnits": "meters",
        "upAxis": "Y",
        "sourceUnits": name,
        "detectedInsunits": insunits,
        "scaleToMeters": scale,
        "sourceOrigin": origin,
        "sourceToLocalMatrix": forward,
        "localToSourceMatrix": inverse,
        "calibrated": calibrated,
    }
    issues = []
    if scale is None:
        issues.append(
            issue(
                "UNKNOWN_UNITS",
                {
                    "insunits": insunits,
                    "decision": "Set units or calibrate a known source distance",
                },
            )
        )
        return frame, issues
    for e in entities:
        e["localPoints"] = [
            [round((p[0] - x) * s, 9), round((p[1] - y) * s, 9)]
            for p in e["sourcePoints"]
        ]
        if e["role"] not in ("ignore", "annotations") and any(
            abs((p[2] - z) * s) > 0.001 for p in e["sourcePoints"]
        ):
            issues.append(
                issue(
                    "UNSUPPORTED_ENTITY",
                    {"reason": "Non-planar geometry in single-floor drawing"},
                    [e["id"]],
                    e["sourceRefs"],
                )
            )
    return frame, issues
