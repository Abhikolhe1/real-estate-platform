import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NavigationItem } from './navigation-item.entity';

@Entity('navigation_menus')
export class NavigationMenu {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string; // Multi-tenant isolation

  @Column({ type: 'varchar', length: 100 })
  name!: string; // Header, Footer, Mobile, etc.

  @OneToMany(() => NavigationItem, (item) => item.menu, { cascade: true })
  items!: NavigationItem[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
