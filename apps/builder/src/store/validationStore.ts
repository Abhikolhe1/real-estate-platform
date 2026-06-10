import { create } from 'zustand';
import {
  Point2D,
  calculateArea,
  calculateCentroid,
  unionPolygons,
  splitPolygon,
  polygonsIntersect,
} from '../utils/geo-utils';

export interface Room {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  points: Point2D[];
  node: Point2D;
}

export interface Wall {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  thickness: number;
  height: number;
}

export interface Aperture {
  id: string;
  wallId: string;
  type: 'door' | 'window';
  startOffset: number;
  width: number;
  height: number;
  elevation: number;
  swing?: number;
}

interface ValidationState {
  rooms: Room[];
  walls: Wall[];
  apertures: Aperture[];
  selectedRoomId: string | null;
  selectedApId: string | null;

  // Actions
  initStore: (rooms: any[], walls: any[], apertures: any[]) => void;
  selectRoom: (roomId: string | null) => void;
  selectAperture: (apId: string | null) => void;
  updateRoomName: (roomId: string, name: string) => void;
  addRoom: (name: string, isBalcony?: boolean) => void;
  deleteRoom: (roomId: string) => void;
  addAperture: (type: 'door' | 'window') => void;
  dragRoomCorner: (roomId: string, cornerIndex: number, newX: number, newZ: number) => void;
  mergeRooms: (roomAId: string, roomBId: string) => void;
  splitRoom: (roomId: string, axis: 'x' | 'z', fraction: number) => void;
  getOverlaps: () => [string, string][];
}

