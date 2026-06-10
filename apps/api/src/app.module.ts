import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { ProjectsController } from './controllers/projects.controller';
import { BuildersController } from './controllers/builders.controller';
import { LeadsController } from './controllers/leads.controller';
import { InventoryController } from './controllers/inventory.controller';
import { PagesController } from './controllers/pages.controller';
import { FloorPlanController } from './controllers/floorplan.controller';
import { ThemesController } from './controllers/themes.controller';
import { MediaController } from './controllers/media.controller';
import { UsersController } from './controllers/users.controller';
import { NavigationController } from './controllers/navigation.controller';
import { ComponentsController } from './controllers/components.controller';
import { TwinsController } from './controllers/twins.controller';
import { SdkController } from './controllers/sdk.controller';
import { BillingController } from './controllers/billing.controller';
import { EnterpriseController } from './controllers/enterprise.controller';
import { HealthController } from './controllers/health.controller';

// Services
import { AuthService } from './services/auth.service';
import { ProjectsService } from './services/projects.service';
import { ThemesService } from './services/themes.service';
import { MediaService } from './services/media.service';
import { UsersService } from './services/users.service';
import { PagesService } from './services/pages.service';
import { NavigationService } from './services/navigation.service';
import { ComponentsService } from './services/components.service';
import { TwinsService } from './services/twins.service';
import { SdkService } from './services/sdk.service';
import { BillingService } from './services/billing.service';
import { EnterpriseService } from './services/enterprise.service';

// Entities
import { Builder } from './entities/builder.entity';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Tower } from './entities/tower.entity';
import { Floor } from './entities/floor.entity';
import { Flat } from './entities/flat.entity';
import { Lead } from './entities/lead.entity';
import { Page } from './entities/page.entity';
import { FloorPlan } from './entities/floorplan.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Theme } from './entities/theme.entity';
import { Media } from './entities/media.entity';
import { AuditLog } from './entities/audit-log.entity';
import { WebsiteSection } from './entities/website-section.entity';
import { Component } from './entities/component.entity';
import { NavigationMenu } from './entities/navigation-menu.entity';
import { NavigationItem } from './entities/navigation-item.entity';
import { AnimationPreset } from './entities/animation-preset.entity';
import { PageRevision } from './entities/page-revision.entity';
import { DigitalTwinModel } from './entities/digital-twin-model.entity';
import { CameraPoint } from './entities/camera-point.entity';
import { Hotspot } from './entities/hotspot.entity';
import { TourRoute } from './entities/tour-route.entity';
import { SdkKey } from './entities/sdk-key.entity';
import { EmbedConfig } from './entities/embed-config.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { SsoProvider } from './entities/sso-provider.entity';
import { Translation } from './entities/translation.entity';
import { Currency } from './entities/currency.entity';
import { GeneratedStructure } from './entities/generated-structure.entity';
import { StructuralAperture } from './entities/structural-aperture.entity';

// Interceptor
import { TenantInterceptor } from './interceptors/tenant.interceptor';
import { AuditInterceptor } from './interceptors/audit.interceptor';

// Services
import { AuditService } from './services/audit.service';

@Module({
  imports: [
    MulterModule.register({
      dest: process.env.UPLOAD_DIR || './apps/api/uploads',
    }),
    // Standard JWT configuration
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'aether-secret-token-key-99',
      signOptions: { expiresIn: '1h' },
    }),
    // PostgreSQL TypeORM Config
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://aether_db_user:aether_db_password_99@localhost:5432/realestate_saas?schema=public',
      entities: [
        Builder, User, Project, Tower, Floor, Flat, Lead, Page, FloorPlan, 
        Role, Permission, Theme, Media, AuditLog, WebsiteSection, Component, 
        NavigationMenu, NavigationItem, AnimationPreset, PageRevision, 
        DigitalTwinModel, CameraPoint, Hotspot, TourRoute, SdkKey, EmbedConfig, 
        AnalyticsEvent, Subscription, Invoice, SsoProvider, Translation, Currency,
        GeneratedStructure, StructuralAperture
      ],
      synchronize: true, // Automatically synchronize schema
    }),
    TypeOrmModule.forFeature([
      Builder, User, Project, Tower, Floor, Flat, Lead, Page, FloorPlan, 
      Role, Permission, Theme, Media, AuditLog, WebsiteSection, Component, 
      NavigationMenu, NavigationItem, AnimationPreset, PageRevision, 
      DigitalTwinModel, CameraPoint, Hotspot, TourRoute, SdkKey, EmbedConfig, 
      AnalyticsEvent, Subscription, Invoice, SsoProvider, Translation, Currency,
      GeneratedStructure, StructuralAperture
    ]),
  ],
  controllers: [
    AuthController,
    ProjectsController,
    BuildersController,
    LeadsController,
    InventoryController,
    PagesController,
    FloorPlanController,
    ThemesController,
    MediaController,
    UsersController,
    NavigationController,
    ComponentsController,
    TwinsController,
    SdkController,
    BillingController,
    EnterpriseController,
    HealthController,
  ],
  providers: [
    AuthService,
    ProjectsService,
    AuditService,
    ThemesService,
    MediaService,
    UsersService,
    PagesService,
    NavigationService,
    ComponentsService,
    TwinsService,
    SdkService,
    BillingService,
    EnterpriseService,
    // Dynamic global multi-tenant injector
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // Global audit logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
