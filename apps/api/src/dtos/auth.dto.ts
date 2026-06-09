import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password!: string;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must contain at least 6 characters' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

export class RegisterBuilderDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  companyName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Company slug is required' })
  companySlug!: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must contain at least 6 characters' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;
}

