import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { BillingService } from '../services/billing.service';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { TenantId } from '../interceptors/tenant.decorator';

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

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.findOne(tenantId, id);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    // Validate project limits based on plan
    await this.billingService.validatePlanLimits(tenantId, 'project');
    return this.projectsService.create(tenantId, createProjectDto);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, id, updateProjectDto);
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.remove(tenantId, id);
  }
}
