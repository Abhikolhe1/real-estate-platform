import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";
export class CreateFloorPlanDto {
  @IsUUID() projectId!: string;
  @IsString() @MinLength(1) @MaxLength(255) name!: string;
}
