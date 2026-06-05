import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { TwinsService } from '../services/twins.service';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('digital-twin')
export class TwinsController {
  constructor(private readonly twinsService: TwinsService) {}

  // Models Endpoints
  @Get('models')
  async findAllModels(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    return this.twinsService.findAllModels(tenantId, projectId);
  }

  @Get('models/:id')
  async findModelById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.twinsService.findModelById(tenantId, id);
  }

  @Post('models')
  async createModel(@TenantId() tenantId: string, @Body() body: any) {
    return this.twinsService.createModel(tenantId, body);
  }

  @Put('models/:id')
  async updateModel(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.twinsService.updateModel(tenantId, id, body);
  }

  @Delete('models/:id')
  async deleteModel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.twinsService.deleteModel(tenantId, id);
  }

  // Camera Points Endpoints
  @Get('models/:modelId/camera-points')
  async findCameraPoints(@TenantId() tenantId: string, @Param('modelId') modelId: string) {
    return this.twinsService.findCameraPoints(tenantId, modelId);
  }

  @Post('models/:modelId/camera-points')
  async createCameraPoint(
    @TenantId() tenantId: string,
    @Param('modelId') modelId: string,
    @Body() body: any,
  ) {
    return this.twinsService.createCameraPoint(tenantId, modelId, body);
  }

  @Delete('camera-points/:id')
  async deleteCameraPoint(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.twinsService.deleteCameraPoint(tenantId, id);
  }

  // Hotspots Endpoints
  @Get('models/:modelId/hotspots')
  async findHotspots(@TenantId() tenantId: string, @Param('modelId') modelId: string) {
    return this.twinsService.findHotspots(tenantId, modelId);
  }

  @Post('models/:modelId/hotspots')
  async createHotspot(
    @TenantId() tenantId: string,
    @Param('modelId') modelId: string,
    @Body() body: any,
  ) {
    return this.twinsService.createHotspot(tenantId, modelId, body);
  }

  @Put('hotspots/:id')
  async updateHotspot(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.twinsService.updateHotspot(tenantId, id, body);
  }

  @Delete('hotspots/:id')
  async deleteHotspot(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.twinsService.deleteHotspot(tenantId, id);
  }

  // Tour Routes Endpoints
  @Get('models/:modelId/tours')
  async findTourRoutes(@TenantId() tenantId: string, @Param('modelId') modelId: string) {
    return this.twinsService.findTourRoutes(tenantId, modelId);
  }

  @Post('models/:modelId/tours')
  async createTourRoute(
    @TenantId() tenantId: string,
    @Param('modelId') modelId: string,
    @Body() body: any,
  ) {
    return this.twinsService.createTourRoute(tenantId, modelId, body);
  }

  @Put('tours/:id')
  async updateTourRoute(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.twinsService.updateTourRoute(tenantId, id, body);
  }

  @Delete('tours/:id')
  async deleteTourRoute(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.twinsService.deleteTourRoute(tenantId, id);
  }
}
