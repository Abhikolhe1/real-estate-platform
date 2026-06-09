import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NavigationService } from '../services/navigation.service';
import { TenantId } from '../interceptors/tenant.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  // List all menus
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER')
  @Get('menus')
  async getMenus(@TenantId() tenantId: string) {
    return this.navigationService.getMenus(tenantId);
  }

  // Get menu by name (Public route, no auth guard)
  @Get('menus/by-name/:name')
  async getMenuByName(
    @TenantId() headerTenantId: string,
    @Param('name') name: string,
    @Query('builderSlug') builderSlug?: string,
  ) {
    return this.navigationService.getMenuByName(headerTenantId, name, builderSlug);
  }

  // Create menu
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post('menus')
  async createMenu(@TenantId() tenantId: string, @Body() body: { name: string }) {
    return this.navigationService.createMenu(tenantId, body.name);
  }

  // Add Item to Menu
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post('menus/:menuId/items')
  async addMenuItem(
    @TenantId() tenantId: string,
    @Param('menuId') menuId: string,
    @Body() body: { title: string; url: string; orderNo?: number },
  ) {
    return this.navigationService.addMenuItem(tenantId, menuId, body);
  }

  // Update Menu Item
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Put('items/:itemId')
  async updateMenuItem(
    @TenantId() tenantId: string,
    @Param('itemId') itemId: string,
    @Body() body: { title?: string; url?: string; orderNo?: number },
  ) {
    return this.navigationService.updateMenuItem(tenantId, itemId, body);
  }

  // Delete Menu Item
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Delete('items/:itemId')
  async deleteMenuItem(@TenantId() tenantId: string, @Param('itemId') itemId: string) {
    return this.navigationService.deleteMenuItem(tenantId, itemId);
  }

  // Reorder Menu Items
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post('menus/:menuId/items/reorder')
  async reorderMenuItems(
    @TenantId() tenantId: string,
    @Param('menuId') menuId: string,
    @Body() body: { itemIds: string[] },
  ) {
    return this.navigationService.reorderMenuItems(tenantId, menuId, body.itemIds);
  }
}
