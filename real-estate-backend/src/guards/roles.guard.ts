import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { ROLES_KEY, PERMISSIONS_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;

    if (!userPayload) {
      throw new ForbiddenException('User payload not found in request');
    }

    // Load user roles and permissions from database
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userPayload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('User not found or inactive');
    }

    // Super Admin overrides everything
    const userRoleNames = user.roles.map(r => r.name);
    if (userRoleNames.includes('SUPER_ADMIN') || user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check Roles
    if (requiredRoles) {
      const hasRole = requiredRoles.some(role => userRoleNames.includes(role) || user.role === role);
      if (!hasRole) {
        throw new ForbiddenException('Insufficient role level');
      }
    }

    // Check Permissions
    if (requiredPermissions) {
      const userPermissions = user.roles.reduce<string[]>((acc, role) => {
        const rolePerms = role.permissions.map(p => p.name);
        return [...acc, ...rolePerms];
      }, []);

      const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));
      if (!hasPermission) {
        throw new ForbiddenException('Missing required permissions');
      }
    }

    return true;
  }
}
