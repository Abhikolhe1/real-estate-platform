import { Controller, Get, Post, Put, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloorPlan } from '../entities/floorplan.entity';
import { TenantId } from '../interceptors/tenant.decorator';
import { parseDXF } from '../utils/dxf-parser';
import * as path from 'path';
import * as fs from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TwinsService } from '../services/twins.service';
import { Builder } from '../entities/builder.entity';

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
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
    private readonly twinsService: TwinsService,
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
  async analyzeFloorPlan(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body?: { snapTolerance?: number; layerMapping?: Record<string, string> }
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    // Determine path to parse
    let parsePath = fp.filePath;
    if (!parsePath && fp.imageUrl) {
      const parts = fp.imageUrl.split('/');
      const filename = parts[parts.length - 1];
      
      const candidatePaths = [
        path.join('c:/xampp/htdocs/real-estate-platform', fp.imageUrl),
        path.join('c:/xampp/htdocs/real-estate-platform/shared-uploads', filename),
        path.join('c:/xampp/htdocs/real-estate-platform/real-estate-builder/public', filename),
        path.join('c:/xampp/htdocs/real-estate-platform/docs/cad', filename)
      ];
      
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const ext = path.extname(p).toLowerCase();
          if (['.dxf', '.pdf'].includes(ext)) {
            parsePath = p;
            break;
          }
        }
      }
    }

    if (!parsePath) {
      // absolute fallback to building_layout.dxf
      parsePath = 'docs/cad/building_layout.dxf';
    }

    // Save preferences to builder if provided
    const layerMapping = body?.layerMapping;
    if (layerMapping) {
      try {
        await this.builderRepo.update(tenantId, { dxfLayerPreferences: layerMapping });
      } catch (err) {
        console.error('Failed to save dxfLayerPreferences to builder:', err);
      }
    }

    fp.status = 'parsing';
    await this.floorplanRepo.save(fp);

    const snapTolerance = body?.snapTolerance;
    const fileType = parsePath.toLowerCase().endsWith('.pdf') ? 'pdf' : 'dxf';

    setImmediate(async () => {
      try {
        await this.twinsService.parseFloorplan(
          tenantId,
          id,
          parsePath,
          fileType,
          snapTolerance,
          layerMapping
        );
      } catch (err) {
        console.error(`Async parse execution failed for floorplan ${id}:`, err);
      }
    });

    return { success: true, status: 'parsing' };
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

  // Save Floor Split boxes
  @Post(':id/split')
  async saveFloorSplits(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { splitBoxes: any[] },
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    fp.layoutData = {
      ...(fp.layoutData || {}),
      splitBoxes: body.splitBoxes,
    };

    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }

  // Auto-Detect Floor/Tower splits using DBSCAN Clustering
  @Post(':id/auto-split')
  async autoSplitFloorPlan(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { eps?: number; minSamples?: number },
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    const eps = body.eps || 8.0;
    const minSamples = body.minSamples || 3;

    // Extract walls from layoutData
    let walls = fp.layoutData?.walls || [];
    if (walls.length === 0 && fp.layoutData?.templates) {
      const keys = Object.keys(fp.layoutData.templates);
      if (keys.length > 0) {
        walls = fp.layoutData.templates[keys[0]].walls || [];
      }
    }

    if (walls.length === 0) {
      // Fallback to a mock set of split boxes if there are no walls
      const mockSplitBoxes = [
        { id: 'mock-1', name: 'Tower A', x: 100, y: 100, width: 200, height: 250 },
        { id: 'mock-2', name: 'Tower B', x: 400, y: 100, width: 200, height: 250 }
      ];
      fp.layoutData = {
        ...(fp.layoutData || {}),
        splitBoxes: mockSplitBoxes
      };
      const saved = await this.floorplanRepo.save(fp);
      return { success: true, floorPlan: saved };
    }

    try {
      // Call Python AI service clustering API
      const res = await fetch('http://localhost:8000/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walls, eps, minSamples })
      });

      if (res.ok) {
        const data = await res.json() as any;
        if (data.success && data.clusters) {
          const canvasWidth = 700;
          const canvasHeight = 450;
          const scale = 18;

          const splitBoxes = data.clusters.map((cluster: any) => {
            const cx = canvasWidth / 2 + cluster.minX * scale;
            const cy = canvasHeight / 2 + cluster.minZ * scale;
            const cw = (cluster.maxX - cluster.minX) * scale;
            const ch = (cluster.maxZ - cluster.minZ) * scale;

            return {
               id: cluster.id,
               name: cluster.name,
               x: Math.round(cx * 10) / 10,
               y: Math.round(cy * 10) / 10,
               width: Math.round(cw * 10) / 10,
               height: Math.round(ch * 10) / 10
            };
          });

          fp.layoutData = {
            ...(fp.layoutData || {}),
            splitBoxes
          };
          const saved = await this.floorplanRepo.save(fp);
          return { success: true, floorPlan: saved };
        }
      }
    } catch (err) {
      console.error("Clustering microservice error, using fallback JS clustering:", err);
    }

    // JS Fallback: partition walls by their X coordinate simply (Tower A vs Tower B)
    const midpoints = walls.map((w: any) => (w.startX + w.endX) / 2);
    const avgX = midpoints.length > 0 ? midpoints.reduce((a: number, b: number) => a + b, 0) / midpoints.length : 0;
    
    const leftWalls = walls.filter((w: any) => ((w.startX + w.endX) / 2) < avgX);
    const rightWalls = walls.filter((w: any) => ((w.startX + w.endX) / 2) >= avgX);

    const getBoundingBox = (wallsList: any[]) => {
      if (wallsList.length === 0) return null;
      const minX = Math.min(...wallsList.map((w: any) => Math.min(w.startX, w.endX)));
      const minZ = Math.min(...wallsList.map((w: any) => Math.min(w.startZ, w.endZ)));
      const maxX = Math.max(...wallsList.map((w: any) => Math.max(w.startX, w.endX)));
      const maxZ = Math.max(...wallsList.map((w: any) => Math.max(w.startZ, w.endZ)));
      return { minX, minZ, maxX, maxZ };
    };

    const leftBox = getBoundingBox(leftWalls);
    const rightBox = getBoundingBox(rightWalls);

    const splitBoxes: any[] = [];
    const scale = 18;
    const cxW = 700;
    const cyH = 450;

    if (leftBox) {
      splitBoxes.push({
        id: 'left-cluster',
        name: 'Tower A',
        x: Math.round((cxW / 2 + (leftBox.minX - 0.5) * scale) * 10) / 10,
        y: Math.round((cyH / 2 + (leftBox.minZ - 0.5) * scale) * 10) / 10,
        width: Math.round(((leftBox.maxX - leftBox.minX + 1.0) * scale) * 10) / 10,
        height: Math.round(((leftBox.maxZ - leftBox.minZ + 1.0) * scale) * 10) / 10
      });
    }
    if (rightBox) {
      splitBoxes.push({
        id: 'right-cluster',
        name: 'Tower B',
        x: Math.round((cxW / 2 + (rightBox.minX - 0.5) * scale) * 10) / 10,
        y: Math.round((cyH / 2 + (rightBox.minZ - 0.5) * scale) * 10) / 10,
        width: Math.round(((rightBox.maxX - rightBox.minX + 1.0) * scale) * 10) / 10,
        height: Math.round(((rightBox.maxZ - rightBox.minZ + 1.0) * scale) * 10) / 10
      });
    }

    fp.layoutData = {
      ...(fp.layoutData || {}),
      splitBoxes
    };

    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }

  // Save Exterior Theme selection and style image
  @Post(':id/theme')
  async saveTheme(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { theme: string; frontImageUrl?: string; detectedStyle?: any },
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    fp.layoutData = {
      ...(fp.layoutData || {}),
      theme: body.theme,
      frontImageUrl: body.frontImageUrl,
      detectedStyle: body.detectedStyle || fp.layoutData?.detectedStyle,
    };

    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }

  // Detect Architectural Theme and materials using Style Intelligence
  @Post(':id/detect-style')
  async detectStyle(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { imageUrl: string },
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    try {
      const response = await fetch('http://localhost:8000/detect-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: body.imageUrl })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return {
        success: false,
        message: 'AI Service connection failed',
        fallback: {
          style: 'Modern',
          materials: ['concrete', 'glass'],
          colors: ['#1e293b', '#00f5d4'],
          confidence: 0.5
        }
      };
    }
  }

  // Finalize Digital Twin Generation
  @Post(':id/twin')
  async finalizeDigitalTwin(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    fp.status = 'GENERATED';
    
    // Seed templates if missing
    if (!fp.layoutData?.floors && !fp.layoutData?.rooms) {
      const config = fp.layoutData?.floorsConfig || [
        { floorNumber: 1, type: '2BHK', flatsCount: 4 },
        { floorNumber: 2, type: '2BHK', flatsCount: 4 }
      ];
      fp.layoutData = {
        ...(fp.layoutData || {}),
        floorsConfig: config,
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

  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('plan', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const baseDir = process.env.UPLOAD_DIR || './apps/api/uploads';
          let destFolder = baseDir;
          if (ext === '.dxf') {
            destFolder = path.join(baseDir, 'dxf');
          } else if (ext === '.pdf') {
            destFolder = path.join(baseDir, 'pdf');
          }
          fs.mkdirSync(destFolder, { recursive: true });
          cb(null, destFolder);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        },
      }),
    }),
  )
  async uploadFloorPlanFile(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body?: { snapTolerance?: string; layerMapping?: string },
  ) {
    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }

    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan record not found' };
    }

    // Save filename/path details to DB
    fp.filePath = file.path;
    fp.imageUrl = file.path; // fallback mapping if needed for view links
    fp.status = 'uploaded';
    await this.floorplanRepo.save(fp);

    // Trigger parsing async via setImmediate
    const fileType = path.extname(file.originalname).toLowerCase().replace('.', '') as 'dxf' | 'pdf';
    const snapTolerance = body?.snapTolerance ? parseFloat(body.snapTolerance) : undefined;
    const layerMapping = body?.layerMapping ? JSON.parse(body.layerMapping) : undefined;

    setImmediate(async () => {
      try {
        await this.twinsService.parseFloorplan(
          tenantId,
          id,
          file.path,
          fileType,
          snapTolerance,
          layerMapping
        );
      } catch (err) {
        console.error('Async parse failed:', err);
      }
    });

    return {
      floorplanId: id,
      filePath: file.path,
      status: 'uploaded',
    };
  }

  @Get(':id/status')
  async getFloorPlanStatus(@TenantId() tenantId: string, @Param('id') id: string) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }
    return {
      success: true,
      status: fp.status,
      structureId: fp.structureId,
    };
  }

  @Get(':id/layers')
  async getLayers(@TenantId() tenantId: string, @Param('id') id: string) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    let parsePath = fp.filePath;
    if (!parsePath && fp.imageUrl) {
      const parts = fp.imageUrl.split('/');
      const filename = parts[parts.length - 1];
      
      const candidatePaths = [
        path.join('c:/xampp/htdocs/real-estate-platform', fp.imageUrl),
        path.join('c:/xampp/htdocs/real-estate-platform/shared-uploads', filename),
        path.join('c:/xampp/htdocs/real-estate-platform/real-estate-builder/public', filename),
        path.join('c:/xampp/htdocs/real-estate-platform/docs/cad', filename)
      ];
      
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const ext = path.extname(p).toLowerCase();
          if (['.dxf'].includes(ext)) {
            parsePath = p;
            break;
          }
        }
      }
    }

    if (!parsePath) {
      parsePath = 'docs/cad/building_layout.dxf';
    }

    if (!parsePath.toLowerCase().endsWith('.dxf')) {
      return { success: true, layers: [] }; // PDF/Image files don't have CAD layers
    }

    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${aiServiceUrl}/layers?filePath=${encodeURIComponent(parsePath)}`);
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const data = await response.json() as any;
      return data;
    } catch (err) {
      console.error('Failed to fetch layers:', err);
      return { success: false, message: 'Failed to fetch layers from AI service' };
    }
  }
}
