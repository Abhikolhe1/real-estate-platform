import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';

interface ProjectMock {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  location?: string;
  status: 'PLANNING' | 'UNDER_CONSTRUCTION' | 'READY' | 'SOLD_OUT';
  createdAt: Date;
}

@Injectable()
export class ProjectsService {
  private projects: ProjectMock[] = [
    {
      id: 'project-uuid-1',
      tenantId: '00000000-0000-0000-0000-000000000000',
      name: 'Grand Central Plaza',
      slug: 'grand-central-plaza',
      description: 'Dynamic commercial & retail premium tower',
      location: 'New York, NY',
      status: 'UNDER_CONSTRUCTION',
      createdAt: new Date(),
    },
    {
      id: 'project-uuid-2',
      tenantId: 'builder-tenant-uuid-abc',
      name: 'Marina Luxury Estates',
      slug: 'marina-luxury-estates',
      description: 'Vibrant seafront residential apartments',
      location: 'Miami, FL',
      status: 'PLANNING',
      createdAt: new Date(),
    },
  ];

  async findAll(tenantId: string): Promise<ProjectMock[]> {
    return this.projects.filter((p) => p.tenantId === tenantId);
  }

  async findOne(tenantId: string, id: string): Promise<ProjectMock> {
    const project = this.projects.find((p) => p.id === id && p.tenantId === tenantId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found under your tenant account`);
    }
    return project;
  }

  async create(tenantId: string, createProjectDto: CreateProjectDto): Promise<ProjectMock> {
    const newProject: ProjectMock = {
      id: `project-uuid-${Date.now()}`,
      tenantId,
      name: createProjectDto.name,
      slug: createProjectDto.slug,
      description: createProjectDto.description,
      location: createProjectDto.location,
      status: createProjectDto.status || 'PLANNING',
      createdAt: new Date(),
    };
    this.projects.push(newProject);
    return newProject;
  }

  async update(tenantId: string, id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectMock> {
    const project = await this.findOne(tenantId, id);
    if (updateProjectDto.name) project.name = updateProjectDto.name;
    if (updateProjectDto.slug) project.slug = updateProjectDto.slug;
    if (updateProjectDto.description) project.description = updateProjectDto.description;
    if (updateProjectDto.location) project.location = updateProjectDto.location;
    if (updateProjectDto.status) project.status = updateProjectDto.status;
    return project;
  }

  async remove(tenantId: string, id: string): Promise<{ success: boolean }> {
    const index = this.projects.findIndex((p) => p.id === id && p.tenantId === tenantId);
    if (index === -1) {
      throw new NotFoundException(`Project with ID ${id} not found under your tenant account`);
    }
    this.projects.splice(index, 1);
    return { success: true };
  }
}
