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

export interface TowerCompilationResult {
  group: THREE.Group;
  floorGroups: Map<string, THREE.Group>;
  floorNumberMap: Map<number, THREE.Group>;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    width: number;
    depth: number;
    centerX: number;
    centerZ: number;
    totalHeight: number;
  };
}

export class TowerCompiler {
  static compile(floorsInfo: TowerFloorInfo[]): TowerCompilationResult {
    const towerGroup = new THREE.Group();
    towerGroup.name = 'compiled_tower';

    const floorGroupsMap = new Map<string, THREE.Group>();
    const floorNumberMap = new Map<number, THREE.Group>();

    const emptyBounds = {
      minX: -10,
      maxX: 10,
      minZ: -10,
      maxZ: 10,
      width: 20,
      depth: 20,
      centerX: 0,
      centerZ: 0,
      totalHeight: 0,
    };

    if (floorsInfo.length === 0) {
      return {
        group: towerGroup,
        floorGroups: floorGroupsMap,
        floorNumberMap,
        bounds: emptyBounds,
      };
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

    if (minX === Infinity) {
      minX = -12; maxX = 12;
      minZ = -10; maxZ = 10;
    }

    const towerWidth = maxX - minX;
    const towerDepth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Materials
    const slabMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569, // Modern slate slab edge
      roughness: 0.7,
      metalness: 0.15,
    });

    const columnMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155, // Architectural dark bronze/charcoal columns
      roughness: 0.5,
      metalness: 0.3,
    });

    const parapetMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f4f0, // Matching walls
      roughness: 0.8,
      metalness: 0.05,
    });

    let currentElevation = 0;
    const slabThickness = 0.25;

    // 1. Foundation Slab (below ground floor, at y = -0.25)
    const foundationThickness = 0.5;
    const foundationGeo = new THREE.BoxGeometry(towerWidth + 1.2, foundationThickness, towerDepth + 1.2);
    const foundationMesh = new THREE.Mesh(foundationGeo, slabMaterial);
    foundationMesh.position.set(centerX, -foundationThickness / 2, centerZ);
    foundationMesh.receiveShadow = true;
    towerGroup.add(foundationMesh);

    // 2. Render each floor with its custom layout (2BHK, 3BHK, 4BHK, Lobby)
    sorted.forEach(({ floor, structureJson }, idx) => {
      const height = Number(floor.floorHeight) || 3.0;

      const floorGroup = new THREE.Group();
      floorGroup.name = `floor_group_level_${floor.floorNumber}`;
      floorGroup.userData = {
        floorId: floor.id,
        floorNumber: floor.floorNumber,
        floorHeight: height,
        baseElevation: currentElevation,
        flatType: floor.flatType,
        unitsPerFloor: floor.unitsPerFloor,
        description: floor.description,
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

      // Middle slab between floors
      const isTopFloor = idx === sorted.length - 1;
      const midSlabGeo = new THREE.BoxGeometry(towerWidth + 0.5, slabThickness, towerDepth + 0.5);
      const midSlabMesh = new THREE.Mesh(midSlabGeo, slabMaterial);
      midSlabMesh.userData.type = 'ceiling';
      midSlabMesh.position.set(centerX, currentElevation + height + slabThickness / 2, centerZ);
      midSlabMesh.receiveShadow = true;
      midSlabMesh.castShadow = true;
      floorGroup.add(midSlabMesh);

      // Four Corner Structural Piers for architectural strength
      const colSize = 0.4;
      const colHalfH = height / 2;
      const cornerPositions = [
        [minX - 0.1, minZ - 0.1],
        [maxX + 0.1, minZ - 0.1],
        [minX - 0.1, maxZ + 0.1],
        [maxX + 0.1, maxZ + 0.1],
      ];

      cornerPositions.forEach(([cx, cz]) => {
        const colGeo = new THREE.BoxGeometry(colSize, height, colSize);
        const colMesh = new THREE.Mesh(colGeo, columnMaterial);
        colMesh.position.set(cx, currentElevation + colHalfH, cz);
        colMesh.castShadow = true;
        colMesh.receiveShadow = true;
        floorGroup.add(colMesh);
      });

      if (isTopFloor) {
        // Roof Parapet Walls
        const parapetHeight = 1.1;
        const parapetThickness = 0.2;
        const parapetGroup = new THREE.Group();
        parapetGroup.name = 'parapet_walls';

        const yPos = currentElevation + height + slabThickness + parapetHeight / 2;

        // North wall
        const nGeo = new THREE.BoxGeometry(towerWidth + 0.5, parapetHeight, parapetThickness);
        const nMesh = new THREE.Mesh(nGeo, parapetMaterial);
        nMesh.position.set(centerX, yPos, minZ - 0.25 + parapetThickness / 2);
        parapetGroup.add(nMesh);

        // South wall
        const sGeo = new THREE.BoxGeometry(towerWidth + 0.5, parapetHeight, parapetThickness);
        const sMesh = new THREE.Mesh(sGeo, parapetMaterial);
        sMesh.position.set(centerX, yPos, maxZ + 0.25 - parapetThickness / 2);
        parapetGroup.add(sMesh);

        // East wall
        const eGeo = new THREE.BoxGeometry(parapetThickness, parapetHeight, towerDepth + 0.5 - 2 * parapetThickness);
        const eMesh = new THREE.Mesh(eGeo, parapetMaterial);
        eMesh.position.set(maxX + 0.25 - parapetThickness / 2, yPos, centerZ);
        parapetGroup.add(eMesh);

        // West wall
        const wGeo = new THREE.BoxGeometry(parapetThickness, parapetHeight, towerDepth + 0.5 - 2 * parapetThickness);
        const wMesh = new THREE.Mesh(wGeo, parapetMaterial);
        wMesh.position.set(minX - 0.25 + parapetThickness / 2, yPos, centerZ);
        parapetGroup.add(wMesh);

        floorGroup.add(parapetGroup);
      }

      towerGroup.add(floorGroup);
      floorGroupsMap.set(floor.id, floorGroup);
      floorNumberMap.set(floor.floorNumber, floorGroup);

      currentElevation += height + slabThickness;
    });

    return {
      group: towerGroup,
      floorGroups: floorGroupsMap,
      floorNumberMap,
      bounds: {
        minX,
        maxX,
        minZ,
        maxZ,
        width: towerWidth,
        depth: towerDepth,
        centerX,
        centerZ,
        totalHeight: currentElevation,
      },
    };
  }
}
