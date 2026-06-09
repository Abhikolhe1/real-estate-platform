import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EnterpriseService } from '../services/enterprise.service';
import { TenantId } from '../interceptors/tenant.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Enterprise')
@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly entService: EnterpriseService) {}

  // SSO Settings
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Get('sso')
  async getSsoSettings(@TenantId() tenantId: string) {
    return this.entService.getSsoSettings(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post('sso')
  async saveSsoSettings(
    @TenantId() tenantId: string,
    @Body() body: { providerType: string; configJson: any },
  ) {
    return this.entService.saveSsoSettings(tenantId, body.providerType, body.configJson);
  }

  // Translation Dictionaries
  @Get('translations')
  async getTranslations(
    @TenantId() tenantId: string,
    @Query('langCode') langCode: string,
  ) {
    return this.entService.getTranslations(tenantId, langCode || 'en');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Post('translations')
  async saveTranslation(
    @TenantId() tenantId: string,
    @Body() body: { langCode: string; translationKey: string; translationValue: string },
  ) {
    return this.entService.saveTranslation(
      tenantId,
      body.langCode,
      body.translationKey,
      body.translationValue,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Delete('translations/:id')
  async deleteTranslation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.entService.deleteTranslation(tenantId, id);
  }

  // Currencies conversions
  @Get('currencies')
  async getCurrencies() {
    return this.entService.getCurrencies();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('currencies')
  async saveCurrency(
    @Body() body: { currencyCode: string; symbol: string; rateToINR: number },
  ) {
    return this.entService.saveCurrency(body.currencyCode, body.symbol, body.rateToINR);
  }
}
