import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import {JwtAuthGuard} from '../guards/auth.guard';
import {TwinAccessGuard} from '../guards/twin-access.guard';
import { ProjectsService } from '../services/projects.service';
import { BillingService } from '../services/billing.service';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { TenantId } from '../interceptors/tenant.decorator';
import { AmenityType } from '../entities/amenity.entity';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly billingService: BillingService,
  ) {}

  @Get()
  async findAll(@TenantId() tenantId: string) {
    return this.projectsService.findAll(tenantId);
  }

  @Get(':id/amenities')
  async findAmenities(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.findAmenities(tenantId, id);
  }

  @Post(':id/amenities')
  @UseGuards(JwtAuthGuard,TwinAccessGuard)
  async saveAmenities(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: {
      amenities: Array<{
        type: AmenityType;
        x: number;
        z: number;
        rotation?: number;
        label: string;
        description?: string;
        imageUrl?: string;
        timings?: string;
      }>;
    },
  ) {
    return this.projectsService.saveAmenities(tenantId, id, body.amenities || []);
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.findOne(tenantId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard,TwinAccessGuard)
  async create(
    @TenantId() tenantId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    // Validate project limits based on plan
    await this.billingService.validatePlanLimits(tenantId, 'project');
    return this.projectsService.create(tenantId, createProjectDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard,TwinAccessGuard)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, id, updateProjectDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard,TwinAccessGuard)
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.remove(tenantId, id);
  }
}
