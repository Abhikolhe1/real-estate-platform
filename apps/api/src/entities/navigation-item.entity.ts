import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NavigationMenu } from './navigation-menu.entity';

@Entity('navigation_items')
export class NavigationItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  menuId!: string;

  @ManyToOne(() => NavigationMenu, (menu) => menu.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu!: NavigationMenu;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'varchar', length: 255 })
  url!: string;

  @Column({ type: 'integer', default: 0 })
  orderNo!: number;
}
