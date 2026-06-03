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
    fp.layoutData = {
      rooms: [
        { id: 'room-1', name: 'Living Room (Flat A)', x: -4, z: -4, width: 4.5, depth: 5.5, color: '#f5efe6' },
        { id: 'room-2', name: 'Master Bed (Flat A)', x: 1, z: -4, width: 4, depth: 4, color: '#e3ece9' },
        { id: 'room-3', name: 'Kitchen (Flat A)', x: -4, z: 2.5, width: 4.5, depth: 3, color: '#f4ece1' },
        { id: 'room-4', name: 'Living Room (Flat B)', x: 6, z: -4, width: 4.5, depth: 5.5, color: '#f5efe6' },
        { id: 'room-5', name: 'Guest Bed (Flat B)', x: 11, z: -4, width: 4, depth: 4, color: '#ece8f2' }
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
