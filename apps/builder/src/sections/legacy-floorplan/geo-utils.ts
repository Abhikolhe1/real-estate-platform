export interface Point2D {
  x: number;
  z: number;
}

/**
 * Calculates the area of a polygon using the Surveyor's formula (Shoelace formula).
 */
export function calculateArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    area += curr.x * next.z - next.x * curr.z;
  }
  return Math.abs(area / 2);
}

/**
 * Calculates the centroid (center of mass) of a polygon.
 */
export function calculateCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, z: 0 };
  if (points.length === 1) return { x: points[0].x, z: points[0].z };
  if (points.length === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      z: (points[0].z + points[1].z) / 2,
    };
  }

  let area = 0;
  let cx = 0;
  let cz = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    const factor = curr.x * next.z - next.x * curr.z;
    area += factor;
    cx += (curr.x + next.x) * factor;
    cz += (curr.z + next.z) * factor;
  }

  if (Math.abs(area) < 1e-6) {
    cx = points.reduce((acc, p) => acc + p.x, 0) / n;
    cz = points.reduce((acc, p) => acc + p.z, 0) / n;
    return { x: cx, z: cz };
  }

  area = area * 3; // 6 * A / 2 = 3 * sum
  return {
    x: cx / area,
    z: cz / area,
  };
}

/**
 * Checks if a point lies inside a polygon using the Ray-Casting algorithm.
 */
export function pointInPolygon(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;

    const intersect = ((zi > pt.z) !== (zj > pt.z))
      && (pt.x < ((xj - xi) * (pt.z - zi)) / (zj - zi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if two line segments intersect.
 */
function lineSegmentsIntersect(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): boolean {
  const det = (p2.x - p1.x) * (p4.z - p3.z) - (p4.x - p3.x) * (p2.z - p1.z);
  if (det === 0) return false;

  const lambda = ((p4.z - p3.z) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.z - p1.z)) / det;
  const gamma = ((p1.z - p2.z) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.z - p1.z)) / det;

  return 0.001 < lambda && lambda < 0.999 && 0.001 < gamma && gamma < 0.999;
}

/**
 * Checks if two polygons overlap or intersect.
 */
export function polygonsIntersect(polyA: Point2D[], polyB: Point2D[]): boolean {
  if (polyA.length < 3 || polyB.length < 3) return false;

  // 1. Check edge intersections
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (lineSegmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  // 2. Check containment
  if (pointInPolygon(polyA[0], polyB)) return true;
  if (pointInPolygon(polyB[0], polyA)) return true;

  return false;
}

/**
 * Merges two adjacent/overlapping polygons.
 * Falls back to bounding envelope for general reliability in standard room merging layouts.
 */
export function unionPolygons(polyA: Point2D[], polyB: Point2D[]): Point2D[] {
  if (polyA.length === 0) return polyB;
  if (polyB.length === 0) return polyA;

  const allPoints = [...polyA, ...polyB];
  const xs = allPoints.map((p) => p.x);
  const zs = allPoints.map((p) => p.z);

  const minX = Math.min(...xs);
  const minZ = Math.min(...zs);
  const maxX = Math.max(...xs);
  const maxZ = Math.max(...zs);

  return [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];
}

/**
 * Splits a polygon along an axis cut line.
 */
export function splitPolygon(poly: Point2D[], axis: 'x' | 'z', coord: number): [Point2D[], Point2D[]] {
  const xs = poly.map((p) => p.x);
  const zs = poly.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  if (axis === 'x') {
    const polyLeft = [
      { x: minX, z: minZ },
      { x: coord, z: minZ },
      { x: coord, z: maxZ },
      { x: minX, z: maxZ },
    ];
    const polyRight = [
      { x: coord, z: minZ },
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
      { x: coord, z: maxZ },
    ];
    return [polyLeft, polyRight];
  } else {
    const polyTop = [
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
      { x: maxX, z: coord },
      { x: minX, z: coord },
    ];
    const polyBottom = [
      { x: minX, z: coord },
      { x: maxX, z: coord },
      { x: maxX, z: maxZ },
      { x: minX, z: maxZ },
    ];
    return [polyTop, polyBottom];
  }
}
