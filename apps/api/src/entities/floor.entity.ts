import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tower } from './tower.entity';
import { Flat } from './flat.entity';

@Entity('floors')
export class Floor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  towerId!: string;

  @ManyToOne(() => Tower, (tower) => tower.floors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'towerId' })
  tower!: Tower;

  @Column({ type: 'integer' })
  floorNumber!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 3.0 })
  floorHeight!: number;

  @Column({ type: 'uuid', nullable: true })
  floorplanId?: string;

  @ManyToOne('FloorPlan', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'floorplanId' })
  floorplan?: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  flatType?: string;

  @Column({ type: 'integer', nullable: true })
  unitsPerFloor?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Flat, (flat) => flat.floor)
  flats!: Flat[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
