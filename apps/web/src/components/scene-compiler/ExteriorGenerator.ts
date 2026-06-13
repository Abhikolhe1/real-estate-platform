import * as THREE from 'three';

export interface ExteriorConfig {
  facadeType?: 'Concrete' | 'Brick' | 'Glass' | 'Stone' | 'Sandstone';
  customTextureUrl?: string;
}

export interface ExteriorGeneratorOptions {
  floorsInfo: { floor: any; structureJson: any }[];
  exteriorConfig?: ExteriorConfig;
}

export class ExteriorGenerator {
  static compile(options: ExteriorGeneratorOptions): THREE.Group {
    const group = new THREE.Group();
    group.name = 'exterior_shell';

    const { floorsInfo, exteriorConfig } = options;
    if (!floorsInfo || floorsInfo.length === 0) {
      return group;
    }

    // Sort floors by floor number ascending
    const sorted = [...floorsInfo].sort((a, b) => a.floor.floorNumber - b.floor.floorNumber);

    // Compute footprint bounds using the ground floor structureJson (or union if ground is missing)
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
      minX = -10; maxX = 10;
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

    // Resolve Facade Materials
    const facadeType = exteriorConfig?.facadeType || 'Concrete';
    const customTextureUrl = exteriorConfig?.customTextureUrl;

    let facadeMat: THREE.Material;

    if (customTextureUrl) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(customTextureUrl);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      // Repeat every 3.0 meters
      texture.repeat.set(width / 3.0, totalHeight / 3.0);
      facadeMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1
      });
    } else {
      switch (facadeType) {
        case 'Brick':
          facadeMat = new THREE.MeshStandardMaterial({
            color: 0xb5652b, // Terracotta brick color
            roughness: 0.95,
            metalness: 0.0
          });
          break;
        case 'Glass':
          facadeMat = new THREE.MeshStandardMaterial({
            color: 0x88b4d4,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.7
          });
          break;
        case 'Stone':
          facadeMat = new THREE.MeshStandardMaterial({
            color: 0x8b7355, // Sand/granite gray-brown
            roughness: 0.85,
            metalness: 0.0
          });
          break;
        case 'Sandstone':
          facadeMat = new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.8,
            metalness: 0.1
          });
          break;
        case 'Concrete':
        default:
          facadeMat = new THREE.MeshStandardMaterial({
            color: 0xc8c4be,
            roughness: 0.9,
            metalness: 0.0
          });
          break;
      }
    }

    // 1. Build the 4 Exterior Wall Faces (North, South, East, West)
    const wallThickness = 0.05;
    
    // North Wall
    const northGeo = new THREE.BoxGeometry(width + wallThickness, totalHeight, wallThickness);
    const northMesh = new THREE.Mesh(northGeo, facadeMat);
    northMesh.position.set(centerX, totalHeight / 2, minZ - wallThickness / 2);
    northMesh.castShadow = true;
    northMesh.receiveShadow = true;
    group.add(northMesh);

    // South Wall
    const southGeo = new THREE.BoxGeometry(width + wallThickness, totalHeight, wallThickness);
    const southMesh = new THREE.Mesh(southGeo, facadeMat);
    southMesh.position.set(centerX, totalHeight / 2, maxZ + wallThickness / 2);
    southMesh.castShadow = true;
    southMesh.receiveShadow = true;
    group.add(southMesh);

    // West Wall
    const westGeo = new THREE.BoxGeometry(wallThickness, totalHeight, depth - wallThickness);
    const westMesh = new THREE.Mesh(westGeo, facadeMat);
    westMesh.position.set(minX - wallThickness / 2, totalHeight / 2, centerZ);
    westMesh.castShadow = true;
    westMesh.receiveShadow = true;
    group.add(westMesh);

    // East Wall
    const eastGeo = new THREE.BoxGeometry(wallThickness, totalHeight, depth - wallThickness);
    const eastMesh = new THREE.Mesh(eastGeo, facadeMat);
    eastMesh.position.set(maxX + wallThickness / 2, totalHeight / 2, centerZ);
    eastMesh.castShadow = true;
    eastMesh.receiveShadow = true;
    group.add(eastMesh);

    // 2. Add Cornice bands around building at floor level edges
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Charcoal slate gray
      roughness: 0.7,
      metalness: 0.2
    });
    
    let currentElevation = 0;
    sorted.forEach(({ floor }) => {
      const h = Number(floor.floorHeight) || 3.0;
      
      // Horizontal slab cornice band: slightly wider than the building
      const bandGeo = new THREE.BoxGeometry(width + 0.15, 0.1, depth + 0.15);
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.set(centerX, currentElevation + h, centerZ);
      bandMesh.receiveShadow = true;
      bandMesh.castShadow = true;
      group.add(bandMesh);

      currentElevation += h + slabThickness;
    });

    // 3. Add Podium Base (ground floor plinth)
    const podiumHeight = 1.5;
    const podiumGeo = new THREE.BoxGeometry(width + 0.6, podiumHeight, depth + 0.6);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate
      roughness: 0.8,
      metalness: 0.1
    });
    const podiumMesh = new THREE.Mesh(podiumGeo, podiumMat);
    podiumMesh.position.set(centerX, podiumHeight / 2, centerZ);
    podiumMesh.receiveShadow = true;
    podiumMesh.castShadow = true;
    group.add(podiumMesh);

    // 4. Generate Windows & Frames Grid
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark steel frame
      roughness: 0.4,
      metalness: 0.8
    });

    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0xadd8e6,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.9
    });

    currentElevation = 0;
    sorted.forEach(({ floor, structureJson }) => {
      const h = Number(floor.floorHeight) || 3.0;
      if (structureJson) {
        const walls = structureJson.walls || [];
        const apertures = structureJson.apertures || [];

        apertures.forEach((ap: any) => {
          if (ap.type !== 'window') return;

          // Find parent wall
          const w = walls.find((wall: any) => wall.id === ap.wallId);
          if (!w) return;

          // Compute global position of this window
          const dx = w.endX - w.startX;
          const dz = w.endZ - w.startZ;
          const wallLength = Math.sqrt(dx * dx + dz * dz);
          if (wallLength === 0) return;

          const ux = dx / wallLength;
          const uz = dz / wallLength;

          const globalX = w.startX + ux * (ap.startOffset + ap.width / 2);
          const globalZ = w.startZ + uz * (ap.startOffset + ap.width / 2);
          const globalY = currentElevation + ap.elevation + ap.height / 2;

          // Determine which facade it fits closest to
          const distW = Math.abs(globalX - minX);
          const distE = Math.abs(globalX - maxX);
          const distN = Math.abs(globalZ - minZ);
          const distS = Math.abs(globalZ - maxZ);

          const minDist = Math.min(distW, distE, distN, distS);

          let windowX = globalX;
          let windowZ = globalZ;
          let rotY = 0;

          const recess = 0.03;

          if (minDist === distW) {
            windowX = minX + recess;
            rotY = -Math.PI / 2;
          } else if (minDist === distE) {
            windowX = maxX - recess;
            rotY = Math.PI / 2;
          } else if (minDist === distN) {
            windowZ = minZ + recess;
            rotY = Math.PI;
          } else {
            windowZ = maxZ - recess;
            rotY = 0;
          }

          // Find which room this window belongs to
          const rooms = structureJson.rooms || [];
          const room = rooms.find((r: any) => {
            const pad = 0.35; // tolerance
            return globalX >= r.x - pad && globalX <= r.x + r.width + pad &&
                   globalZ >= r.z - pad && globalZ <= r.z + r.depth + pad;
          });

          // Create glass plane
          const glassGeo = new THREE.PlaneGeometry(ap.width, ap.height);
          const glassMesh = new THREE.Mesh(glassGeo, windowGlassMat);
          glassMesh.position.set(windowX, globalY, windowZ);
          glassMesh.rotation.y = rotY;
          glassMesh.userData = {
            type: 'windowGlass',
            flatId: room?.flatId || room?.id,
            floorId: floor.id
          };
          group.add(glassMesh);

          // Add frame box outlines
          const frameWidth = 0.04;
          const frameDepth = 0.04;

          const frameGroup = new THREE.Group();
          frameGroup.position.set(windowX, globalY, windowZ);
          frameGroup.rotation.y = rotY;

          // Top frame
          const topGeo = new THREE.BoxGeometry(ap.width + frameWidth, frameWidth, frameDepth);
          const topMesh = new THREE.Mesh(topGeo, frameMat);
          topMesh.position.set(0, ap.height / 2, 0);
          frameGroup.add(topMesh);

          // Bottom frame
          const bottomMesh = new THREE.Mesh(topGeo, frameMat);
          bottomMesh.position.set(0, -ap.height / 2, 0);
          frameGroup.add(bottomMesh);

          // Left frame
          const leftGeo = new THREE.BoxGeometry(frameWidth, ap.height + frameWidth, frameDepth);
          const leftMesh = new THREE.Mesh(leftGeo, frameMat);
          leftMesh.position.set(-ap.width / 2, 0, 0);
          frameGroup.add(leftMesh);

          // Right frame
          const rightMesh = new THREE.Mesh(leftGeo, frameMat);
          rightMesh.position.set(ap.width / 2, 0, 0);
          frameGroup.add(rightMesh);

          group.add(frameGroup);
        });

        // 5. Generate Protruding Balconies
        const rooms = structureJson.rooms || [];
        rooms.forEach((r: any) => {
          if (!r.name.toLowerCase().includes('balcony')) return;

          const width = r.width || 2.0;
          const depth = r.depth || 1.2;
          const cx = r.node?.x ?? (r.x + width / 2);
          const cz = r.node?.z ?? (r.z + depth / 2);
          const by = currentElevation;

          // Protruding floor slab box
          const balSlabGeo = new THREE.BoxGeometry(width, 0.08, depth);
          const balSlabMesh = new THREE.Mesh(balSlabGeo, bandMat);
          balSlabMesh.position.set(cx, by + 0.04, cz);
          balSlabMesh.receiveShadow = true;
          balSlabMesh.castShadow = true;
          balSlabMesh.userData = {
            type: 'balconySlab',
            flatId: r.flatId || r.id,
            floorId: floor.id
          };
          group.add(balSlabMesh);

          // Glass Railings (North, South, East, West edges where exposed)
          // Since the balcony extends beyond the building core, add a 1m tall glass railing around exposed edges
          const distW = Math.abs(cx - minX);
          const distE = Math.abs(cx - maxX);
          const distN = Math.abs(cz - minZ);
          const distS = Math.abs(cz - maxZ);

          const closestEdge = Math.min(distW, distE, distN, distS);

          // Render front and side glass panels
          const glassRailingMat = new THREE.MeshStandardMaterial({
            color: 0x88b4d4,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.9
          });
          const postMat = frameMat;

          // Render a simple wrapping glass barrier
          const railHeight = 1.0;
          const railThickness = 0.02;

          // Determine balcony orientation and render railing shape
          if (closestEdge === distS) {
            // South-facing balcony: Railings on West, South, East
            // South edge
            const sGeo = new THREE.BoxGeometry(width, railHeight, railThickness);
            const sMesh = new THREE.Mesh(sGeo, glassRailingMat);
            sMesh.position.set(cx, by + railHeight / 2, cz + depth / 2);
            group.add(sMesh);

            // West edge
            const wGeo = new THREE.BoxGeometry(railThickness, railHeight, depth);
            const wMesh = new THREE.Mesh(wGeo, glassRailingMat);
            wMesh.position.set(cx - width / 2, by + railHeight / 2, cz);
            group.add(wMesh);

            // East edge
            const eMesh = new THREE.Mesh(wGeo, glassRailingMat);
            eMesh.position.set(cx + width / 2, by + railHeight / 2, cz);
            group.add(eMesh);
          } else if (closestEdge === distN) {
            // North edge
            const nGeo = new THREE.BoxGeometry(width, railHeight, railThickness);
            const nMesh = new THREE.Mesh(nGeo, glassRailingMat);
            nMesh.position.set(cx, by + railHeight / 2, cz - depth / 2);
            group.add(nMesh);

            // West edge
            const wGeo = new THREE.BoxGeometry(railThickness, railHeight, depth);
            const wMesh = new THREE.Mesh(wGeo, glassRailingMat);
            wMesh.position.set(cx - width / 2, by + railHeight / 2, cz);
            group.add(wMesh);

            // East edge
            const eMesh = new THREE.Mesh(wGeo, glassRailingMat);
            eMesh.position.set(cx + width / 2, by + railHeight / 2, cz);
            group.add(eMesh);
          } else if (closestEdge === distW) {
            // West edge
            const wGeo = new THREE.BoxGeometry(railThickness, railHeight, depth);
            const wMesh = new THREE.Mesh(wGeo, glassRailingMat);
            wMesh.position.set(cx - width / 2, by + railHeight / 2, cz);
            group.add(wMesh);

            // North edge
            const nGeo = new THREE.BoxGeometry(width, railHeight, railThickness);
            const nMesh = new THREE.Mesh(nGeo, glassRailingMat);
            nMesh.position.set(cx, by + railHeight / 2, cz - depth / 2);
            group.add(nMesh);

            // South edge
            const sMesh = new THREE.Mesh(nGeo, glassRailingMat);
            sMesh.position.set(cx, by + railHeight / 2, cz + depth / 2);
            group.add(sMesh);
          } else {
            // East edge
            const eGeo = new THREE.BoxGeometry(railThickness, railHeight, depth);
            const eMesh = new THREE.Mesh(eGeo, glassRailingMat);
            eMesh.position.set(cx + width / 2, by + railHeight / 2, cz);
            group.add(eMesh);

            // North edge
            const nGeo = new THREE.BoxGeometry(width, railHeight, railThickness);
            const nMesh = new THREE.Mesh(nGeo, glassRailingMat);
            nMesh.position.set(cx, by + railHeight / 2, cz - depth / 2);
            group.add(nMesh);

            // South edge
            const sMesh = new THREE.Mesh(nGeo, glassRailingMat);
            sMesh.position.set(cx, by + railHeight / 2, cz + depth / 2);
            group.add(sMesh);
          }
        });
      }
      currentElevation += h + slabThickness;
    });

    return group;
  }
}
