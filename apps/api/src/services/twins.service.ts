import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalTwinModel } from '../entities/digital-twin-model.entity';
import { CameraPoint } from '../entities/camera-point.entity';
import { Hotspot } from '../entities/hotspot.entity';
import { TourRoute } from '../entities/tour-route.entity';

@Injectable()
export class TwinsService {
  constructor(
    @InjectRepository(DigitalTwinModel)
    private readonly modelRepo: Repository<DigitalTwinModel>,
    @InjectRepository(CameraPoint)
    private readonly cameraRepo: Repository<CameraPoint>,
    @InjectRepository(Hotspot)
    private readonly hotspotRepo: Repository<Hotspot>,
    @InjectRepository(TourRoute)
    private readonly tourRepo: Repository<TourRoute>,
  ) {}

  // Models CRUD
  async findAllModels(tenantId: string, projectId?: string) {
    const whereClause: any = { tenantId };
    if (projectId) {
      whereClause.projectId = projectId;
    }
    return this.modelRepo.find({ where: whereClause, order: { createdAt: 'DESC' } });
  }

  async findModelById(tenantId: string, id: string) {
    const model = await this.modelRepo.findOne({ where: { tenantId, id } });
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found.`);
    }
    return model;
  }

  async createModel(tenantId: string, data: Partial<DigitalTwinModel>) {
    const model = this.modelRepo.create({
      ...data,
      tenantId,
    });
    return this.modelRepo.save(model);
  }

  async updateModel(tenantId: string, id: string, data: Partial<DigitalTwinModel>) {
    const model = await this.findModelById(tenantId, id);
    Object.assign(model, data);
    return this.modelRepo.save(model);
  }

  async deleteModel(tenantId: string, id: string) {
    const model = await this.findModelById(tenantId, id);
    await this.modelRepo.remove(model);
    return { success: true };
  }

  // Camera Points CRUD
  async findCameraPoints(tenantId: string, modelId: string) {
    return this.cameraRepo.find({ where: { tenantId, modelId }, order: { createdAt: 'ASC' } });
  }

  async createCameraPoint(tenantId: string, modelId: string, data: Partial<CameraPoint>) {
    // Verify model exists and belongs to tenant
    await this.findModelById(tenantId, modelId);
    
    const point = this.cameraRepo.create({
      ...data,
      modelId,
      tenantId,
    });
    return this.cameraRepo.save(point);
  }

  async deleteCameraPoint(tenantId: string, id: string) {
    const point = await this.cameraRepo.findOne({ where: { tenantId, id } });
    if (!point) {
      throw new NotFoundException(`Camera point with ID ${id} not found.`);
    }
    await this.cameraRepo.remove(point);
    return { success: true };
  }

  // Hotspots CRUD
  async findHotspots(tenantId: string, modelId: string) {
    return this.hotspotRepo.find({ where: { tenantId, modelId }, order: { createdAt: 'ASC' } });
  }

  async createHotspot(tenantId: string, modelId: string, data: Partial<Hotspot>) {
    await this.findModelById(tenantId, modelId);
    
    const hotspot = this.hotspotRepo.create({
      ...data,
      modelId,
      tenantId,
    });
    return this.hotspotRepo.save(hotspot);
  }

  async updateHotspot(tenantId: string, id: string, data: Partial<Hotspot>) {
    const hotspot = await this.hotspotRepo.findOne({ where: { tenantId, id } });
    if (!hotspot) {
      throw new NotFoundException(`Hotspot with ID ${id} not found.`);
    }
    Object.assign(hotspot, data);
    return this.hotspotRepo.save(hotspot);
  }

  async deleteHotspot(tenantId: string, id: string) {
    const hotspot = await this.hotspotRepo.findOne({ where: { tenantId, id } });
    if (!hotspot) {
      throw new NotFoundException(`Hotspot with ID ${id} not found.`);
    }
    await this.hotspotRepo.remove(hotspot);
    return { success: true };
  }

  // Tour Routes CRUD
  async findTourRoutes(tenantId: string, modelId: string) {
    return this.tourRepo.find({ where: { tenantId, modelId }, order: { createdAt: 'ASC' } });
  }

  async createTourRoute(tenantId: string, modelId: string, data: Partial<TourRoute>) {
    await this.findModelById(tenantId, modelId);

    const tour = this.tourRepo.create({
      ...data,
      modelId,
      tenantId,
    });
    return this.tourRepo.save(tour);
  }

  async updateTourRoute(tenantId: string, id: string, data: Partial<TourRoute>) {
    const tour = await this.tourRepo.findOne({ where: { tenantId, id } });
    if (!tour) {
      throw new NotFoundException(`Tour route with ID ${id} not found.`);
    }
    Object.assign(tour, data);
    return this.tourRepo.save(tour);
  }

  async deleteTourRoute(tenantId: string, id: string) {
    const tour = await this.tourRepo.findOne({ where: { tenantId, id } });
    if (!tour) {
      throw new NotFoundException(`Tour route with ID ${id} not found.`);
    }
    await this.tourRepo.remove(tour);
    return { success: true };
  }
}
