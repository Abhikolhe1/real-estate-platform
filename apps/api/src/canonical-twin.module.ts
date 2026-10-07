import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CanonicalTwinController,
  CanonicalAdminController,
} from "./controllers/canonical-twin.controller";
import { CanonicalTwinService } from "./services/canonical-twin.service";
import { TwinAccessGuard, TwinAdminGuard } from "./guards/twin-access.guard";
import {
  TwinSourceAsset,
  TwinRevision,
  TwinReconstructionJob,
} from "./entities/canonical-twin.entity";
import { User } from "./entities/user.entity";
import { Project } from "./entities/project.entity";
import { FloorPlan } from "./entities/floorplan.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TwinSourceAsset,
      TwinRevision,
      TwinReconstructionJob,
      User,
      Project,
      FloorPlan,
    ]),
  ],
  controllers: [CanonicalTwinController, CanonicalAdminController],
  providers: [CanonicalTwinService, TwinAccessGuard, TwinAdminGuard],
  exports: [CanonicalTwinService, TwinAccessGuard, TwinAdminGuard],
})
export class CanonicalTwinModule {}
