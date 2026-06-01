import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

@Entity('builders')
export class Builder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  customDomain?: string;

  @Column({ type: 'jsonb', default: '{}' })
  themeSettings!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => User, (user) => user.builder)
  users!: User[];

  @OneToMany(() => Project, (project) => project.builder)
  projects!: Project[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
