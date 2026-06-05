import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateThemeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fontHeader?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fontBody?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  buttonStyle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cardStyle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoText?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  headerStyle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  headerSocials?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  footerCopyright?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  footerTagline?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  footerAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  footerSocials?: any;
}

export class UpdateThemeDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fontHeader?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fontBody?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  buttonStyle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cardStyle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoText?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  headerStyle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  headerSocials?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  footerCopyright?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  footerTagline?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  footerAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  footerSocials?: any;
}
