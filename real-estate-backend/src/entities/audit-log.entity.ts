import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string; // Discriminator, can be null for platform-wide actions

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string; // e.g. "CREATE", "UPDATE", "DELETE"

  @Column({ type: 'varchar', length: 100 })
  module!: string; // e.g. "builders", "projects", "leads"

  @Column({ type: 'jsonb', nullable: true })
  oldValue?: any;

  @Column({ type: 'jsonb', nullable: true })
  newValue?: any;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
