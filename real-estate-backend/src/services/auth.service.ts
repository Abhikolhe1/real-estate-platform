import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto } from '../dtos/auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(tenantId: string, loginDto: LoginDto) {
    if (loginDto.email === 'admin@platform.com') {
      const payload = {
        sub: 'super-admin-uuid-1',
        email: loginDto.email,
        role: 'SUPER_ADMIN',
        tenantId: '00000000-0000-0000-0000-000000000000',
      };
      return this.generateTokens(payload);
    }

    if (loginDto.email.endsWith('@builder.com')) {
      const payload = {
        sub: 'builder-admin-uuid-2',
        email: loginDto.email,
        role: 'BUILDER_ADMIN',
        tenantId: tenantId,
      };
      return this.generateTokens(payload);
    }

    const payload = {
      sub: 'builder-staff-uuid-3',
      email: loginDto.email,
      role: 'BUILDER_STAFF',
      tenantId: tenantId,
    };
    return this.generateTokens(payload);
  }

  async register(tenantId: string, registerDto: RegisterDto) {
    const payload = {
      sub: 'new-user-uuid',
      email: registerDto.email,
      role: 'BUILDER_STAFF',
      tenantId: tenantId,
    };
    return {
      user: {
        id: payload.sub,
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        tenantId: tenantId,
      },
      ...this.generateTokens(payload),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
      };
      return this.generateTokens(newPayload);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(payload: any) {
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
