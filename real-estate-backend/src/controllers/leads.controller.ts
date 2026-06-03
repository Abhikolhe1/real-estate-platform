import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../entities/lead.entity';
import { Builder } from '../entities/builder.entity';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('leads')
export class LeadsController {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
  ) {}

  // Builder Dashboard: Get all leads under active builder
  @Get()
  async getLeads(@TenantId() tenantId: string) {
    return this.leadRepo.find({
      where: { tenantId },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  // Public Web/Landing: Submit new booking tour request
  @Post()
  async createLead(
    @TenantId() headerTenantId: string,
    @Body() body: { name: string; email: string; phone: string; projectId?: string; builderSlug?: string },
  ) {
    let finalTenantId = headerTenantId;

    // Resolve tenant ID if builder slug is supplied
    if (body.builderSlug && (!finalTenantId || finalTenantId === '00000000-0000-0000-0000-000000000000')) {
      const builder = await this.builderRepo.findOne({ where: { slug: body.builderSlug } });
      if (builder) {
        finalTenantId = builder.id;
      }
    }

    const lead = new Lead();
    lead.tenantId = finalTenantId;
    lead.name = body.name;
    lead.email = body.email;
    lead.phone = body.phone;
    lead.projectId = body.projectId;
    lead.status = 'NEW';
    lead.notes = 'Form submitted from public landing portal.';

    const saved = await this.leadRepo.save(lead);
    return { success: true, lead: saved };
  }

  // Builder Dashboard: Update lead status
  @Put(':id')
  async updateLead(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { status: 'NEW' | 'CONTACTED' | 'WARM' | 'HOT' | 'CLOSED'; notes?: string },
  ) {
    const lead = await this.leadRepo.findOne({ where: { id, tenantId } });
    if (!lead) {
      return { success: false, message: 'Lead not found under this tenant context' };
    }
    if (body.status) lead.status = body.status;
    if (body.notes !== undefined) lead.notes = body.notes;

    const saved = await this.leadRepo.save(lead);
    return { success: true, lead: saved };
  }

  // Builder Dashboard: Delete lead
  @Delete(':id')
  async removeLead(@TenantId() tenantId: string, @Param('id') id: string) {
    const lead = await this.leadRepo.findOne({ where: { id, tenantId } });
    if (!lead) {
      return { success: false, message: 'Lead not found' };
    }
    await this.leadRepo.remove(lead);
    return { success: true };
  }
}
