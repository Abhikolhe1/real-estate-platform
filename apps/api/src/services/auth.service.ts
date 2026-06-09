import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { Builder } from '../entities/builder.entity';
import { Role } from '../entities/role.entity';
import { LoginDto, RegisterDto, RegisterBuilderDto } from '../dtos/auth.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(tenantId: string, loginDto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: loginDto.email },
      relations: ['builder'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // SCRAM/Bcrypt validation
    const isPasswordValid = bcrypt.compareSync(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been suspended');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || '00000000-0000-0000-0000-000000000000',
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      ...this.generateTokens(payload),
    };
  }

  async register(tenantId: string, registerDto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: registerDto.email } });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const newUser = new User();
    newUser.email = registerDto.email;
    newUser.passwordHash = bcrypt.hashSync(registerDto.password, 10);
    newUser.firstName = registerDto.firstName;
    newUser.lastName = registerDto.lastName;
    newUser.role = 'BUILDER_STAFF';
    newUser.tenantId = tenantId === '00000000-0000-0000-0000-000000000000' ? undefined : tenantId;

    const savedUser = await this.userRepo.save(newUser);

    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      tenantId: savedUser.tenantId || '00000000-0000-0000-0000-000000000000',
    };

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        tenantId: savedUser.tenantId,
      },
      ...this.generateTokens(payload),
    };
  }

  async registerBuilder(dto: RegisterBuilderDto) {
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const builderRepo = this.userRepo.manager.getRepository(Builder);
    const existingBuilder = await builderRepo.findOne({ where: { slug: dto.companySlug } });
    if (existingBuilder) {
      throw new BadRequestException('Company website slug is already taken');
    }

    const builder = new Builder();
    builder.name = dto.companyName;
    builder.slug = dto.companySlug;
    builder.email = dto.email;
    builder.status = 'ACTIVE';
    builder.themeSettings = {
      logo: dto.companyName.toUpperCase().substring(0, 10),
      primaryColor: '#d4af37',
      secondaryColor: '#131313',
      fontHeader: 'Outfit',
      fontBody: 'Inter',
    };
    builder.isActive = true;
    const savedBuilder = await builderRepo.save(builder);

    const roleRepo = this.userRepo.manager.getRepository(Role);
    let builderAdminRole = await roleRepo.findOne({ where: { name: 'BUILDER_ADMIN' } });
    if (!builderAdminRole) {
      builderAdminRole = new Role();
      builderAdminRole.name = 'BUILDER_ADMIN';
      await roleRepo.save(builderAdminRole);
    }

    const newUser = new User();
    newUser.email = dto.email;
    newUser.passwordHash = bcrypt.hashSync(dto.password, 10);
    newUser.firstName = dto.firstName;
    newUser.lastName = dto.lastName;
    newUser.role = 'BUILDER_ADMIN';
    newUser.tenantId = savedBuilder.id;
    newUser.builder = savedBuilder;
    newUser.roles = [builderAdminRole];
    newUser.isActive = true;

    const savedUser = await this.userRepo.save(newUser);

    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      tenantId: savedUser.tenantId || '00000000-0000-0000-0000-000000000000',
    };

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        tenantId: savedUser.tenantId,
      },
      ...this.generateTokens(payload),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid or inactive user session');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || '00000000-0000-0000-0000-000000000000',
      };
      return this.generateTokens(newPayload);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(payload: any) {
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return {
      accessToken,
      refreshToken,
      expiresIn: 25200, // 7 hours in seconds
    };
  }
}
