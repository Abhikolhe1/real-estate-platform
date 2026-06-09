import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DigitalTwinModel } from './digital-twin-model.entity';

@Entity('camera_points')
export class CameraPoint {
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

  @Column({ type: 'float', default: 0 })
  posX!: number;

  @Column({ type: 'float', default: 0 })
  posY!: number;

  @Column({ type: 'float', default: 0 })
  posZ!: number;

  @Column({ type: 'float', default: 0 })
  targetX!: number;

  @Column({ type: 'float', default: 0 })
  targetY!: number;

  @Column({ type: 'float', default: 0 })
  targetZ!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
