import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ThemesService } from '../services/themes.service';
import { CreateThemeDto, UpdateThemeDto } from '../dtos/theme.dto';
import { TenantId } from '../interceptors/tenant.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  async getThemes(@TenantId() tenantId: string) {
    return this.themesService.getThemes(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post()
  async createTheme(
    @TenantId() tenantId: string,
    @Body() createThemeDto: CreateThemeDto,
  ) {
    return this.themesService.createTheme(tenantId, createThemeDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Put(':id')
  async updateTheme(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateThemeDto: UpdateThemeDto,
  ) {
    return this.themesService.updateTheme(tenantId, id, updateThemeDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post(':id/activate')
  async activateTheme(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.themesService.activateTheme(tenantId, id);
  }
}
