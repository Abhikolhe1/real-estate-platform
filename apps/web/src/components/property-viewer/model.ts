import * as THREE from "three";
import type { CanonicalTwinV1, Polygon2D } from '@aether/twin-schema';

export type Vec3 = [number, number, number];
export interface Room {
  footprint?: Polygon2D;
  revisionId?: string;
  id: string;
  name: string;
  nodeNames: string[];
  bounds: [Vec3, Vec3];
  cameraSpawn: Vec3;
}
export interface Flat {
  id: string;
  name: string;
  nodeNames: string[];
  rooms: Room[];
}
export interface Floor {
  id: string;
  name: string;
  elevation: number;
  nodeNames: string[];
  flats: Flat[];
}
export interface Element {
  canonicalObjectId?: string;
  revisionId?: string;
  id: string;
  type: string;
  floorId: string | null;
  nodeNames: string[];
  bounds?: [Vec3, Vec3];
}
export interface Manifest {
  revisionId?: string;
  sourceAssetId?: string;
  version: 1;
  modelId: string;
  modelUrl: string;
  name: string;
  units: "meters" | "millimeters";
  upAxis: "Y";
  floors: Floor[];
  elements: Element[];
  attribution?: string;
}
export interface ModelSource {
  canonical?: CanonicalTwinV1;
  id: string;
  projectId: string;
  name: string;
  modelUrl: string;
  manifestUrl?: string;
  proceduralDemo?: boolean;
  layout?: any;
  floors?: any[];
}
export const sampleSource: ModelSource = {
  id: "bsi-duplex-v1",
  projectId: "demo-duplex",
  name: "Duplex Apartment · IFC sample",
  modelUrl: "/models/duplex/duplex.glb",
  manifestUrl: "/models/duplex/manifest.json",
};

export function assetUrl(value: string, extension: RegExp): string {
  const url = new URL(value, window.location.href);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !extension.test(url.pathname)
  )
    throw new Error(
      "Use an HTTP(S) GLB/GLTF or manifest URL with the expected extension.",
    );
  if (location.protocol === "https:" && url.protocol !== "https:")
    throw new Error("HTTPS pages require HTTPS assets.");
  return url.href;
}

export function validateManifest(
  data: unknown,
  root?: THREE.Object3D,
): Manifest {
  const m = data as Manifest;
  const fail = (message: string): never => {
    throw new Error(`Invalid model manifest: ${message}`);
  };
  if (
    !m ||
    m.version !== 1 ||
    !m.modelId ||
    !["meters", "millimeters"].includes(m.units) ||
    m.upAxis !== "Y" ||
    !Array.isArray(m.floors) ||
    !Array.isArray(m.elements)
  )
    fail("version, units, Y-up convention, floors and elements are required");
  const names = new Set<string>();
  root?.traverse((n) => names.add(n.name));
  const ids = new Set<string>();
  const id = (s: string) => {
    if (!s || ids.has(s)) fail(`duplicate/missing ID ${s}`);
    ids.add(s);
  };
  const refs = (v: string[]) => {
    if (
      !Array.isArray(v) ||
      v.some((n) => typeof n !== "string" || (root && !names.has(n)))
    )
      fail("nodeNames reference missing scene nodes");
  };
  const vector = (v: number[]) =>
    Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  m.floors.forEach((f) => {
    id(f.id);
    if (!Number.isFinite(f.elevation) || !Array.isArray(f.flats))
      fail("floor elevation/flats");
    refs(f.nodeNames);
    const flats = new Set<string>();
    f.flats.forEach((u) => {
      if (flats.has(u.id)) fail("duplicate unit");
      flats.add(u.id);
      refs(u.nodeNames);
      if (!Array.isArray(u.rooms)) fail("rooms");
      u.rooms.forEach((r) => {
        id(r.id);
        refs(r.nodeNames);
        if (
          !vector(r.cameraSpawn) ||
          !Array.isArray(r.bounds) ||
          r.bounds.length !== 2 ||
          !r.bounds.every(vector) ||
          r.bounds[0].some((v, i) => v >= r.bounds[1][i])
        )
          fail("room bounds/spawn");
        if (
          r.cameraSpawn.some((v, i) => v < r.bounds[0][i] || v > r.bounds[1][i])
        )
          fail("room spawn outside space");
      });
    });
  });
  m.elements.forEach((e) => {
    refs(e.nodeNames);
    if (e.floorId && !m.floors.some((f) => f.id === e.floorId))
      fail("unknown element floor");
  });
  return m;
}

