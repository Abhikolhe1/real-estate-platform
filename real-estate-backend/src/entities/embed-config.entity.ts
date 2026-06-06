import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('embed_configs')
export class EmbedConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'varchar', length: 255 })
  embedName!: string;

  @Column({ type: 'varchar', length: 50, default: 'building' })
  viewerMode!: 'building' | 'walkthrough';

  @Column({ type: 'json', nullable: true })
  theme!: any; // Stores colors, loader styling etc.

  @Column({ type: 'varchar', length: 50, default: '100%' })
  width!: string;

  @Column({ type: 'varchar', length: 50, default: '650px' })
  height!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
