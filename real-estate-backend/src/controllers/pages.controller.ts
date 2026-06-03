import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from '../entities/page.entity';
import { Builder } from '../entities/builder.entity';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('pages')
export class PagesController {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
  ) {}

  // Get all pages
  @Get()
  async getPages(@TenantId() tenantId: string) {
    return this.pageRepo.find({ where: { tenantId } });
  }

  // Create page layout
  @Post()
  async createPage(@TenantId() tenantId: string, @Body() body: { slug: string; title: string; sections?: any[] }) {
    const page = new Page();
    page.tenantId = tenantId;
    page.slug = body.slug || 'home';
    page.title = body.title || 'Landing Page';
    page.sections = body.sections || [];
    page.isActive = true;
    return this.pageRepo.save(page);
  }

  // Get page layout dynamically by slug (Support both tenantId header and query builderSlug)
  @Get('by-slug/:slug')
  async getPageBySlug(
    @TenantId() headerTenantId: string,
    @Param('slug') slug: string,
    @Query('builderSlug') builderSlug?: string,
  ) {
    let finalTenantId = headerTenantId;

    if (builderSlug && (!finalTenantId || finalTenantId === '00000000-0000-0000-0000-000000000000')) {
      const builder = await this.builderRepo.findOne({ where: { slug: builderSlug } });
      if (builder) {
        finalTenantId = builder.id;
      }
    }

    const page = await this.pageRepo.findOne({ where: { slug, tenantId: finalTenantId } });
    if (!page) {
      // Return default systemic boilerplate layout so the client page never crashes!
      return {
        slug: 'home',
        title: 'Boilerplate Layout',
        sections: [
          { id: 'hero', name: 'Cinematic Hero', isActive: true, content: { title: 'The Peak of Luxury Living', subtitle: 'Branded Luxury Penthouses' } },
          { id: 'concept', name: 'Luxury Concept', isActive: true },
          { id: 'gallery', name: 'Cinematic Gallery', isActive: true },
          { id: 'amenities', name: 'Amenities', isActive: true },
          { id: 'location', name: 'Location Map', isActive: true },
          { id: 'contact', name: 'Booking Form', isActive: true },
        ],
      };
    }

    return page;
  }

  // Save published visual editor sections list
  @Put('by-slug/:slug')
  async publishPage(
    @TenantId() tenantId: string,
    @Param('slug') slug: string,
    @Body() body: { sections: any[] },
  ) {
    let page = await this.pageRepo.findOne({ where: { slug, tenantId } });
    if (!page) {
      page = new Page();
      page.tenantId = tenantId;
      page.slug = slug;
      page.title = `${slug.toUpperCase()} Layout`;
    }

    page.sections = body.sections;
    const saved = await this.pageRepo.save(page);
    return { success: true, page: saved };
  }
}
