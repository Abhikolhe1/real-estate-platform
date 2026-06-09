import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async getTeamMembers(tenantId: string) {
    return this.userRepo.find({
      where: { tenantId },
      relations: ['roles'],
      order: { createdAt: 'DESC' },
    });
  }

  async addTeamMember(tenantId: string, data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: 'BUILDER_ADMIN' | 'BUILDER_STAFF' | 'SALES_USER';
  }) {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const dbRole = await this.roleRepo.findOne({ where: { name: data.role } });
    if (!dbRole) {
      throw new NotFoundException(`Role ${data.role} does not exist in system`);
    }

    const user = new User();
    user.tenantId = tenantId;
    user.email = data.email;
    user.firstName = data.firstName;
    user.lastName = data.lastName;
    user.role = data.role;
    user.passwordHash = bcrypt.hashSync(data.password || 'password', 10);
    user.roles = [dbRole];
    user.isActive = true;

    const saved = await this.userRepo.save(user);
    // return without password hash
    const { passwordHash, ...rest } = saved;
    return rest;
  }

  async toggleActive(tenantId: string, userId: string, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isActive = isActive;
    const saved = await this.userRepo.save(user);
    const { passwordHash, ...rest } = saved;
    return rest;
  }

  async deleteTeamMember(tenantId: string, userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepo.remove(user);
    return { success: true };
  }
}
