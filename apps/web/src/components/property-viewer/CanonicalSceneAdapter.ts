import * as THREE from "three";
import {
  assertCanonicalTwin,
  CanonicalTwinV1,
  Polygon2D,
  TwinObject,
} from "@aether/twin-schema";
import { Manifest, validateManifest, Vec3 } from "./model";

/** Presentation producer. Geometry, hosts and spawns come from the approved revision. */
export function canonicalScene(twin: CanonicalTwinV1): {
  root: THREE.Group;
  manifest: Manifest;
} {
  assertCanonicalTwin(twin, true);
  const root = new THREE.Group();
  root.name = `canonical_${twin.revision.id}`;
  root.userData = {
    revisionId: twin.revision.id,
    sourceAssetId: twin.source.assetId,
  };
  const floor = twin.floors[0];
  const floorGroup = new THREE.Group();
  floorGroup.name = `floor_${floor.id}`;
  floorGroup.userData.floorId = floor.id;
  root.add(floorGroup);
  const manifest: Manifest = {
    version: 1,
    modelId: twin.revision.id,
    modelUrl: `canonical:${twin.revision.id}`,
    name: twin.building.name,
    units: "meters",
    upAxis: "Y",
    revisionId: twin.revision.id,
    sourceAssetId: twin.source.assetId,
    elements: [],
    floors: [],
  };
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9e5df,
    roughness: 0.85,
  });
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xc4b9a9,
    roughness: 0.8,
  });
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f2ed,
    roughness: 0.9,
    side: THREE.BackSide,
  });
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x775238,
    roughness: 0.65,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ac5db,
    transparent: true,
    opacity: 0.5,
    roughness: 0.15,
  });
  function tag(mesh: THREE.Mesh, obj: TwinObject, type: string, part: string) {
    mesh.name = `${obj.id}_${part}`;
    mesh.userData = {
      type,
      canonicalObjectId: obj.id,
      revisionId: twin.revision.id,
      sourceAssetId: twin.source.assetId,
      floorId: floor.id,
      sourceRefs: obj.sourceRefs,
      evidence: obj.evidence,
    };
    mesh.castShadow = type !== "floor";
    mesh.receiveShadow = true;
    floorGroup.add(mesh);
    manifest.elements.push({
      id: mesh.name,
      type,
      floorId: floor.id,
      nodeNames: [mesh.name],
      canonicalObjectId: obj.id,
      revisionId: twin.revision.id,
    });
  }
  function polygonGeometry(p: Polygon2D) {
    const shape = new THREE.Shape(
      p.outer.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    shape.holes = p.holes.map(
      (h) => new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))),
    );
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    return geometry;
  }
  for (const slab of twin.slabs) {
    const mesh = new THREE.Mesh(
      polygonGeometry(slab.footprint),
      slab.role === "floor" ? floorMaterial : ceilingMaterial,
    );
    mesh.position.y = slab.elevationM;
    tag(mesh, slab, slab.role, "surface");
    mesh.userData.roomId = slab.roomId;
    mesh.userData.isFloor = slab.role === "floor";
  }
  for (const wall of twin.walls) {
    const dx = wall.end[0] - wall.start[0],
      dz = wall.end[1] - wall.start[1],
      length = Math.hypot(dx, dz),
      angle = Math.atan2(dz, dx);
    const openings = twin.openings.filter((o) => o.hostWallId === wall.id);
    const cuts = [
      ...new Set([
        0,
        length,
        ...openings.flatMap((o) => [o.startOffsetM, o.startOffsetM + o.widthM]),
      ]),
    ].sort((a, b) => a - b);
    let part = 0;
    for (let i = 0; i < cuts.length - 1; i++) {
      const x0 = cuts[i],
        x1 = cuts[i + 1],
        center = (x0 + x1) / 2;
      const holes = openings.filter(
        (o) => center > o.startOffsetM && center < o.startOffsetM + o.widthM,
      );
      const levels = [
        ...new Set([
          0,
          wall.heightM,
          ...holes.flatMap((o) => [o.sillM, o.sillM + o.heightM]),
        ]),
      ].sort((a, b) => a - b);
      for (let j = 0; j < levels.length - 1; j++) {
        const bottom = levels[j],
          top = levels[j + 1],
          middle = (bottom + top) / 2;
        if (
          x1 - x0 < 1e-7 ||
          top - bottom < 1e-7 ||
          holes.some((o) => middle > o.sillM && middle < o.sillM + o.heightM)
        )
          continue;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(x1 - x0, top - bottom, wall.thicknessM),
          wallMaterial,
        );
        mesh.position.set(
          wall.start[0] + (dx * center) / length,
          wall.baseElevationM + middle,
          wall.start[1] + (dz * center) / length,
        );
        mesh.rotation.y = -angle;
        tag(mesh, wall, "wall", String(part++));
      }
    }
    for (const o of openings) {
      const center = o.startOffsetM + o.widthM / 2;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          o.widthM,
          o.heightM,
          o.kind === "door" ? 0.04 : 0.025,
        ),
        o.kind === "door" ? doorMaterial : windowMaterial,
      );
      mesh.position.set(
        wall.start[0] + (dx * center) / length,
        wall.baseElevationM + o.sillM + o.heightM / 2,
        wall.start[1] + (dz * center) / length,
      );
      mesh.rotation.y = -angle;
      tag(
        mesh,
        o,
        o.kind === "door" && !o.passable ? "collision" : o.kind,
        "panel",
      );
      mesh.userData.openingKind = o.kind;
      mesh.userData.passable = o.passable;
    }
  }
  manifest.floors = [
    {
      id: floor.id,
      name: floor.name,
      elevation: floor.elevationM,
      nodeNames: [floorGroup.name],
      flats: [
        {
          id: `${floor.id}:unassigned`,
          name: "Reviewed rooms (units unassigned)",
          nodeNames: [],
          rooms: twin.rooms.map((r) => {
            const xs = r.footprint.outer.map((p) => p[0]),
              zs = r.footprint.outer.map((p) => p[1]);
            return {
              id: r.id,
              name: r.name,
              nodeNames: twin.slabs
                .filter((s) => s.roomId === r.id)
                .map((s) => `${s.id}_surface`),
              bounds: [
                [Math.min(...xs), floor.elevationM, Math.min(...zs)],
                [
                  Math.max(...xs),
                  floor.elevationM + floor.heightM,
                  Math.max(...zs),
                ],
              ] as [Vec3, Vec3],
              cameraSpawn: r.spawn! as Vec3,
              footprint: r.footprint,
              revisionId: twin.revision.id,
            };
          }),
        },
      ],
    },
  ];
  root.updateMatrixWorld(true);
  return { root, manifest: validateManifest(manifest, root) };
}
