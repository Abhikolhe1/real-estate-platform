import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloorPlan } from '../entities/floorplan.entity';
import { TenantId } from '../interceptors/tenant.decorator';

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
    @Body() body: { name: string; projectId: string; imageUrl?: string },
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
    
    const saved = await this.floorplanRepo.save(fp);
    return { success: true, floorPlan: saved };
  }

  // Trigger simulated AI computer vision analysis
  @Post(':id/analyze')
  async analyzeFloorPlan(@TenantId() tenantId: string, @Param('id') id: string) {
    const fp = await this.floorplanRepo.findOne({ where: { id, tenantId } });
    if (!fp) {
      return { success: false, message: 'Floor plan not found' };
    }

    // Simulate AI computing: count flats and rooms
    // We can generate stable mock counts based on length of floorplan name
    const countFactor = fp.name.length;
    const flatCount = (countFactor % 3) + 2; // 2 to 4 flats
    const roomCount = flatCount * ((countFactor % 2) + 2); // 4 to 12 rooms
    const priceEstimate = flatCount * 15000; // ₹15,000 per flat

    fp.flatCount = flatCount;
    fp.roomCount = roomCount;
    fp.priceEstimate = priceEstimate;
    fp.status = 'ANALYZED';

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

    // Seed default 3D floor plan layout coordinates for Three.js
    // Seed default 3D floor plan layout coordinates for Three.js
    fp.layoutData = {
      rooms: [
        { id: 'room-1', name: 'Living Room (Flat A)', x: -4, z: -4, width: 4.5, depth: 5.5, color: '#f5efe6', node: { x: -1.75, z: -1.25 } },
        { id: 'room-2', name: 'Master Bed (Flat A)', x: 1, z: -4, width: 4, depth: 4, color: '#e3ece9', node: { x: 3, z: -2 } },
        { id: 'room-3', name: 'Kitchen (Flat A)', x: -4, z: 2.5, width: 4.5, depth: 3, color: '#f4ece1', node: { x: -1.75, z: 4 } },
        { id: 'room-4', name: 'Living Room (Flat B)', x: 6, z: -4, width: 4.5, depth: 5.5, color: '#f5efe6', node: { x: 8.25, z: -1.25 } },
        { id: 'room-5', name: 'Guest Bed (Flat B)', x: 11, z: -4, width: 4, depth: 4, color: '#ece8f2', node: { x: 13, z: -2 } }
      ],
      walls: [
        // Room 1 (Living Room Flat A)
        { id: 'w-1-1', startX: -4, startZ: -4, endX: 0.5, endZ: -4, thickness: 0.2, height: 3.0 },
        { id: 'w-1-2', startX: 0.5, startZ: -4, endX: 0.5, endZ: 1.5, thickness: 0.2, height: 3.0 },
        { id: 'w-1-3', startX: 0.5, startZ: 1.5, endX: -4, endZ: 1.5, thickness: 0.2, height: 3.0 },
        { id: 'w-1-4', startX: -4, startZ: 1.5, endX: -4, endZ: -4, thickness: 0.2, height: 3.0 },
        
        // Room 2 (Master Bed Flat A)
        { id: 'w-2-1', startX: 1, startZ: -4, endX: 5, endZ: -4, thickness: 0.2, height: 3.0 },
        { id: 'w-2-2', startX: 5, startZ: -4, endX: 5, endZ: 0, thickness: 0.2, height: 3.0 },
        { id: 'w-2-3', startX: 5, startZ: 0, endX: 1, endZ: 0, thickness: 0.2, height: 3.0 },
        { id: 'w-2-4', startX: 1, startZ: 0, endX: 1, endZ: -4, thickness: 0.2, height: 3.0 },

        // Room 3 (Kitchen Flat A)
        { id: 'w-3-1', startX: -4, startZ: 2.5, endX: 0.5, endZ: 2.5, thickness: 0.2, height: 3.0 },
        { id: 'w-3-2', startX: 0.5, startZ: 2.5, endX: 0.5, endZ: 5.5, thickness: 0.2, height: 3.0 },
        { id: 'w-3-3', startX: 0.5, startZ: 5.5, endX: -4, endZ: 5.5, thickness: 0.2, height: 3.0 },
        { id: 'w-3-4', startX: -4, startZ: 5.5, endX: -4, endZ: 2.5, thickness: 0.2, height: 3.0 },

        // Room 4 (Living Room Flat B)
        { id: 'w-4-1', startX: 6, startZ: -4, endX: 10.5, endZ: -4, thickness: 0.2, height: 3.0 },
        { id: 'w-4-2', startX: 10.5, startZ: -4, endX: 10.5, endZ: 1.5, thickness: 0.2, height: 3.0 },
        { id: 'w-4-3', startX: 10.5, startZ: 1.5, endX: 6, endZ: 1.5, thickness: 0.2, height: 3.0 },
        { id: 'w-4-4', startX: 6, startZ: 1.5, endX: 6, endZ: -4, thickness: 0.2, height: 3.0 },

        // Room 5 (Guest Bed Flat B)
        { id: 'w-5-1', startX: 11, startZ: -4, endX: 15, endZ: -4, thickness: 0.2, height: 3.0 },
        { id: 'w-5-2', startX: 15, startZ: -4, endX: 15, endZ: 0, thickness: 0.2, height: 3.0 },
        { id: 'w-5-3', startX: 15, startZ: 0, endX: 11, endZ: 0, thickness: 0.2, height: 3.0 },
        { id: 'w-5-4', startX: 11, startZ: 0, endX: 11, endZ: -4, thickness: 0.2, height: 3.0 }
      ],
      apertures: [
        { id: 'ap-1', wallId: 'w-1-1', type: 'window', startOffset: 1.5, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-2', wallId: 'w-1-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
        { id: 'ap-3', wallId: 'w-2-1', type: 'window', startOffset: 1.2, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-4', wallId: 'w-2-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
        { id: 'ap-5', wallId: 'w-3-3', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
        { id: 'ap-6', wallId: 'w-3-1', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
        { id: 'ap-7', wallId: 'w-4-1', type: 'window', startOffset: 1.5, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-8', wallId: 'w-4-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
        { id: 'ap-9', wallId: 'w-5-1', type: 'window', startOffset: 1.2, width: 1.5, height: 1.2, elevation: 0.9 },
        { id: 'ap-10', wallId: 'w-5-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 }
      ],
      furniture: [
        { id: 'f-1', type: 'sofa', roomId: 'room-1', x: -3.5, z: -2.5, rotation: 0 },
        { id: 'f-2', type: 'bed', roomId: 'room-2', x: 3, z: -2.5, rotation: 90 },
        { id: 'f-3', type: 'table', roomId: 'room-3', x: -2, z: 3, rotation: 0 },
        { id: 'f-4', type: 'sofa', roomId: 'room-4', x: 6.5, z: -2.5, rotation: 0 },
        { id: 'f-5', type: 'bed', roomId: 'room-5', x: 13, z: -2.5, rotation: 90 }
      ]
    };

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