/** Material/texture caches have application ownership; everything else is subtree-owned. */
export function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const candidate of [
      mesh.material,
      object.userData.originalMaterial,
      object.userData.inventoryOriginalMaterial,
      object.userData.transparentMaterial,
    ]) {
      if (candidate)
        (Array.isArray(candidate) ? candidate : [candidate]).forEach((m) =>
          materials.add(m),
        );
    }
  });
  materials.forEach((m) => {
    if (m.userData.shared) return;
    Object.values(m).forEach((t) => {
      if (t instanceof THREE.Texture && !t.userData.shared) textures.add(t);
    });
    m.dispose();
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => {
    t.dispose();
    if (typeof ImageBitmap !== "undefined" && t.image instanceof ImageBitmap)
      t.image.close();
  });
  root.removeFromParent();
}

export function visible(object: THREE.Object3D): boolean {
  let n: THREE.Object3D | null = object;
  while (n) {
    if (!n.visible) return false;
    n = n.parent;
  }
  return true;
}

export class SceneIndex {
  meshes: THREE.Mesh[] = [];
  walls: THREE.Mesh[] = [];
  floors: THREE.Mesh[] = [];
  ceilings: THREE.Mesh[] = [];
  doors: THREE.Mesh[] = [];
  nodes: THREE.Mesh[] = [];
  byFloor = new Map<string, THREE.Object3D[]>();
  byRoom = new Map<string, THREE.Mesh[]>();
  byFlat = new Map<string, THREE.Mesh[]>();
  constructor(root: THREE.Object3D, manifest?: Manifest) {
    const metadata = new Map<string, Element>();
    manifest?.elements.forEach((e) =>
      e.nodeNames.forEach((n) => metadata.set(n, e)),
    );
    const floorNames = new Map<string, string>(),
      flatNames = new Map<string, string>(),
      roomNames = new Map<string, string>();
    manifest?.floors.forEach((f) => {
      f.nodeNames.forEach((n) => floorNames.set(n, f.id));
      f.flats.forEach((u) => {
        u.nodeNames.forEach((n) => flatNames.set(n, u.id));
        u.rooms.forEach((r) =>
          r.nodeNames.forEach((n) => roomNames.set(n, r.id)),
        );
      });
    });
    root.updateMatrixWorld(true);
    root.traverse((n) => {
      if (!(n instanceof THREE.Mesh)) return;
      this.meshes.push(n);
      let p: THREE.Object3D | null = n;
      let element: Element | undefined;
      let floorId: string | undefined,
        roomId: string | undefined,
        flatId: string | undefined,
        door = false;
      let inheritedType: string | undefined;
      while (p && p !== root.parent) {
        element ||= metadata.get(p.name);
        inheritedType ||= p.userData.type;
        floorId ||= floorNames.get(p.name) || p.userData.floorId;
        roomId ||= roomNames.get(p.name) || p.userData.roomId;
        flatId ||= flatNames.get(p.name) || p.userData.flatId;
        door ||= p.userData.type === "door" || p.name.startsWith("doorGroup_");
        p = p.parent;
      }
      const type = element?.type || inheritedType;
      floorId ||= element?.floorId || undefined;
      n.userData.semanticType = type;
      n.userData.floorId = floorId;
      if (
        type?.startsWith("IfcWall") ||
        ["IfcColumn", "IfcMember", "IfcRailing", "IfcWindow"].includes(type || '') ||
        type === "wall" ||
        type === "window" ||
        type === "collision"
      )
        this.walls.push(n);
      if (type === "IfcDoor" || door) this.doors.push(n);
      if (type === "IfcSlab" || n.userData.isFloor || type === "floor")
        this.floors.push(n);
      if (type === "IfcSlab" || type === "IfcCovering" || type === "ceiling")
        this.ceilings.push(n);
      if (n.name.startsWith("node_")) this.nodes.push(n);
      if (floorId)
        this.byFloor.set(floorId, [...(this.byFloor.get(floorId) || []), n]);
      if (roomId)
        this.byRoom.set(roomId, [...(this.byRoom.get(roomId) || []), n]);
      if (flatId)
        this.byFlat.set(flatId, [...(this.byFlat.get(flatId) || []), n]);
    });
  }
}
