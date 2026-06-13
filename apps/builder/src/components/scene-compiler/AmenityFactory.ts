import * as THREE from 'three';

export type AmenityType =
  | 'swimming_pool'
  | 'gym'
  | 'clubhouse'
  | 'garden'
  | 'parking'
  | 'kids_play_area'
  | 'jogging_track'
  | 'tennis_court';

export interface AmenityFootprint {
  width: number;
  depth: number;
}

export class AmenityFactory {
  static readonly footprints: Record<AmenityType, AmenityFootprint> = {
    swimming_pool: { width: 12, depth: 7 },
    gym: { width: 8, depth: 6 },
    clubhouse: { width: 10, depth: 8 },
    garden: { width: 12, depth: 10 },
    parking: { width: 14, depth: 10 },
    kids_play_area: { width: 8, depth: 7 },
    jogging_track: { width: 16, depth: 10 },
    tennis_court: { width: 14, depth: 8 },
  };

  static create(type: AmenityType): THREE.Group {
    const group = new THREE.Group();
    group.name = `amenity_${type}`;
    group.userData = { type: 'amenity', amenityType: type, footprint: this.footprints[type] };

    const footprint = this.footprints[type];
    const baseColors: Record<AmenityType, number> = {
      swimming_pool: 0x2f9ed8,
      gym: 0x5f6b73,
      clubhouse: 0xd6c2a5,
      garden: 0x5f8f4e,
      parking: 0x555b61,
      kids_play_area: 0xef476f,
      jogging_track: 0xb85c38,
      tennis_court: 0x3d8b5f,
    };
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width, 0.15, footprint.depth),
      new THREE.MeshStandardMaterial({ color: baseColors[type], roughness: 0.75 }),
    );
    base.position.y = 0.075;
    base.receiveShadow = true;
    group.add(base);

    if (type === 'garden') {
      [[-3, -2], [0, 2], [3, -1]].forEach(([x, z]) => {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.22, 1.5, 10),
          new THREE.MeshStandardMaterial({ color: 0x795548 }),
        );
        trunk.position.set(x, 0.8, z);
        const canopy = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x2f6f3e }),
        );
        canopy.position.set(x, 1.9, z);
        group.add(trunk, canopy);
      });
    } else if (type === 'clubhouse' || type === 'gym') {
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(footprint.width * 0.8, 3, footprint.depth * 0.75),
        new THREE.MeshStandardMaterial({ color: type === 'gym' ? 0xb8c4cc : 0xd6c2a5 }),
      );
      building.position.y = 1.6;
      group.add(building);
    } else if (type === 'parking') {
      for (let x = -footprint.width / 2 + 1.4; x < footprint.width / 2; x += 2.8) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.03, footprint.depth * 0.8),
          new THREE.MeshBasicMaterial({ color: 0xffffff }),
        );
        line.position.set(x, 0.18, 0);
        group.add(line);
      }
    } else if (type === 'jogging_track') {
      const points = Array.from({ length: 20 }, (_, index) => {
        const angle = (index / 20) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 7, 0.2, Math.sin(angle) * 4);
      });
      const curve = new THREE.CatmullRomCurve3(points, true);
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(curve, 80, 0.3, 8, true),
        new THREE.MeshStandardMaterial({ color: 0xe8aa7c }),
      ));
    }

    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return group;
  }
}
