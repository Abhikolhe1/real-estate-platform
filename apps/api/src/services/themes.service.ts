import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from '../entities/theme.entity';
import { Builder } from '../entities/builder.entity';

@Injectable()
export class ThemesService {
  constructor(
    @InjectRepository(Theme)
    private readonly themeRepo: Repository<Theme>,
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
  ) {}

  async getThemes(tenantId: string) {
    let themes = await this.themeRepo.find({ where: { tenantId } });
    if (themes.length === 0) {
      // Create a default theme for the tenant
      const defaultTheme = new Theme();
      defaultTheme.tenantId = tenantId;
      defaultTheme.name = 'Default Gold Theme';
      defaultTheme.primaryColor = '#d4af37';
      defaultTheme.secondaryColor = '#131313';
      defaultTheme.fontHeader = 'Bodoni Moda';
      defaultTheme.fontBody = 'Hanken Grotesk';
      defaultTheme.buttonStyle = 'square';
      defaultTheme.cardStyle = 'glass';
      defaultTheme.logoText = 'AETHELGARD';
      defaultTheme.logoUrl = '';
      defaultTheme.headerStyle = 'sticky';
      defaultTheme.headerSocials = { whatsapp: '', phone: '', email: '' };
      defaultTheme.footerCopyright = '© 2026. All Rights Reserved.';
      defaultTheme.footerTagline = 'Bespoke Architectural landmarks';
      defaultTheme.footerAddress = '121 Baker Street, London, UK';
      defaultTheme.footerSocials = { facebook: '', instagram: '', linkedin: '', youtube: '' };
      const saved = await this.themeRepo.save(defaultTheme);
      themes = [saved];
    }
    return themes;
  }

  async createTheme(tenantId: string, themeData: Partial<Theme>) {
    const theme = new Theme();
    Object.assign(theme, themeData);
    theme.tenantId = tenantId;
    return this.themeRepo.save(theme);
  }

  async updateTheme(tenantId: string, id: string, themeData: Partial<Theme>) {
    const theme = await this.themeRepo.findOne({ where: { id, tenantId } });
    if (!theme) {
      throw new NotFoundException(`Theme with ID ${id} not found for this tenant`);
    }
    Object.assign(theme, themeData);
    const saved = await this.themeRepo.save(theme);

    // If this theme is currently active (matching builder themeSettings), sync changes automatically
    const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
    if (builder && builder.themeSettings && builder.themeSettings.logo === theme.logoText) {
      builder.themeSettings = {
        logo: saved.logoText,
        logoUrl: saved.logoUrl,
        primaryColor: saved.primaryColor,
        secondaryColor: saved.secondaryColor,
        fontHeader: saved.fontHeader,
        fontBody: saved.fontBody,
        buttonStyle: saved.buttonStyle,
        cardStyle: saved.cardStyle,
        headerStyle: saved.headerStyle,
        headerSocials: saved.headerSocials,
        footerCopyright: saved.footerCopyright,
        footerTagline: saved.footerTagline,
        footerAddress: saved.footerAddress,
        footerSocials: saved.footerSocials,
      };
      await this.builderRepo.save(builder);
    }

    return saved;
  }

  async activateTheme(tenantId: string, id: string) {
    const theme = await this.themeRepo.findOne({ where: { id, tenantId } });
    if (!theme) {
      throw new NotFoundException(`Theme with ID ${id} not found for this tenant`);
    }

    const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
    if (!builder) {
      throw new NotFoundException(`Builder with ID ${tenantId} not found`);
    }

    builder.themeSettings = {
      logo: theme.logoText,
      logoUrl: theme.logoUrl,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      fontHeader: theme.fontHeader,
      fontBody: theme.fontBody,
      buttonStyle: theme.buttonStyle,
      cardStyle: theme.cardStyle,
      headerStyle: theme.headerStyle,
      headerSocials: theme.headerSocials,
      footerCopyright: theme.footerCopyright,
      footerTagline: theme.footerTagline,
      footerAddress: theme.footerAddress,
      footerSocials: theme.footerSocials,
    };

    await this.builderRepo.save(builder);
    return theme;
  }
}
