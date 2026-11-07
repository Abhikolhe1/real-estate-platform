import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FurnitureFactory } from './FurnitureFactory';
import { AutoPlacer } from './AutoPlacer';
import { TextureGenerator } from './TextureGenerator';

export interface SceneCompilerOptions {
  structureJson: any;
  wallHeight?: number;
  wallThickness?: number;
  floorElevation?: number;
}

export class SceneCompiler {
  private structureJson: any;
  private wallHeight: number;
  private wallThickness: number;
  private floorElevation: number;

  constructor({
    structureJson,
    wallHeight = 3.0,
    wallThickness = 0.15,
    floorElevation = 0,
  }: SceneCompilerOptions) {
    this.structureJson = structureJson;
    this.wallHeight = wallHeight;
    this.wallThickness = wallThickness;
    this.floorElevation = floorElevation;
  }

  compile(): THREE.Group {
    const group = new THREE.Group();
    group.name = `compiled_scene_${Math.random().toString(36).substring(2, 9)}`;

    if (!this.structureJson) return group;

    const walls = this.structureJson.walls || [];
    const rooms = this.structureJson.rooms || [];
    const apertures = this.structureJson.apertures || [];
    let furniture = this.structureJson.furniture || [];

    // Auto-placement fallback if empty
    if (furniture.length === 0 && rooms.length > 0) {
      furniture = AutoPlacer.placeForRooms(rooms);
    }

    const wallsGroup = this.buildWalls(walls);
    const floorGroup = this.buildFloor(rooms);
    const ceilingGroup = this.buildCeiling(rooms);
    const aperturesGroup = this.buildApertures(apertures, walls);
    const furnitureGroup = this.buildFurniture(furniture);

    group.add(wallsGroup);
    group.add(floorGroup);
    group.add(ceilingGroup);
    group.add(aperturesGroup);
    group.add(furnitureGroup);

    return group;
  }

