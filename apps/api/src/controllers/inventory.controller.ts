import { Controller, Get, Post, Put, Delete, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tower } from '../entities/tower.entity';
import { Floor } from '../entities/floor.entity';
import { Flat } from '../entities/flat.entity';
import { Lead } from '../entities/lead.entity';
import { GeneratedStructure } from '../entities/generated-structure.entity';
import { FloorPlan } from '../entities/floorplan.entity';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(
    @InjectRepository(Tower)
    private readonly towerRepo: Repository<Tower>,
    @InjectRepository(Floor)
    private readonly floorRepo: Repository<Floor>,
    @InjectRepository(Flat)
    private readonly flatRepo: Repository<Flat>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(GeneratedStructure)
    private readonly generatedStructureRepo: Repository<GeneratedStructure>,
  ) {}

  // Get Towers
  @Get('towers')
  async getTowers(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    const query = { tenantId } as any;
    if (projectId) {
      query.projectId = projectId;
    }
    return this.towerRepo.find({
      where: query,
      relations: ['project', 'floors', 'floors.flats'],
      order: { name: 'ASC' },
    });
  }

  // Create Tower
  @Post('towers')
  async createTower(
    @TenantId() tenantId: string,
    @Body() body: { name: string; projectId: string; description?: string; floorsCount?: number },
  ) {
    const tower = new Tower();
    tower.tenantId = tenantId;
    tower.projectId = body.projectId;
    tower.name = body.name;
    tower.description = body.description;
    const savedTower = await this.towerRepo.save(tower);

    // If floors count specified, auto-seed floors and flats
    const seededFloors: Floor[] = [];
    if (body.floorsCount && body.floorsCount > 0) {
      for (let f = 1; f <= body.floorsCount; f++) {
        const floor = new Floor();
        floor.tenantId = tenantId;
        floor.towerId = savedTower.id;
        floor.floorNumber = f;
        floor.description = `Floor level ${f}`;
        const savedFloor = await this.floorRepo.save(floor);
        seededFloors.push(savedFloor);

        // Seed 2 default flats per floor
        for (let unit = 1; unit <= 2; unit++) {
          const flat = new Flat();
          flat.tenantId = tenantId;
          flat.floorId = savedFloor.id;
          flat.flatNumber = `${f}0${unit}`;
          flat.status = 'AVAILABLE';
          flat.sizeSqFt = 1200 + unit * 200;
          flat.price = 12000000 + unit * 3000000;
          flat.type = '2BHK';
          await this.flatRepo.save(flat);
        }
      }
    }

    return {
      success: true,
      tower: savedTower,
      floorsCount: seededFloors.length,
    };
  }

  // Get flats list (highly useful for both inventory lists and public visual maps)
  @Get('flats')
  async getFlats(@TenantId() tenantId: string, @Query('towerId') towerId?: string) {
    if (towerId) {
      return this.flatRepo.find({
        where: { tenantId, floor: { towerId } } as any,
        relations: ['floor', 'floor.tower'],
        order: {
          floor: { floorNumber: 'DESC' },
          flatNumber: 'ASC',
        } as any,
      });
    }

    return this.flatRepo.find({
      where: { tenantId },
      relations: ['floor', 'floor.tower'],
      order: { flatNumber: 'ASC' },
    });
  }

  @Get('flats/:id')
  async getFlat(@TenantId() tenantId: string, @Param('id') id: string) {
    const flat = await this.flatRepo.findOne({
      where: { id, tenantId },
      relations: ['floor', 'floor.tower'],
    });

    if (!flat) {
      throw new NotFoundException('Flat unit not found under this tenant context');
    }

    return flat;
  }

  // Update Flat Status (Book flat, change price, orientation)
  @Put('flats/:id')
  async updateFlat(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { status?: 'AVAILABLE' | 'BOOKED' | 'HOLD'; price?: number; sizeSqFt?: number; orientation?: string },
  ) {
    const flat = await this.flatRepo.findOne({ where: { id, tenantId } });
    if (!flat) {
      return { success: false, message: 'Flat unit not found under this tenant context' };
    }

    if (body.status) flat.status = body.status;
    if (body.price) flat.price = body.price;
    if (body.sizeSqFt) flat.sizeSqFt = body.sizeSqFt;
    if (body.orientation) flat.orientation = body.orientation;

    const saved = await this.flatRepo.save(flat);
    return { success: true, flat: saved };
  }

  // ===================== FLOORS CRUD =====================

  // Get floors for a specific tower
  @Get('floors')
  async getFloors(@TenantId() tenantId: string, @Query('towerId') towerId?: string) {
    const query: any = { tenantId };
    if (towerId) query.towerId = towerId;
    return this.floorRepo.find({
      where: query,
      relations: ['flats'],
      order: { floorNumber: 'ASC' },
    });
  }

  // Create individual floor under a tower
  @Post('floors')
  async createFloor(
    @TenantId() tenantId: string,
    @Body() body: {
      towerId: string;
      floorNumber: number;
      description?: string;
      flatsCount?: number;
      floorHeight?: number;
      floorplanId?: string;
      flatType?: string;
      unitsPerFloor?: number;
    },
  ) {
    const floor = new Floor();
    floor.tenantId = tenantId;
    floor.towerId = body.towerId;
    floor.floorNumber = body.floorNumber;
    floor.description = body.description || `Floor level ${body.floorNumber}`;
    floor.floorHeight = body.floorHeight !== undefined ? body.floorHeight : 3.0;
    if (body.floorplanId) floor.floorplanId = body.floorplanId;
    if (body.flatType) floor.flatType = body.flatType;
    if (body.unitsPerFloor !== undefined) floor.unitsPerFloor = body.unitsPerFloor;
    const savedFloor = await this.floorRepo.save(floor);

    // Auto-seed flats if flatsCount specified
    const seededFlats: Flat[] = [];
    const count = body.flatsCount !== undefined ? body.flatsCount : (body.unitsPerFloor || 0);
    if (count > 0) {
      for (let unit = 1; unit <= count; unit++) {
        const flat = new Flat();
        flat.tenantId = tenantId;
        flat.floorId = savedFloor.id;
        flat.flatNumber = `${body.floorNumber}0${unit}`;
        flat.status = 'AVAILABLE';
        flat.sizeSqFt = 1200 + unit * 200;
        flat.price = 12000000 + unit * 3000000;
        flat.type = (body.flatType as any) || '2BHK';
        const savedFlat = await this.flatRepo.save(flat);
        seededFlats.push(savedFlat);
      }
    }

    return { success: true, floor: savedFloor, flatsSeeded: seededFlats.length };
  }

  // Update floor description and geometry/plan associations
  @Put('floors/:id')
  async updateFloor(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: {
      description?: string;
      floorNumber?: number;
      floorHeight?: number;
      floorplanId?: string | null;
      flatType?: string;
      unitsPerFloor?: number;
    },
  ) {
    const floor = await this.floorRepo.findOne({ where: { id, tenantId } });
    if (!floor) return { success: false, message: 'Floor not found' };
    if (body.description !== undefined) floor.description = body.description;
    if (body.floorNumber !== undefined) floor.floorNumber = body.floorNumber;
    if (body.floorHeight !== undefined) floor.floorHeight = body.floorHeight;
    if (body.floorplanId !== undefined) floor.floorplanId = body.floorplanId === null ? undefined : body.floorplanId;
    if (body.flatType !== undefined) floor.flatType = body.flatType;
    if (body.unitsPerFloor !== undefined) floor.unitsPerFloor = body.unitsPerFloor;
    const saved = await this.floorRepo.save(floor);
    return { success: true, floor: saved };
  }

  // Delete floor (cascade deletes flats)
  @Delete('floors/:id')
  async deleteFloor(@TenantId() tenantId: string, @Param('id') id: string) {
    const floor = await this.floorRepo.findOne({ where: { id, tenantId } });
    if (!floor) return { success: false, message: 'Floor not found' };
    await this.floorRepo.remove(floor);
    return { success: true };
  }

  // Get floors of a tower with their corresponding structureJson
  @Get('towers/:id/floors')
  async getTowerFloors(@TenantId() tenantId: string, @Param('id') id: string) {
    const floors = await this.floorRepo.find({
      where: { tenantId, towerId: id },
      relations: ['floorplan', 'flats'],
      order: { floorNumber: 'ASC' },
    });

    const floorplanIds = floors
      .map((f) => f.floorplanId)
      .filter((fpId): fpId is string => !!fpId);

    let structures: GeneratedStructure[] = [];
    if (floorplanIds.length > 0) {
      structures = await this.generatedStructureRepo.find({
        where: { tenantId, floorplanId: In(floorplanIds) },
      });
    }

    const structureMap = new Map<string, any>();
    for (const struct of structures) {
      if (struct.floorplanId) {
        structureMap.set(struct.floorplanId, struct.structureJson);
      }
    }

    return floors.map((floor) => ({
      ...floor,
      structureJson: floor.floorplanId ? structureMap.get(floor.floorplanId) || null : null,
    }));
  }

  // ===================== TOWERS UPDATE/DELETE =====================

  // Update Tower
  @Put('towers/:id')
  async updateTower(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    const tower = await this.towerRepo.findOne({ where: { id, tenantId } });
    if (!tower) return { success: false, message: 'Tower not found' };
    if (body.name) tower.name = body.name;
    if (body.description !== undefined) tower.description = body.description;
    const saved = await this.towerRepo.save(tower);
    return { success: true, tower: saved };
  }

  // Delete Tower (cascade deletes floors + flats)
  @Delete('towers/:id')
  async deleteTower(@TenantId() tenantId: string, @Param('id') id: string) {
    const tower = await this.towerRepo.findOne({ where: { id, tenantId } });
    if (!tower) return { success: false, message: 'Tower not found' };
    await this.towerRepo.remove(tower);
    return { success: true };
  }

  // ===================== ADD FLAT =====================

  // Create individual flat under a floor
  @Post('flats')
  async createFlat(
    @TenantId() tenantId: string,
    @Body() body: {
      floorId: string;
      flatNumber: string;
      type?: '1BHK' | '2BHK' | '3BHK' | 'PENTHOUSE';
      sizeSqFt?: number;
      price?: number;
      orientation?: string;
      description?: string;
    },
  ) {
    const flat = new Flat();
    flat.tenantId = tenantId;
    flat.floorId = body.floorId;
    flat.flatNumber = body.flatNumber;
    flat.status = 'AVAILABLE';
    flat.type = body.type || '2BHK';
    flat.sizeSqFt = body.sizeSqFt || 1200;
    flat.price = body.price || 12000000;
    if (body.orientation) flat.orientation = body.orientation;
    if (body.description) flat.description = body.description;
    const saved = await this.flatRepo.save(flat);
    return { success: true, flat: saved };
  }

  // Delete flat unit
  @Delete('flats/:id')
  async deleteFlat(@TenantId() tenantId: string, @Param('id') id: string) {
    const flat = await this.flatRepo.findOne({ where: { id, tenantId } });
    if (!flat) return { success: false, message: 'Flat not found' };
    await this.flatRepo.remove(flat);
    return { success: true };
  }

  // ===================== DASHBOARD ANALYTICS =====================

  // Builder dashboard stats summary
  @Get('stats')
  async getDashboardStats(@TenantId() tenantId: string) {
    const [totalFlats, bookedFlats, heldFlats, totalTowers, totalLeads, hotLeads] = await Promise.all([
      this.flatRepo.count({ where: { tenantId } }),
      this.flatRepo.count({ where: { tenantId, status: 'BOOKED' } }),
      this.flatRepo.count({ where: { tenantId, status: 'HOLD' } }),
      this.towerRepo.count({ where: { tenantId } }),
      this.leadRepo.count({ where: { tenantId } }),
      this.leadRepo.count({ where: { tenantId, status: 'HOT' } }),
    ]);

    const availableFlats = totalFlats - bookedFlats - heldFlats;
    const inventoryAllocationPct = totalFlats > 0 ? Math.round(((bookedFlats + heldFlats) / totalFlats) * 100) : 0;

    // Estimate revenue from booked flats (using avg price calculation)
    const bookedFlatsData = await this.flatRepo.find({ where: { tenantId, status: 'BOOKED' } });
    const totalRevenue = bookedFlatsData.reduce((sum, f) => sum + Number(f.price), 0);

    return {
      totalFlats,
      availableFlats,
      bookedFlats,
      heldFlats,
      totalTowers,
      inventoryAllocationPct,
      totalLeads,
      hotLeads,
      estimatedRevenue: totalRevenue,
      walkthroughVisits: 1840 + Math.floor(Math.random() * 200), // Placeholder until analytics engine
    };
  }
}
