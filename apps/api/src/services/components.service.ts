import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Component } from '../entities/component.entity';
import { AnimationPreset } from '../entities/animation-preset.entity';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(AnimationPreset)
    private readonly presetRepo: Repository<AnimationPreset>,
  ) {}

  // List all custom components for a builder tenant
  async getComponents(tenantId: string): Promise<Component[]> {
    return this.componentRepo.find({ where: { tenantId } });
  }

  // Create component
  async createComponent(tenantId: string, body: { componentType: string; configJson?: any }): Promise<Component> {
    const comp = new Component();
    comp.tenantId = tenantId;
    comp.componentType = body.componentType;
    comp.configJson = body.configJson || {};
    return this.componentRepo.save(comp);
  }

  // Update component
  async updateComponent(tenantId: string, id: string, body: { configJson: any }): Promise<Component> {
    const comp = await this.componentRepo.findOne({ where: { id, tenantId } });
    if (!comp) {
      throw new NotFoundException(`Component with ID ${id} not found`);
    }
    comp.configJson = {
      ...comp.configJson,
      ...body.configJson,
    };
    return this.componentRepo.save(comp);
  }

  // Delete component
  async deleteComponent(tenantId: string, id: string): Promise<boolean> {
    const comp = await this.componentRepo.findOne({ where: { id, tenantId } });
    if (!comp) {
      throw new NotFoundException(`Component with ID ${id} not found`);
    }
    await this.componentRepo.remove(comp);
    return true;
  }

  // Get animation presets (Public endpoint)
  async getAnimationPresets(): Promise<AnimationPreset[]> {
    return this.presetRepo.find();
  }
}
