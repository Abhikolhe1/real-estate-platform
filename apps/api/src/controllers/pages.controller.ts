import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PagesService } from '../services/pages.service';
import { TenantId } from '../interceptors/tenant.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  // List all pages
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER')
  @Get()
  async getPages(@TenantId() tenantId: string) {
    return this.pagesService.getPages(tenantId);
  }

  // Get page by ID
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER')
  @Get(':id')
  async getPageById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pagesService.getPageById(tenantId, id);
  }

  // Get page layout dynamically by slug (Public endpoint, no auth guard)
  @Get('by-slug/:slug')
  async getPageBySlug(
    @TenantId() headerTenantId: string,
    @Param('slug') slug: string,
    @Query('builderSlug') builderSlug?: string,
  ) {
    return this.pagesService.getPageBySlug(headerTenantId, slug, builderSlug);
  }

  // Create page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post()
  async createPage(
    @TenantId() tenantId: string,
    @Body() body: { title: string; slug: string; status?: string; seoTitle?: string; seoDescription?: string; template?: string },
  ) {
    return this.pagesService.createPage(tenantId, body);
  }

  // Update page details
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Put(':id')
  async updatePage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; slug?: string; status?: string; seoTitle?: string; seoDescription?: string },
  ) {
    return this.pagesService.updatePage(tenantId, id, body);
  }

  // Delete page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Delete(':id')
  async deletePage(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pagesService.deletePage(tenantId, id);
  }

  // Duplicate page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post(':id/duplicate')
  async duplicatePage(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pagesService.duplicatePage(tenantId, id);
  }

  // Add Section to Page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Post(':pageId/sections')
  async addSection(
    @TenantId() tenantId: string,
    @Param('pageId') pageId: string,
    @Body() body: { type: string; orderNo?: number; configJson?: any },
  ) {
    return this.pagesService.addSection(tenantId, pageId, body);
  }

  // Update Section in Page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Put(':pageId/sections/:sectionId')
  async updateSection(
    @TenantId() tenantId: string,
    @Param('pageId') pageId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { type?: string; orderNo?: number; configJson?: any },
  ) {
    return this.pagesService.updateSection(tenantId, pageId, sectionId, body);
  }

  // Delete Section from Page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Delete(':pageId/sections/:sectionId')
  async deleteSection(
    @TenantId() tenantId: string,
    @Param('pageId') pageId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.pagesService.deleteSection(tenantId, pageId, sectionId);
  }

  // Reorder Sections list
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Post(':pageId/sections/reorder')
  async reorderSections(
    @TenantId() tenantId: string,
    @Param('pageId') pageId: string,
    @Body() body: { sectionIds: string[] },
  ) {
    return this.pagesService.reorderSections(tenantId, pageId, body.sectionIds);
  }

  // Get all revisions of a page
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER')
  @Get(':pageId/revisions')
  async getPageRevisions(
    @TenantId() tenantId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.pagesService.getRevisions(tenantId, pageId);
  }

  // Restore page to a specific revision
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post(':pageId/revisions/:revisionId/restore')
  async restorePageRevision(
    @TenantId() tenantId: string,
    @Param('pageId') pageId: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.pagesService.restoreRevision(tenantId, pageId, revisionId);
  }
}
