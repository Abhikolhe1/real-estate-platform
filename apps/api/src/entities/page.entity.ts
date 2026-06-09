import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { WebsiteSection } from './website-section.entity';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'jsonb', default: '[]' })
  sections!: any[]; // Deprecated, kept for fallback compatibility

  @Column({ type: 'varchar', length: 50, default: 'published' })
  status!: string; // draft, published

  @Column({ type: 'varchar', length: 255, nullable: true })
  seoTitle?: string;

  @Column({ type: 'text', nullable: true })
  seoDescription?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => WebsiteSection, (section) => section.page, { cascade: true })
  websiteSections!: WebsiteSection[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}

