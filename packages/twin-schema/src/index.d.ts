export type Point2 = [number, number];
export type Point3 = [number, number, number];
export interface Polygon2D {
  outer: Point2[];
  holes: Point2[][];
}
export interface SourceRef {
  assetId: string;
  handle: string | null;
  layer: string;
  entityType: string;
  instancePath: string[];
}
export interface Evidence {
  method: "source" | "rule" | "inferred" | "manual";
  reviewState: "unreviewed" | "accepted" | "corrected" | "rejected";
  confidence: number | null;
  defaults: string[];
}
export interface TwinObject {
  id: string;
  sourceRefs: SourceRef[];
  evidence: Evidence;
  predecessorIds: string[];
}
export interface TwinRoom extends TwinObject {
  floorId: string;
  name: string;
  footprint: Polygon2D;
  boundaryWallIds: string[];
  spawn: Point3 | null;
  areaM2: number;
  perimeterM: number;
}
export interface TwinWall extends TwinObject {
  floorId: string;
  start: Point2;
  end: Point2;
  thicknessM: number;
  heightM: number;
  baseElevationM: number;
  leftRoomId: string | null;
  rightRoomId: string | null;
  openingIds: string[];
}
export interface TwinOpening extends TwinObject {
  floorId: string;
  hostWallId: string;
  kind: "door" | "window";
  startOffsetM: number;
  widthM: number;
  heightM: number;
  sillM: number;
  adjacentRoomIds: string[];
  passable: boolean;
}
export interface TwinIssue {
  id: string;
  code: string;
  severity: "info" | "warning" | "blocking";
  objectIds: string[];
  sourceRefs: SourceRef[];
  details: Record<string, unknown>;
  resolved: boolean;
  resolution: string | null;
}
export interface SourceEntity {
  id: string;
  sourceRefs: SourceRef[];
  role:
    | "walls"
    | "doors"
    | "windows"
    | "annotations"
    | "voids"
    | "ignore"
    | "unknown";
  sourcePoints: Point3[];
  localPoints: Point2[];
  transform: number[];
  text: string | null;
  curved: boolean;
}
export interface CanonicalTwinV1 {
  schemaVersion: "aether-twin/1";
  source: {
    assetId: string;
    sha256: string;
    format: "dxf";
    parserVersion: string;
    algorithmVersion: string;
  };
  revision: {
    id: string;
    baseId: string | null;
    state: "draft" | "review_required" | "approved";
  };
  frame: {
    canonicalUnits: "meters";
    upAxis: "Y";
    sourceUnits:
      "millimeters" | "centimeters" | "meters" | "inches" | "feet" | "unknown";
    detectedInsunits: number;
    scaleToMeters: number | null;
    sourceOrigin: Point3;
    sourceToLocalMatrix: number[];
    localToSourceMatrix: number[];
    calibrated: boolean;
  };
  building: { id: string; name: string; floorIds: string[] };
  floors: (TwinObject & {
    buildingId: string;
    name: string;
    elevationM: number;
    heightM: number;
  })[];
  rooms: TwinRoom[];
  walls: TwinWall[];
  openings: TwinOpening[];
  slabs: (TwinObject & {
    floorId: string;
    roomId: string;
    footprint: Polygon2D;
    elevationM: number;
    thicknessM: number;
    role: "floor" | "ceiling";
  })[];
  issues: TwinIssue[];
  sourceEntities: SourceEntity[];
  entityInventory: Record<string, number>;
  config: Record<string, any>;
  traversal: { doorId: string; roomIds: string[]; exterior: boolean }[];
}
export type Correction = {
  type: string;
  targetId?: string;
  value?: any;
  reason: string;
};
export function assertCanonicalTwin(
  data: unknown,
  approved?: boolean,
): CanonicalTwinV1;
export function pointInPolygon(p: Point2, polygon: Polygon2D): boolean;
export const schema: object;
export function canonicalJson(value: unknown): string;
