import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalTwinModel } from '../entities/digital-twin-model.entity';
import { CameraPoint } from '../entities/camera-point.entity';
import { Hotspot } from '../entities/hotspot.entity';
import { TourRoute } from '../entities/tour-route.entity';
import { FloorPlan } from '../entities/floorplan.entity';
import { GeneratedStructure } from '../entities/generated-structure.entity';
import { Builder } from '../entities/builder.entity';

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
    @InjectRepository(FloorPlan)
    private readonly floorplanRepo: Repository<FloorPlan>,
    @InjectRepository(GeneratedStructure)
    private readonly structureRepo: Repository<GeneratedStructure>,
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
  ) {}

  async parseFloorplan(
    tenantId: string,
    floorplanId: string,
    filePath: string,
    fileType: 'dxf' | 'pdf',
    snapTolerance?: number,
    layerMapping?: Record<string, string>,
  ) {
    const fp = await this.floorplanRepo.findOne({ where: { id: floorplanId, tenantId } });
    if (!fp) {
      throw new NotFoundException(`Floor plan with ID ${floorplanId} not found.`);
    }

    // Update status to parsing
    fp.status = 'parsing';
    await this.floorplanRepo.save(fp);

    // Retrieve default layer preferences from builder if not provided
    let finalLayerMapping = layerMapping;
    if (!finalLayerMapping) {
      try {
        const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
        if (builder?.dxfLayerPreferences) {
          finalLayerMapping = builder.dxfLayerPreferences;
        }
      } catch (err) {
        console.error('Failed to load builder dxfLayerPreferences:', err);
      }
    }

    // Call python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    // We run the actual API call in a wrapper to ensure safety
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${aiServiceUrl}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          snapTolerance,
          layerMapping: finalLayerMapping,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI Service returned status code ${response.status}`);
      }

      const resJson = await response.json() as any;
      if (!resJson.success || !resJson.data) {
        throw new Error(resJson.detail || 'Parsing failed on AI service side');
      }

      const parsedData = resJson.data;

      // Save GeneratedStructure entity
      const structure = this.structureRepo.create({
        tenantId,
        projectId: fp.projectId,
        structureJson: parsedData,
        wallCount: parsedData.walls?.length || 0,
        roomCount: parsedData.rooms?.length || 0,
        floorplanId: fp.id,
        scaleMultiplier: 1.0,
        status: 'generated',
      });

      const savedStructure = await this.structureRepo.save(structure);

      // Update FloorPlan status to parsed and associate structureId
      fp.status = 'parsed';
      fp.structureId = savedStructure.id;
      fp.roomCount = structure.roomCount;
      fp.flatCount = parsedData.rooms?.filter((r: any) =>
        r.name.toLowerCase().includes('living') ||
        r.name.toLowerCase().includes('flat') ||
        r.name.toLowerCase().includes('suite')
      ).length || 1;

      await this.floorplanRepo.save(fp);

      return savedStructure;
    } catch (err) {
      console.error(`Error parsing floorplan ${floorplanId}:`, err);
      fp.status = 'failed';
      await this.floorplanRepo.save(fp);
      throw err;
    }
  }

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
