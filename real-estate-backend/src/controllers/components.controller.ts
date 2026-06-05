import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ComponentsService } from '../services/components.service';
import { TenantId } from '../interceptors/tenant.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Components')
@Controller('components')
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  // List all components
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER')
  @Get()
  async getComponents(@TenantId() tenantId: string) {
    return this.componentsService.getComponents(tenantId);
  }

  // Create component
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Post()
  async createComponent(@TenantId() tenantId: string, @Body() body: { componentType: string; configJson?: any }) {
    return this.componentsService.createComponent(tenantId, body);
  }

  // Update component
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Put(':id')
  async updateComponent(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: { configJson: any }) {
    return this.componentsService.updateComponent(tenantId, id, body);
  }

  // Delete component
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Delete(':id')
  async deleteComponent(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.componentsService.deleteComponent(tenantId, id);
  }

  // Get animation presets (Public route, no auth guard)
  @Get('animations/presets')
  async getAnimationPresets() {
    return this.componentsService.getAnimationPresets();
  }
}
