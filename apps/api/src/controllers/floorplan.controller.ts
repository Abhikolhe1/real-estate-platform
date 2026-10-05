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
// Template coordinates lookup generator for configurable floors matching the Architectural Blueprint:
// Ground Floor: Lobby, Parking, Security, Meter Room, Central Core
// Type A: 2 Units (3 BHK each, ~1,650 sq.ft)
// Type B: 4 Units (2 BHK each, ~1,050 sq.ft)
// Type C: 1 Unit (4 BHK Sky Villa, ~2,400 sq.ft)
export function getTemplateLayout(type: string) {
  const normType = (type || 'TYPE_A').toUpperCase().replace(/[^A-Z0-9_]/g, '');

  // 1. GROUND FLOOR: Entrance Lobby, Security Cabin, Meter Room, Parking Bays, Central Core
  if (normType === 'GROUND' || normType === 'LOBBY' || normType === '0') {
    return {
      rooms: [
        { id: 'room-g-lobby', name: 'Grand Entrance & Reception Lobby', x: -4, z: 0, width: 8, depth: 6, color: '#f8fafc', node: { x: 0, z: 3.0 } },
        { id: 'room-g-stairs', name: 'Central Staircase Core', x: -5, z: -4, width: 5, depth: 4, color: '#0f172a', node: { x: -2.5, z: -2.0 } },
        { id: 'room-g-lift', name: 'High-Speed Passenger Lift', x: 0, z: -4, width: 5, depth: 4, color: '#1e293b', node: { x: 2.5, z: -2.0 } },
        { id: 'room-g-security', name: 'Security Control Cabin', x: 4, z: 0, width: 4, depth: 3, color: '#e2e8f0', node: { x: 6, z: 1.5 } },
        { id: 'room-g-meter', name: 'Meter & Electrical Services', x: 4, z: 3, width: 4, depth: 3, color: '#cbd5e1', node: { x: 6, z: 4.5 } },
        { id: 'room-g-park-w', name: 'West Parking Bays', x: -13, z: -8, width: 7, depth: 15, color: '#334155', node: { x: -9.5, z: 0 } },
        { id: 'room-g-park-e', name: 'East Parking Bays', x: 9, z: -8, width: 7, depth: 15, color: '#334155', node: { x: 12.5, z: 0 } },
      ],
      walls: [
        // Perimeter
        { id: 'w-g-top', startX: -13, startZ: -8, endX: 16, endZ: -8, thickness: 0.25, height: 4.0 },
        { id: 'w-g-right', startX: 16, startZ: -8, endX: 16, endZ: 7, thickness: 0.25, height: 4.0 },
        { id: 'w-g-bottom', startX: 16, startZ: 7, endX: -13, endZ: 7, thickness: 0.25, height: 4.0 },
        { id: 'w-g-left', startX: -13, startZ: 7, endX: -13, endZ: -8, thickness: 0.25, height: 4.0 },
        // Central Core & Lobby Partitions
        { id: 'w-g-core-back', startX: -5, startZ: -4, endX: 5, endZ: -4, thickness: 0.25, height: 4.0 },
        { id: 'w-g-core-mid', startX: 0, startZ: -4, endX: 0, endZ: 0, thickness: 0.2, height: 4.0 },
        { id: 'w-g-lobby-front', startX: -4, startZ: 6, endX: 8, endZ: 6, thickness: 0.25, height: 4.0 },
        { id: 'w-g-lobby-left', startX: -4, startZ: 0, endX: -4, endZ: 6, thickness: 0.25, height: 4.0 },
        { id: 'w-g-sec-mid', startX: 4, startZ: 3, endX: 8, endZ: 3, thickness: 0.2, height: 4.0 },
        { id: 'w-g-sec-right', startX: 8, startZ: 0, endX: 8, endZ: 6, thickness: 0.25, height: 4.0 },
      ],
      apertures: [
        { id: 'ap-g-main-ent', wallId: 'w-g-lobby-front', type: 'door', startOffset: 2.5, width: 3.0, height: 3.0, elevation: 0.0, swing: 1 },
        { id: 'ap-g-sec-door', wallId: 'w-g-sec-mid', type: 'door', startOffset: 1.5, width: 1.0, height: 2.2, elevation: 0.0, swing: -1 },
        { id: 'ap-g-win-l', wallId: 'w-g-lobby-front', type: 'window', startOffset: 0.5, width: 1.5, height: 2.4, elevation: 0.5 },
      ],
      furniture: [
        { id: 'f-g-counter', type: 'counter', roomId: 'room-g-lobby', x: 0, z: 1.5, rotation: 0 },
        { id: 'f-g-lift', type: 'elevator', roomId: 'room-g-lift', x: 2.5, z: -2.5, rotation: 180 },
        { id: 'f-g-stairs', type: 'stairs', roomId: 'room-g-stairs', x: -2.5, z: -2.5, rotation: 0 },
        { id: 'f-g-sofa-w1', type: 'sofa', roomId: 'room-g-lobby', x: -2.5, z: 4.5, rotation: 90 },
        { id: 'f-g-sofa-w2', type: 'sofa', roomId: 'room-g-lobby', x: 2.5, z: 4.5, rotation: -90 },
      ]
    };
  }

  // 2. TYPE B FLOOR: 4 UNITS (2 BHK EACH, ~1,050 sq. ft. each) - Floors 2, 5, 8
  if (normType === 'TYPE_B' || normType === '2BHK' || normType === 'TYPEB' || normType === '2' || normType === '5' || normType === '8') {
    return {
      rooms: [
        // Central Core
        { id: 'room-b-stairs', name: 'Central Staircase Core', x: -5, z: -2, width: 5, depth: 4, color: '#0f172a', node: { x: -2.5, z: 0 } },
        { id: 'room-b-lobby', name: 'Central 4-Door Resident Lobby', x: 0, z: -2, width: 5, depth: 4, color: '#334155', node: { x: 2.5, z: 0 } },
        { id: 'room-b-lift', name: 'High-Speed Passenger Lift', x: 5, z: -2, width: 4, depth: 4, color: '#1e293b', node: { x: 7.0, z: 0 } },
        
        // Unit 1 (2 BHK - NW Top-Left)
        { id: 'room-b1-living', name: 'Unit 1 (2 BHK) - Living & Dining Lounge', x: -11, z: -7, width: 6, depth: 5, color: '#f5efe6', node: { x: -8.0, z: -4.5 } },
        { id: 'room-b1-kitchen', name: 'Unit 1 - Modular Kitchen', x: -5, z: -7, width: 5, depth: 5, color: '#f4ece1', node: { x: -2.5, z: -4.5 } },
        { id: 'room-b1-master', name: 'Unit 1 - Master Bedroom', x: -11, z: -12, width: 5.5, depth: 5, color: '#ece8f2', node: { x: -8.25, z: -9.5 } },
        { id: 'room-b1-bed2', name: 'Unit 1 - Bedroom 2', x: -5.5, z: -12, width: 5.5, depth: 5, color: '#e3ece9', node: { x: -2.75, z: -9.5 } },
        { id: 'room-b1-bath', name: 'Unit 1 - Luxury Bath', x: -13, z: -9, width: 2, depth: 3, color: '#e2e8f0', node: { x: -12.0, z: -7.5 } },
        
        // Unit 2 (2 BHK - NE Top-Right)
        { id: 'room-b2-living', name: 'Unit 2 (2 BHK) - Living & Dining Lounge', x: 5, z: -7, width: 6, depth: 5, color: '#f5efe6', node: { x: 8.0, z: -4.5 } },
        { id: 'room-b2-kitchen', name: 'Unit 2 - Modular Kitchen', x: 0, z: -7, width: 5, depth: 5, color: '#f4ece1', node: { x: 2.5, z: -4.5 } },
        { id: 'room-b2-master', name: 'Unit 2 - Master Bedroom', x: 5.5, z: -12, width: 5.5, depth: 5, color: '#ece8f2', node: { x: 8.25, z: -9.5 } },
        { id: 'room-b2-bed2', name: 'Unit 2 - Bedroom 2', x: 0, z: -12, width: 5.5, depth: 5, color: '#e3ece9', node: { x: 2.75, z: -9.5 } },
        { id: 'room-b2-bath', name: 'Unit 2 - Luxury Bath', x: 11, z: -9, width: 2, depth: 3, color: '#e2e8f0', node: { x: 12.0, z: -7.5 } },

        // Unit 3 (2 BHK - SW Bottom-Left)
        { id: 'room-b3-living', name: 'Unit 3 (2 BHK) - Living & Dining Lounge', x: -11, z: 2, width: 6, depth: 5, color: '#f5efe6', node: { x: -8.0, z: 4.5 } },
        { id: 'room-b3-kitchen', name: 'Unit 3 - Modular Kitchen', x: -5, z: 2, width: 5, depth: 5, color: '#f4ece1', node: { x: -2.5, z: 4.5 } },
        { id: 'room-b3-master', name: 'Unit 3 - Master Bedroom', x: -11, z: 7, width: 5.5, depth: 5, color: '#ece8f2', node: { x: -8.25, z: 9.5 } },
        { id: 'room-b3-bed2', name: 'Unit 3 - Bedroom 2', x: -5.5, z: 7, width: 5.5, depth: 5, color: '#e3ece9', node: { x: -2.75, z: 9.5 } },
        { id: 'room-b3-bath', name: 'Unit 3 - Luxury Bath', x: -13, z: 4, width: 2, depth: 3, color: '#e2e8f0', node: { x: -12.0, z: 5.5 } },

        // Unit 4 (2 BHK - SE Bottom-Right)
        { id: 'room-b4-living', name: 'Unit 4 (2 BHK) - Living & Dining Lounge', x: 5, z: 2, width: 6, depth: 5, color: '#f5efe6', node: { x: 8.0, z: 4.5 } },
        { id: 'room-b4-kitchen', name: 'Unit 4 - Modular Kitchen', x: 0, z: 2, width: 5, depth: 5, color: '#f4ece1', node: { x: 2.5, z: 4.5 } },
        { id: 'room-b4-master', name: 'Unit 4 - Master Bedroom', x: 5.5, z: 7, width: 5.5, depth: 5, color: '#ece8f2', node: { x: 8.25, z: 9.5 } },
        { id: 'room-b4-bed2', name: 'Unit 4 - Bedroom 2', x: 0, z: 7, width: 5.5, depth: 5, color: '#e3ece9', node: { x: 2.75, z: 9.5 } },
        { id: 'room-b4-bath', name: 'Unit 4 - Luxury Bath', x: 11, z: 4, width: 2, depth: 3, color: '#e2e8f0', node: { x: 12.0, z: 5.5 } },
      ],
      walls: [
        // Outer boundaries
        { id: 'w-b-out-top', startX: -13, startZ: -12, endX: 13, endZ: -12, thickness: 0.22, height: 3.1 },
        { id: 'w-b-out-right', startX: 13, startZ: -12, endX: 13, endZ: 12, thickness: 0.22, height: 3.1 },
        { id: 'w-b-out-bottom', startX: 13, startZ: 12, endX: -13, endZ: 12, thickness: 0.22, height: 3.1 },
        { id: 'w-b-out-left', startX: -13, startZ: 12, endX: -13, endZ: -12, thickness: 0.22, height: 3.1 },
        // Central Core Walls
        { id: 'w-b-core-t', startX: -5, startZ: -2, endX: 9, endZ: -2, thickness: 0.22, height: 3.1 },
        { id: 'w-b-core-b', startX: -5, startZ: 2, endX: 9, endZ: 2, thickness: 0.22, height: 3.1 },
        { id: 'w-b-core-v1', startX: 0, startZ: -2, endX: 0, endZ: 2, thickness: 0.2, height: 3.1 },
        { id: 'w-b-core-v2', startX: 5, startZ: -2, endX: 5, endZ: 2, thickness: 0.2, height: 3.1 },
        // Quadrant dividing walls
        { id: 'w-b-div-top', startX: 0, startZ: -12, endX: 0, endZ: -2, thickness: 0.2, height: 3.1 },
        { id: 'w-b-div-bot', startX: 0, startZ: 2, endX: 0, endZ: 12, thickness: 0.2, height: 3.1 },
        { id: 'w-b-div-mid-l', startX: -13, startZ: 0, endX: -5, endZ: 0, thickness: 0.2, height: 3.1 },
        { id: 'w-b-div-mid-r', startX: 9, startZ: 0, endX: 13, endZ: 0, thickness: 0.2, height: 3.1 },
      ],
      apertures: [
        // 4 Entrance Doors directly from the Central Lobby
        { id: 'ap-b-ent-1', wallId: 'w-b-core-t', type: 'door', startOffset: 1.5, width: 1.0, height: 2.2, elevation: 0.0, swing: -1 },
        { id: 'ap-b-ent-2', wallId: 'w-b-core-t', type: 'door', startOffset: 7.0, width: 1.0, height: 2.2, elevation: 0.0, swing: 1 },
        { id: 'ap-b-ent-3', wallId: 'w-b-core-b', type: 'door', startOffset: 1.5, width: 1.0, height: 2.2, elevation: 0.0, swing: -1 },
        { id: 'ap-b-ent-4', wallId: 'w-b-core-b', type: 'door', startOffset: 7.0, width: 1.0, height: 2.2, elevation: 0.0, swing: 1 },
      ],
      furniture: [
        { id: 'f-b-lift', type: 'elevator', roomId: 'room-b-lift', x: 7.0, z: 0.0, rotation: 180 },
        { id: 'f-b-stairs', type: 'stairs', roomId: 'room-b-stairs', x: -2.5, z: 0.0, rotation: 0 },
        // Unit 1
        { id: 'f-b1-sofa', type: 'sofa', roomId: 'room-b1-living', x: -9.5, z: -5.0, rotation: 0 },
        { id: 'f-b1-table', type: 'coffee_table', roomId: 'room-b1-living', x: -8.0, z: -5.0, rotation: 0 },
        { id: 'f-b1-tv', type: 'tv_unit', roomId: 'room-b1-living', x: -6.5, z: -5.0, rotation: 180 },
        { id: 'f-b1-bed-m', type: 'bed', roomId: 'room-b1-master', x: -8.25, z: -9.5, rotation: 90 },
        { id: 'f-b1-bed-2', type: 'bed', roomId: 'room-b1-bed2', x: -2.75, z: -9.5, rotation: 90 },
        { id: 'f-b1-kit', type: 'kitchen_counter', roomId: 'room-b1-kitchen', x: -2.5, z: -6.0, rotation: 0 },
        // Unit 2
        { id: 'f-b2-sofa', type: 'sofa', roomId: 'room-b2-living', x: 6.5, z: -5.0, rotation: 0 },
        { id: 'f-b2-table', type: 'coffee_table', roomId: 'room-b2-living', x: 8.0, z: -5.0, rotation: 0 },
        { id: 'f-b2-tv', type: 'tv_unit', roomId: 'room-b2-living', x: 9.5, z: -5.0, rotation: 180 },
        { id: 'f-b2-bed-m', type: 'bed', roomId: 'room-b2-master', x: 8.25, z: -9.5, rotation: 90 },
        { id: 'f-b2-bed-2', type: 'bed', roomId: 'room-b2-bed2', x: 2.75, z: -9.5, rotation: 90 },
        { id: 'f-b2-kit', type: 'kitchen_counter', roomId: 'room-b2-kitchen', x: 2.5, z: -6.0, rotation: 0 },
        // Unit 3
        { id: 'f-b3-sofa', type: 'sofa', roomId: 'room-b3-living', x: -9.5, z: 4.5, rotation: 0 },
        { id: 'f-b3-bed-m', type: 'bed', roomId: 'room-b3-master', x: -8.25, z: 9.5, rotation: 90 },
        { id: 'f-b3-bed-2', type: 'bed', roomId: 'room-b3-bed2', x: -2.75, z: 9.5, rotation: 90 },
        { id: 'f-b3-kit', type: 'kitchen_counter', roomId: 'room-b3-kitchen', x: -2.5, z: 3.5, rotation: 0 },
        // Unit 4
        { id: 'f-b4-sofa', type: 'sofa', roomId: 'room-b4-living', x: 6.5, z: 4.5, rotation: 0 },
        { id: 'f-b4-bed-m', type: 'bed', roomId: 'room-b4-master', x: 8.25, z: 9.5, rotation: 90 },
        { id: 'f-b4-bed-2', type: 'bed', roomId: 'room-b4-bed2', x: 2.75, z: 9.5, rotation: 90 },
        { id: 'f-b4-kit', type: 'kitchen_counter', roomId: 'room-b4-kitchen', x: 2.5, z: 3.5, rotation: 0 },
      ]
    };
  }

  // 3. TYPE C FLOOR: 1 UNIT (4 BHK SKY VILLA, ~2,400 sq. ft.) - Floors 3, 6, 9
  if (normType === 'TYPE_C' || normType === '4BHK' || normType === 'PENTHOUSE' || normType === 'TYPEC' || normType === '3' || normType === '6' || normType === '9') {
    return {
      rooms: [
        // Central Core
        { id: 'room-c-stairs', name: 'Fire Exit & Staircase', x: -5, z: -2, width: 5, depth: 4, color: '#0f172a', node: { x: -2.5, z: 0 } },
        { id: 'room-c-lobby', name: 'Private Sky Residence Foyer', x: 0, z: -2, width: 4, depth: 4, color: '#334155', node: { x: 2.0, z: 0 } },
        { id: 'room-c-lift', name: 'Direct-Access Elevator Core', x: 4, z: -2, width: 4, depth: 4, color: '#1e293b', node: { x: 6.0, z: 0 } },
        
        // North Wing - Grand Living & Balcony
        { id: 'room-c-living', name: 'Grand Living Salon', x: -2, z: -9, width: 10, depth: 7, color: '#f8fafc', node: { x: 3.0, z: -5.5 } },
        { id: 'room-c-balcony-n', name: 'Panoramic Sky Balcony (North)', x: -2, z: -12, width: 10, depth: 3, color: '#faf5ef', node: { x: 3.0, z: -10.5 } },
        { id: 'room-c-dining', name: 'Formal Royal Dining Hall', x: 4, z: 2, width: 5, depth: 5, color: '#fdf8f4', node: { x: 6.5, z: 4.5 } },
        { id: 'room-c-kitchen', name: 'Gourmet Chef Island Kitchen', x: 9, z: -2, width: 5, depth: 5, color: '#f4ece1', node: { x: 11.5, z: 0.5 } },
        { id: 'room-c-utility', name: 'Utility & Butler Pantry', x: 9, z: 3, width: 5, depth: 3, color: '#f1f5f9', node: { x: 11.5, z: 4.5 } },

        // South Wing - Family Lounge, Master Suite & Bedroom 4
        { id: 'room-c-family', name: 'Private Family Lounge', x: -2, z: 5, width: 8, depth: 5, color: '#f5efe6', node: { x: 2.0, z: 7.5 } },
        { id: 'room-c-balcony-s', name: 'Sunset Balcony (South)', x: -2, z: 10, width: 8, depth: 2.5, color: '#faf5ef', node: { x: 2.0, z: 11.25 } },
        { id: 'room-c-master', name: 'Master Presidential Suite', x: -7, z: 5, width: 5, depth: 5, color: '#ece8f2', node: { x: -4.5, z: 7.5 } },
        { id: 'room-c-walkin', name: 'Walk-in Wardrobe', x: -12, z: 3, width: 5, depth: 3.5, color: '#f3e8ff', node: { x: -9.5, z: 4.75 } },
        { id: 'room-c-mbath', name: 'Master En-Suite Spa Bath', x: -12, z: 6.5, width: 5, depth: 4, color: '#e2e8f0', node: { x: -9.5, z: 8.5 } },
        { id: 'room-c-bed2', name: 'Executive Suite 2', x: -12, z: -9, width: 5, depth: 6, color: '#e3ece9', node: { x: -9.5, z: -6.0 } },
        { id: 'room-c-bed2-bath', name: 'Suite 2 Bath', x: -12, z: -3, width: 5, depth: 3, color: '#e2e8f0', node: { x: -9.5, z: -1.5 } },
        { id: 'room-c-bed3', name: 'Guest Residence 3', x: 8, z: -9, width: 6, depth: 6, color: '#e0e7ff', node: { x: 11.0, z: -6.0 } },
        { id: 'room-c-bed3-bath', name: 'Residence 3 Bath', x: 8, z: -3, width: 6, depth: 3, color: '#e2e8f0', node: { x: 11.0, z: -1.5 } },
        { id: 'room-c-bed4', name: 'Bedroom 4 / Study', x: 6, z: 7, width: 6, depth: 5, color: '#fef3c7', node: { x: 9.0, z: 9.5 } },
      ],
      walls: [
        { id: 'w-c-out-top', startX: -12, startZ: -12, endX: 14, endZ: -12, thickness: 0.25, height: 3.3 },
        { id: 'w-c-out-right', startX: 14, startZ: -12, endX: 14, endZ: 12, thickness: 0.25, height: 3.3 },
        { id: 'w-c-out-bottom', startX: 14, startZ: 12, endX: -12, endZ: 12, thickness: 0.25, height: 3.3 },
        { id: 'w-c-out-left', startX: -12, startZ: 12, endX: -12, endZ: -12, thickness: 0.25, height: 3.3 },
        // Core walls
        { id: 'w-c-core-t', startX: -5, startZ: -2, endX: 8, endZ: -2, thickness: 0.22, height: 3.3 },
        { id: 'w-c-core-b', startX: -5, startZ: 2, endX: 8, endZ: 2, thickness: 0.22, height: 3.3 },
      ],
      apertures: [
        { id: 'ap-c-foyer-door', wallId: 'w-c-core-b', type: 'door', startOffset: 2.0, width: 1.4, height: 2.4, elevation: 0.0, swing: -1 },
        { id: 'ap-c-balc-n', wallId: 'w-c-out-top', type: 'door', startOffset: 5.0, width: 2.8, height: 2.6, elevation: 0.0, swing: 1 },
        { id: 'ap-c-balc-s', wallId: 'w-c-out-bottom', type: 'door', startOffset: 5.0, width: 2.8, height: 2.6, elevation: 0.0, swing: 1 },
      ],
      furniture: [
        { id: 'f-c-lift', type: 'elevator', roomId: 'room-c-lift', x: 6.0, z: 0.0, rotation: 180 },
        { id: 'f-c-stairs', type: 'stairs', roomId: 'room-c-stairs', x: -2.5, z: 0.0, rotation: 0 },
        { id: 'f-c-sofa-main', type: 'sofa', roomId: 'room-c-living', x: 1.0, z: -6.0, rotation: 0 },
        { id: 'f-c-tv-main', type: 'tv_unit', roomId: 'room-c-living', x: 5.0, z: -6.0, rotation: 180 },
        { id: 'f-c-table-main', type: 'coffee_table', roomId: 'room-c-living', x: 3.0, z: -6.0, rotation: 0 },
        { id: 'f-c-dining', type: 'dining_table', roomId: 'room-c-dining', x: 6.5, z: 4.5, rotation: 0 },
        { id: 'f-c-kitchen', type: 'kitchen_counter', roomId: 'room-c-kitchen', x: 11.5, z: 0.5, rotation: 0 },
        { id: 'f-c-family-sofa', type: 'sofa', roomId: 'room-c-family', x: 2.0, z: 7.5, rotation: 0 },
        { id: 'f-c-bed-m', type: 'bed', roomId: 'room-c-master', x: -4.5, z: 7.5, rotation: 90 },
        { id: 'f-c-bed-2', type: 'bed', roomId: 'room-c-bed2', x: -9.5, z: -6.0, rotation: 90 },
        { id: 'f-c-bed-3', type: 'bed', roomId: 'room-c-bed3', x: 11.0, z: -6.0, rotation: 90 },
        { id: 'f-c-bed-4', type: 'bed', roomId: 'room-c-bed4', x: 9.0, z: 9.5, rotation: 90 },
      ]
    };
  }

  // 4. TYPE A FLOOR: 2 UNITS (3 BHK EACH, ~1,650 sq. ft. each) - Floors 1, 4, 7, 10
  return {
    rooms: [
      // Central Core
      { id: 'room-a-stairs', name: 'Central Staircase Core', x: -5, z: -2, width: 5, depth: 4, color: '#0f172a', node: { x: -2.5, z: 0 } },
      { id: 'room-a-lobby', name: 'Central Floor Lobby', x: 0, z: -2, width: 4, depth: 4, color: '#334155', node: { x: 2.0, z: 0 } },
      { id: 'room-a-lift', name: 'High-Speed Passenger Lift', x: 4, z: -2, width: 4, depth: 4, color: '#1e293b', node: { x: 6.0, z: 0 } },

      // Unit 1 (3 BHK - South Wing, ~1,650 sq. ft.)
      { id: 'room-a1-living', name: 'Unit 1 (3 BHK) - Grand Living Hall', x: 0, z: 2.5, width: 6, depth: 5, color: '#f5efe6', node: { x: 3.0, z: 5.0 } },
      { id: 'room-a1-dining', name: 'Unit 1 - Formal Dining Alcove', x: -5, z: 2.5, width: 5, depth: 3, color: '#fdf8f4', node: { x: -2.5, z: 4.0 } },
      { id: 'room-a1-kitchen', name: 'Unit 1 - Chef Modular Kitchen', x: -11, z: 2.5, width: 6, depth: 3, color: '#f4ece1', node: { x: -8.0, z: 4.0 } },
      { id: 'room-a1-master', name: 'Unit 1 - Master Bedroom Suite', x: 6, z: 2.5, width: 5.5, depth: 5, color: '#ece8f2', node: { x: 8.75, z: 5.0 } },
      { id: 'room-a1-mbath', name: 'Unit 1 - Master En-Suite Bath', x: 6, z: 7.5, width: 5.5, depth: 2.5, color: '#e2e8f0', node: { x: 8.75, z: 8.75 } },
      { id: 'room-a1-bed2', name: 'Unit 1 - Bedroom 2', x: -11, z: 5.5, width: 5.5, depth: 4.5, color: '#e3ece9', node: { x: -8.25, z: 7.75 } },
      { id: 'room-a1-bed3', name: 'Unit 1 - Bedroom 3', x: -5.5, z: 5.5, width: 5.5, depth: 4.5, color: '#e0e7ff', node: { x: -2.75, z: 7.75 } },
      { id: 'room-a1-balcony', name: 'Unit 1 - Sunset Horizon Balcony', x: 0, z: 7.5, width: 6, depth: 2.5, color: '#faf5ef', node: { x: 3.0, z: 8.75 } },

      // Unit 2 (3 BHK - North Wing, ~1,650 sq. ft.)
      { id: 'room-a2-living', name: 'Unit 2 (3 BHK) - Grand Living Hall', x: 0, z: -7.5, width: 6, depth: 5, color: '#f5efe6', node: { x: 3.0, z: -5.0 } },
      { id: 'room-a2-dining', name: 'Unit 2 - Formal Dining Alcove', x: -5, z: -5.5, width: 5, depth: 3, color: '#fdf8f4', node: { x: -2.5, z: -4.0 } },
      { id: 'room-a2-kitchen', name: 'Unit 2 - Chef Modular Kitchen', x: -11, z: -5.5, width: 6, depth: 3, color: '#f4ece1', node: { x: -8.0, z: -4.0 } },
      { id: 'room-a2-master', name: 'Unit 2 - Master Bedroom Suite', x: 6, z: -7.5, width: 5.5, depth: 5, color: '#ece8f2', node: { x: 8.75, z: -5.0 } },
      { id: 'room-a2-mbath', name: 'Unit 2 - Master En-Suite Bath', x: 6, z: -10.0, width: 5.5, depth: 2.5, color: '#e2e8f0', node: { x: 8.75, z: -8.75 } },
      { id: 'room-a2-bed2', name: 'Unit 2 - Bedroom 2', x: -11, z: -10.0, width: 5.5, depth: 4.5, color: '#e3ece9', node: { x: -8.25, z: -7.75 } },
      { id: 'room-a2-bed3', name: 'Unit 2 - Bedroom 3', x: -5.5, z: -10.0, width: 5.5, depth: 4.5, color: '#e0e7ff', node: { x: -2.75, z: -7.75 } },
      { id: 'room-a2-balcony', name: 'Unit 2 - Sunrise Horizon Balcony', x: 0, z: -10.0, width: 6, depth: 2.5, color: '#faf5ef', node: { x: 3.0, z: -8.75 } },
    ],
    walls: [
      // Outer boundaries
      { id: 'w-a-out-top', startX: -11, startZ: -10, endX: 11.5, endZ: -10, thickness: 0.22, height: 3.1 },
      { id: 'w-a-out-right', startX: 11.5, startZ: -10, endX: 11.5, endZ: 10, thickness: 0.22, height: 3.1 },
      { id: 'w-a-out-bottom', startX: 11.5, startZ: 10, endX: -11, endZ: 10, thickness: 0.22, height: 3.1 },
      { id: 'w-a-out-left', startX: -11, startZ: 10, endX: -11, endZ: -10, thickness: 0.22, height: 3.1 },
      // Central Core Walls
      { id: 'w-a-core-top', startX: -5, startZ: -2, endX: 8, endZ: -2, thickness: 0.22, height: 3.1 },
      { id: 'w-a-core-bot', startX: -5, startZ: 2, endX: 8, endZ: 2, thickness: 0.22, height: 3.1 },
      { id: 'w-a-core-mid1', startX: 0, startZ: -2, endX: 0, endZ: 2, thickness: 0.2, height: 3.1 },
      { id: 'w-a-core-mid2', startX: 4, startZ: -2, endX: 4, endZ: 2, thickness: 0.2, height: 3.1 },
    ],
    apertures: [
      // Entrances from lobby into Unit 1 and Unit 2
      { id: 'ap-a-ent-1', wallId: 'w-a-core-bot', type: 'door', startOffset: 2.0, width: 1.1, height: 2.3, elevation: 0.0, swing: 1 },
      { id: 'ap-a-ent-2', wallId: 'w-a-core-top', type: 'door', startOffset: 2.0, width: 1.1, height: 2.3, elevation: 0.0, swing: -1 },
      // Balcony doors
      { id: 'ap-a-balc-1', wallId: 'w-a-out-bottom', type: 'door', startOffset: 7.5, width: 2.2, height: 2.3, elevation: 0.0, swing: 1 },
      { id: 'ap-a-balc-2', wallId: 'w-a-out-top', type: 'door', startOffset: 7.5, width: 2.2, height: 2.3, elevation: 0.0, swing: -1 },
    ],
    furniture: [
      // Central Core
      { id: 'f-a-lift', type: 'elevator', roomId: 'room-a-lift', x: 6.0, z: 0.0, rotation: 180 },
      { id: 'f-a-stairs', type: 'stairs', roomId: 'room-a-stairs', x: -2.5, z: 0.0, rotation: 0 },
      // Unit 1
      { id: 'f-a1-sofa', type: 'sofa', roomId: 'room-a1-living', x: 1.5, z: 5.0, rotation: 0 },
      { id: 'f-a1-tv', type: 'tv_unit', roomId: 'room-a1-living', x: 5.0, z: 5.0, rotation: 180 },
      { id: 'f-a1-table', type: 'coffee_table', roomId: 'room-a1-living', x: 3.2, z: 5.0, rotation: 0 },
      { id: 'f-a1-dining', type: 'dining_table', roomId: 'room-a1-dining', x: -2.5, z: 4.0, rotation: 0 },
      { id: 'f-a1-kit', type: 'kitchen_counter', roomId: 'room-a1-kitchen', x: -8.0, z: 3.5, rotation: 0 },
      { id: 'f-a1-bed-m', type: 'bed', roomId: 'room-a1-master', x: 8.75, z: 5.0, rotation: 90 },
      { id: 'f-a1-bed-2', type: 'bed', roomId: 'room-a1-bed2', x: -8.25, z: 7.75, rotation: 90 },
      { id: 'f-a1-bed-3', type: 'bed', roomId: 'room-a1-bed3', x: -2.75, z: 7.75, rotation: 90 },
      // Unit 2
      { id: 'f-a2-sofa', type: 'sofa', roomId: 'room-a2-living', x: 1.5, z: -5.0, rotation: 0 },
      { id: 'f-a2-tv', type: 'tv_unit', roomId: 'room-a2-living', x: 5.0, z: -5.0, rotation: 180 },
      { id: 'f-a2-table', type: 'coffee_table', roomId: 'room-a2-living', x: 3.2, z: -5.0, rotation: 0 },
      { id: 'f-a2-dining', type: 'dining_table', roomId: 'room-a2-dining', x: -2.5, z: -4.0, rotation: 0 },
      { id: 'f-a2-kit', type: 'kitchen_counter', roomId: 'room-a2-kitchen', x: -8.0, z: -4.5, rotation: 0 },
      { id: 'f-a2-bed-m', type: 'bed', roomId: 'room-a2-master', x: 8.75, z: -5.0, rotation: 90 },
      { id: 'f-a2-bed-2', type: 'bed', roomId: 'room-a2-bed2', x: -8.25, z: -7.75, rotation: 90 },
      { id: 'f-a2-bed-3', type: 'bed', roomId: 'room-a2-bed3', x: -2.75, z: -7.75, rotation: 90 },
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

  // Multi-Floor Tower Template Endpoint providing 10 floors matching the blueprint:
  // Floor 0: Ground Floor (Lobby, Parking, Amenities, Security)
  // Floor 1: Type A (2 x 3 BHK)
  // Floor 2: Type B (4 x 2 BHK)
  // Floor 3: Type C (1 x 4 BHK)
  // Floor 4: Type A (2 x 3 BHK)
  // Floor 5: Type B (4 x 2 BHK)
  // Floor 6: Type C (1 x 4 BHK)
  // Floor 7: Type A (2 x 3 BHK)
  // Floor 8: Type B (4 x 2 BHK)
  // Floor 9: Type C (1 x 4 BHK)
  // Floor 10: Type A (2 x 3 BHK)
  @Get('tower-template')
  async getTowerTemplate() {
    return {
      success: true,
      towerName: 'Aetheria Panorama Tower',
      totalFloors: 10,
      floors: [
        { id: 'floor-0', floorNumber: 0, floorHeight: 3.6, unitsPerFloor: 1, flatType: 'Ground Amenities', description: 'Ground Floor - Grand Entrance Lobby, Security, Meter Room & Parking', structureJson: getTemplateLayout('GROUND'), layout: getTemplateLayout('GROUND') },
        { id: 'floor-1', floorNumber: 1, floorHeight: 3.0, unitsPerFloor: 2, flatType: 'Type A (2 x 3 BHK)', description: '1st Floor - Type A: 2 Units (3 BHK Each, ~1,650 sq.ft)', structureJson: getTemplateLayout('TYPE_A'), layout: getTemplateLayout('TYPE_A') },
        { id: 'floor-2', floorNumber: 2, floorHeight: 3.0, unitsPerFloor: 4, flatType: 'Type B (4 x 2 BHK)', description: '2nd Floor - Type B: 4 Units (2 BHK Each, ~1,050 sq.ft)', structureJson: getTemplateLayout('TYPE_B'), layout: getTemplateLayout('TYPE_B') },
        { id: 'floor-3', floorNumber: 3, floorHeight: 3.2, unitsPerFloor: 1, flatType: 'Type C (1 x 4 BHK)', description: '3rd Floor - Type C: 1 Unit (4 BHK Sky Villa, ~2,400 sq.ft)', structureJson: getTemplateLayout('TYPE_C'), layout: getTemplateLayout('TYPE_C') },
        { id: 'floor-4', floorNumber: 4, floorHeight: 3.0, unitsPerFloor: 2, flatType: 'Type A (2 x 3 BHK)', description: '4th Floor - Type A: 2 Units (3 BHK Each, ~1,650 sq.ft)', structureJson: getTemplateLayout('TYPE_A'), layout: getTemplateLayout('TYPE_A') },
        { id: 'floor-5', floorNumber: 5, floorHeight: 3.0, unitsPerFloor: 4, flatType: 'Type B (4 x 2 BHK)', description: '5th Floor - Type B: 4 Units (2 BHK Each, ~1,050 sq.ft)', structureJson: getTemplateLayout('TYPE_B'), layout: getTemplateLayout('TYPE_B') },
        { id: 'floor-6', floorNumber: 6, floorHeight: 3.2, unitsPerFloor: 1, flatType: 'Type C (1 x 4 BHK)', description: '6th Floor - Type C: 1 Unit (4 BHK Sky Villa, ~2,400 sq.ft)', structureJson: getTemplateLayout('TYPE_C'), layout: getTemplateLayout('TYPE_C') },
        { id: 'floor-7', floorNumber: 7, floorHeight: 3.0, unitsPerFloor: 2, flatType: 'Type A (2 x 3 BHK)', description: '7th Floor - Type A: 2 Units (3 BHK Each, ~1,650 sq.ft)', structureJson: getTemplateLayout('TYPE_A'), layout: getTemplateLayout('TYPE_A') },
        { id: 'floor-8', floorNumber: 8, floorHeight: 3.0, unitsPerFloor: 4, flatType: 'Type B (4 x 2 BHK)', description: '8th Floor - Type B: 4 Units (2 BHK Each, ~1,050 sq.ft)', structureJson: getTemplateLayout('TYPE_B'), layout: getTemplateLayout('TYPE_B') },
        { id: 'floor-9', floorNumber: 9, floorHeight: 3.2, unitsPerFloor: 1, flatType: 'Type C (1 x 4 BHK)', description: '9th Floor - Type C: 1 Unit (4 BHK Sky Villa, ~2,400 sq.ft)', structureJson: getTemplateLayout('TYPE_C'), layout: getTemplateLayout('TYPE_C') },
        { id: 'floor-10', floorNumber: 10, floorHeight: 3.2, unitsPerFloor: 2, flatType: 'Type A (2 x 3 BHK)', description: '10th Floor - Type A: 2 Units (3 BHK Each, ~1,650 sq.ft)', structureJson: getTemplateLayout('TYPE_A'), layout: getTemplateLayout('TYPE_A') },
      ]
    };
  }

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
