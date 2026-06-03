import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Floor } from './floor.entity';

@Entity('flats')
export class Flat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  floorId!: string;

  @ManyToOne(() => Floor, (floor) => floor.flats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'floorId' })
  floor!: Floor;

  @Column({ type: 'varchar', length: 100 })
  flatNumber!: string;

  @Column({ type: 'varchar', length: 50, default: 'AVAILABLE' })
  status!: 'AVAILABLE' | 'BOOKED' | 'HOLD';

  @Column({ type: 'integer' })
  sizeSqFt!: number;

  @Column({ type: 'bigint' })
  price!: number;

  @Column({ type: 'varchar', length: 50, default: '2BHK' })
  type!: '1BHK' | '2BHK' | '3BHK' | 'PENTHOUSE';

  @Column({ type: 'varchar', length: 100, nullable: true })
  orientation?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
