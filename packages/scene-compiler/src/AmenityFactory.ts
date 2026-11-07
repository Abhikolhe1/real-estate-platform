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

    switch (type) {
      case 'swimming_pool':
        this.buildPool(group);
        break;
      case 'gym':
        this.buildGym(group);
        break;
      case 'clubhouse':
        this.buildClubhouse(group);
        break;
      case 'garden':
        this.buildGarden(group);
        break;
      case 'parking':
        this.buildParking(group);
        break;
      case 'kids_play_area':
        this.buildKidsArea(group);
        break;
      case 'jogging_track':
        this.buildJoggingTrack(group);
        break;
      case 'tennis_court':
        this.buildTennisCourt(group);
        break;
    }

    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return group;
  }

  private static material(color: number, roughness = 0.75) {
    return new THREE.MeshStandardMaterial({ color, roughness });
  }

  private static box(
    width: number,
    height: number,
    depth: number,
    color: number,
    x = 0,
    y = height / 2,
    z = 0,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.material(color));
    mesh.position.set(x, y, z);
    return mesh;
  }

  private static buildPool(group: THREE.Group) {
    group.add(this.box(13, 0.18, 8, 0xd8c6a3, 0, 0.09, 0));
    const water = this.box(11.5, 0.08, 6.5, 0x2f9ed8, 0, 0.2, 0);
    (water.material as THREE.MeshStandardMaterial).metalness = 0.15;
    group.add(water);
    for (const x of [-5.6, 5.6]) {
      for (const z of [-3.1, 3.1]) {
        const light = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 0.8, 12),
          this.material(0xf4d35e, 0.35),
        );
        light.position.set(x, 0.4, z);
        group.add(light);
      }
    }
  }

  private static buildGym(group: THREE.Group) {
    group.add(this.box(8, 0.15, 6, 0x5f6b73, 0, 0.075, 0));
    const shell = this.box(8, 3.2, 6, 0xb8c4cc, 0, 1.7, 0);
    const shellMaterial = shell.material as THREE.MeshStandardMaterial;
    shellMaterial.transparent = true;
    shellMaterial.opacity = 0.35;
    group.add(shell);
    for (const x of [-2.4, 0, 2.4]) {
      group.add(this.box(1.4, 0.25, 0.65, 0x252b31, x, 0.35, 0.8));
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.6, 10),
        this.material(0x111827),
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(x, 0.8, -1);
      group.add(bar);
    }
  }

  private static buildClubhouse(group: THREE.Group) {
    group.add(this.box(10, 3.5, 8, 0xd6c2a5, 0, 1.75, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 2.2, 4), this.material(0x7c3f2c));
    roof.position.y = 4.6;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    group.add(this.box(1.5, 2.4, 0.2, 0x3b2f2f, 0, 1.2, 4.05));
  }

  private static buildGarden(group: THREE.Group) {
    group.add(this.box(12, 0.12, 10, 0x5f8f4e, 0, 0.06, 0));
    const positions = [
      [-4.5, -3.2], [-1.8, 2.8], [2.2, -2.5], [4.6, 2.6], [0, 0],
    ];
    positions.forEach(([x, z], index) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.7, 10),
        this.material(0x795548),
      );
      trunk.position.set(x, 0.9, z);
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.9 + (index % 2) * 0.2, 16, 12),
        this.material(0x2f6f3e),
      );
      canopy.position.set(x, 2.1, z);
      group.add(trunk, canopy);
    });
  }

  private static buildParking(group: THREE.Group) {
    group.add(this.box(14, 0.1, 10, 0x555b61, 0, 0.05, 0));
    for (let x = -5.6; x <= 5.6; x += 2.8) {
      group.add(this.box(0.06, 0.03, 4, 0xf7f3df, x, 0.12, 0));
    }
    [-4.2, 1.4, 4.2].forEach((x, index) => {
      group.add(this.box(2.1, 0.65, 3.6, [0x4472ca, 0xb33939, 0xd4a72c][index], x, 0.42, 0));
    });
  }

  private static buildKidsArea(group: THREE.Group) {
    group.add(this.box(8, 0.12, 7, 0xe8cfa8, 0, 0.06, 0));
    group.add(this.box(1.2, 1.8, 1.2, 0xef476f, -2, 0.9, 0));
    const slide = this.box(1.1, 0.15, 3.2, 0xffd166, -2, 1.1, -1.8);
    slide.rotation.x = -0.45;
    group.add(slide);
    for (const x of [1.2, 3]) {
      const frame = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8),
        this.material(0x118ab2),
      );
      frame.position.set(x, 1.25, 0);
      group.add(frame);
    }
    group.add(this.box(2, 0.12, 0.5, 0x06d6a0, 2.1, 1.1, 0));
  }

  private static buildJoggingTrack(group: THREE.Group) {
    const points = Array.from({ length: 24 }, (_, index) => {
      const angle = (index / 24) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * 7, 0.12, Math.sin(angle) * 4);
    });
    const curve = new THREE.CatmullRomCurve3(points, true);
    const track = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 96, 0.35, 8, true),
      this.material(0xb85c38),
    );
    group.add(track);
    group.add(this.box(12, 0.08, 6, 0x739b5b, 0, 0.04, 0));
  }

  private static buildTennisCourt(group: THREE.Group) {
    group.add(this.box(14, 0.12, 8, 0x3d8b5f, 0, 0.06, 0));
    group.add(this.box(0.06, 0.03, 7.4, 0xffffff, -6.6, 0.14, 0));
    group.add(this.box(0.06, 0.03, 7.4, 0xffffff, 6.6, 0.14, 0));
    group.add(this.box(13.2, 0.03, 0.06, 0xffffff, 0, 0.14, -3.6));
    group.add(this.box(13.2, 0.03, 0.06, 0xffffff, 0, 0.14, 3.6));
    group.add(this.box(0.08, 1.05, 8, 0x263238, 0, 0.55, 0));
  }
}
