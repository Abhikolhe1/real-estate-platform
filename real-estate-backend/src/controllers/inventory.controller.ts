import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tower } from '../entities/tower.entity';
import { Floor } from '../entities/floor.entity';
import { Flat } from '../entities/flat.entity';
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
      const floors = await this.floorRepo.find({
        where: { tenantId, towerId },
        relations: ['flats'],
        order: { floorNumber: 'DESC' },
      });
      return floors;
    }

    return this.flatRepo.find({
      where: { tenantId },
      relations: ['floor', 'floor.tower'],
      order: { flatNumber: 'ASC' },
    });
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
}
