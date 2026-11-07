import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

export interface ExteriorConfig {
  facadeType?: 'Concrete' | 'Brick' | 'Glass' | 'Stone' | 'Sandstone' | 'Luxury';
  customTextureUrl?: string;
}

export interface ExteriorGeneratorOptions {
  floorsInfo: { floor: any; structureJson: any }[];
  exteriorConfig?: ExteriorConfig;
}

export class ExteriorGenerator {
  static compile(options: ExteriorGeneratorOptions): THREE.Group {
    const group = new THREE.Group();
    group.name = 'exterior_environment_and_shell';

    const { floorsInfo, exteriorConfig } = options;
    if (!floorsInfo || floorsInfo.length === 0) {
      return group;
    }

    // Sort floors by floor number ascending
    const sorted = [...floorsInfo].sort((a, b) => a.floor.floorNumber - b.floor.floorNumber);

    // Compute footprint bounds using structureJson
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

    const width = maxX - minX;
    const depth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Calculate total building height
    let totalHeight = 0;
    const slabThickness = 0.25;
    sorted.forEach(({ floor }) => {
      const h = Number(floor.floorHeight) || 3.0;
      totalHeight += h + slabThickness;
    });

    // =========================================================================
    // 1. REAL-WORLD OUTDOOR ENVIRONMENT (GROUND, ROADS, SIDEWALKS, TREES, SKY)
    // =========================================================================
    const envGroup = new THREE.Group();
    envGroup.name = 'real_world_landscape';

    // Sky Dome - Realistic daylight gradient with sun glow and clouds
    const skyGeo = new THREE.SphereGeometry(260, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: TextureGenerator.getSkyDomeTexture(),
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.position.set(centerX, 0, centerZ);
    envGroup.add(skyDome);

    // A. Manicured Green Grass Lawn (Broad landscape ground)
    const grassGeo = new THREE.PlaneGeometry(260, 260);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32, // Vibrant lush grass green
      roughness: 0.9,
      metalness: 0.0,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.set(centerX, -0.05, centerZ);
    grassMesh.receiveShadow = true;
    envGroup.add(grassMesh);

    // B. Asphalt Access Road & Circular Drop-off Roundabout
    const roadWidth = 8.0;
    const roadLength = 120.0;
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark charcoal asphalt
      roughness: 0.85,
      metalness: 0.1,
    });

    // Main entrance access avenue
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(centerX, 0.01, maxZ + roadLength / 2 + 6.0);
    roadMesh.receiveShadow = true;
    envGroup.add(roadMesh);

