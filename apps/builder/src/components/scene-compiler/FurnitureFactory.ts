import * as THREE from 'three';

export class FurnitureFactory {
  static create(type: string, colorHex: string = '#8a8a8a'): THREE.Group {
    const group = new THREE.Group();
    group.name = `furniture_${type}_${Math.random().toString(36).substring(2, 9)}`;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.6,
      metalness: 0.1,
    });

    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.8,
    });

    const fabricMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.9,
    });

    const pillowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
    });

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.7,
      metalness: 0.05,
    });

    const whitePorcelainMaterial = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.1,
      metalness: 0.1,
    });

    const mirrorChromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.05,
      metalness: 1.0,
    });

    switch (type.toLowerCase()) {
      case 'bed': {
        const mattressGeo = new THREE.BoxGeometry(1.6, 0.4, 2.0);
        const mattress = new THREE.Mesh(mattressGeo, fabricMaterial);
        mattress.position.y = 0.2;
        mattress.castShadow = true;
        mattress.receiveShadow = true;
        group.add(mattress);

        const headboardGeo = new THREE.BoxGeometry(1.6, 1.0, 0.15);
        const headboard = new THREE.Mesh(headboardGeo, woodMaterial);
        headboard.position.set(0, 0.5, -1.0);
        headboard.castShadow = true;
        headboard.receiveShadow = true;
        group.add(headboard);

        const pillowGeo = new THREE.BoxGeometry(0.6, 0.12, 0.4);
        const pillowL = new THREE.Mesh(pillowGeo, pillowMaterial);
        pillowL.position.set(-0.4, 0.45, -0.7);
        pillowL.castShadow = true;
        group.add(pillowL);

        const pillowR = pillowL.clone();
        pillowR.position.x = 0.4;
        group.add(pillowR);
        break;
      }

      case 'sofa': {
        const seatGeo = new THREE.BoxGeometry(1.8, 0.35, 0.85);
        const seat = new THREE.Mesh(seatGeo, fabricMaterial);
        seat.position.y = 0.175;
        seat.castShadow = true;
        seat.receiveShadow = true;
        group.add(seat);

        const backrestGeo = new THREE.BoxGeometry(1.8, 0.7, 0.25);
        const backrest = new THREE.Mesh(backrestGeo, fabricMaterial);
        backrest.position.set(0, 0.45, -0.3);
        backrest.castShadow = true;
        group.add(backrest);

        const armrestGeo = new THREE.BoxGeometry(0.2, 0.55, 0.85);
        const armrestL = new THREE.Mesh(armrestGeo, fabricMaterial);
        armrestL.position.set(-0.9, 0.275, 0);
        armrestL.castShadow = true;
        group.add(armrestL);

        const armrestR = armrestL.clone();
        armrestR.position.x = 0.9;
        group.add(armrestR);
        break;
      }

      case 'table': {
        const topGeo = new THREE.BoxGeometry(1.4, 0.05, 0.8);
        const top = new THREE.Mesh(topGeo, woodMaterial);
        top.position.y = 0.725;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        const legGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.7, 8);
        const legPositions = [
          [-0.6, -0.3],
          [0.6, -0.3],
          [-0.6, 0.3],
          [0.6, 0.3]
        ];
        legPositions.forEach(([x, z]) => {
          const leg = new THREE.Mesh(legGeo, darkMetalMaterial);
          leg.position.set(x, 0.35, z);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case 'wardrobe': {
        const wardrobeGeo = new THREE.BoxGeometry(1.2, 2.2, 0.6);
        const wardrobe = new THREE.Mesh(wardrobeGeo, woodMaterial);
        wardrobe.position.y = 1.1;
        wardrobe.castShadow = true;
        wardrobe.receiveShadow = true;
        group.add(wardrobe);

        const handleGeo = new THREE.BoxGeometry(0.02, 0.6, 0.02);
        const handleL = new THREE.Mesh(handleGeo, darkMetalMaterial);
        handleL.position.set(-0.05, 1.1, 0.31);
        group.add(handleL);

        const handleR = handleL.clone();
        handleR.position.x = 0.05;
        group.add(handleR);
        break;
      }

      case 'toilet': {
        const bowlGeo = new THREE.BoxGeometry(0.4, 0.42, 0.65);
        const bowl = new THREE.Mesh(bowlGeo, whitePorcelainMaterial);
        bowl.position.set(0, 0.21, 0);
        bowl.castShadow = true;
        bowl.receiveShadow = true;
        group.add(bowl);

        const tankGeo = new THREE.BoxGeometry(0.45, 0.45, 0.22);
        const tank = new THREE.Mesh(tankGeo, whitePorcelainMaterial);
        tank.position.set(0, 0.645, -0.215);
        tank.castShadow = true;
        group.add(tank);
        break;
      }

      case 'sink': {
        const cabinetGeo = new THREE.BoxGeometry(0.7, 0.8, 0.5);
        const cabinet = new THREE.Mesh(cabinetGeo, woodMaterial);
        cabinet.position.y = 0.4;
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;
        group.add(cabinet);

        const basinGeo = new THREE.BoxGeometry(0.72, 0.06, 0.52);
        const basin = new THREE.Mesh(basinGeo, whitePorcelainMaterial);
        basin.position.y = 0.83;
        basin.castShadow = true;
        basin.receiveShadow = true;
        group.add(basin);

        const faucetGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
        const faucet = new THREE.Mesh(faucetGeo, mirrorChromeMaterial);
        faucet.position.set(0, 0.935, -0.18);
        group.add(faucet);
        break;
      }

      case 'counter': {
        const counterGeo = new THREE.BoxGeometry(2.4, 0.9, 0.6);
        const counter = new THREE.Mesh(counterGeo, darkMetalMaterial);
        counter.position.y = 0.45;
        counter.castShadow = true;
        counter.receiveShadow = true;
        group.add(counter);

        const topGeo = new THREE.BoxGeometry(2.42, 0.04, 0.62);
        const slabMaterial = new THREE.MeshStandardMaterial({
          color: 0xfafafa,
          roughness: 0.1,
          metalness: 0.1,
        });
        const top = new THREE.Mesh(topGeo, slabMaterial);
        top.position.y = 0.92;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);
        break;
      }

      default: {
        const genericGeo = new THREE.BoxGeometry(0.8, 0.75, 0.8);
        const generic = new THREE.Mesh(genericGeo, material);
        generic.position.y = 0.375;
        generic.castShadow = true;
        generic.receiveShadow = true;
        group.add(generic);
        break;
      }
    }

    return group;
  }
}
