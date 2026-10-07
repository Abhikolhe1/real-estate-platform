import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsUUID,
} from "class-validator";
import type { Correction } from "@aether/twin-schema";
export class BaseRevisionDto {
  @IsUUID() baseRevisionId!: string;
}
export class CorrectionsDto extends BaseRevisionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  commands!: Correction[];
}
export class ReprocessDto extends BaseRevisionDto {
  @IsObject() config!: Record<string, unknown>;
}
