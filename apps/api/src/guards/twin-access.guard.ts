import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { Project } from "../entities/project.entity";
import { FloorPlan } from "../entities/floorplan.entity";

/** JWT verifies identity; active server-side membership establishes tenant authority. */
@Injectable()
export class TwinAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user =
      req.user?.sub &&
      (await this.users.findOne({ where: { id: req.user.sub } }));
    if (
      !user?.isActive ||
      !user.tenantId ||
      user.tenantId !== req.user.tenantId
    ) {
      throw new ForbiddenException("Active tenant membership required");
    }
    const routedTenant =
      req.headers["x-tenant-id"] || req.headers["x-builder-id"];
    if (routedTenant && routedTenant !== user.tenantId)
      throw new ForbiddenException("Tenant context does not match identity");
    if (
      req.method !== "GET" &&
      !["BUILDER_ADMIN", "BUILDER_STAFF"].includes(user.role)
    ) {
      throw new ForbiddenException("Builder review access required");
    }
    req.authorizedTenantId = user.tenantId;
    req.tenantId = user.tenantId;
    // Guards run before Multer, so no upload is buffered for an unauthorized resource.
    if (req.params?.projectId && req.params?.floorplanId) {
      const { projectId, floorplanId } = req.params;
      if (
        !/^[0-9a-f-]{36}$/i.test(projectId) ||
        !/^[0-9a-f-]{36}$/i.test(floorplanId) ||
        !(await this.users.manager.findOneBy(Project, {
          id: projectId,
          tenantId: user.tenantId,
        })) ||
        !(await this.users.manager.findOneBy(FloorPlan, {
          id: floorplanId,
          projectId,
          tenantId: user.tenantId,
        }))
      ) {
        throw new ForbiddenException("Project/floorplan access denied");
      }
    }
    return true;
  }
}

@Injectable()
export class TwinAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user =
      req.user?.sub && (await this.users.findOneBy({ id: req.user.sub }));
    if (!user?.isActive || user.role !== "SUPER_ADMIN")
      throw new ForbiddenException("Administrator required");
    return true;
  }
}
