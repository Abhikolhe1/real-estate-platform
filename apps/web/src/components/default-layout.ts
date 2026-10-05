export const defaultLayoutData = {
  rooms: [
    { id: 'room-lobby-2bhk', name: 'Central Access Lobby', x: -8, z: 4, width: 9, depth: 2, color: '#334155', node: { x: -3.5, z: 5.0 } },
    { id: 'room-elevators-2bhk', name: 'High-Speed Lifts (Elevators)', x: 1, z: 4, width: 3.5, depth: 2, color: '#1e293b', node: { x: 2.75, z: 5.0 } },
    { id: 'room-stairs-2bhk', name: 'Fire Exit & Staircase', x: 4.5, z: 4, width: 3.5, depth: 2, color: '#0f172a', node: { x: 6.25, z: 5.0 } },
    { id: 'room-living-a-2bhk', name: 'Flat A - Living Room', x: -8, z: -1, width: 8, depth: 5, color: '#f5efe6', node: { x: -4, z: 1.5 } },
    { id: 'room-kitchen-a-2bhk', name: 'Flat A - Kitchen', x: -8, z: -5, width: 4, depth: 4, color: '#f4ece1', node: { x: -6, z: -3.0 } },
    { id: 'room-bedroom-a-2bhk', name: 'Flat A - Bedroom', x: -4, z: -5, width: 4, depth: 4, color: '#ece8f2', node: { x: -2, z: -3.0 } },
    { id: 'room-balcony-a-2bhk', name: 'Flat A - Balcony', x: -4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: -2, z: -5.75 } },
    { id: 'room-living-b-2bhk', name: 'Flat B - Living Room', x: 0, z: -1, width: 8, depth: 5, color: '#f5efe6', node: { x: 4, z: 1.5 } },
    { id: 'room-kitchen-b-2bhk', name: 'Flat B - Kitchen', x: 0, z: -5, width: 4, depth: 4, color: '#f4ece1', node: { x: 2, z: -3.0 } },
    { id: 'room-bedroom-b-2bhk', name: 'Flat B - Bedroom', x: 4, z: -5, width: 4, depth: 4, color: '#ece8f2', node: { x: 6, z: -3.0 } },
    { id: 'room-balcony-b-2bhk', name: 'Flat B - Balcony', x: 4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: 6, z: -5.75 } }
  ],
  walls: [
    // Outer boundaries
    { id: 'w-2bhk-out-top', startX: -8, startZ: -5, endX: 8, endZ: -5, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-right', startX: 8, startZ: -5, endX: 8, endZ: 6, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-bottom', startX: 8, startZ: 6, endX: -8, endZ: 6, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-left', startX: -8, startZ: 6, endX: -8, endZ: -5, thickness: 0.2, height: 3.0 },
    // Internal partitions
    { id: 'w-2bhk-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 }, // Mid wall separating Flat A/B
    { id: 'w-2bhk-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 }, // Corridor separator
    { id: 'w-2bhk-int-core-sep', startX: 4.5, startZ: 4, endX: 4.5, endZ: 6, thickness: 0.15, height: 3.0 }, // Core separator
    { id: 'w-2bhk-int-lob-lift', startX: 1, startZ: 4, endX: 1, endZ: 6, thickness: 0.15, height: 3.0 }, // Lobby / lift separator
    { id: 'w-2bhk-int-flat-a-horiz', startX: -8, startZ: -1, endX: 0, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-b-horiz', startX: 0, startZ: -1, endX: 8, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-a-vert', startX: -4, startZ: -5, endX: -4, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-b-vert', startX: 4, startZ: -5, endX: 4, endZ: -1, thickness: 0.15, height: 3.0 }
  ],
  apertures: [
    // Entrance doors from Lobby Corridor (interactive swinging doors)
    { id: 'ap-entrance-a-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-entrance-b-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
    // Flat A Bedrooms/Kitchen
    { id: 'ap-door-bedroom-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-arch-kitchen-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 }, // Open archway
    // Flat B Bedrooms/Kitchen
    { id: 'ap-door-bedroom-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-arch-kitchen-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 }, // Open archway
    // Balcony Doors
    { id: 'ap-balcony-door-a-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
    { id: 'ap-balcony-door-b-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
    // Windows
    { id: 'ap-win-kitchen-a-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
    { id: 'ap-win-kitchen-b-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 9.5, width: 1.2, height: 1.2, elevation: 0.9 },
    { id: 'ap-win-living-a-2bhk', wallId: 'w-2bhk-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
    { id: 'ap-win-living-b-2bhk', wallId: 'w-2bhk-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
  ],
  furniture: [
    { id: 'f-lift-bank-1', type: 'elevator', roomId: 'room-elevators-2bhk', x: 2.75, z: 5.85, rotation: 180 },
    { id: 'f-stairs-core-1', type: 'stairs', roomId: 'room-stairs-2bhk', x: 6.25, z: 4.3, rotation: 0 },
    { id: 'f-sofa-a-2bhk', type: 'sofa', roomId: 'room-living-a-2bhk', x: -4.0, z: 1.5, rotation: 0 },
    { id: 'f-table-a-2bhk', type: 'table', roomId: 'room-living-a-2bhk', x: -4.0, z: 2.5, rotation: 0 },
    { id: 'f-bed-a-2bhk', type: 'bed', roomId: 'room-bedroom-a-2bhk', x: -2.0, z: -3.5, rotation: 90 },
    { id: 'f-sofa-b-2bhk', type: 'sofa', roomId: 'room-living-b-2bhk', x: 4.0, z: 1.5, rotation: 0 },
    { id: 'f-table-b-2bhk', type: 'table', roomId: 'room-living-b-2bhk', x: 4.0, z: 2.5, rotation: 0 },
    { id: 'f-bed-b-2bhk', type: 'bed', roomId: 'room-bedroom-b-2bhk', x: 6.0, z: -3.5, rotation: 90 }
  ]
};
