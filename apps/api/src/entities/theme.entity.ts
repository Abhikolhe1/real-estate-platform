import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Builder } from './builder.entity';

@Entity('themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string; // Multi-tenant isolation

  @ManyToOne(() => Builder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  builder!: Builder;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50, default: '#d4af37' })
  primaryColor!: string;

  @Column({ type: 'varchar', length: 50, default: '#131313' })
  secondaryColor!: string;

  @Column({ type: 'varchar', length: 100, default: 'Outfit' })
  fontHeader!: string;

  @Column({ type: 'varchar', length: 100, default: 'Inter' })
  fontBody!: string;

  @Column({ type: 'varchar', length: 50, default: 'rounded' })
  buttonStyle!: string; // rounded, square, pill

  @Column({ type: 'varchar', length: 50, default: 'glass' })
  cardStyle!: string; // glass, flat, shadow

  @Column({ type: 'varchar', length: 100, default: 'AETHELGARD' })
  logoText!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logoUrl?: string;

  @Column({ type: 'varchar', length: 50, default: 'sticky' })
  headerStyle!: string; // sticky, floating, transparent

  @Column({ type: 'jsonb', default: '{}' })
  headerSocials!: any; // { whatsapp, phone, email }

  @Column({ type: 'varchar', length: 255, default: '© 2026. All Rights Reserved.' })
  footerCopyright!: string;

  @Column({ type: 'varchar', length: 255, default: 'Bespoke Architectural landmarks' })
  footerTagline!: string;

  @Column({ type: 'text', nullable: true })
  footerAddress?: string;

  @Column({ type: 'jsonb', default: '{}' })
  footerSocials!: any; // { facebook, instagram, linkedin, youtube }

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
