import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FurnitureFactory } from './FurnitureFactory';
import { AutoPlacer } from './AutoPlacer';

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

    // Build subcomponents and add them to the main group
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

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f4f0, // White/cream wall color
      roughness: 0.8,
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

      const midX = (startX + endX) / 2;
      const midZ = (startZ + endZ) / 2;
      const midY = height / 2 + this.floorElevation;

      // 1. Render representation (Merged geometry)
      const boxGeo = new THREE.BoxGeometry(length, height, thickness);
      boxGeo.rotateY(-angle);
      boxGeo.translate(midX, midY, midZ);
      geometries.push(boxGeo);

      // 2. Click representation (Invisible collider mesh with wall ID)
      const colliderGeo = new THREE.BoxGeometry(length, height, thickness);
      const colliderMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        visible: false, // Make invisible
      });
      const colliderMesh = new THREE.Mesh(colliderGeo, colliderMat);
      colliderMesh.position.set(midX, midY, midZ);
      colliderMesh.rotation.y = -angle;
      colliderMesh.userData = {
        wallId: wall.id,
        type: 'wall',
        length,
        thickness,
        height,
      };
      wallsGroup.add(colliderMesh);
    });

    // Merge geometries into a single mesh for rendering performance
    if (geometries.length > 0) {
      const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
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

    rooms.forEach((room) => {
      const width = room.width;
      const depth = room.depth;
      const cx = room.node?.x ?? (room.x + width / 2);
      const cz = room.node?.z ?? (room.z + depth / 2);

      const floorGeo = new THREE.PlaneGeometry(width, depth);
      const floorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.color || '#e2e8f0'),
        roughness: 0.6,
        metalness: 0.1,
      });

      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.name = `floor_${room.id}`;
      // Position at room center and rotate -90 degrees on X axis
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(cx, 0.01 + this.floorElevation, cz);
      floorMesh.receiveShadow = true;
      floorMesh.userData = {
        roomId: room.id,
        name: room.name,
        type: 'floor',
        isFloor: true,
        width,
        depth,
        areaSqFt: Math.round(width * depth * 10.7639 * 10) / 10,
      };

      floorGroup.add(floorMesh);
    });

    return floorGroup;
  }

  private buildCeiling(rooms: any[]): THREE.Group {
    const ceilingGroup = new THREE.Group();
    ceilingGroup.name = 'ceilings_layer';

    rooms.forEach((room) => {
      const width = room.width;
      const depth = room.depth;
      const cx = room.node?.x ?? (room.x + width / 2);
      const cz = room.node?.z ?? (room.z + depth / 2);

      const ceilingGeo = new THREE.PlaneGeometry(width, depth);
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5, // Near white ceiling color
        roughness: 0.9,
        side: THREE.BackSide, // Visible from inside the room
      });

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

      // Compute aperture world position midpoint
      const apOffset = ap.startOffset + ap.width / 2;
      const px = startX + ux * apOffset;
      const pz = startZ + uz * apOffset;
      const py = ap.elevation + ap.height / 2 + this.floorElevation;

      if (ap.type === 'door') {
        // Door Opening: Dark transparent box
        const doorGeo = new THREE.BoxGeometry(ap.width, ap.height, thickness * 1.25);
        const doorMat = new THREE.MeshStandardMaterial({
          color: 0x111111,
          opacity: 0.7,
          transparent: true,
          roughness: 0.8,
        });

        const doorMesh = new THREE.Mesh(doorGeo, doorMat);
        doorMesh.name = `door_${ap.id}`;
        doorMesh.position.set(px, py, pz);
        doorMesh.rotation.y = -angle;
        doorMesh.userData = {
          apertureId: ap.id,
          type: 'door',
          width: ap.width,
          height: ap.height,
        };
        aperturesGroup.add(doorMesh);

        // Door Swing Arc (quarter circle ring) on the floor
        // Swing start from door edge pivot
        const pivotX = startX + ux * ap.startOffset;
        const pivotZ = startZ + uz * ap.startOffset;
        
        const swingGeo = new THREE.RingGeometry(ap.width * 0.96, ap.width, 32, 1, 0, Math.PI / 2);
        const swingMat = new THREE.MeshBasicMaterial({
          color: 0x00f5d4,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        const swingMesh = new THREE.Mesh(swingGeo, swingMat);
        swingMesh.rotation.x = -Math.PI / 2;
        // Align rotation with door angle and swing direction
        swingMesh.rotation.z = -angle + (ap.swing && ap.swing < 0 ? Math.PI : 0);
        swingMesh.position.set(pivotX, 0.02 + this.floorElevation, pivotZ);
        swingMesh.userData = { isDoorSwing: true };
        aperturesGroup.add(swingMesh);
      } else if (ap.type === 'window') {
        // Window: Blue semi-transparent box
        const winGeo = new THREE.BoxGeometry(ap.width, ap.height, thickness * 1.25);
        const winMat = new THREE.MeshStandardMaterial({
          color: 0xadd8e6,
          opacity: 0.45,
          transparent: true,
          roughness: 0.1,
          metalness: 0.9,
        });

        const winMesh = new THREE.Mesh(winGeo, winMat);
        winMesh.name = `window_${ap.id}`;
        winMesh.position.set(px, py, pz);
        winMesh.rotation.y = -angle;
        winMesh.userData = {
          apertureId: ap.id,
          type: 'window',
          width: ap.width,
          height: ap.height,
          elevation: ap.elevation,
        };
        aperturesGroup.add(winMesh);
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
