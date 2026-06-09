import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('animation_presets')
export class AnimationPreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string; // e.g. Smooth Fade Up

  @Column({ type: 'varchar', length: 50 })
  type!: string; // fade-up, fade-down, fade-left, fade-right, scale, zoom, rotate, parallax

  @Column({ type: 'float', default: 1.0 })
  duration!: number;

  @Column({ type: 'float', default: 0.0 })
  delay!: number;

  @Column({ type: 'varchar', length: 50, default: 'power2.out' })
  easing!: string;
}