  private buildWalls(walls: any[]): THREE.Group {
    const wallsGroup = new THREE.Group();
    wallsGroup.name = 'walls_layer';

    if (walls.length === 0) return wallsGroup;

    const geometries: THREE.BufferGeometry[] = [];

    // Premium architectural wall finish
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf6f6f4,
      roughness: 0.75,
      metalness: 0.05,
    });

    walls.forEach((wall) => {
      const startX = wall.startX;
      const startZ = wall.startZ;
      const endX = wall.endX;
      const endZ = wall.endZ;
      const thickness = wall.thickness || this.wallThickness;
      const height = wall.height || this.wallHeight;

      const dx = endX - startX;
      const dz = endZ - startZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      if (!Number.isFinite(length) || length < .001) return;
      const openings = (this.structureJson.apertures || []).filter((ap: any) => ap.wallId === wall.id && ap.width > 0 && ap.height > 0);
      const cuts = Array.from(new Set<number>([0, length, ...openings.flatMap((ap: any) => [Math.max(0, Math.min(length, ap.startOffset)), Math.max(0, Math.min(length, ap.startOffset + ap.width))])])).sort((a, b) => a - b);
      const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
      for (let i = 0; i < cuts.length - 1; i++) {
        const x0 = cuts[i], x1 = cuts[i + 1], center = (x0 + x1) / 2;
        const holes = openings.filter((ap: any) => center > ap.startOffset && center < ap.startOffset + ap.width);
        const heights = Array.from(new Set<number>([0, height, ...holes.flatMap((ap: any) => [Math.max(0, Math.min(height, ap.elevation || 0)), Math.max(0, Math.min(height, (ap.elevation || 0) + ap.height))])])).sort((a, b) => a - b);
        for (let j = 0; j < heights.length - 1; j++) {
          const y0 = heights[j], y1 = heights[j + 1], cy = (y0 + y1) / 2;
          if (x1 - x0 < .001 || y1 - y0 < .001 || holes.some((ap: any) => cy > (ap.elevation || 0) && cy < (ap.elevation || 0) + ap.height)) continue;
          const midX = startX + dx * center / length, midZ = startZ + dz * center / length, midY = cy + this.floorElevation;
          const boxGeo = new THREE.BoxGeometry(x1 - x0, y1 - y0, thickness);
          boxGeo.rotateY(-angle); boxGeo.translate(midX, midY, midZ); geometries.push(boxGeo);
          const colliderMesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, thickness), colliderMat);
          colliderMesh.position.set(midX, midY, midZ); colliderMesh.rotation.y = -angle;
          colliderMesh.userData = { wallId: wall.id, type: 'wall', length: x1 - x0, thickness, height: y1 - y0 };
          wallsGroup.add(colliderMesh);
        }
      }
    });

    if (geometries.length > 0) {
      const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
      geometries.forEach(geometry => geometry.dispose());
      const visualWallsMesh = new THREE.Mesh(mergedGeo, wallMaterial);
      visualWallsMesh.name = 'visual_walls_merged';
      visualWallsMesh.castShadow = true;
      visualWallsMesh.receiveShadow = true;
      wallsGroup.add(visualWallsMesh);
    }

    return wallsGroup;
  }

  private buildFloor(rooms: any[]): THREE.Group {
    const floorGroup = new THREE.Group();
    floorGroup.name = 'floors_layer';

    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });

    rooms.forEach((room) => {
      const width = room.width;
      const depth = room.depth;
      const cx = room.node?.x ?? (room.x + width / 2);
      const cz = room.node?.z ?? (room.z + depth / 2);
      const roomNameLower = (room.name || '').toLowerCase();

      // Determine realistic architectural floor material
      let floorMat: THREE.MeshStandardMaterial;

      if (roomNameLower.includes('balcony') || roomNameLower.includes('terrace') || roomNameLower.includes('deck')) {
        floorMat = new THREE.MeshStandardMaterial({
          map: TextureGenerator.getBalconyDeckTexture(),
          roughness: 0.8,
          metalness: 0.05,
        });
      } else if (roomNameLower.includes('bed') || roomNameLower.includes('suite')) {
        floorMat = new THREE.MeshStandardMaterial({
          map: TextureGenerator.getWoodParquetTexture(),
          roughness: 0.35,
          metalness: 0.05,
        });
      } else if (
        roomNameLower.includes('bath') ||
        roomNameLower.includes('kitchen') ||
        roomNameLower.includes('powder') ||
        roomNameLower.includes('utility')
      ) {
        floorMat = new THREE.MeshStandardMaterial({
          map: TextureGenerator.getTileTexture(),
          roughness: 0.25,
          metalness: 0.1,
        });
      } else {
        // Living room, formal dining, foyer, sky lobby, grand lounge -> Italian Carrara Marble
        floorMat = new THREE.MeshStandardMaterial({
          map: TextureGenerator.getMarbleTexture(),
          roughness: 0.18,
          metalness: 0.15,
        });
      }

      const floorGeo = new THREE.PlaneGeometry(width, depth);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.name = `floor_${room.id}`;
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(cx, 0.01 + this.floorElevation, cz);
      floorMesh.receiveShadow = true;
      floorMesh.userData = {
        roomId: room.id,
        name: room.name,
        type: 'floor',
        isFloor: true,
        flatId: room.flatId || room.id,
        width,
        depth,
        areaSqFt: Math.round(width * depth * 10.7639 * 10) / 10,
      };
      floorGroup.add(floorMesh);

      // Baseboard Skirting around interior rooms (not on balconies)
      if (!roomNameLower.includes('balcony') && !roomNameLower.includes('terrace')) {
        const skirtH = 0.12;
        const skirtT = 0.025;
        const yPos = this.floorElevation + skirtH / 2;

        // North skirt
        const nSkirt = new THREE.Mesh(new THREE.BoxGeometry(width, skirtH, skirtT), baseboardMat);
        nSkirt.position.set(cx, yPos, cz - depth / 2 + skirtT / 2);
        floorGroup.add(nSkirt);

        // South skirt
        const sSkirt = new THREE.Mesh(new THREE.BoxGeometry(width, skirtH, skirtT), baseboardMat);
        sSkirt.position.set(cx, yPos, cz + depth / 2 - skirtT / 2);
        floorGroup.add(sSkirt);

        // West skirt
        const wSkirt = new THREE.Mesh(new THREE.BoxGeometry(skirtT, skirtH, depth - skirtT * 2), baseboardMat);
        wSkirt.position.set(cx - width / 2 + skirtT / 2, yPos, cz);
        floorGroup.add(wSkirt);

        // East skirt
        const eSkirt = new THREE.Mesh(new THREE.BoxGeometry(skirtT, skirtH, depth - skirtT * 2), baseboardMat);
        eSkirt.position.set(cx + width / 2 - skirtT / 2, yPos, cz);
        floorGroup.add(eSkirt);
      }
    });

    return floorGroup;
  }

  private buildCeiling(rooms: any[]): THREE.Group {
    const ceilingGroup = new THREE.Group();
    ceilingGroup.name = 'ceilings_layer';

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xfdfdfd,
      roughness: 0.9,
      side: THREE.BackSide,
    });

    rooms.forEach((room) => {
      const width = room.width;
      const depth = room.depth;
      const cx = room.node?.x ?? (room.x + width / 2);
      const cz = room.node?.z ?? (room.z + depth / 2);

      const ceilingGeo = new THREE.PlaneGeometry(width, depth);
      const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceilingMesh.name = `ceiling_${room.id}`;
      ceilingMesh.rotation.x = -Math.PI / 2;
      ceilingMesh.position.set(cx, this.wallHeight + this.floorElevation, cz);
      ceilingMesh.userData = {
        roomId: room.id,
        type: 'ceiling',
      };

      ceilingGroup.add(ceilingMesh);
    });

    return ceilingGroup;
  }

  private buildApertures(apertures: any[], walls: any[]): THREE.Group {
    const aperturesGroup = new THREE.Group();
    aperturesGroup.name = 'apertures_layer';

    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x2b201a, // Dark espresso wood frame
      roughness: 0.6,
      metalness: 0.1,
    });

    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728, // Walnut wood leaf
      roughness: 0.5,
      metalness: 0.05,
    });

    const doorHandleMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished brushed brass handle
      roughness: 0.25,
      metalness: 0.9,
    });

    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark anthracite architectural metal
      roughness: 0.4,
      metalness: 0.8,
    });

    const clearGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdff1ff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      metalness: 0.0,
      depthWrite: false,
    });

    apertures.forEach((ap) => {
      const parentWall = walls.find((w) => w.id === ap.wallId);
      if (!parentWall) return;

      const startX = parentWall.startX;
      const startZ = parentWall.startZ;
      const endX = parentWall.endX;
      const endZ = parentWall.endZ;
      const thickness = parentWall.thickness || this.wallThickness;

      const dx = endX - startX;
      const dz = endZ - startZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      const ux = dx / length;
      const uz = dz / length;
      const angle = Math.atan2(dz, dx);

      const apOffset = ap.startOffset + ap.width / 2;
      const px = startX + ux * apOffset;
      const pz = startZ + uz * apOffset;
      const py = (ap.elevation || 0) + ap.height / 2 + this.floorElevation;

      if (ap.type === 'door') {
        const doorAssembly = new THREE.Group();
        doorAssembly.name = `door_assembly_${ap.id}`;
        doorAssembly.position.set(px, py, pz);
        doorAssembly.rotation.y = -angle;

        // Frame: Top header
        const frameT = 0.07;
        const frameHeader = new THREE.Mesh(
          new THREE.BoxGeometry(ap.width, frameT, thickness * 1.15),
          doorFrameMat
        );
        frameHeader.position.set(0, ap.height / 2 - frameT / 2, 0);
        doorAssembly.add(frameHeader);

        // Frame: Left & right jambs
        const leftJamb = new THREE.Mesh(
          new THREE.BoxGeometry(frameT, ap.height - frameT, thickness * 1.15),
          doorFrameMat
        );
        leftJamb.position.set(-ap.width / 2 + frameT / 2, -frameT / 2, 0);
        doorAssembly.add(leftJamb);

        const rightJamb = leftJamb.clone();
        rightJamb.position.x = ap.width / 2 - frameT / 2;
        doorAssembly.add(rightJamb);

        // Door panel (leaf)
        const panelWidth = ap.width - frameT * 2;
        const panelHeight = ap.height - frameT;
        const panelThickness = 0.045;
        const doorLeaf = new THREE.Mesh(
          new THREE.BoxGeometry(panelWidth, panelHeight, panelThickness),
          doorLeafMat
        );
        const pivot = new THREE.Group();
        pivot.name = `doorGroup_${ap.id}`;
        pivot.position.set(-panelWidth / 2, 0, 0);
        pivot.userData = { id: ap.id, type: 'door', isOpen: false, originalRotationY: 0, swing: ap.swing || 1 };
        doorLeaf.position.set(panelWidth / 2, -frameT / 2, 0);
        doorLeaf.castShadow = true;
        pivot.add(doorLeaf);
        doorAssembly.add(pivot);

        // Door Lever / Handle
        const handleLever = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8),
          doorHandleMat
        );
        handleLever.rotation.z = Math.PI / 2;
        handleLever.position.set(panelWidth * 0.88, -0.1, panelThickness / 2 + 0.03);
        pivot.add(handleLever);

        doorAssembly.userData = {
          apertureId: ap.id,
          type: 'door',
          width: ap.width,
          height: ap.height,
        };
        aperturesGroup.add(doorAssembly);

        // Door swing floor guide (subtle dashed arc)
        const pivotX = startX + ux * ap.startOffset;
        const pivotZ = startZ + uz * ap.startOffset;
        const swingGeo = new THREE.RingGeometry(ap.width * 0.95, ap.width, 32, 1, 0, Math.PI / 2);
        const swingMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        });
        const swingMesh = new THREE.Mesh(swingGeo, swingMat);
        swingMesh.rotation.x = -Math.PI / 2;
        swingMesh.rotation.z = -angle + (ap.swing && ap.swing < 0 ? Math.PI : 0);
        swingMesh.position.set(pivotX, 0.02 + this.floorElevation, pivotZ);
        swingMesh.userData = { isDoorSwing: true };
        aperturesGroup.add(swingMesh);
      } else if (ap.type === 'window') {
        const winAssembly = new THREE.Group();
        winAssembly.name = `window_assembly_${ap.id}`;
        winAssembly.position.set(px, py, pz);
        winAssembly.rotation.y = -angle;

        const fThick = 0.06;
        // Outer frame
        const wTop = new THREE.Mesh(new THREE.BoxGeometry(ap.width, fThick, thickness * 1.1), windowFrameMat);
        wTop.position.set(0, ap.height / 2 - fThick / 2, 0);
        winAssembly.add(wTop);

        const wBottom = wTop.clone();
        wBottom.position.y = -ap.height / 2 + fThick / 2;
        winAssembly.add(wBottom);

        const wLeft = new THREE.Mesh(new THREE.BoxGeometry(fThick, ap.height - fThick * 2, thickness * 1.1), windowFrameMat);
        wLeft.position.set(-ap.width / 2 + fThick / 2, 0, 0);
        winAssembly.add(wLeft);

        const wRight = wLeft.clone();
        wRight.position.x = ap.width / 2 - fThick / 2;
        winAssembly.add(wRight);

        // Center vertical mullion for realism
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(fThick * 0.7, ap.height - fThick * 2, thickness * 0.9), windowFrameMat);
        mullion.position.set(0, 0, 0);
        winAssembly.add(mullion);

        // Clear architectural double-pane glass
        const glassPane = new THREE.Mesh(
          new THREE.BoxGeometry(ap.width - fThick * 2, ap.height - fThick * 2, 0.02),
          clearGlassMat
        );
        glassPane.position.set(0, 0, 0);
        winAssembly.add(glassPane);

        winAssembly.userData = {
          apertureId: ap.id,
          type: 'window',
          width: ap.width,
          height: ap.height,
          elevation: ap.elevation,
        };
        aperturesGroup.add(winAssembly);
      }
    });

    return aperturesGroup;
  }

  private buildFurniture(furniture: any[]): THREE.Group {
    const furnitureGroup = new THREE.Group();
    furnitureGroup.name = 'furniture_layer';

    furniture.forEach((item) => {
      const colorHex = item.color || '#a0a0a0';
      const mesh = FurnitureFactory.create(item.type, colorHex);
      mesh.position.set(item.x, this.floorElevation, item.z);
      mesh.rotation.y = (item.rotation * Math.PI) / 180;
      mesh.userData = {
        furnitureId: item.id,
        type: 'furniture',
        furnitureType: item.type,
      };
      furnitureGroup.add(mesh);
    });

    return furnitureGroup;
  }
}
