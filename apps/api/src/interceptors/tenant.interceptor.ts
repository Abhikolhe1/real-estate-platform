import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Resolve Tenant ID from headers or subdomains
    let tenantId = request.headers['x-tenant-id'] || request.headers['x-builder-id'];

    if (!tenantId) {
      const host = request.headers.host || '';
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'admin') {
        tenantId = parts[0]; // Subdomain fallback slug
      }
    }

    const path = request.url;
    const isPublicSuperAdminPath = path.startsWith('/builders') && request.method === 'POST';
    const isAuth = path.startsWith('/auth');

    if (!tenantId && !isPublicSuperAdminPath && !isAuth) {
      tenantId = '00000000-0000-0000-0000-000000000000'; // Default systemic fallback
    }

    request['tenantId'] = tenantId;
    return next.handle();
  }
}
