import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { ProjectsController } from './controllers/projects.controller';
import { BuildersController } from './controllers/builders.controller';
import { LeadsController } from './controllers/leads.controller';
import { InventoryController } from './controllers/inventory.controller';
import { PagesController } from './controllers/pages.controller';
import { FloorPlanController } from './controllers/floorplan.controller';
import { UsersController } from './controllers/users.controller';

// Services
import { AuthService } from './services/auth.service';
import { ProjectsService } from './services/projects.service';
import { UsersService } from './services/users.service';

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
import { AuditLog } from './entities/audit-log.entity';

// Interceptor
import { TenantInterceptor } from './interceptors/tenant.interceptor';
import { AuditInterceptor } from './interceptors/audit.interceptor';

// Services
import { AuditService } from './services/audit.service';

@Module({
  imports: [
    // Standard JWT configuration
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'aether-secret-token-key-99',
      signOptions: { expiresIn: '1h' },
    }),
    // PostgreSQL TypeORM Config
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://aether_db_user:aether_db_password_99@localhost:5432/realestate_saas?schema=public',
      entities: [Builder, User, Project, Tower, Floor, Flat, Lead, Page, FloorPlan, Role, Permission, AuditLog],
      synchronize: true, // Automatically synchronize schema
    }),
    TypeOrmModule.forFeature([Builder, User, Project, Tower, Floor, Flat, Lead, Page, FloorPlan, Role, Permission, AuditLog]),
  ],
  controllers: [
    AuthController,
    ProjectsController,
    BuildersController,
    LeadsController,
    InventoryController,
    PagesController,
    FloorPlanController,
    UsersController,
  ],
  providers: [
    AuthService,
    ProjectsService,
    AuditService,
    UsersService,
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
