import * as THREE from "three";
import { pointInPolygon } from '@aether/twin-schema';
import { FurnitureFactory } from "../scene-compiler/FurnitureFactory";
import { disposeTree, Manifest, Room, Vec3 } from "./model";
import { Navigation } from "./Navigation";

export interface Placement {
  id: string;
  type: "sofa" | "bed" | "table";
  roomId: string;
  position: Vec3;
  rotation: number;
  origin: Vec3;
}
export class Furniture {
  readonly group = new THREE.Group();
  readonly objects = new Map<string, THREE.Group>();
  placements: Placement[] = [];
  selected: string | null = null;
  constructor(
    readonly key: string,
    readonly modelUrl: string,
    readonly manifest: Manifest,
    readonly nav: Navigation,
  ) {
    this.group.name = "user_furniture";
  }
  room(id: string) {
    return this.manifest.floors
      .flatMap((f) => f.flats.flatMap((u) => u.rooms))
      .find((r) => r.id === id);
  }
  floor(id: string) {
    return this.manifest.floors.find((f) =>
      f.flats.some((u) => u.rooms.some((r) => r.id === id)),
    );
  }
  private make(p: Placement) {
    const object = FurnitureFactory.create(p.type);
    object.userData.furnitureId = p.id;
    object.position.fromArray(p.position);
    object.rotation.y = p.rotation;
    this.group.add(object);
    this.objects.set(p.id, object);
    return object;
  }
  valid(object: THREE.Group, room: Room) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object),
      floor = this.floor(room.id)!;
    const support = this.nav.ground(
      object.position.x,
      object.position.z,
      floor.elevation,
    );
    if (support === undefined || Math.abs(object.position.y - support) > 0.005)
      return false;
    if (
      box.min.x < room.bounds[0][0] + 0.08 ||
      box.max.x > room.bounds[1][0] - 0.08 ||
      box.min.z < room.bounds[0][2] + 0.08 ||
      box.max.z > room.bounds[1][2] - 0.08
    )
      return false;
    if (!this.nav.placementClear(box)) return false;
    if (room.footprint) {
      for (const x of [box.min.x,box.max.x]) for (const z of [box.min.z,box.max.z]) {
        if (!pointInPolygon([x,z],room.footprint)) return false;
      }
      const crossesBox = ([a,b]: [number[],number[]]) => {
        let low=0,high=1;
        for (let axis=0;axis<2;axis++) {
          const min=axis===0?box.min.x:box.min.z,max=axis===0?box.max.x:box.max.z,d=b[axis]-a[axis];
          if (Math.abs(d)<1e-10) { if (a[axis]<=min||a[axis]>=max) return false; }
          else { const t0=(min-a[axis])/d,t1=(max-a[axis])/d;low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1)); }
        }
        return low<high && high>0 && low<1;
      };
      if ([room.footprint.outer,...room.footprint.holes].some(ring=>ring.some((a,i)=>crossesBox([a,ring[(i+1)%ring.length]])))) return false;
    }
    for (const x of [box.min.x, box.max.x])
      for (const z of [box.min.z, box.max.z])
        if (this.nav.ground(x, z, floor.elevation) === undefined) return false;
    return Array.from(this.objects.values()).every(
      (other) =>
        other === object ||
        !new THREE.Box3().setFromObject(other).intersectsBox(box),
    );
  }
  add(type: Placement["type"], room: Room) {
    const elevation = this.floor(room.id)!.elevation;
    const p: Placement = {
      id: crypto.randomUUID(),
      type,
      roomId: room.id,
      position: [room.cameraSpawn[0], elevation, room.cameraSpawn[2]],
      rotation: 0,
      origin: [0, 0, 0],
    };
    const object = this.make(p);
    const attempts: Vec3[] = [p.position];
    for (let x = room.bounds[0][0] + 1.4; x < room.bounds[1][0] - 1.3; x += 0.6)
      for (let z = room.bounds[0][2] + 1; z < room.bounds[1][2] - 0.8; z += 0.6)
        attempts.push([x, elevation, z]);
    for (const point of attempts) {
      const y = this.nav.ground(point[0], point[2], elevation);
      if (y === undefined) continue;
      object.position.set(point[0], y, point[2]);
      if (this.valid(object, room)) {
        p.position = object.position.toArray() as Vec3;
        p.origin = [...p.position];
        this.placements.push(p);
        this.selected = p.id;
        return p;
      }
    }
    disposeTree(object);
    this.objects.delete(p.id);
    throw new Error(
      "No clear space for this furniture in the selected room. Try a larger room.",
    );
  }
  transform(id: string, position?: Vec3, rotation?: number) {
    const p = this.placements.find((p) => p.id === id),
      object = this.objects.get(id);
    if (!p || !object) return false;
    const before = object.position.clone(),
      angle = object.rotation.y;
    if (position) {
      const y = this.nav.ground(
        position[0],
        position[2],
        this.floor(p.roomId)!.elevation,
      );
      if (y === undefined) return false;
      object.position.set(position[0], y, position[2]);
    }
    if (rotation !== undefined) object.rotation.y = rotation;
    if (!this.valid(object, this.room(p.roomId)!)) {
      object.position.copy(before);
      object.rotation.y = angle;
      object.updateMatrixWorld(true);
      return false;
    }
    p.position = object.position.toArray() as Vec3;
    p.rotation = object.rotation.y;
    return true;
  }
  delete(id: string) {
    const o = this.objects.get(id);
    if (o) disposeTree(o);
    this.objects.delete(id);
    this.placements = this.placements.filter((p) => p.id !== id);
    this.selected = null;
  }
  reset(id: string) {
    const p = this.placements.find((p) => p.id === id);
    return p ? this.transform(id, p.origin, 0) : false;
  }
  save() {
    localStorage.setItem(
      this.key,
      JSON.stringify({
        version: 1,
        modelId: this.manifest.modelId,
        modelUrl: this.modelUrl,
        placements: this.placements,
      }),
    );
  }
  restore() {
    const raw = localStorage.getItem(this.key);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      data.modelId !== this.manifest.modelId ||
      data.modelUrl !== this.modelUrl ||
      !Array.isArray(data.placements) ||
      data.placements.length > 100
    )
      throw new Error("Saved configuration is incompatible with this model.");
    const restored: Placement[] = [];
    const ids = new Set<string>();
    const vector = (v: unknown): v is Vec3 =>
      Array.isArray(v) &&
      v.length === 3 &&
      v.every(
        (x) =>
          typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 10000,
      );
    for (const p of data.placements) {
      if (
        typeof p.id !== "string" ||
        ids.has(p.id) ||
        !["sofa", "bed", "table"].includes(p.type) ||
        !this.room(p.roomId) ||
        !vector(p.position) ||
        !vector(p.origin) ||
        !Number.isFinite(p.rotation)
      )
        throw new Error("Saved furniture contains invalid transformations.");
      ids.add(p.id);
      restored.push(p);
    }
    const added: string[] = [];
    try {
      for (const p of restored) {
        const o = this.make(p);
        added.push(p.id);
        if (!this.valid(o, this.room(p.roomId)!))
          throw new Error(
            "Saved furniture conflicts with the current building.",
          );
        this.placements.push(p);
      }
    } catch (e) {
      added.forEach((id) => this.delete(id));
      throw e;
    }
    return restored.length;
  }
  dispose() {
    disposeTree(this.group);
    this.objects.clear();
    this.placements = [];
  }
}
