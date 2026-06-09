import * as fs from 'fs';

interface DXFLine {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
}

interface DXFAperture {
  type: 'door' | 'window';
  x: number;
  z: number;
  width: number;
}

interface DXFLabel {
  text: string;
  x: number;
  z: number;
}

export function parseDXF(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  let i = 0;
  const rawWalls: DXFLine[] = [];
  const rawDoors: DXFAperture[] = [];
  const rawWindows: DXFAperture[] = [];
  const rawLabels: DXFLabel[] = [];

  // Helper to read group code and value
  const readPair = () => {
    if (i >= lines.length) return null;
    const code = parseInt(lines[i].trim(), 10);
    const val = i + 1 < lines.length ? lines[i + 1].trim() : '';
    i += 2;
    return { code, val };
  };

  // State machine variables
  let currentEntity: string | null = null;
  let currentLayer = '';
  let startX = 0, startZ = 0, endX = 0, endZ = 0;
  let textVal = '';
  let textX = 0, textZ = 0;
  let currentPolyPoints: {x: number, z: number}[] = [];
  let isClosedPoly = false;

  const flushEntity = () => {
    if (!currentEntity) return;
    const layer = currentLayer.toLowerCase();
    
    if (currentEntity === 'LINE') {
      if (layer.includes('wall')) {
        rawWalls.push({ startX, startZ, endX, endZ });
      } else if (layer.includes('door')) {
        const w = Math.hypot(endX - startX, endZ - startZ);
        rawDoors.push({ type: 'door', x: (startX + endX) / 2, z: (startZ + endZ) / 2, width: w });
      } else if (layer.includes('window')) {
        const w = Math.hypot(endX - startX, endZ - startZ);
        rawWindows.push({ type: 'window', x: (startX + endX) / 2, z: (startZ + endZ) / 2, width: w });
      }
    } else if (currentEntity === 'LWPOLYLINE') {
      if (layer.includes('wall') && currentPolyPoints.length > 1) {
        for (let idx = 0; idx < currentPolyPoints.length - 1; idx++) {
          rawWalls.push({
            startX: currentPolyPoints[idx].x,
            startZ: currentPolyPoints[idx].z,
            endX: currentPolyPoints[idx+1].x,
            endZ: currentPolyPoints[idx+1].z
          });
        }
        if (isClosedPoly) {
          rawWalls.push({
            startX: currentPolyPoints[currentPolyPoints.length - 1].x,
            startZ: currentPolyPoints[currentPolyPoints.length - 1].z,
            endX: currentPolyPoints[0].x,
            endZ: currentPolyPoints[0].z
          });
        }
      }
    } else if (currentEntity === 'TEXT' || currentEntity === 'MTEXT') {
      if (layer.includes('label') || layer.includes('text') || layer.includes('room')) {
        rawLabels.push({ text: textVal, x: textX, z: textZ });
      }
    }
    
    // Reset fields
    startX = 0; startZ = 0; endX = 0; endZ = 0;
    textVal = ''; textX = 0; textZ = 0;
    currentPolyPoints = [];
    isClosedPoly = false;
  };

  while (i < lines.length) {
    const pair = readPair();
    if (!pair) break;
    
    const { code, val } = pair;
    
    if (code === 0) {
      // Flush previous entity before starting a new one
      flushEntity();
      
      if (val === 'LINE' || val === 'LWPOLYLINE' || val === 'TEXT' || val === 'MTEXT') {
        currentEntity = val;
      } else {
        currentEntity = null;
      }
    } else if (currentEntity) {
      if (code === 8) {
        currentLayer = val;
      } else if (code === 10) {
        startX = parseFloat(val);
        if (currentEntity === 'LWPOLYLINE') {
          currentPolyPoints.push({ x: parseFloat(val), z: 0 });
        } else if (currentEntity === 'TEXT' || currentEntity === 'MTEXT') {
          textX = parseFloat(val);
        }
      } else if (code === 20) {
        startZ = parseFloat(val);
        if (currentEntity === 'LWPOLYLINE' && currentPolyPoints.length > 0) {
          currentPolyPoints[currentPolyPoints.length - 1].z = parseFloat(val);
        } else if (currentEntity === 'TEXT' || currentEntity === 'MTEXT') {
          textZ = parseFloat(val);
        }
      } else if (code === 11) {
        endX = parseFloat(val);
      } else if (code === 21) {
        endZ = parseFloat(val);
      } else if (code === 1) {
        textVal = val;
      } else if (code === 70 && currentEntity === 'LWPOLYLINE') {
        const flag = parseInt(val, 10);
        isClosedPoly = (flag & 1) === 1;
      }
    }
  }
  flushEntity(); // flush final entity

  // Normalize/snap wall line coordinates
  const snappedWalls: DXFLine[] = [];
  const snapTolerance = 0.05;
  
  for (const w of rawWalls) {
    let sX = w.startX;
    let sZ = w.startZ;
    let eX = w.endX;
    let eZ = w.endZ;
    
    for (const other of snappedWalls) {
      if (Math.hypot(sX - other.startX, sZ - other.startZ) < snapTolerance) {
        sX = other.startX; sZ = other.startZ;
      } else if (Math.hypot(sX - other.endX, sZ - other.endZ) < snapTolerance) {
        sX = other.endX; sZ = other.endZ;
      }
      
      if (Math.hypot(eX - other.startX, eZ - other.startZ) < snapTolerance) {
        eX = other.startX; eZ = other.startZ;
      } else if (Math.hypot(eX - other.endX, eZ - other.endZ) < snapTolerance) {
        eX = other.endX; eZ = other.endZ;
      }
    }
    
    if (Math.hypot(sX - eX, sZ - eZ) > snapTolerance) {
      snappedWalls.push({ startX: sX, startZ: sZ, endX: eX, endZ: eZ });
    }
  }

  // Fallback defaults if no walls parsed
  if (snappedWalls.length === 0) {
    return { rooms: [], walls: [], apertures: [], furniture: [] };
  }

  // 1. Grid-based BFS Room Detection
  // Find layout bounding box
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const w of snappedWalls) {
    minX = Math.min(minX, w.startX, w.endX);
    maxX = Math.max(maxX, w.startX, w.endX);
    minZ = Math.min(minZ, w.startZ, w.endZ);
    maxZ = Math.max(maxZ, w.startZ, w.endZ);
  }

  // Buffer bounding box slightly
  minX -= 0.5; maxX += 0.5;
  minZ -= 0.5; maxZ += 0.5;

  const resolution = 0.2; // grid resolution in meters
  const cols = Math.ceil((maxX - minX) / resolution);
  const rows = Math.ceil((maxZ - minZ) / resolution);
  
  // Initialize solid/grid matrices
  const isSolid = Array.from({ length: rows }, () => new Uint8Array(cols));
  
  // Mark cells that intersect wall lines as SOLID
  const pointToLineDistance = (px: number, pz: number, l: DXFLine) => {
    const dx = l.endX - l.startX;
    const dz = l.endZ - l.startZ;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) return Math.hypot(px - l.startX, pz - l.startZ);
    
    let t = ((px - l.startX) * dx + (pz - l.startZ) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    return Math.hypot(px - (l.startX + t * dx), pz - (l.startZ + t * dz));
  };

  for (let r = 0; r < rows; r++) {
    const cz = minZ + r * resolution + resolution / 2;
    for (let c = 0; c < cols; c++) {
      const cx = minX + c * resolution + resolution / 2;
      for (const w of snappedWalls) {
        if (pointToLineDistance(cx, cz, w) < 0.15) {
          isSolid[r][c] = 1;
          break;
        }
      }
    }
  }

  // Perform BFS Flood-Fill to locate connected walkable components
  const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
  const rooms: any[] = [];
  let roomCount = 1;

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (isSolid[r][c] === 0 && visited[r][c] === 0) {
        // Run flood fill BFS
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = 1;
        const componentCells: [number, number][] = [];
        
        let isOuterBoundary = false;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          const [cr, cc] = curr;
          componentCells.push(curr);
          
          if (cr === 0 || cr === rows - 1 || cc === 0 || cc === cols - 1) {
            isOuterBoundary = true; // connects to outside the building footprint
          }

          // Check 4-way neighbors
          const neighbors = [
            [cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]
          ];
          for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (isSolid[nr][nc] === 0 && visited[nr][nc] === 0) {
                visited[nr][nc] = 1;
                queue.push([nr, nc]);
              }
            }
          }
        }

        // If the connected region is not the outer void space, save it as a Room!
        if (!isOuterBoundary && componentCells.length > 15) { // min size threshold
          let rMinX = Infinity, rMaxX = -Infinity, rMinZ = Infinity, rMaxZ = -Infinity;
          let sumX = 0, sumZ = 0;
          
          for (const [cr, cc] of componentCells) {
            const cx = minX + cc * resolution;
            const cz = minZ + cr * resolution;
            rMinX = Math.min(rMinX, cx);
            rMaxX = Math.max(rMaxX, cx);
            rMinZ = Math.min(rMinZ, cz);
            rMaxZ = Math.max(rMaxZ, cz);
            sumX += cx;
            sumZ += cz;
          }

          const walkX = sumX / componentCells.length;
          const walkZ = sumZ / componentCells.length;
          
          // Match nearest label
          let name = `Room ${roomCount}`;
          let bestDist = Infinity;
          for (const label of rawLabels) {
            const d = Math.hypot(label.x - walkX, label.z - walkZ);
            if (d < bestDist && d < (rMaxX - rMinX + rMaxZ - rMinZ)) {
              name = label.text;
              bestDist = d;
            }
          }

          rooms.push({
            id: `room-${roomCount}`,
            name,
            x: Math.round(rMinX * 100) / 100,
            z: Math.round(rMinZ * 100) / 100,
            width: Math.round((rMaxX - rMinX) * 100) / 100,
            depth: Math.round((rMaxZ - rMinZ) * 100) / 100,
            color: name.toLowerCase().includes('lobby') ? '#374151' : name.toLowerCase().includes('living') ? '#f5efe6' : name.toLowerCase().includes('bed') ? '#ece8f2' : '#f4ece1',
            node: {
              x: Math.round(walkX * 100) / 100,
              z: Math.round(walkZ * 100) / 100
            }
          });
          roomCount++;
        }
      }
    }
  }

  // 2. Map Walls
  const walls = snappedWalls.map((w, index) => ({
    id: `w-${index + 1}`,
    startX: Math.round(w.startX * 100) / 100,
    startZ: Math.round(w.startZ * 100) / 100,
    endX: Math.round(w.endX * 100) / 100,
    endZ: Math.round(w.endZ * 100) / 100,
    thickness: 0.15,
    height: 3.0
  }));

  // 3. Map Door/Window Apertures
  const apertures: any[] = [];
  let apIndex = 1;

  const projectAperture = (ap: DXFAperture) => {
    let bestWall: any = null;
    let minDist = 0.6;
    let offset = 0;

    for (const w of walls) {
      const dx = w.endX - w.startX;
      const dz = w.endZ - w.startZ;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;
      
      let t = ((ap.x - w.startX) * dx + (ap.z - w.startZ) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      
      const px = w.startX + t * dx;
      const pz = w.startZ + t * dz;
      const dist = Math.hypot(ap.x - px, ap.z - pz);
      
      if (dist < minDist) {
        minDist = dist;
        bestWall = w;
        offset = t * Math.sqrt(lenSq);
      }
    }

    if (bestWall) {
      apertures.push({
        id: `ap-${ap.type}-${apIndex++}`,
        wallId: bestWall.id,
        type: ap.type,
        startOffset: Math.round(offset * 100) / 100,
        width: Math.round((ap.width > 0.4 ? ap.width : ap.type === 'door' ? 0.9 : 1.2) * 100) / 100,
        height: ap.type === 'door' ? 2.1 : 1.2,
        elevation: ap.type === 'door' ? 0.0 : 0.9,
        swing: ap.type === 'door' ? -1 : undefined // default inward swing
      });
    }
  };

  rawDoors.forEach(projectAperture);
  rawWindows.forEach(projectAperture);

  return {
    rooms,
    walls,
    apertures,
    furniture: []
  };
}
