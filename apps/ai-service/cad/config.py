from pydantic import Field
from .schema import Model

PARSER_VERSION = "ezdxf-1.4.4/aether-1"
ALGORITHM_VERSION = "single-floor-1.0.0"
MAX_BYTES = 10 * 1024 * 1024
MAX_ENTITIES = 20000
MAX_POINTS = 100000
MAX_DEPTH = 16
MAX_SECONDS = 30


class ReconstructionConfig(Model):
    # All tolerances operate in metres, after unit conversion.
    endpointSnapToleranceM: float = Field(default=0.001, ge=0, le=0.01)
    intersectionToleranceM: float = Field(default=1e-7, gt=0, le=0.00001)
    openingHostToleranceM: float = Field(default=0.03, gt=0, le=0.1)
    curveSagittaM: float = Field(default=0.001, ge=0.0001, le=0.01)
    bodyClearanceM: float = Field(default=0.25, ge=0.22, le=0.5)
    wallThicknessM: float = Field(default=0.15, gt=0, le=2)
    floorHeightM: float = Field(default=3, gt=1.8, le=20)
    scaleToMeters: float | None = Field(default=None, gt=0, le=1000)
    sourceUnits: str | None = None
    sourceOrigin: tuple[float, float, float] | None = None
    layerMapping: dict[str, str] = Field(default_factory=dict, max_length=1000)
    ignoredSourceIds: list[str] = Field(default_factory=list, max_length=20000)


UNITS = {
    1: ("inches", 0.0254),
    2: ("feet", 0.3048),
    4: ("millimeters", 0.001),
    5: ("centimeters", 0.01),
    6: ("meters", 1.0),
}
