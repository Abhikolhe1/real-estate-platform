import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }
}
