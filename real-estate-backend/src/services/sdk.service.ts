import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SdkKey } from '../entities/sdk-key.entity';
import { EmbedConfig } from '../entities/embed-config.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { DigitalTwinModel } from '../entities/digital-twin-model.entity';
import { Hotspot } from '../entities/hotspot.entity';
import { TourRoute } from '../entities/tour-route.entity';
import { FloorPlan } from '../entities/floorplan.entity';
import * as crypto from 'crypto';

@Injectable()
export class SdkService {
  constructor(
    @InjectRepository(SdkKey)
    private readonly keyRepo: Repository<SdkKey>,
    @InjectRepository(EmbedConfig)
    private readonly embedRepo: Repository<EmbedConfig>,
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepo: Repository<AnalyticsEvent>,
    @InjectRepository(DigitalTwinModel)
    private readonly modelRepo: Repository<DigitalTwinModel>,
    @InjectRepository(Hotspot)
    private readonly hotspotRepo: Repository<Hotspot>,
    @InjectRepository(TourRoute)
    private readonly tourRepo: Repository<TourRoute>,
    @InjectRepository(FloorPlan)
    private readonly floorPlanRepo: Repository<FloorPlan>,
  ) {}

  // SDK Keys CRUD
  async findAllKeys(tenantId: string) {
    return this.keyRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async createKey(tenantId: string, keyName: string) {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const apiKey = `sdk_live_${randomHex}`;
    
    const key = this.keyRepo.create({
      tenantId,
      keyName,
      apiKey,
      status: 'active',
    });
    return this.keyRepo.save(key);
  }

  async revokeKey(tenantId: string, id: string) {
    const key = await this.keyRepo.findOne({ where: { tenantId, id } });
    if (!key) {
      throw new NotFoundException(`API key with ID ${id} not found.`);
    }
    await this.keyRepo.remove(key);
    return { success: true };
  }

  // Validate API key from external iframe requests
  async validateKey(apiKey: string): Promise<string> {
    const key = await this.keyRepo.findOne({ where: { apiKey, status: 'active' } });
    if (!key) {
      throw new UnauthorizedException('Invalid or inactive SDK API key.');
    }
    return key.tenantId;
  }

  // Embed Configs CRUD
  async findAllEmbeds(tenantId: string, projectId?: string) {
    const where: any = { tenantId };
    if (projectId) {
      where.projectId = projectId;
    }
    return this.embedRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createEmbed(tenantId: string, data: Partial<EmbedConfig>) {
    const config = this.embedRepo.create({
      ...data,
      tenantId,
    });
    return this.embedRepo.save(config);
  }

  async deleteEmbed(tenantId: string, id: string) {
    const config = await this.embedRepo.findOne({ where: { tenantId, id } });
    if (!config) {
      throw new NotFoundException(`Embed configuration with ID ${id} not found.`);
    }
    await this.embedRepo.remove(config);
    return { success: true };
  }

  // Ingest Analytics Events
  async logEvent(tenantId: string, projectId: string, eventName: string, eventData: any) {
    const event = this.eventRepo.create({
      tenantId,
      projectId,
      eventName,
      eventData,
    });
    return this.eventRepo.save(event);
  }

  // Aggregate stats for dashboard usage charts
  async getSummary(tenantId: string, projectId?: string) {
    const whereClause: any = { tenantId };
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Load raw events to process aggregates
    const events = await this.eventRepo.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    const totalViews = events.filter((e) => e.eventName === 'viewer_opened').length;
    const totalClicks = events.filter((e) => e.eventName === 'hotspot_clicked').length;
    const leadsCaptured = events.filter((e) => e.eventName === 'lead_generated').length;

    // Get unique sessions
    const sessionIds = events.map((e) => e.eventData?.sessionId).filter(Boolean);
    const uniqueSessions = new Set(sessionIds).size;

    // Most Viewed Floors
    const floorCounts: Record<string, number> = {};
    events
      .filter((e) => e.eventName === 'floor_selected')
      .forEach((e) => {
        const floor = e.eventData?.floorNumber ?? 'Unknown';
        floorCounts[floor] = (floorCounts[floor] || 0) + 1;
      });

    // Most Viewed Flats
    const flatCounts: Record<string, number> = {};
    events
      .filter((e) => e.eventName === 'flat_selected')
      .forEach((e) => {
        const flat = e.eventData?.flatNumber ?? 'Unknown';
        flatCounts[flat] = (flatCounts[flat] || 0) + 1;
      });

    // Hotspot Clicks
    const hotspotCounts: Record<string, number> = {};
    events
      .filter((e) => e.eventName === 'hotspot_clicked')
      .forEach((e) => {
        const hotspot = e.eventData?.hotspotName ?? 'Unknown';
        hotspotCounts[hotspot] = (hotspotCounts[hotspot] || 0) + 1;
      });

    // Format top items as arrays
    const topFloors = Object.entries(floorCounts)
      .map(([floor, count]) => ({ floor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topFlats = Object.entries(flatCounts)
      .map(([flat, count]) => ({ flat, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topHotspots = Object.entries(hotspotCounts)
      .map(([hotspot, count]) => ({ hotspot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Format logs list (last 15 events)
    const logs = events.slice(0, 15).map((e) => ({
      id: e.id,
      eventName: e.eventName,
      eventData: e.eventData,
      createdAt: e.createdAt,
    }));

    return {
      stats: {
        totalViews,
        totalClicks,
        leadsCaptured,
        uniqueSessions,
      },
      topFloors,
      topFlats,
      topHotspots,
      logs,
    };
  }

  // Resolve complete Digital Twin Embed configuration using public API key
  async resolveEmbed(apiKey: string, projectId: string) {
    const tenantId = await this.validateKey(apiKey);
    
    // Fetch all spatial models for this project
    const models = await this.modelRepo.find({ where: { tenantId, projectId } });
    
    // Fetch floor plans for procedural structure generation
    const floorPlans = await this.floorPlanRepo.find({ 
      where: { tenantId, projectId } 
    });

    const result: any[] = [];
    for (const model of models) {
      const hotspots = await this.hotspotRepo.find({ where: { tenantId, modelId: model.id } });
      const tours = await this.tourRepo.find({ where: { tenantId, modelId: model.id } });
      result.push({
        model,
        hotspots,
        tours,
      });
    }

    return {
      tenantId,
      data: result,
      floorPlans: floorPlans || []
    };
  }
}
