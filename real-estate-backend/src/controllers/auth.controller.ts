import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dtos/auth.dto';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @TenantId() tenantId: string,
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.login(tenantId, loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @TenantId() tenantId: string,
    @Body() registerDto: RegisterDto,
  ) {
    return this.authService.register(tenantId, registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true, message: 'Session terminated' };
  }
}
