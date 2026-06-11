export interface FurnitureItem {
  id: string;
  type: string;
  roomId: string;
  x: number;
  z: number;
  rotation: number;
  color?: string;
}

export class AutoPlacer {
  static placeForRooms(rooms: any[]): FurnitureItem[] {
    const furniture: FurnitureItem[] = [];
    let count = 1;

    rooms.forEach((room) => {
      const nameLower = room.name.toLowerCase();
      const cx = room.node?.x ?? (room.x + room.width / 2);
      const cz = room.node?.z ?? (room.z + room.depth / 2);

      if (nameLower.includes('bed')) {
        furniture.push({
          id: `auto-f-${count++}`,
          type: 'bed',
          roomId: room.id,
          x: Math.round(cx * 100) / 100,
          z: Math.round(cz * 100) / 100,
          rotation: 0,
        });

        furniture.push({
          id: `auto-f-${count++}`,
          type: 'wardrobe',
          roomId: room.id,
          x: Math.round((room.x + 0.8) * 100) / 100,
          z: Math.round(cz * 100) / 100,
          rotation: 90,
        });
      } else if (nameLower.includes('living') || nameLower.includes('hall')) {
        furniture.push({
          id: `auto-f-${count++}`,
          type: 'sofa',
          roomId: room.id,
          x: Math.round(cx * 100) / 100,
          z: Math.round(cz * 100) / 100,
          rotation: 0,
          color: '#3e4a36',
        });

        furniture.push({
          id: `auto-f-${count++}`,
          type: 'table',
          roomId: room.id,
          x: Math.round(cx * 100) / 100,
          z: Math.round((cz + 1.1) * 100) / 100,
          rotation: 0,
        });
      } else if (nameLower.includes('kitchen')) {
        const isHorizontal = room.width > room.depth;
        furniture.push({
          id: `auto-f-${count++}`,
          type: 'counter',
          roomId: room.id,
          x: Math.round(cx * 100) / 100,
          z: Math.round((isHorizontal ? room.z + 0.4 : cz) * 100) / 100,
          rotation: isHorizontal ? 0 : 90,
        });
      } else if (nameLower.includes('bath') || nameLower.includes('toilet') || nameLower.includes('wc')) {
        furniture.push({
          id: `auto-f-${count++}`,
          type: 'toilet',
          roomId: room.id,
          x: Math.round((room.x + 0.5) * 100) / 100,
          z: Math.round((room.z + room.depth - 0.5) * 100) / 100,
          rotation: 180,
        });

        furniture.push({
          id: `auto-f-${count++}`,
          type: 'sink',
          roomId: room.id,
          x: Math.round((room.x + room.width - 0.5) * 100) / 100,
          z: Math.round((room.z + room.depth - 0.5) * 100) / 100,
          rotation: 180,
        });
      }
    });

    return furniture;
  }
}
