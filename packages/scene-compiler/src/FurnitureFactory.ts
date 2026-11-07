import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shared High-Fidelity Material Palette for 60 FPS Performance
// ---------------------------------------------------------------------------
class MaterialLibrary {
  private static instance: MaterialLibrary;

  public fabricUpholstery: THREE.MeshStandardMaterial;
  public velvetAccent: THREE.MeshStandardMaterial;
  public leatherDark: THREE.MeshStandardMaterial;
  public oakWood: THREE.MeshStandardMaterial;
  public darkWalnut: THREE.MeshStandardMaterial;
  public flutedWood: THREE.MeshStandardMaterial;
  public quartzWhite: THREE.MeshStandardMaterial;
  public blackGranite: THREE.MeshStandardMaterial;
  public mirrorChrome: THREE.MeshStandardMaterial;
  public brushedNickel: THREE.MeshStandardMaterial;
  public darkMetal: THREE.MeshStandardMaterial;
  public brassGold: THREE.MeshStandardMaterial;
  public porcelainWhite: THREE.MeshStandardMaterial;
  public glassClear: THREE.MeshPhysicalMaterial;
  public glassSmoked: THREE.MeshPhysicalMaterial;
  public tvScreen: THREE.MeshStandardMaterial;
  public lampGlow: THREE.MeshStandardMaterial;
  public plantGreen: THREE.MeshStandardMaterial;
  public rugFabric: THREE.MeshStandardMaterial;

  private constructor() {
    this.fabricUpholstery = new THREE.MeshStandardMaterial({
      color: 0x334155, // Elegant slate charcoal
      roughness: 0.85,
      metalness: 0.05,
    });

    this.velvetAccent = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Warm ochre accent for throw pillows
      roughness: 0.9,
      metalness: 0.0,
    });

    this.leatherDark = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.1,
    });

    this.oakWood = new THREE.MeshStandardMaterial({
      color: 0xb4824d, // Natural warm oak
      roughness: 0.65,
      metalness: 0.05,
    });

    this.darkWalnut = new THREE.MeshStandardMaterial({
      color: 0x3e2723, // Deep rich walnut
      roughness: 0.6,
      metalness: 0.05,
    });

    this.flutedWood = new THREE.MeshStandardMaterial({
      color: 0x2d1f14,
      roughness: 0.7,
      metalness: 0.05,
    });

    this.quartzWhite = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.05,
    });

    this.blackGranite = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.3,
      metalness: 0.1,
    });

    this.mirrorChrome = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.08,
      metalness: 0.95,
    });

    this.brushedNickel = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      roughness: 0.35,
      metalness: 0.8,
    });

    this.darkMetal = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.45,
      metalness: 0.85,
    });

    this.brassGold = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.9,
    });

    this.porcelainWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.05,
    });

    this.glassClear = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.5,
    });

    this.glassSmoked = new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.2,
    });

    this.tvScreen = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.15,
      metalness: 0.8,
      emissive: new THREE.Color(0x0a1020),
      emissiveIntensity: 0.4,
    });

    this.lampGlow = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: new THREE.Color(0xfde047),
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    this.plantGreen = new THREE.MeshStandardMaterial({
      color: 0x22543d,
      roughness: 0.8,
      metalness: 0.0,
    });

    this.rugFabric = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  public static get(): MaterialLibrary {
    if (!MaterialLibrary.instance) {
      MaterialLibrary.instance = new MaterialLibrary();
      Object.values(MaterialLibrary.instance).forEach(material => {
        if (material instanceof THREE.Material) material.userData.shared = true;
      });
    }
    return MaterialLibrary.instance;
  }
}

