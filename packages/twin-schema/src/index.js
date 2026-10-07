"use strict";
const Ajv = require("ajv");
const schema = require("../schema/canonical.schema.json");
const validate = new Ajv({ allErrors: true, jsonPointers: true }).compile(
  schema,
);
function assertCanonicalTwin(data, approved = false) {
  if (!validate(data))
    throw new Error(
      `Invalid canonical twin: ${JSON.stringify(validate.errors)}`,
    );
  const walk = (v) => {
    if (typeof v === "number" && !Number.isFinite(v))
      throw new Error("Non-finite canonical value");
    if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(data);
  const objects = [
    data.building,
    ...data.floors,
    ...data.rooms,
    ...data.walls,
    ...data.openings,
    ...data.slabs,
  ];
  if (new Set(objects.map((o) => o.id)).size !== objects.length)
    throw new Error("Duplicate canonical ID");
  const floors = new Set(data.floors.map((f) => f.id));
  for (const o of [
    ...data.rooms,
    ...data.walls,
    ...data.openings,
    ...data.slabs,
  ]) {
    if (!floors.has(o.floorId)) throw new Error("Unknown floor reference");
  }
  for (const o of data.openings) {
    const w = data.walls.find((w) => w.id === o.hostWallId);
    if (
      !w ||
      !w.openingIds.includes(o.id) ||
      w.floorId !== o.floorId ||
      o.startOffsetM + o.widthM >
        Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]) + 1e-6 ||
      o.sillM + o.heightM > w.heightM + 1e-6 ||
      (o.kind === "window" && o.passable)
    ) {
      throw new Error("Invalid canonical opening host/span");
    }
  }
  if (
    approved &&
    (data.revision.state !== "approved" ||
      data.frame.scaleToMeters === null ||
      data.issues.some((i) => i.severity === "blocking" && !i.resolved))
  )
    throw new Error("Approved, calibrated revision required");
  if (approved)
    for (const r of data.rooms) {
      if (!r.spawn || !pointInPolygon([r.spawn[0], r.spawn[2]], r.footprint))
        throw new Error("Invalid room spawn");
    }
  return data;
}
function pointInRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
function pointInPolygon(p, polygon) {
  return (
    pointInRing(p, polygon.outer) &&
    !polygon.holes.some((h) => pointInRing(p, h))
  );
}
function canonicalJson(value) {
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
module.exports = { assertCanonicalTwin, pointInPolygon, canonicalJson, schema };
