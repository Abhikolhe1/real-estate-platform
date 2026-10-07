import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FloorPlan } from "../entities/floorplan.entity";
import { Project } from "../entities/project.entity";
import { TenantId } from "../interceptors/tenant.decorator";
import { JwtAuthGuard } from "../guards/auth.guard";
import { TwinAccessGuard } from "../guards/twin-access.guard";
import { CreateFloorPlanDto } from "../dtos/floorplan.dto";

/** Floorplan identity and ownership. CAD sources/revisions are handled by CanonicalTwinController. */
@Controller("floorplans")
@UseGuards(JwtAuthGuard, TwinAccessGuard)
export class FloorPlanController {
  constructor(
    @InjectRepository(FloorPlan)
    private readonly floorplans: Repository<FloorPlan>,
  ) {}
  @Get() list(
    @TenantId() tenantId: string,
    @Query("projectId") projectId?: string,
  ) {
    return this.floorplans.find({
      where: { tenantId, ...(projectId ? { projectId } : {}) },
      order: { createdAt: "DESC" },
    });
  }
  @Get(":id") async get(
    @TenantId() tenantId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const fp = await this.floorplans.findOneBy({ id, tenantId });
    if (!fp) throw new NotFoundException("Floorplan not found");
    return fp;
  }
  @Post() async create(
    @TenantId() tenantId: string,
    @Body() body: CreateFloorPlanDto,
  ) {
    if (
      !(await this.floorplans.manager.findOneBy(Project, {
        id: body.projectId,
        tenantId,
      }))
    )
      throw new NotFoundException("Project not found");
    const floorPlan = await this.floorplans.save(
      this.floorplans.create({
        tenantId,
        projectId: body.projectId,
        name: body.name.trim(),
        layoutData: null,
      }),
    );
    return { success: true, floorPlan };
  }
}
