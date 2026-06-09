import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Builder } from './builder.entity';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string; // Multi-tenant isolation

  @ManyToOne(() => Builder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  builder!: Builder;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ type: 'varchar', length: 100 })
  fileType!: string;

  @Column({ type: 'integer' })
  fileSize!: number;

  @Column({ type: 'text' })
  url!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
