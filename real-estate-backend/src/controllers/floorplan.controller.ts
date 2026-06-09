import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloorPlan } from '../entities/floorplan.entity';
import { TenantId } from '../interceptors/tenant.decorator';
import { parseDXF } from '../utils/dxf-parser';
import * as path from 'path';
import * as fs from 'fs';

// Template coordinates lookup generator for configurable floors
function getTemplateLayout(type: string) {
  if (type === '1BHK') {
    return {
      rooms: [
        { id: 'room-lobby-1bhk', name: 'Lobby Corridor', x: -8, z: 4, width: 16, depth: 2, color: '#374151', node: { x: 0, z: 5.0 } },
        { id: 'room-living-a-1bhk', name: 'Flat A - Living Room', x: -8, z: 0, width: 8, depth: 4, color: '#f5efe6', node: { x: -4, z: 2.0 } },
        { id: 'room-kitchen-a-1bhk', name: 'Flat A - Kitchen', x: -8, z: -4, width: 4, depth: 4, color: '#f4ece1', node: { x: -6, z: -2.0 } },
        { id: 'room-bedroom-a-1bhk', name: 'Flat A - Bedroom', x: -4, z: -4, width: 4, depth: 4, color: '#ece8f2', node: { x: -2, z: -2.0 } },
        { id: 'room-balcony-a-1bhk', name: 'Flat A - Balcony', x: -4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: -2, z: -5.75 } },
        { id: 'room-living-b-1bhk', name: 'Flat B - Living Room', x: 0, z: 0, width: 8, depth: 4, color: '#f5efe6', node: { x: 4, z: 2.0 } },
        { id: 'room-kitchen-b-1bhk', name: 'Flat B - Kitchen', x: 0, z: -4, width: 4, depth: 4, color: '#f4ece1', node: { x: 2, z: -2.0 } },
        { id: 'room-bedroom-b-1bhk', name: 'Flat B - Bedroom', x: 4, z: -4, width: 4, depth: 4, color: '#ece8f2', node: { x: 6, z: -2.0 } },
        { id: 'room-balcony-b-1bhk', name: 'Flat B - Balcony', x: 4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: 6, z: -5.75 } }
      ],
      walls: [
        // Outer boundaries
        { id: 'w-1bhk-out-top', startX: -8, startZ: -5, endX: 8, endZ: -5, thickness: 0.2, height: 3.0 },
        { id: 'w-1bhk-out-right', startX: 8, startZ: -5, endX: 8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-1bhk-out-bottom', startX: 8, startZ: 6, endX: -8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-1bhk-out-left', startX: -8, startZ: 6, endX: -8, endZ: -5, thickness: 0.2, height: 3.0 },
        // Internal partitions
        { id: 'w-1bhk-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-1bhk-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-1bhk-int-flat-a-horiz', startX: -8, startZ: 0, endX: 0, endZ: 0, thickness: 0.15, height: 3.0 },
        { id: 'w-1bhk-int-flat-b-horiz', startX: 0, startZ: 0, endX: 8, endZ: 0, thickness: 0.15, height: 3.0 },
        { id: 'w-1bhk-int-flat-a-vert', startX: -4, startZ: -4, endX: -4, endZ: 0, thickness: 0.15, height: 3.0 },
        { id: 'w-1bhk-int-flat-b-vert', startX: 4, startZ: -4, endX: 4, endZ: 0, thickness: 0.15, height: 3.0 }
      ],
      apertures: [
        // Entrance doors from Lobby Corridor (interactive swinging doors swinging inward)
        { id: 'ap-entrance-a-1bhk', wallId: 'w-1bhk-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-entrance-b-1bhk', wallId: 'w-1bhk-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        // Flat A Bedroom/Kitchen
        { id: 'ap-door-bedroom-a-1bhk', wallId: 'w-1bhk-int-flat-a-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-a-1bhk', wallId: 'w-1bhk-int-flat-a-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 }, // Open archway
        // Flat B Bedroom/Kitchen
        { id: 'ap-door-bedroom-b-1bhk', wallId: 'w-1bhk-int-flat-b-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-b-1bhk', wallId: 'w-1bhk-int-flat-b-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 }, // Open archway
        // Balcony Doors
        { id: 'ap-balcony-door-a-1bhk', wallId: 'w-1bhk-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-balcony-door-b-1bhk', wallId: 'w-1bhk-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        // Windows
        { id: 'ap-win-kitchen-a-1bhk', wallId: 'w-1bhk-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-kitchen-b-1bhk', wallId: 'w-1bhk-out-top', type: 'window', startOffset: 9.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-a-1bhk', wallId: 'w-1bhk-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-b-1bhk', wallId: 'w-1bhk-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
      ],
      furniture: [
        { id: 'f-sofa-a-1bhk', type: 'sofa', roomId: 'room-living-a-1bhk', x: -4.0, z: 1.5, rotation: 0 },
        { id: 'f-table-a-1bhk', type: 'table', roomId: 'room-living-a-1bhk', x: -4.0, z: 2.5, rotation: 0 },
        { id: 'f-bed-a-1bhk', type: 'bed', roomId: 'room-bedroom-a-1bhk', x: -2.0, z: -2.5, rotation: 90 },
        { id: 'f-sofa-b-1bhk', type: 'sofa', roomId: 'room-living-b-1bhk', x: 4.0, z: 1.5, rotation: 0 },
        { id: 'f-table-b-1bhk', type: 'table', roomId: 'room-living-b-1bhk', x: 4.0, z: 2.5, rotation: 0 },
        { id: 'f-bed-b-1bhk', type: 'bed', roomId: 'room-bedroom-b-1bhk', x: 6.0, z: -2.5, rotation: 90 }
      ]
    };
  }

  if (type === '2BHK') {
    return {
      rooms: [
        { id: 'room-lobby-2bhk', name: 'Lobby Corridor', x: -8, z: 4, width: 16, depth: 2, color: '#374151', node: { x: 0, z: 5.0 } },
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
        { id: 'w-2bhk-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-2bhk-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-2bhk-int-flat-a-horiz', startX: -8, startZ: -1, endX: 0, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-2bhk-int-flat-b-horiz', startX: 0, startZ: -1, endX: 8, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-2bhk-int-flat-a-vert', startX: -4, startZ: -5, endX: -4, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-2bhk-int-flat-b-vert', startX: 4, startZ: -5, endX: 4, endZ: -1, thickness: 0.15, height: 3.0 }
      ],
      apertures: [
        { id: 'ap-entrance-a-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-entrance-b-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-door-bedroom-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
        { id: 'ap-door-bedroom-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
        { id: 'ap-balcony-door-a-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-balcony-door-b-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-win-kitchen-a-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-kitchen-b-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 9.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-a-2bhk', wallId: 'w-2bhk-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-b-2bhk', wallId: 'w-2bhk-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
      ],
      furniture: [
        { id: 'f-sofa-a-2bhk', type: 'sofa', roomId: 'room-living-a-2bhk', x: -4.0, z: 1.5, rotation: 0 },
        { id: 'f-table-a-2bhk', type: 'table', roomId: 'room-living-a-2bhk', x: -4.0, z: 2.5, rotation: 0 },
        { id: 'f-bed-a-2bhk', type: 'bed', roomId: 'room-bedroom-a-2bhk', x: -2.0, z: -3.5, rotation: 90 },
        { id: 'f-sofa-b-2bhk', type: 'sofa', roomId: 'room-living-b-2bhk', x: 4.0, z: 1.5, rotation: 0 },
        { id: 'f-table-b-2bhk', type: 'table', roomId: 'room-living-b-2bhk', x: 4.0, z: 2.5, rotation: 0 },
        { id: 'f-bed-b-2bhk', type: 'bed', roomId: 'room-bedroom-b-2bhk', x: 6.0, z: -3.5, rotation: 90 }
      ]
    };
  }

  if (type === '3BHK') {
    return {
      rooms: [
        { id: 'room-lobby-3bhk', name: 'Lobby Corridor', x: -8, z: 4, width: 16, depth: 2, color: '#374151', node: { x: 0, z: 5.0 } },
        { id: 'room-living-a-3bhk', name: 'Flat A - Living Room', x: -8, z: 1, width: 8, depth: 3, color: '#f5efe6', node: { x: -4, z: 2.5 } },
        { id: 'room-kitchen-a-3bhk', name: 'Flat A - Kitchen', x: -8, z: -2, width: 4, depth: 3, color: '#f4ece1', node: { x: -6, z: -0.5 } },
        { id: 'room-bedroom-a-3bhk', name: 'Flat A - Master Bedroom', x: -4, z: -2, width: 4, depth: 3, color: '#ece8f2', node: { x: -2, z: -0.5 } },
        { id: 'room-kids-a-3bhk', name: 'Flat A - Kids Bedroom', x: -8, z: -5, width: 4, depth: 3, color: '#e3ece9', node: { x: -6, z: -3.5 } },
        { id: 'room-guest-a-3bhk', name: 'Flat A - Guest Bedroom', x: -4, z: -5, width: 4, depth: 3, color: '#e1ecf4', node: { x: -2, z: -3.5 } },
        { id: 'room-balcony-a-3bhk', name: 'Flat A - Balcony', x: -4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: -2, z: -5.75 } },
        
        { id: 'room-living-b-3bhk', name: 'Flat B - Living Room', x: 0, z: 1, width: 8, depth: 3, color: '#f5efe6', node: { x: 4, z: 2.5 } },
        { id: 'room-kitchen-b-3bhk', name: 'Flat B - Kitchen', x: 0, z: -2, width: 4, depth: 3, color: '#f4ece1', node: { x: 2, z: -0.5 } },
        { id: 'room-bedroom-b-3bhk', name: 'Flat B - Master Bedroom', x: 4, z: -2, width: 4, depth: 3, color: '#ece8f2', node: { x: 6, z: -0.5 } },
        { id: 'room-kids-b-3bhk', name: 'Flat B - Kids Bedroom', x: 0, z: -5, width: 4, depth: 3, color: '#e3ece9', node: { x: 2, z: -3.5 } },
        { id: 'room-guest-b-3bhk', name: 'Flat B - Guest Bedroom', x: 4, z: -5, width: 4, depth: 3, color: '#e1ecf4', node: { x: 6, z: -3.5 } },
        { id: 'room-balcony-b-3bhk', name: 'Flat B - Balcony', x: 4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: 6, z: -5.75 } }
      ],
      walls: [
        // Outer boundaries
        { id: 'w-3bhk-out-top', startX: -8, startZ: -5, endX: 8, endZ: -5, thickness: 0.2, height: 3.0 },
        { id: 'w-3bhk-out-right', startX: 8, startZ: -5, endX: 8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-3bhk-out-bottom', startX: 8, startZ: 6, endX: -8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-3bhk-out-left', startX: -8, startZ: 6, endX: -8, endZ: -5, thickness: 0.2, height: 3.0 },
        // Internal partitions
        { id: 'w-3bhk-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-a-horiz1', startX: -8, startZ: 1, endX: 0, endZ: 1, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-b-horiz1', startX: 0, startZ: 1, endX: 8, endZ: 1, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-a-horiz2', startX: -8, startZ: -2, endX: 0, endZ: -2, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-b-horiz2', startX: 0, startZ: -2, endX: 8, endZ: -2, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-a-vert1', startX: -4, startZ: -2, endX: -4, endZ: 1, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-b-vert1', startX: 4, startZ: -2, endX: 4, endZ: 1, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-a-vert2', startX: -4, startZ: -5, endX: -4, endZ: -2, thickness: 0.15, height: 3.0 },
        { id: 'w-3bhk-int-flat-b-vert2', startX: 4, startZ: -5, endX: 4, endZ: -2, thickness: 0.15, height: 3.0 }
      ],
      apertures: [
        { id: 'ap-entrance-a-3bhk', wallId: 'w-3bhk-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-entrance-b-3bhk', wallId: 'w-3bhk-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-door-master-a-3bhk', wallId: 'w-3bhk-int-flat-a-horiz1', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-a-3bhk', wallId: 'w-3bhk-int-flat-a-horiz1', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
        { id: 'ap-door-kids-a-3bhk', wallId: 'w-3bhk-int-flat-a-horiz2', type: 'door', startOffset: 1.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-door-guest-a-3bhk', wallId: 'w-3bhk-int-flat-a-horiz2', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-door-master-b-3bhk', wallId: 'w-3bhk-int-flat-b-horiz1', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-b-3bhk', wallId: 'w-3bhk-int-flat-b-horiz1', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
        { id: 'ap-door-kids-b-3bhk', wallId: 'w-3bhk-int-flat-b-horiz2', type: 'door', startOffset: 1.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-door-guest-b-3bhk', wallId: 'w-3bhk-int-flat-b-horiz2', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-balcony-door-a-3bhk', wallId: 'w-3bhk-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-balcony-door-b-3bhk', wallId: 'w-3bhk-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-win-kitchen-a-3bhk', wallId: 'w-3bhk-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-kitchen-b-3bhk', wallId: 'w-3bhk-out-top', type: 'window', startOffset: 9.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-a-3bhk', wallId: 'w-3bhk-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-b-3bhk', wallId: 'w-3bhk-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
      ],
      furniture: [
        { id: 'f-sofa-a-3bhk', type: 'sofa', roomId: 'room-living-a-3bhk', x: -4.0, z: 2.0, rotation: 0 },
        { id: 'f-table-a-3bhk', type: 'table', roomId: 'room-living-a-3bhk', x: -4.0, z: 3.0, rotation: 0 },
        { id: 'f-bed-master-a-3bhk', type: 'bed', roomId: 'room-bedroom-a-3bhk', x: -2.0, z: -0.5, rotation: 90 },
        { id: 'f-bed-kids-a-3bhk', type: 'bed', roomId: 'room-kids-a-3bhk', x: -6.0, z: -3.5, rotation: 90 },
        { id: 'f-bed-guest-a-3bhk', type: 'bed', roomId: 'room-guest-a-3bhk', x: -2.0, z: -3.5, rotation: 90 },
        { id: 'f-sofa-b-3bhk', type: 'sofa', roomId: 'room-living-b-3bhk', x: 4.0, z: 2.0, rotation: 0 },
        { id: 'f-table-b-3bhk', type: 'table', roomId: 'room-living-b-3bhk', x: 4.0, z: 3.0, rotation: 0 },
        { id: 'f-bed-master-b-3bhk', type: 'bed', roomId: 'room-bedroom-b-3bhk', x: 6.0, z: -0.5, rotation: 90 },
        { id: 'f-bed-kids-b-3bhk', type: 'bed', roomId: 'room-kids-b-3bhk', x: 2.0, z: -3.5, rotation: 90 },
        { id: 'f-bed-guest-b-3bhk', type: 'bed', roomId: 'room-guest-b-3bhk', x: 6.0, z: -3.5, rotation: 90 }
      ]
    };
  }

  if (type === 'PENTHOUSE') {
    return {
      rooms: [
        { id: 'room-lobby-ph', name: 'Lobby Corridor', x: -8, z: 4, width: 16, depth: 2, color: '#374151', node: { x: 0, z: 5.0 } },
        { id: 'room-living-ph', name: 'Grand Living Hall', x: -8, z: -1, width: 16, depth: 5, color: '#f5efe6', node: { x: 0, z: 1.5 } },
        { id: 'room-kitchen-ph', name: 'Gourmet Kitchen', x: -8, z: -5, width: 5, depth: 4, color: '#f4ece1', node: { x: -5.5, z: -3.0 } },
        { id: 'room-master-ph', name: 'Master Suite', x: -3, z: -5, width: 6, depth: 4, color: '#ece8f2', node: { x: 0, z: -3.0 } },
        { id: 'room-guest-ph', name: 'Guest Suite', x: 3, z: -5, width: 5, depth: 4, color: '#e1ecf4', node: { x: 5.5, z: -3.0 } },
        { id: 'room-balcony-ph', name: 'Sky Deck Balcony', x: -4, z: -6.5, width: 8, depth: 1.5, color: '#faf5ef', node: { x: 0, z: -5.75 } }
      ],
      walls: [
        // Outer boundaries
        { id: 'w-ph-out-top', startX: -8, startZ: -5, endX: 8, endZ: -5, thickness: 0.2, height: 3.0 },
        { id: 'w-ph-out-right', startX: 8, startZ: -5, endX: 8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-ph-out-bottom', startX: 8, startZ: 6, endX: -8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-ph-out-left', startX: -8, startZ: 6, endX: -8, endZ: -5, thickness: 0.2, height: 3.0 },
        // Internal partitions
        { id: 'w-ph-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-ph-int-flat-horiz', startX: -8, startZ: -1, endX: 8, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-ph-int-flat-vert1', startX: -3, startZ: -5, endX: -3, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-ph-int-flat-vert2', startX: 3, startZ: -5, endX: 3, endZ: -1, thickness: 0.15, height: 3.0 }
      ],
      apertures: [
        { id: 'ap-entrance-ph', wallId: 'w-ph-int-lobby', type: 'door', startOffset: 7.5, width: 1.2, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-door-master-ph', wallId: 'w-ph-int-flat-horiz', type: 'door', startOffset: 7.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-ph', wallId: 'w-ph-int-flat-horiz', type: 'arch', startOffset: 2.0, width: 1.2, height: 2.1, elevation: 0.0 },
        { id: 'ap-door-guest-ph', wallId: 'w-ph-int-flat-horiz', type: 'door', startOffset: 13.0, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-deck-door-ph', wallId: 'w-ph-out-top', type: 'door', startOffset: 7.5, width: 1.2, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-win-kitchen-ph', wallId: 'w-ph-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-guest-ph', wallId: 'w-ph-out-top', type: 'window', startOffset: 13.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-l-ph', wallId: 'w-ph-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-r-ph', wallId: 'w-ph-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
      ],
      furniture: [
        { id: 'f-sofa-ph', type: 'sofa', roomId: 'room-living-ph', x: 0, z: 1.5, rotation: 0 },
        { id: 'f-table-ph', type: 'table', roomId: 'room-living-ph', x: 0, z: 2.5, rotation: 0 },
        { id: 'f-bed-master-ph', type: 'bed', roomId: 'room-master-ph', x: 0, z: -3.5, rotation: 90 },
        { id: 'f-bed-guest-ph', type: 'bed', roomId: 'room-guest-ph', x: 5.5, z: -3.5, rotation: 90 }
      ]
    };
  }

  if (type === 'LUXURY_SHOWROOM') {
    return {
      rooms: [
        { id: 'room-lobby-sr', name: 'Lobby Corridor', x: -8, z: 4, width: 16, depth: 2, color: '#374151', node: { x: 0, z: 5.0 } },
        { id: 'room-living-a-sr', name: 'Flat A - Luxury Living Suite', x: -8, z: -1, width: 8, depth: 5, color: '#f5efe6', node: { x: -4, z: 1.5 } },
        { id: 'room-kitchen-sr', name: 'Flat A - Modern Gourmet Kitchen', x: -8, z: -5, width: 4, depth: 4, color: '#f4ece1', node: { x: -6, z: -3.0 } },
        { id: 'room-bedroom-sr', name: 'Flat A - Presidential Master Suite', x: -4, z: -5, width: 4, depth: 4, color: '#ece8f2', node: { x: -2, z: -3.0 } },
        { id: 'room-balcony-sr', name: 'Flat A - Open Air Sun Deck', x: -4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: -2, z: -5.75 } },
        { id: 'room-living-b-sr', name: 'Flat B - Luxury Living Suite', x: 0, z: -1, width: 8, depth: 5, color: '#f5efe6', node: { x: 4, z: 1.5 } },
        { id: 'room-kitchen-b-sr', name: 'Flat B - Modern Gourmet Kitchen', x: 0, z: -5, width: 4, depth: 4, color: '#f4ece1', node: { x: 2, z: -3.0 } },
        { id: 'room-bedroom-b-sr', name: 'Flat B - Presidential Master Suite', x: 4, z: -5, width: 4, depth: 4, color: '#ece8f2', node: { x: 6, z: -3.0 } },
        { id: 'room-balcony-b-sr', name: 'Flat B - Open Air Sun Deck', x: 4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: 6, z: -5.75 } }
      ],
      walls: [
        // Outer boundaries
        { id: 'w-sr-out-top', startX: -8, startZ: -5, endX: 8, endZ: -5, thickness: 0.2, height: 3.0 },
        { id: 'w-sr-out-right', startX: 8, startZ: -5, endX: 8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-sr-out-bottom', startX: 8, startZ: 6, endX: -8, endZ: 6, thickness: 0.2, height: 3.0 },
        { id: 'w-sr-out-left', startX: -8, startZ: 6, endX: -8, endZ: -5, thickness: 0.2, height: 3.0 },
        // Internal partitions
        { id: 'w-sr-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-sr-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 },
        { id: 'w-sr-int-flat-a-horiz', startX: -8, startZ: -1, endX: 0, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-sr-int-flat-b-horiz', startX: 0, startZ: -1, endX: 8, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-sr-int-flat-a-vert', startX: -4, startZ: -5, endX: -4, endZ: -1, thickness: 0.15, height: 3.0 },
        { id: 'w-sr-int-flat-b-vert', startX: 4, startZ: -5, endX: 4, endZ: -1, thickness: 0.15, height: 3.0 }
      ],
      apertures: [
        { id: 'ap-entrance-a-sr', wallId: 'w-sr-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-entrance-b-sr', wallId: 'w-sr-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-door-bedroom-a-sr', wallId: 'w-sr-int-flat-a-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-a-sr', wallId: 'w-sr-int-flat-a-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
        { id: 'ap-door-bedroom-b-sr', wallId: 'w-sr-int-flat-b-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
        { id: 'ap-arch-kitchen-b-sr', wallId: 'w-sr-int-flat-b-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
        { id: 'ap-balcony-door-a-sr', wallId: 'w-sr-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-balcony-door-b-sr', wallId: 'w-sr-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
        { id: 'ap-win-kitchen-a-sr', wallId: 'w-sr-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-kitchen-b-sr', wallId: 'w-sr-out-top', type: 'window', startOffset: 9.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-a-sr', wallId: 'w-sr-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-win-living-b-sr', wallId: 'w-sr-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
      ],
      furniture: [
        { id: 'f-sofa-a-sr', type: 'sofa', roomId: 'room-living-a-sr', x: -4.0, z: 1.5, rotation: 0 },
        { id: 'f-table-a-sr', type: 'table', roomId: 'room-living-a-sr', x: -4.0, z: 2.5, rotation: 0 },
        { id: 'f-bed-a-sr', type: 'bed', roomId: 'room-bedroom-a-sr', x: -2.0, z: -3.5, rotation: 90 },
        { id: 'f-sofa-b-sr', type: 'sofa', roomId: 'room-living-b-sr', x: 4.0, z: 1.5, rotation: 0 },
        { id: 'f-table-b-sr', type: 'table', roomId: 'room-living-b-sr', x: 4.0, z: 2.5, rotation: 0 },
        { id: 'f-bed-b-sr', type: 'bed', roomId: 'room-bedroom-b-sr', x: 6.0, z: -3.5, rotation: 90 }
      ]
    };
  }

  // Symmetrical Default 2BHK Layout Fallback
  return {
    rooms: [
      { id: 'room-lobby-2bhk', name: 'Lobby Corridor', x: -8, z: 4, width: 16, depth: 2, color: '#374151', node: { x: 0, z: 5.0 } },
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
      { id: 'w-2bhk-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 },
      { id: 'w-2bhk-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 },
      { id: 'w-2bhk-int-flat-a-horiz', startX: -8, startZ: -1, endX: 0, endZ: -1, thickness: 0.15, height: 3.0 },
      { id: 'w-2bhk-int-flat-b-horiz', startX: 0, startZ: -1, endX: 8, endZ: -1, thickness: 0.15, height: 3.0 },
      { id: 'w-2bhk-int-flat-a-vert', startX: -4, startZ: -5, endX: -4, endZ: -1, thickness: 0.15, height: 3.0 },
      { id: 'w-2bhk-int-flat-b-vert', startX: 4, startZ: -5, endX: 4, endZ: -1, thickness: 0.15, height: 3.0 }
    ],
    apertures: [
      { id: 'ap-entrance-a-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
      { id: 'ap-entrance-b-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
      { id: 'ap-door-bedroom-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
      { id: 'ap-arch-kitchen-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
      { id: 'ap-door-bedroom-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
      { id: 'ap-arch-kitchen-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
      { id: 'ap-balcony-door-a-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
      { id: 'ap-balcony-door-b-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
      { id: 'ap-win-kitchen-a-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
      { id: 'ap-win-kitchen-b-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 9.5, width: 1.2, height: 1.2, elevation: 0.9 },
      { id: 'ap-win-living-a-2bhk', wallId: 'w-2bhk-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
      { id: 'ap-win-living-b-2bhk', wallId: 'w-2bhk-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
    ],
    furniture: [
      { id: 'f-sofa-a-2bhk', type: 'sofa', roomId: 'room-living-a-2bhk', x: -4.0, z: 1.5, rotation: 0 },
      { id: 'f-table-a-2bhk', type: 'table', roomId: 'room-living-a-2bhk', x: -4.0, z: 2.5, rotation: 0 },
      { id: 'f-bed-a-2bhk', type: 'bed', roomId: 'room-bedroom-a-2bhk', x: -2.0, z: -3.5, rotation: 90 },
      { id: 'f-sofa-b-2bhk', type: 'sofa', roomId: 'room-living-b-2bhk', x: 4.0, z: 1.5, rotation: 0 },
      { id: 'f-table-b-2bhk', type: 'table', roomId: 'room-living-b-2bhk', x: 4.0, z: 2.5, rotation: 0 },
      { id: 'f-bed-b-2bhk', type: 'bed', roomId: 'room-bedroom-b-2bhk', x: 6.0, z: -3.5, rotation: 90 }
    ]
  };
}

@Controller('floorplans')
export class FloorPlanController {
  constructor(
    @InjectRepository(FloorPlan)
    private readonly floorplanRepo: Repository<FloorPlan>,
  ) {}

  // Get all floor plans
  @Get()
  async getFloorPlans(@TenantId() tenantId: string) {
    return this.floorplanRepo.find({
      where: { tenantId },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get a specific floor plan
  @Get(':id')
  async getFloorPlan(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.floorplanRepo.findOne({
      where: { id, tenantId },
      relations: ['project'],
    });
  }

  // Upload/Create new floor plan record
  @Post()
  async createFloorPlan(
    @TenantId() tenantId: string,
    @Body() body: { name: string; projectId: string; imageUrl?: string; floorsConfig?: any[] },
  ) {
    const fp = new FloorPlan();
    fp.tenantId = tenantId;
    fp.projectId = body.projectId;
    fp.name = body.name;
    fp.imageUrl = body.imageUrl || 'https://images.unsplash.com/photo-1545464693-f1798a373343?auto=format&fit=crop&w=800&q=80';
    fp.status = 'PENDING_ANALYSIS';
    fp.flatCount = 0;
    fp.roomCount = 0;
    fp.priceEstimate = 0;
    fp.isPaid = false;
    
    // Save floors config inside layoutData
    fp.layoutData = {
      floorsConfig: body.floorsConfig || [
        { floorNumber: 1, type: '2BHK', flatsCount: 4, imageUrl: fp.imageUrl },
        { floorNumber: 2, type: '2BHK', flatsCount: 4, imageUrl: fp.imageUrl }
      ]
    };
    
    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }

  // Trigger simulated AI computer vision analysis / real CAD DXF parsing
  @Post(':id/analyze')
  async analyzeFloorPlan(@TenantId() tenantId: string, @Param('id') id: string) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    let parsedLayout: any = null;
    let dxfPath = '';

    if (fp.imageUrl) {
      const parts = fp.imageUrl.split('/');
      const filename = parts[parts.length - 1];
      
      const candidatePaths = [
        path.join('c:/xampp/htdocs/real-estate-platform', fp.imageUrl),
        path.join('c:/xampp/htdocs/real-estate-platform/shared-uploads', filename),
        path.join('c:/xampp/htdocs/real-estate-platform/real-estate-builder/public', filename),
        path.join('c:/xampp/htdocs/real-estate-platform/docs/cad', filename)
      ];
      
      for (const p of candidatePaths) {
        if (fs.existsSync(p) && p.endsWith('.dxf')) {
          dxfPath = p;
          break;
        }
      }
    }

    if (dxfPath) {
      try {
        console.log(`Parsing active DXF blueprint file: ${dxfPath}`);
        parsedLayout = parseDXF(dxfPath);
      } catch (err) {
        console.error(`DXF parser execution failed:`, err);
      }
    }

    let flatCount = 0;
    let roomCount = 0;

    if (parsedLayout) {
      roomCount = parsedLayout.rooms.length;
      // Estimate flat counts by checking rooms labeled living/flat/etc.
      flatCount = parsedLayout.rooms.filter((r: any) => 
        r.name.toLowerCase().includes('living') || 
        r.name.toLowerCase().includes('flat') || 
        r.name.toLowerCase().includes('suite')
      ).length;
      if (flatCount === 0) flatCount = 2; // fallback to 2 flats if undefined

      const priceEstimate = flatCount * 15000;

      fp.flatCount = flatCount;
      fp.roomCount = roomCount;
      fp.priceEstimate = priceEstimate;
      fp.status = 'ANALYZED';

      // Restructure layoutData to support floor-varying layouts
      const floorsConfig = fp.layoutData?.floorsConfig || [
        { floorNumber: 1, type: '2BHK', flatsCount: flatCount },
        { floorNumber: 2, type: '2BHK', flatsCount: flatCount }
      ];

      const floors: Record<number, any> = {};
      const templates: Record<string, any> = {};

      floorsConfig.forEach((fl: any) => {
        floors[fl.floorNumber] = parsedLayout;
        if (fl.type) {
          templates[fl.type] = parsedLayout;
        }
      });

      fp.layoutData = {
        floorsConfig,
        floors,
        templates
      };
    } else {
      // Fallback to mock behavior if file not found or not DXF
      const config = fp.layoutData?.floorsConfig || [];
      config.forEach((fl: any) => {
        const fType = fl.type || '2BHK';
        const count = fType === '1BHK' ? 6 : fType === '2BHK' ? 4 : fType === '3BHK' ? 3 : 1;
        flatCount += count;
        roomCount += count;
      });

      if (flatCount === 0) {
        flatCount = 8;
        roomCount = 10;
      }

      const priceEstimate = flatCount * 15000;

      fp.flatCount = flatCount;
      fp.roomCount = roomCount;
      fp.priceEstimate = priceEstimate;
      fp.status = 'ANALYZED';
    }

    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }

  // Process simulated payment
  @Post(':id/pay')
  async payFloorPlan(@TenantId() tenantId: string, @Param('id') id: string) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    fp.isPaid = true;
    fp.status = 'PAID';

    const existingConfig = fp.layoutData?.floorsConfig || [
      { floorNumber: 1, type: '2BHK', flatsCount: 4 },
      { floorNumber: 2, type: '2BHK', flatsCount: 4 }
    ];

    // Seed default 3D floor plan layout coordinates templates if not already parsed via DXF
    if (!fp.layoutData?.floors) {
      fp.layoutData = {
        floorsConfig: existingConfig,
        templates: {
          '1BHK': getTemplateLayout('1BHK'),
          '2BHK': getTemplateLayout('2BHK'),
          '3BHK': getTemplateLayout('3BHK'),
          'PENTHOUSE': getTemplateLayout('PENTHOUSE'),
          'LUXURY_SHOWROOM': getTemplateLayout('LUXURY_SHOWROOM')
        }
      };
    }

    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }

  // Update layout coordinates (save improved 3D plan)
  @Put(':id/layout')
  async updateLayout(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { layoutData: Record<string, any> },
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    fp.layoutData = body.layoutData;
    fp.status = 'GENERATED';

    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }
}
