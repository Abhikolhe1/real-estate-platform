import * as THREE from "three";
import { SceneIndex, visible } from "./model";

/** Swept horizontal body probes with short substeps; floor/ceiling triangles supply support. */
export class Navigation {
  readonly radius = 0.22;
  readonly eyeHeight = 1.65;
  readonly ray = new THREE.Raycaster();
  private boxes = new Map<THREE.Mesh, THREE.Box3>();
  constructor(readonly index: SceneIndex) {
    [...index.walls, ...index.doors].forEach((m) =>
      this.boxes.set(m, new THREE.Box3().setFromObject(m)),
    );
  }
  candidates(position: THREE.Vector3, distance = 2) {
    return [...this.index.walls, ...this.index.doors].filter(
      (m) =>
        visible(m) &&
        this.boxes.get(m)!.distanceToPoint(position) <
          distance + this.eyeHeight,
    );
  }
  ground(x: number, z: number, elevation: number) {
    this.ray.set(
      new THREE.Vector3(x, elevation + 0.25, z),
      new THREE.Vector3(0, -1, 0),
    );
    this.ray.near = 0;
    this.ray.far = 0.55;
    return this.ray
      .intersectObjects(this.index.floors.filter(visible), false)
      .find((h) => Math.abs(h.point.y - elevation) < 0.23)?.point.y;
  }
  fits(position: THREE.Vector3, elevation: number) {
    const ground = this.ground(position.x, position.z, elevation);
    if (ground === undefined) return false;
    const candidates = this.candidates(position);
    for (const y of [0.25, 0.85, 1.5])
      for (let a = 0; a < 8; a++) {
        this.ray.set(
          new THREE.Vector3(position.x, ground + y, position.z),
          new THREE.Vector3(
            Math.cos((a * Math.PI) / 4),
            0,
            Math.sin((a * Math.PI) / 4),
          ),
        );
        this.ray.far = this.radius;
        if (this.ray.intersectObjects(candidates, false).length) return false;
      }
    this.ray.set(
      new THREE.Vector3(position.x, ground + 0.1, position.z),
      new THREE.Vector3(0, 1, 0),
    );
    this.ray.far = 1.75;
    if (
      this.ray.intersectObjects(this.index.ceilings.filter(visible), false)
        .length
    )
      return false;
    return true;
  }
  move(position: THREE.Vector3, offset: THREE.Vector3, elevation: number) {
    const steps = Math.max(1, Math.ceil(offset.length() / 0.08));
    const step = offset.clone().divideScalar(steps);
    for (let i = 0; i < steps; i++)
      for (const axis of ["x", "z"] as const) {
        if (!step[axis]) continue;
        const next = position.clone();
        next[axis] += step[axis];
        if (this.fits(next, elevation)) {
          next.y = this.ground(next.x, next.z, elevation)! + this.eyeHeight;
          position.copy(next);
        }
      }
  }
  placementClear(box: THREE.Box3) {
    return [...this.index.walls, ...this.index.doors].every(
      (m) => !visible(m) || !this.boxes.get(m)!.intersectsBox(box),
    );
  }
}
