import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { AddTeamMemberDto, ToggleActiveDto } from '../dtos/user.dto';
import { TenantId } from '../interceptors/tenant.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Get('team')
  async getTeamMembers(@TenantId() tenantId: string) {
    return this.usersService.getTeamMembers(tenantId);
  }

  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Post('team')
  async addTeamMember(
    @TenantId() tenantId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto,
  ) {
    return this.usersService.addTeamMember(tenantId, addTeamMemberDto);
  }

  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Put('team/:id/toggle')
  async toggleActive(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() toggleActiveDto: ToggleActiveDto,
  ) {
    return this.usersService.toggleActive(tenantId, id, toggleActiveDto.isActive);
  }

  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN')
  @Delete('team/:id')
  async deleteTeamMember(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteTeamMember(tenantId, id);
  }
}
