import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string; // e.g. "create_builder", "manage_projects"

  @Column({ type: 'varchar', length: 100 })
  module!: string; // e.g. "builders", "projects"

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
