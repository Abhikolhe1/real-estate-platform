"""Authoritative wire schema. Exported as draft-07 JSON Schema for TypeScript."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Point2 = tuple[float, float]
Point3 = tuple[float, float, float]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class SourceRef(Model):
    assetId: str
    handle: str | None = None
    layer: str
    entityType: str
    instancePath: list[str] = Field(default_factory=list)


class Evidence(Model):
    method: Literal["source", "rule", "inferred", "manual"]
    reviewState: Literal["unreviewed", "accepted", "corrected", "rejected"] = (
        "unreviewed"
    )
    confidence: float | None = Field(default=None, ge=0, le=1)
    defaults: list[str] = Field(default_factory=list)


class Polygon2D(Model):
    # Unclosed rings: outer CCW and holes CW in the canonical X/Z plane.
    outer: list[Point2] = Field(min_length=3, max_length=10000)
    holes: list[list[Point2]] = Field(default_factory=list, max_length=1000)


class Object(Model):
    id: str = Field(min_length=1, max_length=160)
    sourceRefs: list[SourceRef] = Field(default_factory=list)
    evidence: Evidence
    predecessorIds: list[str] = Field(default_factory=list)


class SourceInfo(Model):
    assetId: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    format: Literal["dxf"] = "dxf"
    parserVersion: str
    algorithmVersion: str


class RevisionInfo(Model):
    id: str
    baseId: str | None = None
    state: Literal["draft", "review_required", "approved"] = "review_required"


class CoordinateFrame(Model):
    canonicalUnits: Literal["meters"] = "meters"
    upAxis: Literal["Y"] = "Y"
    sourceUnits: Literal[
        "millimeters", "centimeters", "meters", "inches", "feet", "unknown"
    ]
    detectedInsunits: int
    scaleToMeters: float | None = Field(default=None, gt=0)
    sourceOrigin: Point3
    # Column-major: [sx, sy, sz] -> [s*(sx-ox), s*(sz-oz), s*(sy-oy)].
    sourceToLocalMatrix: list[float] = Field(min_length=16, max_length=16)
    localToSourceMatrix: list[float] = Field(min_length=16, max_length=16)
    calibrated: bool = False


class Building(Model):
    id: str
    name: str
    floorIds: list[str]


class Floor(Object):
    buildingId: str
    name: str
    elevationM: float
    heightM: float = Field(gt=1.8, le=20)


class Room(Object):
    floorId: str
    name: str
    footprint: Polygon2D
    boundaryWallIds: list[str]
    spawn: Point3 | None = None
    areaM2: float = Field(gt=0)
    perimeterM: float = Field(gt=0)


class Wall(Object):
    floorId: str
    start: Point2
    end: Point2
    thicknessM: float = Field(gt=0, le=2)
    heightM: float = Field(gt=0, le=20)
    baseElevationM: float
    leftRoomId: str | None = None
    rightRoomId: str | None = None
    openingIds: list[str] = Field(default_factory=list)


class Opening(Object):
    floorId: str
    hostWallId: str
    kind: Literal["door", "window"]
    startOffsetM: float = Field(ge=0)
    widthM: float = Field(gt=0)
    heightM: float = Field(gt=0)
    sillM: float = Field(ge=0)
    adjacentRoomIds: list[str] = Field(default_factory=list, max_length=2)
    passable: bool = False


class Slab(Object):
    floorId: str
    roomId: str
    footprint: Polygon2D
    elevationM: float
    thicknessM: float = Field(gt=0)
    role: Literal["floor", "ceiling"]


class TwinIssue(Model):
    id: str
    code: str
    severity: Literal["info", "warning", "blocking"]
    objectIds: list[str] = Field(default_factory=list)
    sourceRefs: list[SourceRef] = Field(default_factory=list)
    details: dict = Field(default_factory=dict)
    resolved: bool = False
    resolution: str | None = None


class SourceEntity(Model):
    id: str
    sourceRefs: list[SourceRef]
    role: Literal[
        "walls", "doors", "windows", "annotations", "voids", "ignore", "unknown"
    ]
    # Original WCS source geometry remains immutable; localPoints are absent before calibration.
    sourcePoints: list[Point3]
    localPoints: list[Point2] = Field(default_factory=list)
    transform: list[float] = Field(min_length=16, max_length=16)
    text: str | None = None
    curved: bool = False


class CanonicalTwinV1(Model):
    schemaVersion: Literal["aether-twin/1"] = "aether-twin/1"
    source: SourceInfo
    revision: RevisionInfo
    frame: CoordinateFrame
    building: Building
    floors: list[Floor] = Field(min_length=1, max_length=1)
    rooms: list[Room] = Field(max_length=2000)
    walls: list[Wall] = Field(max_length=20000)
    openings: list[Opening] = Field(max_length=5000)
    slabs: list[Slab] = Field(max_length=4000)
    issues: list[TwinIssue]
    sourceEntities: list[SourceEntity] = Field(max_length=20000)
    entityInventory: dict[str, int]
    config: dict
    traversal: list[dict] = Field(default_factory=list)


def export_schema():
    """Translate Pydantic's tuple keywords to draft-07; one shared runtime contract."""
    import json
    from pathlib import Path

    def convert(value):
        if isinstance(value, list):
            return [convert(v) for v in value]
        if not isinstance(value, dict):
            return value
        out = {
            ("definitions" if k == "$defs" else k): convert(v) for k, v in value.items()
        }
        if "$ref" in out:
            out["$ref"] = out["$ref"].replace("#/$defs/", "#/definitions/")
        if "prefixItems" in out:
            out["items"] = out.pop("prefixItems")
            out["additionalItems"] = False
        return out

    schema = convert(CanonicalTwinV1.model_json_schema())
    schema["$schema"] = "http://json-schema.org/draft-07/schema#"
    target = (
        Path(__file__).resolve().parents[3]
        / "packages/twin-schema/schema/canonical.schema.json"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    export_schema()
