import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Builder } from '../entities/builder.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { Lead } from '../entities/lead.entity';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('builders')
export class BuildersController {
  constructor(
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
    private readonly dataSource: DataSource,
  ) {}

  // Super Admin: List all builders
  @Get()
  async listAll() {
    return this.builderRepo.find({ order: { createdAt: 'DESC' } });
  }

  // Super Admin: Create new builder
  @Post()
  async create(@Body() body: { name: string; slug: string; themeSettings?: any }) {
    const builder = new Builder();
    builder.name = body.name;
    builder.slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-');
    builder.themeSettings = body.themeSettings || {
      logo: body.name.toUpperCase(),
      primaryColor: '#3b82f6',
      secondaryColor: '#1f2937',
      fontHeader: 'Outfit',
      fontBody: 'Inter',
    };
    builder.isActive = true;
    return this.builderRepo.save(builder);
  }

  // Public: Get theme settings by builder slug
  @Get('theme-by-slug/:slug')
  async getThemeBySlug(@Param('slug') slug: string) {
    const builder = await this.builderRepo.findOne({ where: { slug } });
    if (!builder) {
      return { success: false, message: `Builder slug ${slug} not found` };
    }
    return {
      id: builder.id,
      name: builder.name,
      slug: builder.slug,
      themeSettings: builder.themeSettings,
    };
  }

  // Builder Dashboard: Get current builder settings
  @Get('theme')
  async getTheme(@TenantId() tenantId: string) {
    const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
    if (!builder) {
      // Fallback systemic
      return {
        logo: 'AETHER PLATFORM',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e293b',
        fontHeader: 'Outfit',
        fontBody: 'Inter',
      };
    }
    return builder.themeSettings;
  }

  // Builder Dashboard: Save active theme branding HSL/Hex settings
  @Put('theme')
  async updateTheme(@TenantId() tenantId: string, @Body() body: any) {
    const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
    if (!builder) {
      return { success: false, message: 'Builder not found under this tenant context' };
    }
    builder.themeSettings = {
      ...builder.themeSettings,
      ...body,
    };
    const saved = await this.builderRepo.save(builder);
    return { success: true, themeSettings: saved.themeSettings };
  }

  // Super Admin: Get stats summary
  @Get('stats/summary')
  async getStats() {
    const totalBuilders = await this.builderRepo.count();
    const activeBuilders = await this.builderRepo.count({ where: { isActive: true } });
    
    const projectRepo = this.dataSource.getRepository(Project);
    const userRepo = this.dataSource.getRepository(User);
    const leadRepo = this.dataSource.getRepository(Lead);
    
    const projectsCount = await projectRepo.count();
    const usersCount = await userRepo.count();
    const leadsCount = await leadRepo.count();

    return {
      activeBuilders,
      totalBuilders,
      projectsCount,
      usersCount,
      leadsCount,
      monthlyMRR: activeBuilders > 0 ? activeBuilders * 420000 : 0,
      totalVisits: activeBuilders > 0 ? 42850 + (activeBuilders * 240) : 0,
      storageBytes: activeBuilders > 0 ? 214.6 * 1024 * 1024 * 1024 + (activeBuilders * 1024 * 1024) : 0,
    };
  }

  // Super Admin: Update builder details
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const builder = await this.builderRepo.findOne({ where: { id } });
    if (!builder) {
      return { success: false, message: 'Builder not found' };
    }
    if (body.name !== undefined) builder.name = body.name;
    if (body.slug !== undefined) builder.slug = body.slug;
    if (body.customDomain !== undefined) builder.customDomain = body.customDomain;
    if (body.isActive !== undefined) builder.isActive = body.isActive;
    if (body.themeSettings !== undefined) {
      builder.themeSettings = {
        ...builder.themeSettings,
        ...body.themeSettings,
      };
    }
    const saved = await this.builderRepo.save(builder);
    return { success: true, builder: saved };
  }

  // Super Admin: Delete builder
  @Delete(':id')
  async delete(@Param('id') id: string) {
    const builder = await this.builderRepo.findOne({ where: { id } });
    if (!builder) {
      return { success: false, message: 'Builder not found' };
    }
    await this.builderRepo.remove(builder);
    return { success: true };
  }
}
