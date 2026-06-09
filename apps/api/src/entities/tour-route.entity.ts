import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DigitalTwinModel } from './digital-twin-model.entity';

@Entity('tour_routes')
export class TourRoute {
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
  routeName!: string;

  @Column({ type: 'json', nullable: true })
  routeJson!: any; // Array of camera positions/targets in chronological order

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
