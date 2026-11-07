import * as THREE from "three";
import { SceneIndex, visible } from "./model";

/** Swept horizontal body probes with short substeps; floor/ceiling triangles supply support. */
export class Navigation {
  readonly radius = 0.22;
  readonly eyeHeight = 1.65;
  readonly ray = new THREE.Raycaster();
  private boxes = new Map<THREE.Mesh, THREE.Box3>();
  private obstacles: THREE.Mesh[];
  private nearby: THREE.Mesh[] = [];
  private hits: THREE.Intersection[] = [];
  private origin = new THREE.Vector3();
  private down = new THREE.Vector3(0, -1, 0);
  private up = new THREE.Vector3(0, 1, 0);
  private next = new THREE.Vector3();
  private step = new THREE.Vector3();
  private directions = Array.from(
    { length: 8 },
    (_, a) =>
      new THREE.Vector3(
        Math.cos((a * Math.PI) / 4),
        0,
        Math.sin((a * Math.PI) / 4),
      ),
  );
  constructor(readonly index: SceneIndex) {
    this.obstacles = [...new Set([...index.walls, ...index.doors])];
    // Architecture is static; reuse world bounds for broad-phase collision checks.
    new Set([...this.obstacles, ...index.floors, ...index.ceilings]).forEach(
      (m) => {
        this.boxes.set(m, new THREE.Box3().setFromObject(m));
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      },
    );
  }
  candidates(position: THREE.Vector3, distance = 2, target: THREE.Mesh[] = []) {
    target.length = 0;
    for (const m of this.obstacles) {
      if (
        visible(m) &&
        this.boxes.get(m)!.distanceToPoint(position) < distance + this.eyeHeight
      )
        target.push(m);
    }
    return target;
  }
  private intersects(objects: THREE.Mesh[]) {
    this.hits.length = 0;
    return this.ray.intersectObjects(objects, false, this.hits);
  }
  private verticalCandidates(
    objects: THREE.Mesh[],
    x: number,
    z: number,
    minY: number,
    maxY: number,
  ) {
    this.nearby.length = 0;
    for (const mesh of objects) {
      const box = this.boxes.get(mesh)!;
      if (
        visible(mesh) &&
        x >= box.min.x - 0.001 &&
        x <= box.max.x + 0.001 &&
        z >= box.min.z - 0.001 &&
        z <= box.max.z + 0.001 &&
        box.max.y >= minY &&
        box.min.y <= maxY
      )
        this.nearby.push(mesh);
    }
    return this.nearby;
  }
  ground(x: number, z: number, elevation: number) {
    this.ray.set(this.origin.set(x, elevation + 0.25, z), this.down);
    this.ray.near = 0;
    this.ray.far = 0.55;
    return this.intersects(
      this.verticalCandidates(
        this.index.floors,
        x,
        z,
        elevation - 0.3,
        elevation + 0.25,
      ),
    ).find((h) => Math.abs(h.point.y - elevation) < 0.23)?.point.y;
  }
  fits(position: THREE.Vector3, elevation: number) {
    return this.standingHeight(position, elevation) !== undefined;
  }
  private standingHeight(position: THREE.Vector3, elevation: number) {
    const ground = this.ground(position.x, position.z, elevation);
    if (ground === undefined) return undefined;
    const candidates = this.candidates(position, this.radius, this.nearby);
    for (const y of [0.25, 0.85, 1.5])
      for (const direction of this.directions) {
        this.ray.set(
          this.origin.set(position.x, ground + y, position.z),
          direction,
        );
        this.ray.far = this.radius;
        if (this.intersects(candidates).length) return undefined;
      }
    this.ray.set(
      this.origin.set(position.x, ground + 0.1, position.z),
      this.up,
    );
    this.ray.far = 1.75;
    if (
      this.intersects(
        this.verticalCandidates(
          this.index.ceilings,
          position.x,
          position.z,
          ground + 0.1,
          ground + 1.85,
        ),
      ).length
    )
      return undefined;
    return ground;
  }
  move(position: THREE.Vector3, offset: THREE.Vector3, elevation: number) {
    const steps = Math.max(1, Math.ceil(offset.length() / 0.08));
    const step = this.step.copy(offset).divideScalar(steps);
    for (let i = 0; i < steps; i++)
      for (const axis of ["x", "z"] as const) {
        if (!step[axis]) continue;
        const next = this.next.copy(position);
        next[axis] += step[axis];
        const ground = this.standingHeight(next, elevation);
        if (ground !== undefined) {
          next.y = ground + this.eyeHeight;
          position.copy(next);
        }
      }
  }
  placementClear(box: THREE.Box3) {
    return this.obstacles.every(
      (m) => !visible(m) || !this.boxes.get(m)!.intersectsBox(box),
    );
  }
}
