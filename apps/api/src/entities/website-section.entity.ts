import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Page } from './page.entity';

@Entity('website_sections')
export class WebsiteSection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pageId!: string;

  @ManyToOne(() => Page, (page) => page.websiteSections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page!: Page;

  @Column({ type: 'varchar', length: 100 })
  type!: string; // hero, features, gallery, amenities, testimonials, cta, contact, video, virtual-tour

  @Column({ type: 'integer', default: 0 })
  orderNo!: number;

  @Column({ type: 'jsonb', default: '{}' })
  configJson!: any;
}
