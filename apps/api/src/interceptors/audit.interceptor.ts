import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../services/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, tenantId } = request;

    // Only audit write operations (mutations)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      let action = 'CREATE';
      if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
      if (method === 'DELETE') action = 'DELETE';

      // Parse module name from URL (e.g. /projects/123 -> projects)
      const pathParts = url.split('?')[0].split('/').filter(Boolean);
      const moduleName = pathParts[0] || 'general';

      return next.handle().pipe(
        tap((response) => {
          const userId = user?.sub || user?.id;
          const resolvedTenantId = tenantId || user?.tenantId;

          // Prevent auditing the auth endpoints logs (could expose passwords)
          if (moduleName === 'auth') {
            return;
          }

          this.auditService.logAction({
            tenantId: resolvedTenantId === '00000000-0000-0000-0000-000000000000' ? undefined : resolvedTenantId,
            userId,
            action,
            module: moduleName,
            oldValue: method === 'DELETE' ? null : { ...body, password: undefined },
            newValue: response ? { ...response, passwordHash: undefined } : null,
          }).catch(err => {
            console.error('Failed to log audit action:', err);
          });
        }),
      );
    }

    return next.handle();
  }
}
