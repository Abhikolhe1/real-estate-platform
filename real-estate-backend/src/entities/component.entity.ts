import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('components')
export class Component {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string; // Multi-tenant isolation

  @Column({ type: 'varchar', length: 100 })
  componentType!: string; // text, button, card, image, video, form, carousel, counter, testimonial

  @Column({ type: 'jsonb', default: '{}' })
  configJson!: any;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
