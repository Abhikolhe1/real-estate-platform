import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  status?: 'PLANNING' | 'UNDER_CONSTRUCTION' | 'READY' | 'SOLD_OUT';
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  status?: 'PLANNING' | 'UNDER_CONSTRUCTION' | 'READY' | 'SOLD_OUT';
}