export class FurnitureFactory {
  static create(type: string, colorHex?: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `furniture_${type}_${Math.random().toString(36).substring(2, 7)}`;
    const mats = MaterialLibrary.get();

    const customFabric = colorHex ? new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.85,
      metalness: 0.05,
    }) : mats.fabricUpholstery;

    const normType = type.toLowerCase().replace(/[-_\s]/g, '');

    switch (normType) {
      // ---------------------------------------------------------------------
      // 1. PLUSH MODERN SECTIONAL SOFA WITH CUSHIONS & THROW PILLOWS
      // ---------------------------------------------------------------------
      case 'sofa':
      case 'couch': {
        // Base wooden plinth
        const baseGeo = new THREE.BoxGeometry(2.4, 0.12, 0.95);
        const base = new THREE.Mesh(baseGeo, mats.darkWalnut);
        base.position.y = 0.06;
        base.castShadow = true;
        group.add(base);

        // 4 Slender Angled Legs
        const legGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.18, 8);
        [[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, mats.brassGold);
          leg.position.set(lx, 0.09, lz);
          leg.castShadow = true;
          group.add(leg);
        });

        // 3 Contoured Deep Seat Cushions
        const cushionGeo = new THREE.BoxGeometry(0.74, 0.26, 0.78);
        [-0.76, 0, 0.76].forEach((cx) => {
          const cushion = new THREE.Mesh(cushionGeo, customFabric);
          cushion.position.set(cx, 0.25, 0.04);
          cushion.castShadow = true;
          cushion.receiveShadow = true;
          group.add(cushion);
        });

        // Backrest Frame
        const backFrameGeo = new THREE.BoxGeometry(2.4, 0.65, 0.2);
        const backFrame = new THREE.Mesh(backFrameGeo, customFabric);
        backFrame.position.set(0, 0.52, -0.38);
        backFrame.castShadow = true;
        group.add(backFrame);

        // 3 Backrest Pillows (angled slightly forward)
        const backPillowGeo = new THREE.BoxGeometry(0.72, 0.42, 0.16);
        [-0.76, 0, 0.76].forEach((bx) => {
          const bp = new THREE.Mesh(backPillowGeo, customFabric);
          bp.position.set(bx, 0.56, -0.26);
          bp.rotation.x = 0.1;
          bp.castShadow = true;
          group.add(bp);
        });

        // Left & Right Armrests
        const armGeo = new THREE.BoxGeometry(0.22, 0.45, 0.94);
        [-1.19, 1.19].forEach((ax) => {
          const arm = new THREE.Mesh(armGeo, customFabric);
          arm.position.set(ax, 0.42, 0);
          arm.castShadow = true;
          group.add(arm);
        });

        // 2 Accent Throw Pillows (Ochre/Gold velvet)
        const throwGeo = new THREE.BoxGeometry(0.32, 0.32, 0.1);
        const throwL = new THREE.Mesh(throwGeo, mats.velvetAccent);
        throwL.position.set(-0.95, 0.48, -0.15);
        throwL.rotation.y = 0.35;
        throwL.rotation.z = -0.15;
        throwL.castShadow = true;
        group.add(throwL);

        const throwR = new THREE.Mesh(throwGeo, mats.velvetAccent);
        throwR.position.set(0.95, 0.48, -0.15);
        throwR.rotation.y = -0.35;
        throwR.rotation.z = 0.15;
        throwR.castShadow = true;
        group.add(throwR);
        break;
      }

      // ---------------------------------------------------------------------
      // 2. COFFEE TABLE WITH MARBLE TOP & PATTERNED AREA RUG
      // ---------------------------------------------------------------------
      case 'coffeetable':
      case 'tablecenter': {
        // Area Rug Underneath
        const rugGeo = new THREE.BoxGeometry(2.4, 0.015, 1.8);
        const rug = new THREE.Mesh(rugGeo, mats.rugFabric);
        rug.position.y = 0.008;
        rug.receiveShadow = true;
        group.add(rug);

        // Table Top (Polished Quartz / Marble)
        const topGeo = new THREE.BoxGeometry(1.2, 0.04, 0.7);
        const top = new THREE.Mesh(topGeo, mats.quartzWhite);
        top.position.y = 0.42;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Lower Shelf (Smoked Glass)
        const shelfGeo = new THREE.BoxGeometry(1.1, 0.02, 0.6);
        const shelf = new THREE.Mesh(shelfGeo, mats.glassSmoked);
        shelf.position.y = 0.18;
        group.add(shelf);

        // Slender Brass Legs & Frame
        const frameGeo = new THREE.BoxGeometry(1.16, 0.02, 0.66);
        const frame = new THREE.Mesh(frameGeo, mats.brassGold);
        frame.position.y = 0.39;
        group.add(frame);

        const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8);
        [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, mats.brassGold);
          leg.position.set(lx, 0.2, lz);
          leg.castShadow = true;
          group.add(leg);
        });

        // Decorative hardcover art books on table
        const bookGeo = new THREE.BoxGeometry(0.25, 0.03, 0.32);
        const book = new THREE.Mesh(bookGeo, mats.darkWalnut);
        book.position.set(-0.25, 0.45, 0.05);
        book.rotation.y = 0.15;
        group.add(book);
        break;
      }

      // ---------------------------------------------------------------------
      // 3. ENTERTAINMENT UNIT (OLED TV, SOUNDBAR, FLUTED CONSOLE)
      // ---------------------------------------------------------------------
      case 'tvunit':
      case 'tv':
      case 'entertainment': {
        // Floating Wall Credenza
        const credenzaGeo = new THREE.BoxGeometry(2.2, 0.38, 0.42);
        const credenza = new THREE.Mesh(credenzaGeo, mats.flutedWood);
        credenza.position.set(0, 0.4, 0);
        credenza.castShadow = true;
        group.add(credenza);

        // Marble Top on Credenza
        const credTopGeo = new THREE.BoxGeometry(2.24, 0.03, 0.44);
        const credTop = new THREE.Mesh(credTopGeo, mats.blackGranite);
        credTop.position.set(0, 0.605, 0);
        group.add(credTop);

        // Wall-Mounted OLED 65" TV
        const tvFrameGeo = new THREE.BoxGeometry(1.65, 0.95, 0.04);
        const tvFrame = new THREE.Mesh(tvFrameGeo, mats.darkMetal);
        tvFrame.position.set(0, 1.45, 0.08);
        tvFrame.castShadow = true;
        group.add(tvFrame);

        // TV Glass Screen with subtle ambient glow
        const tvScreenGeo = new THREE.BoxGeometry(1.61, 0.91, 0.01);
        const tvScreen = new THREE.Mesh(tvScreenGeo, mats.tvScreen);
        tvScreen.position.set(0, 1.45, 0.105);
        group.add(tvScreen);

        // Soundbar underneath TV
        const soundbarGeo = new THREE.BoxGeometry(1.0, 0.06, 0.08);
        const soundbar = new THREE.Mesh(soundbarGeo, mats.darkMetal);
        soundbar.position.set(0, 0.88, 0.08);
        group.add(soundbar);
        break;
      }

      // ---------------------------------------------------------------------
      // 4. PLATFORM BED WITH HEADBOARD, MATTRESS, DUVET & NIGHTSTANDS
      // ---------------------------------------------------------------------
      case 'bed':
      case 'masterbed':
      case 'bedsingle': {
        const isMaster = normType !== 'bedsingle';
        const bedWidth = isMaster ? 2.0 : 1.4;
        const bedLength = 2.15;

        // Platform Wooden Base
        const frameGeo = new THREE.BoxGeometry(bedWidth + 0.15, 0.28, bedLength + 0.1);
        const frame = new THREE.Mesh(frameGeo, mats.oakWood);
        frame.position.set(0, 0.14, 0);
        frame.castShadow = true;
        group.add(frame);

        // Tall Upholstered Tufted Headboard
        const headboardGeo = new THREE.BoxGeometry(bedWidth + 0.2, 1.25, 0.14);
        const headboard = new THREE.Mesh(headboardGeo, customFabric);
        headboard.position.set(0, 0.72, -bedLength / 2 - 0.05);
        headboard.castShadow = true;
        group.add(headboard);

        // Deep Thick Mattress
        const mattressGeo = new THREE.BoxGeometry(bedWidth, 0.32, bedLength);
        const mattress = new THREE.Mesh(mattressGeo, mats.quartzWhite);
        mattress.position.set(0, 0.42, 0);
        mattress.castShadow = true;
        group.add(mattress);

        // Folded Duvet / Blanket (Navy/Slate or Charcoal)
        const duvetGeo = new THREE.BoxGeometry(bedWidth + 0.04, 0.18, bedLength * 0.65);
        const duvet = new THREE.Mesh(duvetGeo, mats.fabricUpholstery);
        duvet.position.set(0, 0.48, bedLength * 0.15);
        duvet.castShadow = true;
        group.add(duvet);

        // 4 Pillows (2 White + 2 Velvet Accent)
        const pillowGeo = new THREE.BoxGeometry(0.65, 0.15, 0.4);
        [[-bedWidth * 0.25], [bedWidth * 0.25]].forEach(([px]) => {
          const pBase = new THREE.Mesh(pillowGeo, mats.quartzWhite);
          pBase.position.set(px, 0.62, -bedLength * 0.35);
          pBase.rotation.x = 0.25;
          pBase.castShadow = true;
          group.add(pBase);

          const pAccent = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.32), mats.velvetAccent);
          pAccent.position.set(px, 0.66, -bedLength * 0.24);
          pAccent.rotation.x = 0.35;
          pAccent.castShadow = true;
          group.add(pAccent);
        });

        // Dual Floating Nightstands with Bedside Lamps
        [[-bedWidth / 2 - 0.4], [bedWidth / 2 + 0.4]].forEach(([nx]) => {
          const nsGeo = new THREE.BoxGeometry(0.55, 0.45, 0.45);
          const ns = new THREE.Mesh(nsGeo, mats.oakWood);
          ns.position.set(nx, 0.225, -bedLength * 0.35);
          ns.castShadow = true;
          group.add(ns);

          // Lamp Base
          const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 12), mats.brassGold);
          lBase.position.set(nx, 0.465, -bedLength * 0.35);
          group.add(lBase);

          // Lamp Stem
          const lStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), mats.brassGold);
          lStem.position.set(nx, 0.61, -bedLength * 0.35);
          group.add(lStem);

          // Glowing Lamp Shade
          const lShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 12), mats.lampGlow);
          lShade.position.set(nx, 0.78, -bedLength * 0.35);
          group.add(lShade);
        });
        break;
      }

      // ---------------------------------------------------------------------
      // 5. DINING TABLE & UPHOLSTERED BUCKET CHAIRS
      // ---------------------------------------------------------------------
      case 'diningtable':
      case 'dining':
      case 'table': {
        // Chamfered Oak Tabletop
        const topGeo = new THREE.BoxGeometry(1.8, 0.05, 0.95);
        const top = new THREE.Mesh(topGeo, mats.oakWood);
        top.position.y = 0.74;
        top.castShadow = true;
        group.add(top);

        // Tapered Timber Legs
        const legGeo = new THREE.CylinderGeometry(0.04, 0.025, 0.72, 8);
        [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, mats.darkWalnut);
          leg.position.set(lx, 0.36, lz);
          leg.castShadow = true;
          group.add(leg);
        });

        // 4 Modern Upholstered Dining Chairs
        const chairSeats = [
          [-0.5, 0.65, 0], [0.5, 0.65, 0],
          [-0.5, -0.65, Math.PI], [0.5, -0.65, Math.PI]
        ];

        chairSeats.forEach(([cx, cz, rot]) => {
          const chairGroup = new THREE.Group();
          chairGroup.position.set(cx, 0, cz);
          chairGroup.rotation.y = rot;

          // Seat cushion
          const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), mats.fabricUpholstery);
          seatMesh.position.y = 0.45;
          seatMesh.castShadow = true;
          chairGroup.add(seatMesh);

          // Curved Backrest
          const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.06), mats.fabricUpholstery);
          backMesh.position.set(0, 0.68, -0.2);
          backMesh.castShadow = true;
          chairGroup.add(backMesh);

          // Chair legs
          const cLegGeo = new THREE.CylinderGeometry(0.018, 0.012, 0.45, 6);
          [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([clx, clz]) => {
            const cl = new THREE.Mesh(cLegGeo, mats.darkMetal);
            cl.position.set(clx, 0.225, clz);
            chairGroup.add(cl);
          });

          group.add(chairGroup);
        });
        break;
      }

      // ---------------------------------------------------------------------
      // 6. MODULAR GOURMET CHEF KITCHEN (CABINETS, SINK, FAUCET, HOB, HOOD)
      // ---------------------------------------------------------------------
      case 'kitchencounter':
      case 'counter':
      case 'kitchen': {
        const counterLength = 2.8;

        // Base Cabinets with recessed plinth
        const baseGeo = new THREE.BoxGeometry(counterLength, 0.86, 0.65);
        const base = new THREE.Mesh(baseGeo, mats.darkMetal);
        base.position.set(0, 0.43, 0);
        base.castShadow = true;
        group.add(base);

        // Quartz Waterfall Countertop
        const topGeo = new THREE.BoxGeometry(counterLength + 0.04, 0.06, 0.68);
        const top = new THREE.Mesh(topGeo, mats.quartzWhite);
        top.position.set(0, 0.89, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Brushed Metal Bar Handles on Drawers
        const handleGeo = new THREE.BoxGeometry(0.22, 0.02, 0.03);
        [-1.0, -0.35, 0.35, 1.0].forEach((hx) => {
          const h = new THREE.Mesh(handleGeo, mats.brushedNickel);
          h.position.set(hx, 0.65, 0.34);
          group.add(h);
        });

        // Stainless Undermount Sink
        const sinkGeo = new THREE.BoxGeometry(0.65, 0.02, 0.42);
        const sink = new THREE.Mesh(sinkGeo, mats.mirrorChrome);
        sink.position.set(-0.65, 0.925, 0.02);
        group.add(sink);

        // Gooseneck Chrome Mixer Faucet
        const faucetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 8), mats.mirrorChrome);
        faucetBase.position.set(-0.65, 0.98, -0.16);
        group.add(faucetBase);

        const faucetArch = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16, Math.PI), mats.mirrorChrome);
        faucetArch.position.set(-0.65, 1.08, -0.16);
        faucetArch.rotation.y = Math.PI / 2;
        group.add(faucetArch);

        // Induction Glass Cooktop
        const hobGeo = new THREE.BoxGeometry(0.72, 0.01, 0.45);
        const hob = new THREE.Mesh(hobGeo, mats.tvScreen);
        hob.position.set(0.65, 0.925, 0.02);
        group.add(hob);

        // Stainless Steel Chimney Hood
        const hoodGeo = new THREE.BoxGeometry(0.8, 0.08, 0.5);
        const hood = new THREE.Mesh(hoodGeo, mats.brushedNickel);
        hood.position.set(0.65, 1.75, 0.02);
        hood.castShadow = true;
        group.add(hood);

        const flueGeo = new THREE.BoxGeometry(0.3, 0.6, 0.25);
        const flue = new THREE.Mesh(flueGeo, mats.brushedNickel);
        flue.position.set(0.65, 2.05, 0.02);
        group.add(flue);
        break;
      }

      // ---------------------------------------------------------------------
      // 7. FRENCH-DOOR STAINLESS STEEL REFRIGERATOR
      // ---------------------------------------------------------------------
      case 'refrigerator':
      case 'fridge': {
        const bodyGeo = new THREE.BoxGeometry(0.9, 1.9, 0.75);
        const body = new THREE.Mesh(bodyGeo, mats.brushedNickel);
        body.position.set(0, 0.95, 0);
        body.castShadow = true;
        group.add(body);

        // Water/Ice Dispenser Panel
        const dispGeo = new THREE.BoxGeometry(0.24, 0.32, 0.02);
        const disp = new THREE.Mesh(dispGeo, mats.tvScreen);
        disp.position.set(-0.2, 1.25, 0.38);
        group.add(disp);

        // Full-length vertical handles
        const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8);
        const handleL = new THREE.Mesh(handleGeo, mats.mirrorChrome);
        handleL.position.set(-0.04, 1.2, 0.41);
        group.add(handleL);

        const handleR = new THREE.Mesh(handleGeo, mats.mirrorChrome);
        handleR.position.set(0.04, 1.2, 0.41);
        group.add(handleR);
        break;
      }

      // ---------------------------------------------------------------------
      // 8. LUXURY DESIGNER BATHROOM (WALL-HUNG TOILET, DUAL-FLUSH)
      // ---------------------------------------------------------------------
      case 'toilet':
      case 'commode': {
        // Wall-hung contoured bowl
        const bowlGeo = new THREE.BoxGeometry(0.38, 0.36, 0.58);
        const bowl = new THREE.Mesh(bowlGeo, mats.porcelainWhite);
        bowl.position.set(0, 0.28, 0.12);
        bowl.castShadow = true;
        group.add(bowl);

        // Soft-close lid
        const lidGeo = new THREE.BoxGeometry(0.39, 0.04, 0.56);
        const lid = new THREE.Mesh(lidGeo, mats.porcelainWhite);
        lid.position.set(0, 0.48, 0.12);
        group.add(lid);

        // Wall-mounted dual-flush plate
        const flushPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.02), mats.mirrorChrome);
        flushPlate.position.set(0, 0.85, -0.17);
        group.add(flushPlate);
        break;
      }

      // ---------------------------------------------------------------------
      // 9. FLOATING DESIGNER VANITY WITH VESSEL SINK & BACKLIT MIRROR
      // ---------------------------------------------------------------------
      case 'vanity':
      case 'sink': {
        // Floating Wall-Hung Oak Vanity
        const vanityGeo = new THREE.BoxGeometry(0.95, 0.45, 0.52);
        const vanity = new THREE.Mesh(vanityGeo, mats.oakWood);
        vanity.position.set(0, 0.62, 0);
        vanity.castShadow = true;
        group.add(vanity);

        // White Vessel Basin
        const basinGeo = new THREE.BoxGeometry(0.65, 0.12, 0.4);
        const basin = new THREE.Mesh(basinGeo, mats.porcelainWhite);
        basin.position.set(0, 0.9, 0.02);
        basin.castShadow = true;
        group.add(basin);

        // Chrome Single-Lever Faucet
        const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), mats.mirrorChrome);
        faucet.position.set(0, 1.05, -0.16);
        group.add(faucet);

        // Large Rectangular Illuminated LED Mirror
        const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.03), mats.lampGlow);
        mirrorFrame.position.set(0, 1.6, -0.22);
        group.add(mirrorFrame);

        const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.81, 0.86, 0.01), mats.mirrorChrome);
        mirrorGlass.position.set(0, 1.6, -0.2);
        group.add(mirrorGlass);
        break;
      }

      // ---------------------------------------------------------------------
      // 10. INDOOR POTTED LUSH GREEN PLANT
      // ---------------------------------------------------------------------
      case 'plant':
      case 'indoorplant': {
        // White Ceramic Pot
        const potGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.45, 16);
        const pot = new THREE.Mesh(potGeo, mats.quartzWhite);
        pot.position.y = 0.225;
        pot.castShadow = true;
        group.add(pot);

        // Soil
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 16), mats.darkWalnut);
        soil.position.y = 0.42;
        group.add(soil);

        // Foliage Cluster
        [
          [0, 0.65, 0, 0.35],
          [-0.12, 0.8, 0.08, 0.3],
          [0.12, 0.85, -0.06, 0.32],
          [0.05, 1.05, 0.02, 0.28]
        ].forEach(([fx, fy, fz, r]) => {
          const leafCluster = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mats.plantGreen);
          leafCluster.position.set(fx, fy, fz);
          leafCluster.castShadow = true;
          group.add(leafCluster);
        });
        break;
      }

      // ---------------------------------------------------------------------
      // 11. HIGH-SPEED ELEVATOR CORE & DOORS
      // ---------------------------------------------------------------------
      case 'elevator':
      case 'lift':
      case 'elevator_bank': {
        // Metallic Frame / Architrave
        const frameGeo = new THREE.BoxGeometry(2.4, 2.5, 0.12);
        const frame = new THREE.Mesh(frameGeo, mats.darkMetal);
        frame.position.set(0, 1.25, 0);
        frame.castShadow = true;
        group.add(frame);

        // Twin Brushed Stainless Steel Sliding Doors
        const doorGeo = new THREE.BoxGeometry(0.95, 2.2, 0.05);
        const doorL = new THREE.Mesh(doorGeo, mats.brushedNickel);
        doorL.position.set(-0.5, 1.12, 0.04);
        const doorR = new THREE.Mesh(doorGeo, mats.brushedNickel);
        doorR.position.set(0.5, 1.12, 0.04);
        group.add(doorL, doorR);

        // Center seam line
        const seamGeo = new THREE.BoxGeometry(0.03, 2.22, 0.06);
        const seam = new THREE.Mesh(seamGeo, mats.darkMetal);
        seam.position.set(0, 1.12, 0.045);
        group.add(seam);

        // Digital LED Floor Indicator (Glowing)
        const dispGeo = new THREE.BoxGeometry(0.7, 0.22, 0.04);
        const dispMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
        const disp = new THREE.Mesh(dispGeo, dispMat);
        disp.position.set(0, 2.34, 0.07);
        group.add(disp);

        // Call button console
        const callBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.03), mats.darkMetal);
        callBox.position.set(1.15, 1.2, 0.06);
        const btnGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12);
        const btnMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
        const btnUp = new THREE.Mesh(btnGeo, btnMat);
        btnUp.rotation.x = Math.PI / 2;
        btnUp.position.set(1.15, 1.26, 0.08);
        const btnDown = btnUp.clone();
        btnDown.position.y = 1.14;
        group.add(callBox, btnUp, btnDown);
        break;
      }

      // ---------------------------------------------------------------------
      // 12. ARCHITECTURAL STAIRCASE & FIRE EXIT
      // ---------------------------------------------------------------------
      case 'stairs':
      case 'staircase':
      case 'fire_stairs': {
        const numSteps = 10;
        const stepWidth = 1.4;
        const stepDepth = 0.26;
        const stepHeight = 0.18;

        for (let i = 0; i < numSteps; i++) {
          const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight * (i + 1), stepDepth);
          const step = new THREE.Mesh(stepGeo, mats.quartzWhite);
          step.position.set(0, (stepHeight * (i + 1)) / 2, i * stepDepth);
          step.castShadow = true;
          step.receiveShadow = true;
          group.add(step);

          // Nosing
          const nosingGeo = new THREE.BoxGeometry(stepWidth + 0.02, 0.02, 0.04);
          const nosing = new THREE.Mesh(nosingGeo, mats.darkWalnut);
          nosing.position.set(0, (i + 1) * stepHeight, (i + 0.45) * stepDepth);
          group.add(nosing);
        }

        // Railings
        const railLen = Math.hypot(numSteps * stepDepth, numSteps * stepHeight);
        const railAngle = Math.atan2(numSteps * stepHeight, numSteps * stepDepth);
        [-stepWidth / 2 + 0.05, stepWidth / 2 - 0.05].forEach((rx) => {
          const railGeo = new THREE.CylinderGeometry(0.025, 0.025, railLen, 8);
          const rail = new THREE.Mesh(railGeo, mats.darkMetal);
          rail.position.set(rx, (numSteps * stepHeight) / 2 + 0.85, (numSteps * stepDepth) / 2);
          rail.rotation.x = -railAngle + Math.PI / 2;
          group.add(rail);

          for (let b = 0; b < numSteps; b += 3) {
            const postGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8);
            const post = new THREE.Mesh(postGeo, mats.darkMetal);
            post.position.set(rx, (b + 1) * stepHeight + 0.425, b * stepDepth);
            group.add(post);
          }
        });

        // Glowing Exit Sign
        const exitSignGeo = new THREE.BoxGeometry(0.6, 0.22, 0.04);
        const exitSignMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const exitSign = new THREE.Mesh(exitSignGeo, exitSignMat);
        exitSign.position.set(0, 2.3, 0);
        group.add(exitSign);
        break;
      }

      // ---------------------------------------------------------------------
      // 13. LOBBY RECEPTION & SERVICE COUNTER
      // ---------------------------------------------------------------------
      case 'counter':
      case 'reception_desk':
      case 'kitchen_counter': {
        // Base structure
        const baseGeo = new THREE.BoxGeometry(2.4, 0.95, 0.7);
        const base = new THREE.Mesh(baseGeo, mats.darkWalnut);
        base.position.set(0, 0.475, 0);
        base.castShadow = true;
        group.add(base);

        // Countertop (White Quartz/Marble)
        const topGeo = new THREE.BoxGeometry(2.5, 0.06, 0.8);
        const top = new THREE.Mesh(topGeo, mats.quartzWhite);
        top.position.set(0, 0.98, 0);
        top.castShadow = true;
        group.add(top);

        // Ambient LED under-counter strip
        const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 0.03), mats.lampGlow);
        glowStrip.position.set(0, 0.94, 0.36);
        group.add(glowStrip);
        break;
      }

      // ---------------------------------------------------------------------
      // DEFAULT REFINED ACCENT FURNITURE
      // ---------------------------------------------------------------------
      default: {
        const blockGeo = new THREE.BoxGeometry(0.8, 0.75, 0.8);
        const block = new THREE.Mesh(blockGeo, mats.oakWood);
        block.position.y = 0.375;
        block.castShadow = true;
        block.receiveShadow = true;
        group.add(block);
        break;
      }
    }

    return group;
  }
}
