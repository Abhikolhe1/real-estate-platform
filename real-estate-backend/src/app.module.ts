import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { ProjectsController } from './controllers/projects.controller';

// Services
import { AuthService } from './services/auth.service';
import { ProjectsService } from './services/projects.service';

// Entities
import { Builder } from './entities/builder.entity';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';

// Interceptor
import { TenantInterceptor } from './interceptors/tenant.interceptor';

@Module({
  imports: [
    // Standard JWT configuration
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'aether-secret-token-key-99',
      signOptions: { expiresIn: '1h' },
    }),
    // Mock TypeORM Config (Uses environment URL)
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://aether_db_user:aether_db_password_99@localhost:5432/realestate_saas?schema=public',
      entities: [Builder, User, Project],
      synchronize: false, // Maintain schema DDL migrations manually
    }),
  ],
  controllers: [
    AuthController,
    ProjectsController,
  ],
  providers: [
    AuthService,
    ProjectsService,
    // Dynamic global multi-tenant injector
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
