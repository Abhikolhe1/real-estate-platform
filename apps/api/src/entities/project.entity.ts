import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Builder } from './builder.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string; // Multi-tenant discriminator

  @ManyToOne(() => Builder, (builder) => builder.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  builder!: Builder;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'varchar', length: 50, default: 'PLANNING' })
  status!: 'PLANNING' | 'UNDER_CONSTRUCTION' | 'READY' | 'SOLD_OUT';

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
