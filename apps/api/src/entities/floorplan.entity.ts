import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('floorplans')
export class FloorPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string; // Multi-tenant discriminator

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ type: 'integer', default: 0 })
  flatCount!: number;

  @Column({ type: 'integer', default: 0 })
  roomCount!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  priceEstimate!: number;

  @Column({ type: 'boolean', default: false })
  isPaid!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'PENDING_ANALYSIS' })
  status!: 'PENDING_ANALYSIS' | 'ANALYZED' | 'PAID' | 'GENERATED';

  @Column({ type: 'jsonb', nullable: true })
  layoutData!: any;
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