export const useValidationStore = create<ValidationState>((set, get) => ({
  rooms: [],
  walls: [],
  apertures: [],
  selectedRoomId: null,
  selectedApId: null,

  initStore: (rawRooms, rawWalls, rawApertures) => {
    const rooms = (rawRooms || []).map((r: any) => {
      // Auto-initialize points clockwise rectangle if not defined
      const points = r.points || [
        { x: r.x, z: r.z },
        { x: r.x + r.width, z: r.z },
        { x: r.x + r.width, z: r.z + r.depth },
        { x: r.x, z: r.z + r.depth },
      ];
      const centroid = calculateCentroid(points);
      return {
        id: r.id,
        name: r.name,
        x: r.x,
        z: r.z,
        width: r.width,
        depth: r.depth,
        color: r.color || '#f5efe6',
        points,
        node: r.node || centroid,
      };
    });

    set({
      rooms,
      walls: rawWalls || [],
      apertures: rawApertures || [],
      selectedRoomId: null,
      selectedApId: null,
    });
  },

  selectRoom: (selectedRoomId) => set({ selectedRoomId, selectedApId: null }),

  selectAperture: (selectedApId) => set({ selectedApId, selectedRoomId: null }),

  updateRoomName: (roomId, name) => {
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, name } : r)),
    }));
  },

  addRoom: (name, isBalcony = false) => {
    const rx = -4 + Math.random() * 2;
    const rz = -3 + Math.random() * 2;
    const rw = 4.5;
    const rd = 4.0;
    const color = isBalcony ? '#faf5ef' : '#f5efe6';

    const points = [
      { x: rx, z: rz },
      { x: rx + rw, z: rz },
      { x: rx + rw, z: rz + rd },
      { x: rx, z: rz + rd },
    ];
    const centroid = calculateCentroid(points);

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name,
      x: rx,
      z: rz,
      width: rw,
      depth: rd,
      color,
      points,
      node: centroid,
    };

    // Construct 4 walls around the new room
    const wallIdBase = `w-new-${Date.now()}`;
    const newWalls = [
      { id: `${wallIdBase}-top`, startX: rx, startZ: rz, endX: rx + rw, endZ: rz, thickness: 0.15, height: 3.0 },
      { id: `${wallIdBase}-right`, startX: rx + rw, startZ: rz, endX: rx + rw, endZ: rz + rd, thickness: 0.15, height: 3.0 },
      { id: `${wallIdBase}-bottom`, startX: rx + rw, startZ: rz + rd, endX: rx, endZ: rz + rd, thickness: 0.15, height: 3.0 },
      { id: `${wallIdBase}-left`, startX: rx, startZ: rz + rd, endX: rx, endZ: rz, thickness: 0.15, height: 3.0 },
    ];

    set((state) => ({
      rooms: [...state.rooms, newRoom],
      walls: [...state.walls, ...newWalls],
      selectedRoomId: newRoom.id,
    }));
  },

  deleteRoom: (roomId) => {
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
      selectedRoomId: state.selectedRoomId === roomId ? null : state.selectedRoomId,
    }));
  },

  addAperture: (type) => {
    const { walls } = get();
    if (walls.length === 0) return;
    const targetWall = walls[0];

    const newAp: Aperture = {
      id: `ap-${Date.now()}`,
      wallId: targetWall.id,
      type,
      startOffset: 1.0,
      width: type === 'door' ? 0.9 : 1.5,
      height: type === 'door' ? 2.1 : 1.2,
      elevation: type === 'door' ? 0.0 : 0.9,
    };

    if (type === 'door') {
      newAp.swing = -1;
    }

    set((state) => ({
      apertures: [...state.apertures, newAp],
      selectedApId: newAp.id,
    }));
  },

  dragRoomCorner: (roomId, cornerIndex, newX, newZ) => {
    set((state) => ({
      rooms: state.rooms.map((r) => {
        if (r.id !== roomId) return r;

        // Clone points and update specific vertex
        const points = r.points.map((pt, idx) =>
          idx === cornerIndex ? { x: Math.round(newX * 100) / 100, z: Math.round(newZ * 100) / 100 } : pt
        );

        // Re-calculate bounds
        const xs = points.map((p) => p.x);
        const zs = points.map((p) => p.z);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minZ = Math.min(...zs);
        const maxZ = Math.max(...zs);

        const centroid = calculateCentroid(points);

        return {
          ...r,
          points,
          x: minX,
          z: minZ,
          width: Math.round((maxX - minX) * 100) / 100,
          depth: Math.round((maxZ - minZ) * 100) / 100,
          node: centroid,
        };
      }),
    }));
  },

  mergeRooms: (roomAId, roomBId) => {
    const { rooms } = get();
    const roomA = rooms.find((r) => r.id === roomAId);
    const roomB = rooms.find((r) => r.id === roomBId);
    if (!roomA || !roomB) return;

    const mergedPoints = unionPolygons(roomA.points, roomB.points);
    const centroid = calculateCentroid(mergedPoints);

    const xs = mergedPoints.map((p) => p.x);
    const zs = mergedPoints.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const mergedRoom: Room = {
      ...roomA,
      name: `${roomA.name} + ${roomB.name}`,
      points: mergedPoints,
      x: minX,
      z: minZ,
      width: Math.round((maxX - minX) * 100) / 100,
      depth: Math.round((maxZ - minZ) * 100) / 100,
      node: centroid,
    };

    set((state) => ({
      rooms: state.rooms
        .filter((r) => r.id !== roomAId && r.id !== roomBId)
        .concat(mergedRoom),
      selectedRoomId: mergedRoom.id,
    }));
  },

  splitRoom: (roomId, axis, fraction) => {
    const { rooms } = get();
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const xs = room.points.map((p) => p.x);
    const zs = room.points.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const coord =
      axis === 'x'
        ? minX + fraction * (maxX - minX)
        : minZ + fraction * (maxZ - minZ);

    const [polyA, polyB] = splitPolygon(room.points, axis, coord);

    const centroidA = calculateCentroid(polyA);
    const centroidB = calculateCentroid(polyB);

    const xsA = polyA.map((p) => p.x);
    const zsA = polyA.map((p) => p.z);
    const minXA = Math.min(...xsA);
    const maxXA = Math.max(...xsA);
    const minZA = Math.min(...zsA);
    const maxZA = Math.max(...zsA);

    const xsB = polyB.map((p) => p.x);
    const zsB = polyB.map((p) => p.z);
    const minXB = Math.min(...xsB);
    const maxXB = Math.max(...xsB);
    const minZB = Math.min(...zsB);
    const maxZB = Math.max(...zsB);

    const partA: Room = {
      id: `room-${Date.now()}-A`,
      name: `${room.name} Part 1`,
      x: minXA,
      z: minZA,
      width: Math.round((maxXA - minXA) * 100) / 100,
      depth: Math.round((maxZA - minZA) * 100) / 100,
      color: room.color,
      points: polyA,
      node: centroidA,
    };

    const partB: Room = {
      id: `room-${Date.now()}-B`,
      name: `${room.name} Part 2`,
      x: minXB,
      z: minZB,
      width: Math.round((maxXB - minXB) * 100) / 100,
      depth: Math.round((maxZB - minZB) * 100) / 100,
      color: room.color,
      points: polyB,
      node: centroidB,
    };

    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId).concat(partA, partB),
      selectedRoomId: partA.id,
    }));
  },

  getOverlaps: () => {
    const { rooms } = get();
    const overlaps: [string, string][] = [];

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        if (polygonsIntersect(rooms[i].points, rooms[j].points)) {
          overlaps.push([rooms[i].id, rooms[j].id]);
        }
      }
    }
    return overlaps;
  },
}));
