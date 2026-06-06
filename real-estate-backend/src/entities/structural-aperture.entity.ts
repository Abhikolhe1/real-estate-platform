import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('structural_apertures')
export class StructuralAperture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'integer' })
  floorNumber!: number;

  @Column({ type: 'varchar', length: 50 })
  flatNumber!: string;

  @Column({ type: 'varchar', length: 50 })
  apertureType!: string; // 'window', 'door', 'balcony_railing'

  @Column({ type: 'double precision' })
  posX!: number;

  @Column({ type: 'double precision' })
  posY!: number;

  @Column({ type: 'double precision' })
  posZ!: number;

  @Column({ type: 'double precision' })
  width!: number;

  @Column({ type: 'double precision' })
  height!: number;

  @Column({ type: 'double precision', default: 0.0 })
  rotation!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
