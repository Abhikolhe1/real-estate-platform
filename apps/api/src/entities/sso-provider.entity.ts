import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Builder } from './builder.entity';

@Entity('sso_providers')
export class SsoProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Builder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  builder!: Builder;

  @Column({ type: 'varchar', length: 50 })
  providerType!: string; // google, saml, okta

  @Column({ type: 'jsonb', default: '{}' })
  configJson!: Record<string, any>; // client id, client secret, entrypoints, etc.

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