    // Road White Center Dashed Line Markings
    const dashLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let d = 0; d < 10; d++) {
      const dashGeo = new THREE.PlaneGeometry(0.2, 5.0);
      const dash = new THREE.Mesh(dashGeo, dashLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(centerX, 0.02, maxZ + 12.0 + d * 10.0);
      envGroup.add(dash);
    }

    // Paved Sidewalks along the Road
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Light concrete paver gray
      roughness: 0.75,
      metalness: 0.05,
    });

    [-roadWidth / 2 - 1.25, roadWidth / 2 + 1.25].forEach((swX) => {
      const swGeo = new THREE.BoxGeometry(2.5, 0.14, roadLength);
      const sw = new THREE.Mesh(swGeo, sidewalkMat);
      sw.position.set(centerX + swX, 0.07, maxZ + roadLength / 2 + 6.0);
      sw.receiveShadow = true;
      envGroup.add(sw);
    });

    // Paved Plaza Surrounding Building Footprint
    const plazaWidth = width + 14.0;
    const plazaDepth = depth + 14.0;
    const plazaGeo = new THREE.BoxGeometry(plazaWidth, 0.12, plazaDepth);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Elegant light stone plaza
      roughness: 0.7,
      metalness: 0.05,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(centerX, 0.06, centerZ);
    plaza.receiveShadow = true;
    envGroup.add(plaza);

    // C. 3D Procedural Trees & Landscaping
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const foliageMats = [
      new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.75 }),
      new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.85 }),
    ];

    const createTree = (tx: number, tz: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0.1, tz);
      tree.scale.setScalar(scale);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      tree.add(trunk);

      // Multi-tier organic foliage canopy
      [
        [0, 3.2, 0, 1.4, 0],
        [-0.3, 4.2, 0.2, 1.2, 1],
        [0.3, 4.4, -0.2, 1.15, 2],
        [0, 5.2, 0, 0.9, 0],
      ].forEach(([fx, fy, fz, r, matIdx]) => {
        const foliageGeo = new THREE.DodecahedronGeometry(r as number, 1);
        const foliage = new THREE.Mesh(foliageGeo, foliageMats[matIdx as number]);
        foliage.position.set(fx as number, fy as number, fz as number);
        foliage.castShadow = true;
        tree.add(foliage);
      });

      return tree;
    };

    // Plant Perimeter Trees around the Plaza & Boulevard
    const treePositions = [
      // Left boulevard
      [centerX - roadWidth / 2 - 4.5, maxZ + 15],
      [centerX - roadWidth / 2 - 4.5, maxZ + 35],
      [centerX - roadWidth / 2 - 4.5, maxZ + 55],
      // Right boulevard
      [centerX + roadWidth / 2 + 4.5, maxZ + 15],
      [centerX + roadWidth / 2 + 4.5, maxZ + 35],
      [centerX + roadWidth / 2 + 4.5, maxZ + 55],
      // Plaza Garden corners
      [minX - 6.0, minZ - 6.0],
      [maxX + 6.0, minZ - 6.0],
      [minX - 6.0, maxZ + 4.0],
      [maxX + 6.0, maxZ + 4.0],
      [centerX - width * 0.4, minZ - 6.0],
      [centerX + width * 0.4, minZ - 6.0],
    ];

    treePositions.forEach(([tx, tz], i) => {
      const scale = 0.85 + (i % 3) * 0.15;
      envGroup.add(createTree(tx, tz, scale));
    });

    // D. Modern Pathway LED Bollards & Dual-Arm Streetlamps
    const lampMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });
    const lampGlow = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: new THREE.Color(0xfef08a),
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    const createStreetLamp = (lx: number, lz: number) => {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0.1, lz);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 5.5, 8), lampMetal);
      pole.position.y = 2.75;
      pole.castShadow = true;
      lamp.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), lampMetal);
      arm.position.set(0, 5.4, 0);
      lamp.add(arm);

      [-0.55, 0.55].forEach((hx) => {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.15), lampGlow);
        head.position.set(hx, 5.34, 0);
        lamp.add(head);
      });

      return lamp;
    };

    [
      [centerX - roadWidth / 2 - 2.8, maxZ + 25],
      [centerX + roadWidth / 2 + 2.8, maxZ + 25],
      [centerX - roadWidth / 2 - 2.8, maxZ + 45],
      [centerX + roadWidth / 2 + 2.8, maxZ + 45],
    ].forEach(([lx, lz]) => {
      envGroup.add(createStreetLamp(lx, lz));
    });

    group.add(envGroup);

    // =========================================================================
    // 2. ARCHITECTURAL EXTERIOR BUILDING SHELL & CURTAIN WALL FACADE
    // =========================================================================
    const facadeGroup = new THREE.Group();
    facadeGroup.name = 'architectural_facade';

    const curtainGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x60a5fa, // Elegant azure reflection
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.85,
      transmission: 0.6,
      thickness: 0.4,
    });

    const frameMullionMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Matte architectural dark bronze
      roughness: 0.35,
      metalness: 0.8,
    });

    const slabEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Charcoal slate slab edge
      roughness: 0.7,
      metalness: 0.15,
    });

    const railingGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      metalness: 0.9,
    });

    // Floor Slabs & Cantilevered Balconies along building height
    let currentElevation = 0;
    sorted.forEach(({ floor }, fIdx) => {
      const floorHeight = Number(floor.floorHeight) || 3.0;

      // Floor horizontal architectural trim slab
      const slabMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.6, slabThickness, depth + 0.6),
        slabEdgeMat
      );
      slabMesh.position.set(centerX, currentElevation, centerZ);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      facadeGroup.add(slabMesh);

      // Add Cantilevered Glass Balconies on South & North Facades for residential floors
      if (fIdx > 0) {
        // South Balcony Deck
        const balcDeckGeo = new THREE.BoxGeometry(width * 0.65, 0.15, 2.0);
        const balcDeck = new THREE.Mesh(balcDeckGeo, slabEdgeMat);
        balcDeck.position.set(centerX, currentElevation + 0.08, maxZ + 1.0);
        balcDeck.castShadow = true;
        balcDeck.receiveShadow = true;
        facadeGroup.add(balcDeck);

        // Balcony Glass Safety Railing
        const railGlassGeo = new THREE.BoxGeometry(width * 0.65, 1.05, 0.03);
        const railGlass = new THREE.Mesh(railGlassGeo, railingGlassMat);
        railGlass.position.set(centerX, currentElevation + 0.65, maxZ + 1.98);
        facadeGroup.add(railGlass);

        // Balcony Top Handrail
        const handrailGeo = new THREE.BoxGeometry(width * 0.66, 0.06, 0.08);
        const handrail = new THREE.Mesh(handrailGeo, frameMullionMat);
        handrail.position.set(centerX, currentElevation + 1.18, maxZ + 1.98);
        facadeGroup.add(handrail);
      }

      currentElevation += floorHeight + slabThickness;
    });

    // Roof Slab & Parapet
    const roofSlab = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.8, slabThickness, depth + 0.8),
      slabEdgeMat
    );
    roofSlab.position.set(centerX, currentElevation, centerZ);
    roofSlab.castShadow = true;
    roofSlab.receiveShadow = true;
    facadeGroup.add(roofSlab);

    // =========================================================================
    // 3. ROOFTOP SKY LOUNGE & TIMBER PERGOLA
    // =========================================================================
    const rooftopGroup = new THREE.Group();
    rooftopGroup.position.set(centerX, currentElevation + slabThickness / 2, centerZ);

    // Rooftop Glass Perimeter Parapet
    const parapetHeight = 1.2;
    [
      [0, parapetHeight / 2, -depth / 2 - 0.2, width + 0.4, 0.04],
      [0, parapetHeight / 2, depth / 2 + 0.2, width + 0.4, 0.04],
      [-width / 2 - 0.2, parapetHeight / 2, 0, 0.04, depth + 0.4],
      [width / 2 + 0.2, parapetHeight / 2, 0, 0.04, depth + 0.4],
    ].forEach(([px, py, pz, pw, pd]) => {
      const pg = new THREE.Mesh(new THREE.BoxGeometry(pw, parapetHeight, pd), railingGlassMat);
      pg.position.set(px, py, pz);
      rooftopGroup.add(pg);
    });

    // Rooftop Timber Pergola Louvers
    const woodLouverMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.65 });
    const pergolaWidth = width * 0.5;
    const pergolaDepth = depth * 0.5;

    // 4 Pergola Columns
    [
      [-pergolaWidth / 2, -pergolaDepth / 2],
      [pergolaWidth / 2, -pergolaDepth / 2],
      [-pergolaWidth / 2, pergolaDepth / 2],
      [pergolaWidth / 2, pergolaDepth / 2],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 0.18), frameMullionMat);
      col.position.set(cx, 1.5, cz);
      col.castShadow = true;
      rooftopGroup.add(col);
    });

    // Pergola Slats
    for (let s = 0; s < 12; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(pergolaWidth + 0.4, 0.08, 0.12), woodLouverMat);
      slat.position.set(0, 3.05, -pergolaDepth / 2 + (s / 11) * pergolaDepth);
      slat.castShadow = true;
      rooftopGroup.add(slat);
    }

    facadeGroup.add(rooftopGroup);

    // =========================================================================
    // 4. GRAND GROUND FLOOR ENTRANCE CANOPY & STOREFRONT
    // =========================================================================
    const entranceGroup = new THREE.Group();
    entranceGroup.position.set(centerX, 0, maxZ + 0.2);

    // Cantilevered Architectural Canopy
    const canopyWidth = 9.0;
    const canopyDepth = 4.5;
    const canopyHeight = 0.25;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyWidth, canopyHeight, canopyDepth), frameMullionMat);
    canopy.position.set(0, 3.6, canopyDepth / 2);
    canopy.castShadow = true;
    entranceGroup.add(canopy);

    // Canopy Under-ceiling Warm LED Spotlights
    const spotGlowMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    [-2.5, 0, 2.5].forEach((sx) => {
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), spotGlowMat);
      spot.position.set(sx, 3.47, canopyDepth / 2);
      entranceGroup.add(spot);
    });

    // Double-Height Glass Storefront Doors
    const entryGlass = new THREE.Mesh(new THREE.BoxGeometry(canopyWidth - 0.4, 3.4, 0.04), curtainGlassMat);
    entryGlass.position.set(0, 1.7, 0.05);
    entranceGroup.add(entryGlass);

    facadeGroup.add(entranceGroup);

    group.add(facadeGroup);

    return group;
  }
}
