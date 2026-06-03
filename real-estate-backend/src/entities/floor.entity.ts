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

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Flat, (flat) => flat.floor)
  flats!: Flat[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
