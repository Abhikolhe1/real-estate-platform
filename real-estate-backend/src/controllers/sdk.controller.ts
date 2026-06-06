import { Controller, Get, Post, Delete, Body, Param, Query, UnauthorizedException } from '@nestjs/common';
import { SdkService } from '../services/sdk.service';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('sdk')
export class SdkController {
  constructor(private readonly sdkService: SdkService) {}

  // API SDK Keys Management (Tenant Authorized)
  @Get('keys')
  async findAllKeys(@TenantId() tenantId: string) {
    return this.sdkService.findAllKeys(tenantId);
  }

  @Post('keys')
  async createKey(@TenantId() tenantId: string, @Body() body: { keyName: string }) {
    return this.sdkService.createKey(tenantId, body.keyName);
  }

  @Delete('keys/:id')
  async revokeKey(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sdkService.revokeKey(tenantId, id);
  }

  // Embed Configurations Management (Tenant Authorized)
  @Get('embeds')
  async findAllEmbeds(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    return this.sdkService.findAllEmbeds(tenantId, projectId);
  }

  @Post('embeds')
  async createEmbed(@TenantId() tenantId: string, @Body() body: any) {
    return this.sdkService.createEmbed(tenantId, body);
  }

  @Delete('embeds/:id')
  async deleteEmbed(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sdkService.deleteEmbed(tenantId, id);
  }

  // Public Analytics Ingestion (API Key Validated)
  @Post('analytics')
  async logEvent(
    @Body() body: { projectId: string; eventName: string; eventData: any; sdkKey?: string },
    @Query('sdkKey') querySdkKey?: string,
  ) {
    const key = body.sdkKey || querySdkKey;
    if (!key) {
      throw new UnauthorizedException('Missing SDK API validation key (sdkKey).');
    }
    
    // Validate key and resolve tenantId context
    const resolvedTenantId = await this.sdkService.validateKey(key);
    
    return this.sdkService.logEvent(
      resolvedTenantId,
      body.projectId,
      body.eventName,
      body.eventData,
    );
  }

  // Retrieve Analytics report (Tenant Authorized)
  @Get('analytics/summary')
  async getSummary(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    return this.sdkService.getSummary(tenantId, projectId);
  }

  // Public Embed Configuration Resolution (API Key Validated)
  @Get('embeds/resolve')
  async resolveEmbed(
    @Query('apiKey') apiKey: string,
    @Query('projectId') projectId: string,
  ) {
    if (!apiKey || !projectId) {
      throw new UnauthorizedException('Missing apiKey or projectId parameters.');
    }
    return this.sdkService.resolveEmbed(apiKey, projectId);
  }
}
