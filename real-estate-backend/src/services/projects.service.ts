import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async findAll(tenantId: string): Promise<Project[]> {
    return this.projectRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id, tenantId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found under your account`);
    }
    return project;
  }

  async create(tenantId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const project = new Project();
    project.tenantId = tenantId;
    project.name = createProjectDto.name;
    project.slug = createProjectDto.slug || createProjectDto.name.toLowerCase().replace(/\s+/g, '-');
    project.description = createProjectDto.description;
    project.location = createProjectDto.location;
    project.status = createProjectDto.status || 'PLANNING';

    return this.projectRepo.save(project);
  }

  async update(tenantId: string, id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(tenantId, id);
    
    if (updateProjectDto.name) {
      project.name = updateProjectDto.name;
      if (!updateProjectDto.slug) {
        project.slug = updateProjectDto.name.toLowerCase().replace(/\s+/g, '-');
      }
    }
    if (updateProjectDto.slug) project.slug = updateProjectDto.slug;
    if (updateProjectDto.description) project.description = updateProjectDto.description;
    if (updateProjectDto.location) project.location = updateProjectDto.location;
    if (updateProjectDto.status) project.status = updateProjectDto.status;

    return this.projectRepo.save(project);
  }

  async remove(tenantId: string, id: string): Promise<{ success: boolean }> {
    const project = await this.findOne(tenantId, id);
    await this.projectRepo.remove(project);
    return { success: true };
  }
}
