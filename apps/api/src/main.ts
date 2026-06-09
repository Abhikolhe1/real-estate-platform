import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as morgan from 'morgan';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Ensure uploads directory exists
  const uploadsDir = 'c:/xampp/htdocs/real-estate-platform/shared-uploads';
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Ensure logs directory exists
  const logsDir = join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Winston Logger Configuration
  const loggerInstance = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
          })
        ),
      }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: loggerInstance }),
  });

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Morgan request logging middleware
  app.use(morgan('dev'));

  // Serve the uploads directory statically
  app.use('/uploads', express.static(uploadsDir));

  // Global DTO Validation Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Real Estate SaaS API')
    .setDescription('The foundation API for the Multi-Tenant Real Estate Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`[Standalone Backend API] Dynamic multi-tenant server successfully booted on port ${port}`);
}
bootstrap();

