import * as THREE from 'three';
import { SceneCompiler } from './SceneCompiler';

export interface FloorData {
  id: string;
  floorNumber: number;
  floorHeight: number;
  floorplanId?: string;
  flatType?: string;
  unitsPerFloor?: number;
  description?: string;
}

export interface TowerFloorInfo {
  floor: FloorData;
  structureJson: any;
}

export class TowerCompiler {
  static compile(floorsInfo: TowerFloorInfo[]): { group: THREE.Group; floorGroups: Map<string, THREE.Group> } {
    const towerGroup = new THREE.Group();
    towerGroup.name = 'compiled_tower';

    const floorGroupsMap = new Map<string, THREE.Group>();

    if (floorsInfo.length === 0) {
      return { group: towerGroup, floorGroups: floorGroupsMap };
    }

    // Sort by floor number ascending
    const sorted = [...floorsInfo].sort((a, b) => a.floor.floorNumber - b.floor.floorNumber);

    // Compute bounding box footprint across all floors to make uniform slabs
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    sorted.forEach(({ structureJson }) => {
      if (!structureJson) return;
      const rooms = structureJson.rooms || [];
      const walls = structureJson.walls || [];

      rooms.forEach((r: any) => {
        const width = r.width || 0;
        const depth = r.depth || 0;
        const cx = r.node?.x ?? (r.x + width / 2);
        const cz = r.node?.z ?? (r.z + depth / 2);
        minX = Math.min(minX, cx - width / 2);
        maxX = Math.max(maxX, cx + width / 2);
        minZ = Math.min(minZ, cz - depth / 2);
        maxZ = Math.max(maxZ, cz + depth / 2);
      });

      walls.forEach((w: any) => {
        minX = Math.min(minX, w.startX, w.endX);
        maxX = Math.max(maxX, w.startX, w.endX);
        minZ = Math.min(minZ, w.startZ, w.endZ);
        maxZ = Math.max(maxZ, w.startZ, w.endZ);
      });
    });

    // Fallback if no valid geometry was found
    if (minX === Infinity) {
      minX = -10; maxX = 10;
      minZ = -10; maxZ = 10;
    }

    const towerWidth = maxX - minX;
    const towerDepth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Materials
    const slabMaterial = new THREE.MeshStandardMaterial({
      color: 0x6e7682, // Concrete gray
      roughness: 0.8,
      metalness: 0.1,
    });

    const parapetMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f4f0, // Matching walls
      roughness: 0.8,
      metalness: 0.05,
    });

    // Keep track of current elevation
    let currentElevation = 0;

    // 1. Foundation Slab (below ground floor, i.e., at currentElevation = 0, thickness 0.5m)
    const foundationThickness = 0.5;
    const foundationGeo = new THREE.BoxGeometry(towerWidth + 0.8, foundationThickness, towerDepth + 0.8);
    const foundationMesh = new THREE.Mesh(foundationGeo, slabMaterial);
    foundationMesh.position.set(centerX, -foundationThickness / 2, centerZ);
    foundationMesh.receiveShadow = true;
    towerGroup.add(foundationMesh);

    // Render floor groups
    sorted.forEach(({ floor, structureJson }, idx) => {
      const height = Number(floor.floorHeight) || 3.0;

      // Compile this floor plan
      const floorGroup = new THREE.Group();
      floorGroup.name = `floor_group_level_${floor.floorNumber}`;
      floorGroup.userData = {
        floorId: floor.id,
        floorNumber: floor.floorNumber,
        floorHeight: height,
        baseElevation: currentElevation,
      };

      if (structureJson) {
        const compiler = new SceneCompiler({
          structureJson,
          wallHeight: height,
          floorElevation: currentElevation,
        });
        const compiled = compiler.compile();
        floorGroup.add(compiled);
      }

      // Add middle slabs (concrete floor/ceiling slab between floors, thickness 0.25m)
      // We place the slab at the CEILING of this floor (i.e. at currentElevation + height)
      const isTopFloor = idx === sorted.length - 1;
      const slabThickness = 0.25;
      
      const midSlabGeo = new THREE.BoxGeometry(towerWidth + 0.4, slabThickness, towerDepth + 0.4);
      const midSlabMesh = new THREE.Mesh(midSlabGeo, slabMaterial);
      midSlabMesh.position.set(centerX, currentElevation + height + slabThickness / 2, centerZ);
      midSlabMesh.receiveShadow = true;
      midSlabMesh.castShadow = true;
      floorGroup.add(midSlabMesh);

      if (isTopFloor) {
        // Roof Slab and Parapet
        const parapetHeight = 1.0;
        const parapetThickness = 0.2;
        const parapetGroup = new THREE.Group();
        parapetGroup.name = 'parapet_walls';

        const yPos = currentElevation + height + slabThickness + parapetHeight / 2;

        // North wall
        const nGeo = new THREE.BoxGeometry(towerWidth + 0.4, parapetHeight, parapetThickness);
        const nMesh = new THREE.Mesh(nGeo, parapetMaterial);
        nMesh.position.set(centerX, yPos, centerZ - towerDepth / 2 - 0.2 + parapetThickness / 2);
        parapetGroup.add(nMesh);

        // South wall
        const sGeo = new THREE.BoxGeometry(towerWidth + 0.4, parapetHeight, parapetThickness);
        const sMesh = new THREE.Mesh(sGeo, parapetMaterial);
        sMesh.position.set(centerX, yPos, centerZ + towerDepth / 2 + 0.2 - parapetThickness / 2);
        parapetGroup.add(sMesh);

        // East wall
        const eGeo = new THREE.BoxGeometry(parapetThickness, parapetHeight, towerDepth + 0.4 - 2 * parapetThickness);
        const eMesh = new THREE.Mesh(eGeo, parapetMaterial);
        eMesh.position.set(centerX + towerWidth / 2 + 0.2 - parapetThickness / 2, yPos, centerZ);
        parapetGroup.add(eMesh);

        // West wall
        const wGeo = new THREE.BoxGeometry(parapetThickness, parapetHeight, towerDepth + 0.4 - 2 * parapetThickness);
        const wMesh = new THREE.Mesh(wGeo, parapetMaterial);
        wMesh.position.set(centerX - towerWidth / 2 - 0.2 + parapetThickness / 2, yPos, centerZ);
        parapetGroup.add(wMesh);

        floorGroup.add(parapetGroup);
      }

      towerGroup.add(floorGroup);
      floorGroupsMap.set(floor.id, floorGroup);

      // Increment elevation for the next floor
      currentElevation += height + slabThickness;
    });

    return { group: towerGroup, floorGroups: floorGroupsMap };
  }
}
