import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  BaseRevisionDto,
  CorrectionsDto,
  ReprocessDto,
} from "../dtos/canonical-twin.dto";
import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { JwtAuthGuard } from "../guards/auth.guard";
import { TwinAccessGuard, TwinAdminGuard } from "../guards/twin-access.guard";
import {
  CanonicalTwinService,
  TwinScope,
} from "../services/canonical-twin.service";
import { TwinReconstructionJob } from "../entities/canonical-twin.entity";

function scope(
  req: Request,
  params: { projectId: string; floorplanId: string },
): TwinScope {
  return {
    tenantId: (req as any).authorizedTenantId,
    projectId: params.projectId,
    floorplanId: params.floorplanId,
  };
}

@Controller("canonical/projects/:projectId/floorplans/:floorplanId")
@UseGuards(JwtAuthGuard, TwinAccessGuard)
export class CanonicalTwinController {
  constructor(private readonly service: CanonicalTwinService) {}
  @Get() status(@Req() req: Request, @Param() p: any) {
    return this.service.status(scope(req, p));
  }
  @Get("revisions/:id") revision(@Req() req: Request, @Param() p: any) {
    return this.service.revision(scope(req, p), p.id);
  }
  @Get("approved") approved(@Req() req: Request, @Param() p: any) {
    return this.service.approved(scope(req, p));
  }
  @Get("sources/:id") async source(
    @Req() req: Request,
    @Param() p: any,
    @Res() res: Response,
  ) {
    const asset = await this.service.source(scope(req, p), p.id);
    res
      .set({
        "Content-Type": "application/dxf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(asset.bytes);
  }
  @Post("source")
  @UseInterceptors(
    FileInterceptor("plan", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 },
      fileFilter: (_req, file, cb) =>
        cb(
          /\.dxf$/i.test(file.originalname)
            ? null
            : new BadRequestException("Only DXF is supported"),
          /\.dxf$/i.test(file.originalname),
        ),
    }),
  )
  upload(
    @Req() req: Request,
    @Param() p: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.upload(scope(req, p), (req as any).user.sub, file);
  }
  @Post("reprocess") reprocess(
    @Req() req: Request,
    @Param() p: any,
    @Body() body: ReprocessDto,
  ) {
    return this.service.reprocess(
      scope(req, p),
      (req as any).user.sub,
      body.baseRevisionId,
      body.config,
    );
  }
  @Post("corrections") corrections(
    @Req() req: Request,
    @Param() p: any,
    @Body() body: CorrectionsDto,
  ) {
    return this.service.corrections(
      scope(req, p),
      (req as any).user.sub,
      body.baseRevisionId,
      body.commands,
    );
  }
  @Post("validate") validate(
    @Req() req: Request,
    @Param() p: any,
    @Body() body: BaseRevisionDto,
  ) {
    return this.service.validate(scope(req, p), body.baseRevisionId);
  }
  @Post("approve") approve(
    @Req() req: Request,
    @Param() p: any,
    @Body() body: BaseRevisionDto,
  ) {
    return this.service.approve(
      scope(req, p),
      (req as any).user.sub,
      body.baseRevisionId,
    );
  }
  @Post("jobs/:id/cancel") cancel(@Req() req: Request, @Param() p: any) {
    return this.service.cancel(scope(req, p), p.id);
  }
}

@Controller("canonical-admin")
@UseGuards(JwtAuthGuard, TwinAdminGuard)
export class CanonicalAdminController {
  constructor(private readonly db: DataSource) {}
  @Get("status") async status() {
    return this.db
      .getRepository(TwinReconstructionJob)
      .createQueryBuilder("j")
      .leftJoin(
        "floorplans",
        "f",
        "f.id=j.floorplanId AND f.tenantId=j.tenantId AND f.projectId=j.projectId",
      )
      .select([
        'j.id AS "jobId"',
        'j.tenantId AS "tenantId"',
        'j.projectId AS "projectId"',
        'j.floorplanId AS "floorplanId"',
        "j.stage AS stage",
        "j.failure AS failure",
        'j.issueCounts AS "issueCounts"',
        'j.createdAt AS "createdAt"',
        'j.resultRevisionId AS "resultRevisionId"',
        'f.approvedCanonicalRevisionId AS "approvedRevisionId"',
      ])
      .orderBy("j.createdAt", "DESC")
      .limit(100)
      .getRawMany();
  }
}
