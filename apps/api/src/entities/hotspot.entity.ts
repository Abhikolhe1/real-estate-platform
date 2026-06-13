import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DigitalTwinModel } from './digital-twin-model.entity';

@Entity('hotspots')
export class Hotspot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  modelId!: string;

  @ManyToOne(() => DigitalTwinModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modelId' })
  model!: DigitalTwinModel;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, default: 'info' })
  type!: 'info' | 'pricing' | 'video' | 'brochure' | 'cta' | 'amenity';

  @Column({ type: 'float', default: 0 })
  posX!: number;

  @Column({ type: 'float', default: 0 })
  posY!: number;

  @Column({ type: 'float', default: 0 })
  posZ!: number;

  @Column({ type: 'json', nullable: true })
  contentJson!: any;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
