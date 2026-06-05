import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTeamMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty({ enum: ['BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER'] })
  @IsEnum(['BUILDER_ADMIN', 'BUILDER_STAFF', 'SALES_USER'])
  role!: 'BUILDER_ADMIN' | 'BUILDER_STAFF' | 'SALES_USER';
}

export class ToggleActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
