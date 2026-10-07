import { InventoryService } from "./services/inventory.service";
import { CanonicalTwinModule } from "./canonical-twin.module";
import { databaseEntities } from "./database/entities";
import { databaseOptions } from "./database/options";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MulterModule } from "@nestjs/platform-express";

// Controllers
import { AuthController } from "./controllers/auth.controller";
import { ProjectsController } from "./controllers/projects.controller";
import { BuildersController } from "./controllers/builders.controller";
import { LeadsController } from "./controllers/leads.controller";
import { InventoryController } from "./controllers/inventory.controller";
import { PagesController } from "./controllers/pages.controller";
import { FloorPlanController } from "./controllers/floorplan.controller";
import { FloorPlanDemoController } from "./controllers/demo/floorplan-demo.controller";
import { LegacyDemoGuard } from "./guards/legacy-demo.guard";
import { ThemesController } from "./controllers/themes.controller";
import { MediaController } from "./controllers/media.controller";
import { UsersController } from "./controllers/users.controller";
import { NavigationController } from "./controllers/navigation.controller";
import { ComponentsController } from "./controllers/components.controller";
import { TwinsController } from "./controllers/twins.controller";
import { SdkController } from "./controllers/sdk.controller";
import { BillingController } from "./controllers/billing.controller";
import { EnterpriseController } from "./controllers/enterprise.controller";
import { HealthController } from "./controllers/health.controller";
import { StructuresController } from "./controllers/structures.controller";

// Services
import { AuthService } from "./services/auth.service";
import { ProjectsService } from "./services/projects.service";
import { ThemesService } from "./services/themes.service";
import { MediaService } from "./services/media.service";
import { UsersService } from "./services/users.service";
import { PagesService } from "./services/pages.service";
import { NavigationService } from "./services/navigation.service";
import { ComponentsService } from "./services/components.service";
import { TwinsService } from "./services/twins.service";
import { SdkService } from "./services/sdk.service";
import { BillingService } from "./services/billing.service";
import { EnterpriseService } from "./services/enterprise.service";

// Entities

// Interceptor
import { TenantInterceptor } from "./interceptors/tenant.interceptor";
import { AuditInterceptor } from "./interceptors/audit.interceptor";

// Services
import { AuditService } from "./services/audit.service";

@Module({
  imports: [
    CanonicalTwinModule,
    MulterModule.register({
      dest: process.env.UPLOAD_DIR || "./apps/api/uploads",
    }),
    // Standard JWT configuration
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1h" },
    }),
    // PostgreSQL TypeORM Config
    TypeOrmModule.forRoot(databaseOptions),
    TypeOrmModule.forFeature(databaseEntities),
  ],
  controllers: [
    FloorPlanDemoController,
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
    StructuresController,
  ],
  providers: [
    InventoryService,
    LegacyDemoGuard,
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
