import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('analytics_events')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', length: 100 })
  eventName!: string; // e.g. viewer_opened, floor_selected, flat_selected, hotspot_clicked, lead_generated

  @Column({ type: 'json', nullable: true })
  eventData!: any; // Stores session UUID, floor index, flat number, browser metadata etc.

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
