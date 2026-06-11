import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';
import { Builder } from './builder.entity';

@Entity('generated_building_structures')
export class GeneratedStructure {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Builder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  builder!: Builder;

  @Column({ type: 'jsonb' })
  structureJson!: Record<string, any>; // maps walls, floors, levels polylines

  @Column({ type: 'jsonb', nullable: true })
  materialsConfig?: Record<string, any>; // maps surface materials & textures

  @Column({ type: 'double precision', default: 1.0 })
  scaleMultiplier!: number;

  @Column({ type: 'uuid', nullable: true })
  floorplanId?: string;

  @Column({ type: 'integer', default: 0 })
  wallCount!: number;

  @Column({ type: 'integer', default: 0 })
  roomCount!: number;

  @Column({ type: 'varchar', length: 50, default: 'generated' })
  status!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
