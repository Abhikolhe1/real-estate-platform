import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Builder } from './builder.entity';
import { Subscription } from './subscription.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Builder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  builder!: Builder;

  @Column({ type: 'uuid' })
  subscriptionId!: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription!: Subscription;

  @Column({ type: 'varchar', length: 100, unique: true })
  invoiceNumber!: string;

  @Column({ type: 'integer' })
  amount!: number; // stored in base currency (INR)

  @Column({ type: 'varchar', length: 50, default: 'PAID' })
  status!: string; // PAID, OVERDUE, CANCELLED

  @Column({ type: 'timestamp with time zone', nullable: true })
  paymentDate?: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
