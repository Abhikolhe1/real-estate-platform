import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Builder } from './builder.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Builder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  builder!: Builder;

  @Column({ type: 'varchar', length: 50 })
  planId!: string; // Starter, Professional, Enterprise

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status!: string; // ACTIVE, SUSPENDED, EXPIRED, CANCELLED

  @Column({ type: 'timestamp with time zone', nullable: true })
  cycleStart?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cycleEnd?: Date;

  @Column({ type: 'varchar', length: 50, default: 'monthly' })
  billingCycle!: string; // monthly, yearly

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
