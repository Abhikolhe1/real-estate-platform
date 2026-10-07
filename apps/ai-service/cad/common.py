import hashlib
import json


def stable_id(role, *values):
    payload = json.dumps(
        values, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    )
    return role + "-" + hashlib.sha256(payload.encode()).hexdigest()[:24]


def refs_unique(refs):
    return [
        json.loads(s) for s in sorted({json.dumps(r, sort_keys=True) for r in refs})
    ]


def evidence(method="rule", defaults=()):
    return {
        "method": method,
        "reviewState": "unreviewed",
        "confidence": None,
        "defaults": list(defaults),
    }


def issue(code, details, object_ids=(), refs=(), severity="blocking"):
    return {
        "id": stable_id("issue", code, sorted(object_ids), details),
        "code": code,
        "severity": severity,
        "objectIds": list(object_ids),
        "sourceRefs": list(refs),
        "details": details,
        "resolved": False,
        "resolution": None,
    }


def ring(coords, ccw=True):
    pts = [tuple(round(float(v), 9) for v in p[:2]) for p in coords]
    if pts[0] == pts[-1]:
        pts.pop()
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))
    if (area > 0) != ccw:
        pts.reverse()
    idx = min(range(len(pts)), key=lambda i: pts[i])
    return [list(p) for p in pts[idx:] + pts[:idx]]


def footprint(poly):
    return {
        "outer": ring(poly.exterior.coords),
        "holes": sorted([ring(r.coords, False) for r in poly.interiors]),
    }
