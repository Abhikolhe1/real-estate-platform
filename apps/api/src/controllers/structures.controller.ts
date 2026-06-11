import { Controller, Get, Param, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneratedStructure } from '../entities/generated-structure.entity';
import { TenantId } from '../interceptors/tenant.decorator';

@Controller('structures')
export class StructuresController {
  constructor(
    @InjectRepository(GeneratedStructure)
    private readonly structureRepo: Repository<GeneratedStructure>,
  ) {}

  @Get(':id')
  async getStructure(@TenantId() tenantId: string, @Param('id') id: string) {
    const structure = await this.structureRepo.findOne({
      where: { id },
    });

    if (!structure) {
      throw new NotFoundException(`Structure with ID ${id} not found.`);
    }

    // Tenancy Check
    if (structure.tenantId !== tenantId) {
      throw new ForbiddenException('You do not have permission to access this structure.');
    }

    return structure.structureJson;
  }
}
