'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

// ---------------------------------------------------------------------------
// Procedural Texture Generators (Canvas-based, zero external assets)
// ---------------------------------------------------------------------------
function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  // Base warm amber
  ctx.fillStyle = '#c8924f';
  ctx.fillRect(0, 0, 256, 256);
  // Wood grain lines
  for (let i = 0; i < 40; i++) {
    const y = (i / 40) * 256;
    const wave = Math.sin(i * 0.8) * 6;
    ctx.beginPath();
    ctx.moveTo(0, y + wave);
    for (let x = 0; x < 256; x += 4) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 4 + wave);
    }
    ctx.strokeStyle = `rgba(${100 + Math.floor(i * 2)}, ${60 + Math.floor(i * 1.2)}, 20, 0.35)`;
    ctx.lineWidth = 1.5 + Math.random() * 1.5;
    ctx.stroke();
  }
  // Knot
  const knotGrd = ctx.createRadialGradient(80, 120, 2, 80, 120, 18);
  knotGrd.addColorStop(0, 'rgba(80,45,10,0.6)');
  knotGrd.addColorStop(1, 'rgba(80,45,10,0)');
  ctx.fillStyle = knotGrd;
  ctx.fillRect(60, 100, 40, 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createMarbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  // Base creamy white
  ctx.fillStyle = '#f0ece4';
  ctx.fillRect(0, 0, 256, 256);
  // Vein generator
  const drawVein = (startX: number, startY: number, angle: number, len: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let x = startX, y = startY;
    let a = angle;
    for (let i = 0; i < len; i++) {
      a += (Math.random() - 0.5) * 0.4;
      x += Math.cos(a) * 2;
      y += Math.sin(a) * 2;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8 + Math.random();
    ctx.globalAlpha = 0.35 + Math.random() * 0.25;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  for (let i = 0; i < 12; i++) {
    drawVein(Math.random() * 256, Math.random() * 256, Math.random() * Math.PI * 2, 60 + Math.random() * 80, '#8c7a6b');
  }
  for (let i = 0; i < 6; i++) {
    drawVein(Math.random() * 256, Math.random() * 256, Math.random() * Math.PI * 2, 40 + Math.random() * 60, '#5c4a3b');
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createTileTexture(tileColor = '#c8d0d8', groutColor = '#8899aa'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const tileSize = 64;
  const grout = 3;
  // Fill grout background
  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, 256, 256);
  // Draw tiles
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * tileSize + grout / 2;
      const y = row * tileSize + grout / 2;
      const sz = tileSize - grout;
      ctx.fillStyle = tileColor;
      ctx.fillRect(x, y, sz, sz);
      // Subtle gloss highlight
      const grd = ctx.createLinearGradient(x, y, x + sz, y + sz);
      grd.addColorStop(0, 'rgba(255,255,255,0.25)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, sz, sz);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

const buildFurnitureMesh = (THREE: any, type: string, color: string) => {
  const furnGroup = new THREE.Group();

  if (type === 'sofa') {
    const baseGeo = new THREE.BoxGeometry(1.8, 0.4, 0.8);
    const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    furnGroup.add(base);

    const backGeo = new THREE.BoxGeometry(1.8, 0.6, 0.2);
    const back = new THREE.Mesh(backGeo, baseMat);
    back.position.set(0, 0.5, -0.3);
    furnGroup.add(back);

    const armGeo = new THREE.BoxGeometry(0.2, 0.5, 0.8);
    const armL = new THREE.Mesh(armGeo, baseMat);
    armL.position.set(-0.9, 0.45, 0);
    const armR = armL.clone();
    armR.position.x = 0.9;
    furnGroup.add(armL, armR);
  } else if (type === 'bed') {
    const baseGeo = new THREE.BoxGeometry(1.6, 0.4, 2.0);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    furnGroup.add(base);

    const headGeo = new THREE.BoxGeometry(1.6, 0.9, 0.15);
    const headMat = new THREE.MeshStandardMaterial({ color: '#554d48', roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.45, -1.0);
    furnGroup.add(head);

    const pillowGeo = new THREE.BoxGeometry(1.2, 0.1, 0.4);
    const pillowMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(0, 0.45, -0.7);
    furnGroup.add(pillow);
  } else if (type === 'table') {
    const topGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16);
    const woodMat = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.4 });
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.y = 0.76;
    furnGroup.add(top);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.5 });
    const leg = new THREE.Mesh(legGeo, metalMat);
    leg.position.y = 0.36;
    furnGroup.add(leg);
  } else if (type === 'plant') {
    const potGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8);
    const potMat = new THREE.MeshStandardMaterial({ color: '#a0522d' });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 0.25;
    furnGroup.add(pot);

    const leafGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#2e8b57', roughness: 0.9 });
    const foliage = new THREE.Mesh(leafGeo, leafMat);
    foliage.position.y = 0.7;
    furnGroup.add(foliage);
  } else {
    const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({ color: '#999999' });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.4;
    furnGroup.add(box);
  }

  return furnGroup;
};

const defaultLayoutData = {
  rooms: [
    { id: 'room-lobby-2bhk', name: 'Lobby Corridor', x: -8, z: 4, width: 16, depth: 2, color: '#374151', node: { x: 0, z: 5.0 } },
    { id: 'room-living-a-2bhk', name: 'Flat A - Living Room', x: -8, z: -1, width: 8, depth: 5, color: '#f5efe6', node: { x: -4, z: 1.5 } },
    { id: 'room-kitchen-a-2bhk', name: 'Flat A - Kitchen', x: -8, z: -5, width: 4, depth: 4, color: '#f4ece1', node: { x: -6, z: -3.0 } },
    { id: 'room-bedroom-a-2bhk', name: 'Flat A - Bedroom', x: -4, z: -5, width: 4, depth: 4, color: '#ece8f2', node: { x: -2, z: -3.0 } },
    { id: 'room-balcony-a-2bhk', name: 'Flat A - Balcony', x: -4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: -2, z: -5.75 } },
    { id: 'room-living-b-2bhk', name: 'Flat B - Living Room', x: 0, z: -1, width: 8, depth: 5, color: '#f5efe6', node: { x: 4, z: 1.5 } },
    { id: 'room-kitchen-b-2bhk', name: 'Flat B - Kitchen', x: 0, z: -5, width: 4, depth: 4, color: '#f4ece1', node: { x: 2, z: -3.0 } },
    { id: 'room-bedroom-b-2bhk', name: 'Flat B - Bedroom', x: 4, z: -5, width: 4, depth: 4, color: '#ece8f2', node: { x: 6, z: -3.0 } },
    { id: 'room-balcony-b-2bhk', name: 'Flat B - Balcony', x: 4, z: -6.5, width: 4, depth: 1.5, color: '#faf5ef', node: { x: 6, z: -5.75 } }
  ],
  walls: [
    // Outer boundaries
    { id: 'w-2bhk-out-top', startX: -8, startZ: -5, endX: 8, endZ: -5, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-right', startX: 8, startZ: -5, endX: 8, endZ: 6, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-bottom', startX: 8, startZ: 6, endX: -8, endZ: 6, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-left', startX: -8, startZ: 6, endX: -8, endZ: -5, thickness: 0.2, height: 3.0 },
    // Internal partitions
    { id: 'w-2bhk-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 }, // Mid wall separating Flat A/B
    { id: 'w-2bhk-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 }, // Corridor separator
    { id: 'w-2bhk-int-flat-a-horiz', startX: -8, startZ: -1, endX: 0, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-b-horiz', startX: 0, startZ: -1, endX: 8, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-a-vert', startX: -4, startZ: -5, endX: -4, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-b-vert', startX: 4, startZ: -5, endX: 4, endZ: -1, thickness: 0.15, height: 3.0 }
  ],
  apertures: [
    // Entrance doors from Lobby Corridor (interactive swinging doors)
    { id: 'ap-entrance-a-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-entrance-b-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
    // Flat A Bedrooms/Kitchen
    { id: 'ap-door-bedroom-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-arch-kitchen-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 }, // Open archway
    // Flat B Bedrooms/Kitchen
    { id: 'ap-door-bedroom-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-arch-kitchen-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 }, // Open archway
    // Balcony Doors
    { id: 'ap-balcony-door-a-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
    { id: 'ap-balcony-door-b-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
    // Windows
    { id: 'ap-win-kitchen-a-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
    { id: 'ap-win-kitchen-b-2bhk', wallId: 'w-2bhk-out-top', type: 'window', startOffset: 9.5, width: 1.2, height: 1.2, elevation: 0.9 },
    { id: 'ap-win-living-a-2bhk', wallId: 'w-2bhk-out-left', type: 'window', startOffset: 4.0, width: 1.5, height: 1.2, elevation: 0.9 },
    { id: 'ap-win-living-b-2bhk', wallId: 'w-2bhk-out-right', type: 'window', startOffset: 6.0, width: 1.5, height: 1.2, elevation: 0.9 }
  ],
  furniture: [
    { id: 'f-sofa-a-2bhk', type: 'sofa', roomId: 'room-living-a-2bhk', x: -4.0, z: 1.5, rotation: 0 },
    { id: 'f-table-a-2bhk', type: 'table', roomId: 'room-living-a-2bhk', x: -4.0, z: 2.5, rotation: 0 },
    { id: 'f-bed-a-2bhk', type: 'bed', roomId: 'room-bedroom-a-2bhk', x: -2.0, z: -3.5, rotation: 90 },
    { id: 'f-sofa-b-2bhk', type: 'sofa', roomId: 'room-living-b-2bhk', x: 4.0, z: 1.5, rotation: 0 },
    { id: 'f-table-b-2bhk', type: 'table', roomId: 'room-living-b-2bhk', x: 4.0, z: 2.5, rotation: 0 },
    { id: 'f-bed-b-2bhk', type: 'bed', roomId: 'room-bedroom-b-2bhk', x: 6.0, z: -3.5, rotation: 90 }
  ]
};

function buildFloorPlanMesh(
  layout: any,
  floorHeightOffset: number,
  isActiveFloor: boolean,
  viewMode: 'building' | 'walkthrough',
  floorIndex: number
) {
  const floorGroup = new THREE.Group();
  floorGroup.userData.floorIndex = floorIndex;

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = Infinity;
  let coreMinX = Infinity, coreMaxX = -Infinity, coreMinZ = Infinity, coreMaxZ = -Infinity;

  // Compute boundaries
  layout.rooms.forEach((r: any) => {
    if (r.name.toLowerCase().includes('balcony')) return;
    coreMinX = Math.min(coreMinX, r.x);
    coreMaxX = Math.max(coreMaxX, r.x + r.width);
    coreMinZ = Math.min(coreMinZ, r.z);
    coreMaxZ = Math.max(coreMaxZ, r.z + r.depth);
  });

  if (coreMinX === Infinity) {
    coreMinX = -8; coreMaxX = 8; coreMinZ = -5; coreMaxZ = 6;
  }

  minX = coreMinX - 1;
  maxX = coreMaxX + 1;
  minZ = coreMinZ - 1;
  maxZ = coreMaxZ + 1;

  const slabWidth = maxX - minX;
  const slabDepth = maxZ - minZ;

  // Unified Floor Slab
  const floorGeo = new THREE.BoxGeometry(slabWidth, 0.1, slabDepth);
  const floorMat = new THREE.MeshStandardMaterial({
    color: isActiveFloor ? 0x1f2937 : 0x0f172a,
    roughness: 0.8,
    metalness: 0.1
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(minX + slabWidth / 2, -0.05 + floorHeightOffset, minZ + slabDepth / 2);
  floorMesh.receiveShadow = true;
  floorGroup.add(floorMesh);

  // Unified Ceiling Slab
  const ceilingGeo = new THREE.BoxGeometry(slabWidth, 0.05, slabDepth);
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: isActiveFloor ? 0xe5e7eb : 0x111827,
    roughness: 0.9,
    metalness: 0.05,
    transparent: !isActiveFloor,
    opacity: isActiveFloor ? 1.0 : 0.15
  });
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  const ceilingHeight = 3.0;
  ceilingMesh.position.set(minX + slabWidth / 2, ceilingHeight + 0.025 + floorHeightOffset, minZ + slabDepth / 2);
  ceilingMesh.receiveShadow = true;
  ceilingMesh.castShadow = true;
  floorGroup.add(ceilingMesh);

  // 1. Procedural Concrete Columns (Exterior Stucco Columns)
  if (viewMode === 'building') {
    const colGeo = new THREE.BoxGeometry(0.4, 3.2, 0.4);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }); // Slate concrete
    const corners = [
      { x: coreMinX, z: coreMinZ },
      { x: coreMaxX, z: coreMinZ },
      { x: coreMinX, z: coreMaxZ },
      { x: coreMaxX, z: coreMaxZ }
    ];
    corners.forEach((c) => {
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(c.x, 1.6 + floorHeightOffset, c.z);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      floorGroup.add(colMesh);
    });
  }

  // 2. Procedural Entrance Gate (Ground floor building mode only)
  if (viewMode === 'building' && floorHeightOffset === 0) {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, coreMaxZ);

    // Decorative columns
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.2, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.2 });
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-1.8, 1.6, 0);
    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 1.8;
    gateGroup.add(leftPillar, rightPillar);

    // Gold header beam
    const beamGeo = new THREE.BoxGeometry(4.2, 0.3, 0.5);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.3 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 3.25, 0);
    gateGroup.add(beam);

    // Cyan reflective glass panel
    const archGeo = new THREE.BoxGeometry(3.0, 2.8, 0.08);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.3,
      metalness: 0.9,
      roughness: 0.1
    });
    const archGlass = new THREE.Mesh(archGeo, archMat);
    archGlass.position.set(0, 1.4, 0);
    gateGroup.add(archGlass);

    // Signboard banner
    const signGeo = new THREE.BoxGeometry(2.2, 0.4, 0.08);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.4, 0.05);
    gateGroup.add(sign);

    floorGroup.add(gateGroup);
  }

  // 3. Room floor textures (Only in walkthrough mode)
  if (viewMode === 'walkthrough') {
    layout.rooms.forEach((r: any) => {
      if (r.name.toLowerCase().includes('balcony')) return; // handled separately

      const rGeo = new THREE.BoxGeometry(r.width, 0.02, r.depth);
      let rMat: THREE.MeshStandardMaterial;

      if (r.texture === 'wood') {
        rMat = new THREE.MeshStandardMaterial({ map: createWoodTexture(), roughness: 0.75 });
      } else if (r.texture === 'marble') {
        rMat = new THREE.MeshStandardMaterial({ map: createMarbleTexture(), roughness: 0.3, metalness: 0.05 });
      } else if (r.texture === 'tile') {
        rMat = new THREE.MeshStandardMaterial({ map: createTileTexture(), roughness: 0.5 });
      } else {
        rMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(r.color || '#374151'), roughness: 0.6 });
      }

      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.name = `floor_${r.id}`;
      rMesh.userData.isFloor = true;
      rMesh.userData.roomId = r.id;
      rMesh.position.set(r.x + r.width / 2, 0.01 + floorHeightOffset, r.z + r.depth / 2);
      rMesh.receiveShadow = true;
      floorGroup.add(rMesh);
    });
  }

  // 4. Balcony slab + railing generator
  layout.rooms.forEach((r: any) => {
    const isBalcony = r.name.toLowerCase().includes('balcony');
    if (!isBalcony) return;

    // Balcony Floor Slab
    const slabGeo = new THREE.BoxGeometry(r.width, 0.08, r.depth);
    const slabMat = new THREE.MeshStandardMaterial({ map: createTileTexture('#e2e8f0', '#94a3b8'), roughness: 0.6 });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.set(r.x + r.width / 2, 0.04 + floorHeightOffset, r.z + r.depth / 2);
    slabMesh.receiveShadow = true;
    floorGroup.add(slabMesh);

    // Exposed railings
    const edges = [
      { p1: { x: r.x, z: r.z }, p2: { x: r.x + r.width, z: r.z } }, // North
      { p1: { x: r.x, z: r.z + r.depth }, p2: { x: r.x + r.width, z: r.z + r.depth } }, // South
      { p1: { x: r.x, z: r.z }, p2: { x: r.x, z: r.z + r.depth } }, // West
      { p1: { x: r.x + r.width, z: r.z }, p2: { x: r.x + r.width, z: r.z + r.depth } } // East
    ];

    const isEdgeExposed = (x1: number, z1: number, x2: number, z2: number) => {
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      return !layout.rooms.some((other: any) => {
        if (other.id === r.id) return false;
        if (other.name.toLowerCase().includes('balcony')) return false;
        const buffer = 0.05;
        return midX >= other.x - buffer && midX <= other.x + other.width + buffer &&
               midZ >= other.z - buffer && midZ <= other.z + other.depth + buffer;
      });
    };

    edges.forEach((edge) => {
      if (isEdgeExposed(edge.p1.x, edge.p1.z, edge.p2.x, edge.p2.z)) {
        const dx = edge.p2.x - edge.p1.x;
        const dz = edge.p2.z - edge.p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        const railingGroup = new THREE.Group();

        // Transparent glass panel
        const glassGeo = new THREE.BoxGeometry(len, 1.0, 0.03);
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x00f5d4,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
          metalness: 0.9
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(len / 2, 0.5, 0);
        railingGroup.add(glass);

        // Dark metal handrail
        const topRailGeo = new THREE.BoxGeometry(len, 0.04, 0.05);
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.3 });
        const topRail = new THREE.Mesh(topRailGeo, metalMat);
        topRail.position.set(len / 2, 1.02, 0);
        railingGroup.add(topRail);

        // Supporting posts
        const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0);
        const post1 = new THREE.Mesh(postGeo, metalMat);
        post1.position.set(0, 0.5, 0);
        const post2 = post1.clone();
        post2.position.x = len;
        railingGroup.add(post1, post2);

        railingGroup.position.set(edge.p1.x, floorHeightOffset, edge.p1.z);
        railingGroup.rotation.y = -angle;
        floorGroup.add(railingGroup);
      }
    });
  });

  // Helper to verify outer walls
  const isOuterWall = (w: any) => {
    const onLeft = Math.abs(w.startX - coreMinX) < 0.15 && Math.abs(w.endX - coreMinX) < 0.15;
    const onRight = Math.abs(w.startX - coreMaxX) < 0.15 && Math.abs(w.endX - coreMaxX) < 0.15;
    const onTop = Math.abs(w.startZ - coreMinZ) < 0.15 && Math.abs(w.endZ - coreMinZ) < 0.15;
    const onBottom = Math.abs(w.startX - coreMinX) < 0.15 || Math.abs(w.endX - coreMinX) < 0.15 ||
                     (Math.abs(w.startZ - coreMaxZ) < 0.15 && Math.abs(w.endZ - coreMaxZ) < 0.15);
    const isOutId = w.id.includes('out') || w.id.includes('outer');
    return onLeft || onRight || onTop || onBottom || isOutId;
  };

  // 5. Walls & Apertures generator
  layout.walls.forEach((w: any) => {
    // In building mode, hide all interior walls
    if (viewMode === 'building' && !isOuterWall(w)) {
      return;
    }

    const startX = w.startX;
    const startZ = w.startZ;
    const endX = w.endX;
    const endZ = w.endZ;
    const thickness = w.thickness || 0.2;
    const height = w.height || 3.0;

    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    const wallApertures = (layout.apertures || []).filter((ap: any) => ap.wallId === w.id);

    if (wallApertures.length === 0) {
      const wallGeo = new THREE.BoxGeometry(length, height, thickness);
      const wallMat = new THREE.MeshStandardMaterial({
        color: isActiveFloor ? 0xd1d5db : 0x4b5563,
        roughness: 0.7,
        metalness: 0.1,
        transparent: !isActiveFloor,
        opacity: isActiveFloor ? 1.0 : 0.25
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);

      const midX = (startX + endX) / 2;
      const midZ = (startZ + endZ) / 2;
      wallMesh.position.set(midX, height / 2 + floorHeightOffset, midZ);
      wallMesh.rotation.y = -angle;

      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      floorGroup.add(wallMesh);
    } else {
      const sortedAps = [...wallApertures].sort((a, b) => a.startOffset - b.startOffset);
      let currentOffset = 0;
      const wallMat = new THREE.MeshStandardMaterial({
        color: isActiveFloor ? 0xd1d5db : 0x4b5563,
        roughness: 0.7,
        metalness: 0.1,
        transparent: !isActiveFloor,
        opacity: isActiveFloor ? 1.0 : 0.25
      });

      const ux = dx / length;
      const uz = dz / length;

      sortedAps.forEach((ap: any) => {
        if (ap.startOffset > currentOffset) {
          const segLen = ap.startOffset - currentOffset;
          const segGeo = new THREE.BoxGeometry(segLen, height, thickness);
          const segMesh = new THREE.Mesh(segGeo, wallMat);

          const segMidOffset = currentOffset + segLen / 2;
          const px = startX + ux * segMidOffset;
          const pz = startZ + uz * segMidOffset;

          segMesh.position.set(px, height / 2 + floorHeightOffset, pz);
          segMesh.rotation.y = -angle;
          segMesh.castShadow = true;
          segMesh.receiveShadow = true;
          floorGroup.add(segMesh);
        }

        if (ap.elevation > 0) {
          const bottomGeo = new THREE.BoxGeometry(ap.width, ap.elevation, thickness);
          const bottomMesh = new THREE.Mesh(bottomGeo, wallMat);

          const apMidOffset = ap.startOffset + ap.width / 2;
          const px = startX + ux * apMidOffset;
          const pz = startZ + uz * apMidOffset;

          bottomMesh.position.set(px, ap.elevation / 2 + floorHeightOffset, pz);
          bottomMesh.rotation.y = -angle;
          bottomMesh.castShadow = true;
          bottomMesh.receiveShadow = true;
          floorGroup.add(bottomMesh);
        }

        const topElevation = ap.elevation + ap.height;
        if (height > topElevation) {
          const topH = height - topElevation;
          const topGeo = new THREE.BoxGeometry(ap.width, topH, thickness);
          const topMesh = new THREE.Mesh(topGeo, wallMat);

          const apMidOffset = ap.startOffset + ap.width / 2;
          const px = startX + ux * apMidOffset;
          const pz = startZ + uz * apMidOffset;

          topMesh.position.set(px, topElevation + topH / 2 + floorHeightOffset, pz);
          topMesh.rotation.y = -angle;
          topMesh.castShadow = true;
          topMesh.receiveShadow = true;
          floorGroup.add(topMesh);
        }

        const apMidOffset = ap.startOffset + ap.width / 2;
        const px = startX + ux * apMidOffset;
        const pz = startZ + uz * apMidOffset;

        if (ap.type === 'window') {
          const frameGeo = new THREE.BoxGeometry(ap.width, ap.height, thickness * 1.2);
          const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
          const frameMesh = new THREE.Mesh(frameGeo, frameMat);

          const glassGeo = new THREE.BoxGeometry(ap.width - 0.1, ap.height - 0.1, thickness * 0.4);
          const glassMat = new THREE.MeshStandardMaterial({
            color: 0x00f5d4,
            transparent: true,
            opacity: 0.45,
            roughness: 0.05,
            metalness: 0.95
          });
          const glassMesh = new THREE.Mesh(glassGeo, glassMat);

          const windowGroup = new THREE.Group();
          windowGroup.add(frameMesh);
          windowGroup.add(glassMesh);

          windowGroup.position.set(px, ap.elevation + ap.height / 2 + floorHeightOffset, pz);
          windowGroup.rotation.y = -angle;
          floorGroup.add(windowGroup);
        } else if (ap.type === 'door') {
          const edgeX = startX + ux * ap.startOffset;
          const edgeZ = startZ + uz * ap.startOffset;

          const pivotGroup = new THREE.Group();
          pivotGroup.name = `doorGroup_${ap.id}`;
          pivotGroup.position.set(edgeX, ap.elevation + floorHeightOffset, edgeZ);
          pivotGroup.rotation.y = -angle;

          const panelGeo = new THREE.BoxGeometry(ap.width, ap.height, thickness * 0.8);
          const panelMat = new THREE.MeshStandardMaterial({
            color: isActiveFloor ? 0x5c4033 : 0x3e2723,
            roughness: 0.6,
            transparent: !isActiveFloor,
            opacity: isActiveFloor ? 1.0 : 0.25
          });
          const panelMesh = new THREE.Mesh(panelGeo, panelMat);
          panelMesh.name = `doorPanel_${ap.id}`;

          panelMesh.position.set(ap.width / 2, ap.height / 2, 0);
          panelMesh.castShadow = true;
          panelMesh.receiveShadow = true;

          pivotGroup.add(panelMesh);

          pivotGroup.userData = {
            isOpen: false,
            originalRotationY: -angle,
            id: ap.id,
            width: ap.width,
            swing: ap.swing || 1
          };

          floorGroup.add(pivotGroup);
        }

        currentOffset = ap.startOffset + ap.width;
      });

      if (length > currentOffset) {
        const segLen = length - currentOffset;
        const segGeo = new THREE.BoxGeometry(segLen, height, thickness);
        const segMesh = new THREE.Mesh(segGeo, wallMat);

        const segMidOffset = currentOffset + segLen / 2;
        const px = startX + ux * segMidOffset;
        const pz = startZ + uz * segMidOffset;

        segMesh.position.set(px, height / 2 + floorHeightOffset, pz);
        segMesh.rotation.y = -angle;
        segMesh.castShadow = true;
        segMesh.receiveShadow = true;
        floorGroup.add(segMesh);
      }
    }
  });

  // Tag all children with floorIndex for click raycasting
  floorGroup.traverse((child) => {
    child.userData.floorIndex = floorIndex;
  });

  return floorGroup;
}



interface BuildingViewerProps {
  activeFloor: number;
  setActiveFloor?: (floor: number) => void;
  viewMode: 'building' | 'walkthrough';
  setViewMode?: (mode: 'building' | 'walkthrough') => void;
  activeRoom: string | null;
  setActiveRoom: (roomName: string | null) => void;
  
  // SDK / Embed props
  isEmbedded?: boolean;
  initialModels?: DigitalTwinModel[];
  initialHotspots?: Hotspot[];
  initialTours?: TourRoute[];
  initialTenantId?: string;
  projectId?: string;
  sdkKey?: string;
  layoutData?: any;
}

interface DigitalTwinModel {
  id: string;
  projectId: string;
  name: string;
  modelUrl: string;
  modelType: 'exterior' | 'interior';
}

interface Hotspot {
  id: string;
  name: string;
  type: 'info' | 'pricing' | 'video' | 'brochure' | 'cta';
  posX: number;
  posY: number;
  posZ: number;
  contentJson: {
    title: string;
    description: string;
    price?: number;
    videoUrl?: string;
    linkUrl?: string;
    buttonText?: string;
    flatNumber?: string;
  };
}

interface CameraPoint {
  name: string;
  posX: number;
  posY: number;
  posZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

interface TourRoute {
  id: string;
  routeName: string;
  routeJson: CameraPoint[];
}

const getLayoutForFloor = (layout: any, floorIndex: number): any => {
  if (!layout) return defaultLayoutData;
  if (layout.rooms && Array.isArray(layout.rooms)) return layout;
  
  if (layout.floors && (layout.floors[floorIndex] || layout.floors[floorIndex + 1])) {
    return layout.floors[floorIndex] || layout.floors[floorIndex + 1];
  }
  
  const configFloors = layout.floorsConfig || [];
  const floorConf = configFloors.find((fc: any) => fc.floorNumber === floorIndex + 1 || fc.floorNumber === floorIndex);
  const type = floorConf ? floorConf.type : '2BHK';
  
  if (layout.templates && layout.templates[type]) {
    return layout.templates[type];
  }
  
  if (layout.templates) {
    const available = Object.keys(layout.templates);
    if (available.length > 0) {
      return layout.templates[available[0]];
    }
  }
  
  return defaultLayoutData;
};

export default function BuildingViewer({
  activeFloor,
  setActiveFloor,
  viewMode,
  setViewMode,
  activeRoom,
  setActiveRoom,
  isEmbedded = false,
  initialModels,
  initialHotspots,
  initialTours,
  initialTenantId,
  projectId,
  sdkKey,
  layoutData: initialLayoutData, // Rename prop to avoid confusion
}: BuildingViewerProps) {
  // 1. Primary State (Must be first for TDZ safety)
  const [localLayout, setLocalLayout] = useState<any>(initialLayoutData || defaultLayoutData);
  const [layoutData, setLayoutData] = useState<any>(null); // External data from fetch

  // 2. Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // 3. Effects for state sync
  useEffect(() => {
    if (initialLayoutData) setLocalLayout(initialLayoutData);
  }, [initialLayoutData]);

  useEffect(() => {
    if (layoutData) setLocalLayout(layoutData);
  }, [layoutData]);

  // 4. Rest of state
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(initialTenantId || null);
  const [models, setModels] = useState<DigitalTwinModel[]>(initialModels || []);
  const [activeModel, setActiveModel] = useState<DigitalTwinModel | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots || []);
  const [tours, setTours] = useState<TourRoute[]>(initialTours || []);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [tourIndex, setTourIndex] = useState<number>(0);
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFurnId, setSelectedFurnId] = useState<string | null>(null);



  // Fetch LayoutData dynamically
  useEffect(() => {
    if (isEmbedded) return;
    if (!tenantId) return;

    fetch(`http://localhost:3001/floorplans`, {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data)) {
          const fpWithLayout = data.find((fp) => fp.layoutData && (fp.layoutData.rooms || fp.layoutData.floorsConfig));
          if (fpWithLayout) {
            setLayoutData(fpWithLayout.layoutData);
          }
        }
      })
      .catch((err) => console.error('Error fetching floorplans:', err));
  }, [tenantId, isEmbedded]);

  // Keep WebGL refs accessible across animation updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const loadedModelRef = useRef<THREE.Group | null>(null);
  const originalMaterials = useRef<Map<string, THREE.Material>>(new Map());
  const highlightMaterial = useRef<THREE.MeshStandardMaterial | null>(null);
  
  // Dynamic navigation refs
  const targetCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetControlsTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Event telemetry logging
  const trackEvent = (eventName: string, eventData: any = {}) => {
    // 1. PostMessage Bridge to parent frame
    if (isEmbedded && typeof window !== 'undefined') {
      window.parent.postMessage({
        type: 'AETHER_3D_EVENT',
        eventName,
        eventData,
      }, '*');
    }

    // 2. Log event to NestJS SDK Analytics API
    if (isEmbedded && sdkKey && projectId) {
      fetch('http://localhost:3001/sdk/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          eventName,
          eventData: { ...eventData, sessionId },
          sdkKey,
        }),
      }).catch(() => {});
    }
  };

  // Sync state if initialized from parent props
  useEffect(() => {
    if (isEmbedded) {
      if (initialModels) setModels(initialModels);
      if (initialHotspots) setHotspots(initialHotspots);
      if (initialTours) setTours(initialTours);
      if (initialTenantId) setTenantId(initialTenantId);
    }
  }, [isEmbedded, initialModels, initialHotspots, initialTours, initialTenantId]);

  // Initialize highlight material
  useEffect(() => {
    highlightMaterial.current = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.2,
    });
  }, []);

  // Fetch Tenant & Models dynamically
  useEffect(() => {
    if (isEmbedded) return;
    const fetchModels = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const builderSlug = urlParams.get('builder') || 'aethelgard';
        
        // 1. Fetch builder theme to get builder ID (tenantId)
        const themeRes = await fetch(`http://localhost:3001/builders/theme-by-slug/${builderSlug}`);
        const themeData = await themeRes.json();
        if (themeData && themeData.id) {
          setTenantId(themeData.id);

          // 2. Fetch digital twin models
          const modelsRes = await fetch(`http://localhost:3001/digital-twin/models`, {
            headers: { 'x-tenant-id': themeData.id },
          });
          const modelsData = await modelsRes.json();
          setModels(modelsData || []);
        }
      } catch (err) {
        console.error('Failed to load spatial engine configurations:', err);
      }
    };
    fetchModels();
  }, [isEmbedded]);

  // Sync activeModel based on viewMode
  useEffect(() => {
    if (models.length === 0) return;
    const modelType = viewMode === 'building' ? 'exterior' : 'interior';
    const found = models.find((m) => m.modelType === modelType);
    if (found) {
      setActiveModel(found);
    } else {
      // Fallbacks if backend doesn't have it (handles initial setups)
      setActiveModel({
        id: 'fallback',
        projectId: 'fallback',
        name: viewMode === 'building' ? 'Aethelgard Exterior' : 'Luxury Corridor',
        modelUrl: viewMode === 'building' ? '/building.glb' : '/floor_walkthrough.glb',
        modelType,
      });
    }
  }, [models, viewMode]);

  // Load hotspots & tours once activeModel is set
  useEffect(() => {
    if (isEmbedded) return;
    if (!activeModel || activeModel.id === 'fallback' || !tenantId) {
      setHotspots([]);
      setTours([]);
      return;
    }

    const headers = { 'x-tenant-id': tenantId };
    
    Promise.all([
      fetch(`http://localhost:3001/digital-twin/models/${activeModel.id}/hotspots`, { headers }).then((r) => r.json()),
      fetch(`http://localhost:3001/digital-twin/models/${activeModel.id}/tours`, { headers }).then((r) => r.json()),
    ])
      .then(([hotspotsData, toursData]) => {
        setHotspots(hotspotsData || []);
        setTours(toursData || []);
        setTourIndex(0);
        setIsPlayingTour(false);
      })
      .catch((err) => console.error('Error fetching digital twin assets:', err));
  }, [activeModel, tenantId, isEmbedded]);

  // Telemetry Triggers for Embed tracking
  useEffect(() => {
    if (isEmbedded && !loading && activeModel) {
      trackEvent('viewer_opened', { modelName: activeModel.name, modelType: activeModel.modelType });
    }
  }, [loading, activeModel, isEmbedded]);

  useEffect(() => {
    if (isEmbedded && !loading && activeFloor !== undefined) {
      trackEvent('floor_selected', { floorNumber: activeFloor });
    }
  }, [activeFloor, isEmbedded, loading]);

  useEffect(() => {
    if (isEmbedded && !loading && activeRoom) {
      trackEvent('flat_selected', { flatNumber: activeRoom });
    }
  }, [activeRoom, isEmbedded, loading]);

  useEffect(() => {
    if (isEmbedded && !loading && selectedHotspot) {
      trackEvent('hotspot_clicked', { hotspotId: selectedHotspot.id, hotspotName: selectedHotspot.name });
    }
  }, [selectedHotspot, isEmbedded, loading]);

  // Floor highlighting logic (Exterior mode only)
  useEffect(() => {
    if (viewMode !== 'building' || !loadedModelRef.current || !highlightMaterial.current) return;

    loadedModelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        let parent: THREE.Object3D | null = child.parent;
        let floorName = '';

        while (parent && parent !== loadedModelRef.current) {
          if (parent.name.startsWith('Floor_')) {
            floorName = parent.name;
            break;
          }
          parent = parent.parent;
        }

        if (floorName) {
          const floorIndex = parseInt(floorName.split('_')[1], 10);
          if (floorIndex === activeFloor) {
            child.material = highlightMaterial.current!;
          } else {
            if (originalMaterials.current.has(child.uuid)) {
              child.material = originalMaterials.current.get(child.uuid)!;
            }
          }
        }
      }
    });
  }, [activeFloor, viewMode, loading]);

  // Handle "Back to Lobby" – only fires when parent explicitly resets activeRoom to null
  // (e.g., clicking the ← Lobby button in explorer/page.tsx)
  // All other camera navigation is handled DIRECTLY inside click/WASD handlers.
  useEffect(() => {
    if (viewMode !== 'walkthrough' || !cameraRef.current || !controlsRef.current) return;
    if (activeRoom !== null) return; // ← key fix: do NOT react to room-name changes here

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const floorOffset = activeFloor * 3.2;

    // Glide back to lobby corridor entry point
    controls.enabled = false;
    gsap.to(camera.position, { x: 0, y: 1.6 + floorOffset, z: 5.0, duration: 1.8, ease: 'power2.inOut' });
    gsap.to(controls.target, {
      x: 0,
      y: 1.6 + floorOffset,
      z: 5.05,
      duration: 1.8,
      ease: 'power2.inOut',
      onComplete: () => {
        controls.enabled = true;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.minDistance = 0.01;
        controls.maxDistance = 0.1;
      },
    });
  }, [activeRoom, viewMode, activeFloor]);



  // Main Canvas Renderer & Procedural Extrusion Engine
  useEffect(() => {
    if (!containerRef.current || !activeModel) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0c0f16);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight1.position.set(25, 40, 15);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f5d4, 0.4); // Neon cyan fill light
    dirLight2.position.set(-25, 20, -15);
    scene.add(dirLight2);

    // Grid helper
    const gridHelper = new THREE.GridHelper(80, 40, 0x00f5d4, 0x1f2937);
    gridHelper.position.y = -0.5;
    if (gridHelper.material instanceof THREE.Material) {
      gridHelper.material.opacity = 0.15;
      gridHelper.material.transparent = true;
    }
    scene.add(gridHelper);

    // Configs based on type
    setLoading(true);
    setError(null);
    originalMaterials.current.clear();

    // Safety checking constraint to keep the camera inside flat boundaries
    const isPosWalkable = (x: number, z: number) => {
      const floorLayout = getLayoutForFloor(localLayout, activeFloor);
      if (!floorLayout.rooms) return true; // fallback

      // 1. Check if the point is inside any room with a buffer
      const insideRoom = floorLayout.rooms.some((r: any) => {
        const pad = r.name.toLowerCase().includes('balcony') ? 0.15 : 0.35;
        return x >= r.x + pad && x <= r.x + r.width - pad &&
               z >= r.z + pad && z <= r.z + r.depth - pad;
      });
      if (insideRoom) return true;

      // 2. Check if the point is near any door or archway aperture (to allow walking through walls/doors)
      const nearAperture = (floorLayout.apertures || []).some((ap: any) => {
        if (ap.type !== 'door' && ap.type !== 'arch') return false;
        const w = floorLayout.walls?.find((wall: any) => wall.id === ap.wallId);
        if (!w) return false;

        const dx = w.endX - w.startX;
        const dz = w.endZ - w.startZ;
        const len = Math.sqrt(dx * dx + dz * dz);
        const ux = dx / len;
        const uz = dz / len;

        const apX = w.startX + ux * (ap.startOffset + ap.width / 2);
        const apZ = w.startZ + uz * (ap.startOffset + ap.width / 2);

        const dist = Math.hypot(x - apX, z - apZ);
        return dist < 0.8; // Allow walking if within 0.8m of door center
      });

      return nearAperture;
    };

    if (viewMode === 'building') {
      camera.fov = 45;
      camera.updateProjectionMatrix();
      camera.position.set(40, 25, 45);
      controls.target.set(0, 16, 0);
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minDistance = 15;
      controls.maxDistance = 80;
      controls.enableZoom = true;
      controls.enablePan = true;
    } else {
      const floorOffset = activeFloor * 3.2;
      camera.fov = 70;
      camera.updateProjectionMatrix();
      camera.position.set(0, 1.6 + floorOffset, 4.0);
      controls.target.set(0, 1.6 + floorOffset, 4.05);
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minDistance = 0.01;
      controls.maxDistance = 0.1;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    // Generate Procedural Structure from Layout
    const proceduralGroup = new THREE.Group();
    proceduralGroup.name = "procedural_building";

    if (viewMode === 'building') {
      // Stack multiple floors (procedural building shell)
      const configFloors = localLayout.floorsConfig || [];
      const numFloors = configFloors.length || 10;
      for (let fNum = 0; fNum < numFloors; fNum++) {
        const floorOffset = fNum * 3.2;
        const isAct = fNum === activeFloor;
        const floorLayout = getLayoutForFloor(localLayout, fNum);
        const floorMesh = buildFloorPlanMesh(floorLayout, floorOffset, isAct, viewMode, fNum);
        proceduralGroup.add(floorMesh);
      }
      scene.add(proceduralGroup);
      setLoading(false);
    } else {
      // Walkthrough mode: render active floor and add walkable nodes
      const floorOffset = activeFloor * 3.2;
      const floorLayout = getLayoutForFloor(localLayout, activeFloor);
      const floorMesh = buildFloorPlanMesh(floorLayout, floorOffset, true, viewMode, activeFloor);
      proceduralGroup.add(floorMesh);

      // Add walkable nodes
      if (floorLayout.rooms) {
        floorLayout.rooms.forEach((r: any) => {
          if (!r.node) return;
          const nodeGeo = new THREE.RingGeometry(0.3, 0.4, 32);
          nodeGeo.rotateX(-Math.PI / 2);
          const nodeMat = new THREE.MeshBasicMaterial({
            color: 0x00f5d4,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
          });
          const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
          nodeMesh.name = `node_${r.id}`;
          nodeMesh.position.set(r.node.x, 0.05 + floorOffset, r.node.z);
          proceduralGroup.add(nodeMesh);
        });
      }

      // Add Furniture
      if (floorLayout.furniture) {
        floorLayout.furniture.forEach((f: any) => {
          const color = f.color || (f.type === 'sofa' ? '#2f4f4f' : '#6b8e23');
          const mesh = buildFurnitureMesh(THREE, f.type, color);
          mesh.position.set(f.x, 0.01 + floorOffset, f.z);
          mesh.rotation.y = (f.rotation * Math.PI) / 180;
          mesh.userData = { type: 'furniture', id: f.id };
          proceduralGroup.add(mesh);
        });
      }

      scene.add(proceduralGroup);

      // Position camera appropriately
      if (activeRoom === null) {
        camera.position.set(0, 1.6 + floorOffset, 5.0);
        controls.target.set(0, 1.6 + floorOffset, 5.05);
      } else {
        const currentRoom = floorLayout.rooms?.find((r: any) => r.name === activeRoom);
        if (currentRoom && currentRoom.node) {
          camera.position.set(currentRoom.node.x, 1.6 + floorOffset, currentRoom.node.z);
          controls.target.set(currentRoom.node.x, 1.6 + floorOffset, currentRoom.node.z + 0.05);
        }
      }
      setLoading(false);
    }

    // ---------------------------------------------------------------------------
    // Ground hover ring (Shapespark-style floor projection cursor)
    // ---------------------------------------------------------------------------
    const hoverRingGeo = new THREE.RingGeometry(0.28, 0.42, 48);
    hoverRingGeo.rotateX(-Math.PI / 2);
    const hoverRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const hoverRingMesh = new THREE.Mesh(hoverRingGeo, hoverRingMat);
    hoverRingMesh.name = 'hoverRing';
    hoverRingMesh.visible = false;
    scene.add(hoverRingMesh);

    // Collision raycaster probes (for WASD wall sliding)
    const collisionRaycaster = new THREE.Raycaster();
    collisionRaycaster.near = 0;
    collisionRaycaster.far = 0.55; // probe distance from camera center

    // Collect all wall meshes for collision (excluding open doors)
    const getWallMeshes = (): THREE.Mesh[] => {
      const meshes: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !obj.userData.isFloor && !obj.name.startsWith('node_') && obj.name !== 'hoverRing') {
          // Check if mesh belongs to an open door group
          let isDoorOpen = false;
          let parentObj = obj.parent;
          while (parentObj && parentObj !== scene) {
            if (parentObj.name.startsWith('doorGroup_')) {
              if (parentObj.userData?.isOpen) {
                isDoorOpen = true;
              }
              break;
            }
            parentObj = parentObj.parent;
          }
          if (!isDoorOpen) {
            meshes.push(obj);
          }
        }
      });
      return meshes;
    };

    // Raycast click handler for hotspots & nodes
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Floor hover ring + mousemove
    const handleMouseMove = (event: MouseEvent) => {
      if (viewMode !== 'walkthrough') {
        hoverRingMesh.visible = false;
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const floorMeshes: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.isFloor) floorMeshes.push(obj);
      });
      const hits = raycaster.intersectObjects(floorMeshes, false);
      if (hits.length > 0) {
        const pt = hits[0].point;
        const floorY = pt.y + 0.015;
        hoverRingMesh.position.set(pt.x, floorY, pt.z);
        hoverRingMesh.visible = true;
        // Pulse opacity
        hoverRingMat.opacity = 0.55 + Math.sin(Date.now() * 0.006) * 0.2;
      } else {
        hoverRingMesh.visible = false;
      }
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    let pointerDownX = 0;
    let pointerDownY = 0;

    const handleMouseDown = (event: MouseEvent) => {
      pointerDownX = event.clientX;
      pointerDownY = event.clientY;
    };

    const handleMouseUp = (event: MouseEvent) => {
      const moveDist = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
      if (moveDist > 5) {
        return; // Dragged to rotate, ignore teleportation trigger
      }
      handlePointerDown(event);
    };

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (viewMode === 'building') {
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          let clickedFloorIndex: number | undefined;
          for (const hit of intersects) {
            if (hit.object.userData && hit.object.userData.floorIndex !== undefined) {
              clickedFloorIndex = hit.object.userData.floorIndex;
              break;
            }
          }
          if (clickedFloorIndex !== undefined) {
            if (setActiveFloor) setActiveFloor(clickedFloorIndex);
            if (setViewMode) setViewMode('walkthrough');
            trackEvent('building_click_enter', { floorIndex: clickedFloorIndex });
          }
        }
        return;
      }

      if (viewMode !== 'walkthrough') return;

      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        // Find if we intersected a floor mesh, and its distance
        const floorHit = intersects.find(h => (h.object as THREE.Mesh).userData?.isFloor);
        const floorDist = floorHit ? floorHit.distance : Infinity;

        // 1. Try to find a walkable node first among any of the intersected objects closer than the floor
        let nodeName = '';
        let clickedNodeObj: THREE.Object3D | null = null;
        const floorLayout = getLayoutForFloor(localLayout, activeFloor);
        
        for (const intersect of intersects) {
          if (intersect.distance >= floorDist) continue;
          
          let tempObj: THREE.Object3D | null = intersect.object;
          while (tempObj && tempObj !== scene) {
            if (tempObj.name.startsWith('node_')) {
              nodeName = tempObj.name;
              clickedNodeObj = tempObj;
              break;
            }
            if ((tempObj as any).userData && (tempObj as any).userData.type === 'furniture') {
              setSelectedFurnId((tempObj as any).userData.id);
              setActiveRoom(null); // clear room selection when furniture is picked
              return;
            }
            tempObj = tempObj.parent;
          }
          if (nodeName) break;
        }

        if (nodeName && floorLayout.rooms) {
          const roomId = nodeName.replace('node_', '');
          const room = floorLayout.rooms.find((r: any) => r.id === roomId);
          if (room && room.node) {
            controls.enabled = false;
            const floorOffset = activeFloor * 3.2;

            const targetCam = new THREE.Vector3(room.node.x, 1.6 + floorOffset, room.node.z);
            const targetLook = new THREE.Vector3(room.node.x, 1.6 + floorOffset, room.node.z + 0.05);

            gsap.to(camera.position, {
              x: targetCam.x,
              y: targetCam.y,
              z: targetCam.z,
              duration: 2.0,
              ease: 'power2.inOut',
            });
            gsap.to(controls.target, {
              x: targetLook.x,
              y: targetLook.y,
              z: targetLook.z,
              duration: 2.0,
              ease: 'power2.inOut',
              onComplete: () => {
                controls.enabled = true;
                controls.enableZoom = false;
                controls.enablePan = false;
                controls.minDistance = 0.01;
                controls.maxDistance = 0.1;
                setActiveRoom(room.name);
              },
            });
            trackEvent('node_teleport', { roomId, roomName: room.name });
            return;
          }
        }

        // 2. Try to find a door pivot or door panel mesh to swing open / go through closer than the floor
        let doorPivot: THREE.Object3D | null = null;
        let doorMesh: THREE.Object3D | null = null;
        let doorName = '';

        for (const intersect of intersects) {
          if (intersect.distance >= floorDist) continue;
          
          let tempObj: THREE.Object3D | null = intersect.object;
          while (tempObj && tempObj !== scene) {
            if (tempObj.name.startsWith('doorGroup_')) {
              doorPivot = tempObj;
              break;
            }
            if (tempObj.name.toLowerCase().includes('door') || tempObj.name.startsWith('doorPanel_')) {
              doorMesh = tempObj;
              doorName = tempObj.name;
            }
            tempObj = tempObj.parent;
          }
          if (doorPivot || doorMesh) break;
        }

        if (doorMesh && !doorPivot) {
          let tempParent = doorMesh.parent;
          while (tempParent && tempParent !== scene) {
            if (tempParent.name.startsWith('doorGroup_')) {
              doorPivot = tempParent;
              break;
            }
            tempParent = tempParent.parent;
          }
        }

        if (doorPivot) {
          // Visual swing open animation!
          const isOpen = !doorPivot.userData.isOpen;
          doorPivot.userData.isOpen = isOpen;
          
          const swingSign = doorPivot.userData.swing !== undefined ? doorPivot.userData.swing : 1;
          const targetRotationY = isOpen 
            ? doorPivot.userData.originalRotationY + swingSign * Math.PI / 2 
            : doorPivot.userData.originalRotationY;
            
          gsap.to(doorPivot.rotation, {
            y: targetRotationY,
            duration: 1.0,
            ease: 'power2.out'
          });
          
          trackEvent('door_interact', { doorId: doorPivot.userData.id, isOpen });

          // Glide camera through / to the door - directly via GSAP, no setActiveRoom
          if (isOpen) {
            const doorWorldPos = new THREE.Vector3();
            doorPivot.getWorldPosition(doorWorldPos);
            const floorOffset = activeFloor * 3.2;
            
            // Calculate direction from camera to door
            const camToDoor = doorWorldPos.clone().sub(camera.position);
            camToDoor.y = 0;
            camToDoor.normalize();
            
            // Project a point 1.2m past the door in that direction
            const projX = doorWorldPos.x + camToDoor.x * 1.2;
            const projZ = doorWorldPos.z + camToDoor.z * 1.2;
            
            // Find which room contains this projected point
            const fl = getLayoutForFloor(localLayout, activeFloor);
            const destRoom = fl.rooms?.find((r: any) => 
              projX >= r.x && projX <= r.x + r.width &&
              projZ >= r.z && projZ <= r.z + r.depth
            );
            
            let destCam: THREE.Vector3;
            let destLook: THREE.Vector3;
            
            if (destRoom && destRoom.node) {
              destCam = new THREE.Vector3(destRoom.node.x, 1.6 + floorOffset, destRoom.node.z);
              destLook = destCam.clone().add(camToDoor.clone().normalize().multiplyScalar(0.05));
            } else {
              // Fallback if no room matched
              destCam = new THREE.Vector3(projX, 1.6 + floorOffset, projZ);
              destLook = destCam.clone().add(camToDoor.clone().normalize().multiplyScalar(0.05));
            }

            controls.enabled = false;
            gsap.to(camera.position, {
              x: destCam.x, y: destCam.y, z: destCam.z,
              duration: 1.6, ease: 'power2.inOut',
            });
            gsap.to(controls.target, {
              x: destLook.x, y: destLook.y, z: destLook.z,
              duration: 1.6, ease: 'power2.inOut',
              onComplete: () => {
                controls.enabled = true;
                controls.enableZoom = false;
                controls.enablePan = false;
                controls.minDistance = 0.01;
                controls.maxDistance = 0.1;
                if (destRoom) setActiveRoom(destRoom.name);
              },
            });
          }
          return;
        }

        // 3. Otherwise, if floorHit exists, handle floor teleport
        if (floorHit) {
          const pt = floorHit.point;
          const floorOffset = activeFloor * 3.2;
          const destY = 1.6 + floorOffset;

          // Look direction: keep current horizontal look, just move position
          const lookDir = new THREE.Vector3();
          camera.getWorldDirection(lookDir);
          lookDir.y = 0;
          lookDir.normalize();

          const destPos = new THREE.Vector3(pt.x, destY, pt.z);
          const destLook = destPos.clone().add(lookDir.multiplyScalar(0.05));

          controls.enabled = false;
          gsap.to(camera.position, {
            x: destPos.x, y: destPos.y, z: destPos.z,
            duration: 1.4,
            ease: 'power2.inOut',
          });
          gsap.to(controls.target, {
            x: destLook.x, y: destLook.y, z: destLook.z,
            duration: 1.4,
            ease: 'power2.inOut',
            onComplete: () => {
              controls.enabled = true;
              controls.enableZoom = false;
              controls.enablePan = false;
              controls.minDistance = 0.01;
              controls.maxDistance = 0.1;
              // Detect which room we landed in
              const fl = getLayoutForFloor(localLayout, activeFloor);
              const landed = fl.rooms?.find((r: any) =>
                pt.x >= r.x && pt.x <= r.x + r.width &&
                pt.z >= r.z && pt.z <= r.z + r.depth
              );
              if (landed) setActiveRoom(landed.name);
            },
          });
          trackEvent('floor_teleport', { x: pt.x, z: pt.z });
          return;
        }
      }
    };

    // Keyboard WASD walkthrough state tracker
    const keysPressed = {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'walkthrough') return;
      
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key.toLowerCase()) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        (keysPressed as any)[key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (viewMode !== 'walkthrough') return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key in keysPressed) {
        (keysPressed as any)[key] = false;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (viewMode === 'walkthrough') {
        const direction = event.deltaY < 0 ? 'in' : 'out';
        handleZoom(direction);
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // Keyboard WASD / Arrows Walkthrough movement
      if (viewMode === 'walkthrough' && cameraRef.current && controlsRef.current) {
        const cam = cameraRef.current;
        const ctrls = controlsRef.current;
        
        // Calculate move vector
        const moveVector = new THREE.Vector3();
        const lookDir = new THREE.Vector3();
        cam.getWorldDirection(lookDir);
        lookDir.y = 0;
        lookDir.normalize();
        
        const sideDir = new THREE.Vector3();
        sideDir.crossVectors(lookDir, cam.up).normalize();
        
        const moveSpeed = 0.05;
        
        if (keysPressed.w || keysPressed.ArrowUp) {
          moveVector.add(lookDir);
        }
        if (keysPressed.s || keysPressed.ArrowDown) {
          moveVector.sub(lookDir);
        }
        if (keysPressed.a || keysPressed.ArrowLeft) {
          moveVector.sub(sideDir);
        }
        if (keysPressed.d || keysPressed.ArrowRight) {
          moveVector.add(sideDir);
        }
        
        if (moveVector.lengthSq() > 0) {
          moveVector.normalize().multiplyScalar(moveSpeed);

          // ---------------------------------------------------------------
          // SLIDING COLLISION DETECTION – Orientational sliding raycasts
          // ---------------------------------------------------------------
          const wallMeshes = getWallMeshes();
          const playerRadius = 0.4; // player collision envelope radius
          let finalMove = moveVector.clone();

          const probeDir = finalMove.clone().normalize();
          collisionRaycaster.set(cam.position, probeDir);
          collisionRaycaster.far = playerRadius + moveSpeed;

          const hits = collisionRaycaster.intersectObjects(wallMeshes, false);

          if (hits.length > 0) {
            const hit = hits[0];
            const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
            
            // Transform local face normal to world space
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
            normal.applyMatrix3(normalMatrix).normalize();
            
            // Flatten to horizontal plane (X-Z)
            normal.y = 0;
            normal.normalize();

            // Slide projection
            const dot = finalMove.dot(normal);
            if (dot < 0) {
              finalMove.sub(normal.multiplyScalar(dot));

              // Corner/second wall check
              if (finalMove.lengthSq() > 0.0001) {
                const slideDir = finalMove.clone().normalize();
                collisionRaycaster.set(cam.position, slideDir);
                collisionRaycaster.far = playerRadius + finalMove.length();
                
                const slideHits = collisionRaycaster.intersectObjects(wallMeshes, false);
                if (slideHits.length > 0) {
                  // Double collision blocked (corners), freeze movement
                  finalMove.set(0, 0, 0);
                }
              }
            }
          }

          // Safety clamp check to enforce building flat walls & balcony railings boundary constraints
          const nextX = cam.position.x + finalMove.x;
          const nextZ = cam.position.z + finalMove.z;

          if (isPosWalkable(nextX, nextZ)) {
            cam.position.x = nextX;
            cam.position.z = nextZ;
          } else {
            // Slide along X-axis
            if (isPosWalkable(nextX, cam.position.z)) {
              cam.position.x = nextX;
            } else if (isPosWalkable(cam.position.x, nextZ)) {
              // Slide along Z-axis
              cam.position.z = nextZ;
            }
          }
          
          const floorOffset = activeFloor * 3.2;
          cam.position.y = 1.6 + floorOffset;
          ctrls.target.y = 1.6 + floorOffset;

          // Sync look-target controls target
          const targetOffset = ctrls.target.clone().sub(cam.position);
          ctrls.target.copy(cam.position).add(targetOffset);

          const floorLayout = getLayoutForFloor(localLayout, activeFloor);
          if (floorLayout.rooms) {
            const currentRoom = floorLayout.rooms.find((r: any) => {
              return cam.position.x >= r.x && cam.position.x <= r.x + r.width &&
                     cam.position.z >= r.z && cam.position.z <= r.z + r.depth;
            });
            if (currentRoom && currentRoom.name !== activeRoom) {
              setActiveRoom(currentRoom.name);
            }
          }
        }
      }

      // Animate walkable node rings pulsing
      scene.traverse((child) => {
        if (child.name.startsWith('node_') && child instanceof THREE.Mesh) {
          const time = Date.now() * 0.003;
          const scaleVal = 1.0 + Math.sin(time) * 0.15;
          child.scale.set(scaleVal, 1.0, scaleVal);
          if (child.material && 'opacity' in child.material) {
            child.material.opacity = 0.6 + Math.sin(time) * 0.25;
          }
        }
      });

      // 1. Draw 2D Minimap
      drawMinimap();
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeModel, activeFloor, viewMode, localLayout]); // Updated deps array

  // Project 3D Hotspots to HTML screenspace coordinates
  const updateHotspotPlacement = () => {
    if (!cameraRef.current || hotspots.length === 0 || !containerRef.current) return;
    const camera = cameraRef.current;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    hotspots.forEach((h) => {
      const el = document.getElementById(`hotspot-overlay-${h.id}`);
      if (el) {
        const tempV = new THREE.Vector3(h.posX, h.posY, h.posZ);
        tempV.project(camera);

        // Check if hotspot is in front of the camera frustum (z <= 1)
        if (tempV.z <= 1 && Math.abs(tempV.x) < 1.1 && Math.abs(tempV.y) < 1.1) {
          const x = (tempV.x * 0.5 + 0.5) * width;
          const y = (-(tempV.y * 0.5) + 0.5) * height;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.display = 'flex';
        } else {
          el.style.display = 'none';
        }
      }
    });
  };

  // Bind hotspot calculations inside a secondary fast interval or manual window draw to keep 60fps
  useEffect(() => {
    let animId = 0;
    const loop = () => {
      animId = requestAnimationFrame(loop);
      updateHotspotPlacement();
    };
    if (hotspots.length > 0) {
      loop();
    }
    return () => cancelAnimationFrame(animId);
  }, [hotspots]);

  // Draw 2D Vector Minimap Canvas
  const drawMinimap = () => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || !cameraRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear minimap
    ctx.clearRect(0, 0, w, h);

    // Style backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Draw grid map borders
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    const floorLayout = getLayoutForFloor(localLayout, activeFloor);

    // Define 2D layouts translation (scale walk range x: -10..10, z: -10..10 to fit canvas)
    const scale = 4.2; // pixel multiplier
    const mapX = (x3d: number) => w / 2 + x3d * scale;
    const mapZ = (z3d: number) => h / 2 + z3d * scale; 

    // Draw procedural rooms
    if (floorLayout.rooms) {
      floorLayout.rooms.forEach((r: any) => {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.fillRect(mapX(r.x), mapZ(r.z), r.width * scale, r.depth * scale);
        
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(mapX(r.x), mapZ(r.z), r.width * scale, r.depth * scale);

        // Label rooms
        ctx.fillStyle = '#94a3b8';
        ctx.font = '6px sans-serif';
        const cleanName = r.name.replace(/\(.*?\)/g, '').trim();
        ctx.fillText(cleanName, mapX(r.x) + 3, mapZ(r.z) + 8);
      });

      // Draw walkable nodes as pulsing rings
      floorLayout.rooms.forEach((r: any) => {
        if (!r.node) return;
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mapX(r.node.x), mapZ(r.node.z), 3, 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    // Draw Active camera position & orientation
    const posX = cameraRef.current.position.x;
    const posZ = cameraRef.current.position.z;

    const cX = mapX(posX);
    const cY = mapZ(posZ);

    // Calculate rotation angle
    const dir = new THREE.Vector3();
    cameraRef.current.getWorldDirection(dir);
    const angle = Math.atan2(dir.x, dir.z);

    // Draw look frustum cone
    ctx.fillStyle = 'rgba(0, 245, 212, 0.15)';
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.arc(cX, cY, 20, angle - 0.4, angle + 0.4);
    ctx.closePath();
    ctx.fill();

    // Draw player dot
    ctx.fillStyle = '#00f5d4';
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cX, cY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  };

  // Guided Tour Player Handler
  const handlePlayTour = () => {
    if (!tours || tours.length === 0 || !cameraRef.current || !controlsRef.current) return;
    
    const activeRoute = tours[0].routeJson;
    if (!activeRoute || activeRoute.length === 0) return;

    setIsPlayingTour(true);
    controlsRef.current.enabled = false;
    
    let currentStep = tourIndex;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const playNext = (index: number) => {
      if (index >= activeRoute.length) {
        setIsPlayingTour(false);
        controls.enabled = true;
        setTourIndex(0);
        return;
      }

      setTourIndex(index);
      const pt = activeRoute[index];

      gsap.to(camera.position, {
        x: pt.posX,
        y: pt.posY,
        z: pt.posZ,
        duration: 3.0,
        ease: 'power2.inOut',
      });

      gsap.to(controls.target, {
        x: pt.targetX,
        y: pt.targetY,
        z: pt.targetZ,
        duration: 3.0,
        ease: 'power2.inOut',
        onComplete: () => {
          // Pause for 2s at each point before gliding next
          setTimeout(() => {
            if (isPlayingTour) {
              playNext(index + 1);
            }
          }, 2000);
        },
      });
    };

    playNext(currentStep);
  };

  const handlePauseTour = () => {
    setIsPlayingTour(false);
    if (cameraRef.current) {
      gsap.killTweensOf(cameraRef.current.position);
    }
    if (controlsRef.current) {
      gsap.killTweensOf(controlsRef.current.target);
      controlsRef.current.enabled = true;
    }
  };

  const handleMinimapClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || !cameraRef.current || !controlsRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 4.2; // Must match drawMinimap scale

    const x3d = (clickX - w / 2) / scale;
    const z3d = (clickY - h / 2) / scale;

    const floorLayout = getLayoutForFloor(localLayout, activeFloor);

    if (!floorLayout.rooms) return;

    // Find if clicked inside a room
    let targetRoom = floorLayout.rooms.find((r: any) => {
      return x3d >= r.x && x3d <= r.x + r.width && z3d >= r.z && z3d <= r.z + r.depth;
    });

    // Fallback: find closest room node
    if (!targetRoom) {
      let minDist = Infinity;
      floorLayout.rooms.forEach((r: any) => {
        if (!r.node) return;
        const dist = Math.hypot(r.node.x - x3d, r.node.z - z3d);
        if (dist < minDist) {
          minDist = dist;
          targetRoom = r;
        }
      });
    }

    if (targetRoom && targetRoom.node) {
      controlsRef.current.enabled = false;
      const floorOffset = activeFloor * 3.2;

      const targetCam = new THREE.Vector3(targetRoom.node.x, 1.6 + floorOffset, targetRoom.node.z);
      const targetLook = new THREE.Vector3(targetRoom.node.x, 1.6 + floorOffset, targetRoom.node.z + 0.05);

      gsap.to(cameraRef.current.position, {
        x: targetCam.x,
        y: targetCam.y,
        z: targetCam.z,
        duration: 1.5,
        ease: 'power2.inOut',
      });
      gsap.to(controlsRef.current.target, {
        x: targetLook.x,
        y: targetLook.y,
        z: targetLook.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => {
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
            controlsRef.current.enableZoom = false;
            controlsRef.current.enablePan = false;
            controlsRef.current.minDistance = 0.01;
            controlsRef.current.maxDistance = 0.1;
          }
          setActiveRoom(targetRoom.name);
        },
      });
      trackEvent('minimap_teleport', { roomId: targetRoom.id, roomName: targetRoom.name });
    }
  };

  // Viewport Control Actions
  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const factor = direction === 'in' ? 0.9 : 1.1;
    
    if (viewMode === 'building') {
      camera.position.sub(controlsRef.current.target).multiplyScalar(factor).add(controlsRef.current.target);
    } else {
      let fov = camera.fov * factor;
      camera.fov = Math.max(35, Math.min(85, fov));
      camera.updateProjectionMatrix();
    }
  };

  const handleRotate = (dir: 'left' | 'right') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const offset = dir === 'left' ? -0.15 : 0.15;
    
    const target = controlsRef.current.target;
    const radius = camera.position.distanceTo(target);
    const theta = Math.atan2(camera.position.x - target.x, camera.position.z - target.z) + offset;
    
    camera.position.x = target.x + radius * Math.sin(theta);
    camera.position.z = target.z + radius * Math.cos(theta);
  };

  // Toggle Fullscreen Mode
  const toggleFullscreen = () => {
    const el = containerRef.current?.parentElement;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Setup listener for escape key exit fullscreen
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[550px] bg-black/20 rounded-3xl overflow-hidden group/viewer border border-white/5">
      {/* 3D Canvas element */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* Dynamic Hotspots HTML Projection Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {hotspots.map((h) => (
          <button
            key={h.id}
            id={`hotspot-overlay-${h.id}`}
            onClick={() => setSelectedHotspot(h)}
            className="absolute pointer-events-auto w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-[#00f5d4] hover:bg-[#00f5d4]/90 text-[#0c0f16] flex items-center justify-center rounded-full border border-white shadow-lg shadow-[#00f5d4]/40 transition-transform scale-95 hover:scale-110 active:scale-95 duration-200 select-none animate-pulse"
            style={{ display: 'none' }}
          >
            <Icon 
              icon={
                h.type === 'pricing' ? 'solar:dollar-minimalistic-bold' :
                h.type === 'video' ? 'solar:play-circle-bold' :
                h.type === 'brochure' ? 'solar:document-bold' :
                h.type === 'cta' ? 'solar:link-bold' :
                'solar:info-square-bold'
              } 
              className="text-xs" 
            />
          </button>
        ))}
      </div>

      {/* Floating 2D Minimap Overlay (Interior walkthrough mode only) */}
      {viewMode === 'walkthrough' && (
        <div className="absolute bottom-6 left-6 z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 opacity-60 hover:opacity-100 cursor-pointer">
          <canvas 
            ref={minimapCanvasRef} 
            width={140} 
            height={110} 
            onClick={handleMinimapClick}
            className="block" 
          />
        </div>
      )}

      {/* Walkthrough HUD Controls Legend */}
      {viewMode === 'walkthrough' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 pointer-events-none select-none">
          <div className="flex items-center gap-1.5">
            {['W','A','S','D'].map(k => (
              <span key={k} className="w-5 h-5 bg-white/10 border border-white/20 rounded-md flex items-center justify-center text-[9px] font-bold text-white/70">{k}</span>
            ))}
            <span className="text-[9px] text-white/40 ml-1">Move</span>
          </div>
          <div className="w-px h-4 bg-white/15" />
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-white/40">Drag</span>
            <Icon icon="solar:cursor-bold-duotone" className="text-sm text-[#00f5d4]/70" />
            <span className="text-[9px] text-white/40">Look</span>
          </div>
          <div className="w-px h-4 bg-white/15" />
          <div className="flex items-center gap-1.5">
            <Icon icon="solar:cursor-bold" className="text-xs text-[#00f5d4]" />
            <span className="text-[9px] text-white/40">Click floor to</span>
            <span className="text-[9px] font-bold text-[#00f5d4]">Teleport</span>
          </div>
        </div>
      )}

      {/* Floating Viewport Controls widget (Top-Right) */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={toggleFullscreen}
          className="w-11 h-11 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl group"
          title="Toggle Fullscreen"
        >
          <Icon icon={isFullscreen ? "solar:minimize-square-bold-duotone" : "solar:maximize-square-bold-duotone"} className="text-xl group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={() => handleZoom('in')}
          className="w-11 h-11 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl group"
          title="Zoom In"
        >
          <Icon icon="solar:maximize-bold-duotone" className="text-xl text-primary group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="w-11 h-11 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl group"
          title="Zoom Out"
        >
          <Icon icon="solar:minimize-bold-duotone" className="text-xl text-primary group-hover:scale-110 transition-transform" />
        </button>
        {viewMode === 'building' && (
          <>
            <button
              onClick={() => handleRotate('left')}
              className="w-11 h-11 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl group"
              title="Rotate Left"
            >
              <Icon icon="solar:restart-bold-duotone" className="text-xl flip-x group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button
              onClick={() => handleRotate('right')}
              className="w-11 h-11 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl group"
              title="Rotate Right"
            >
              <Icon icon="solar:restart-bold-duotone" className="text-xl group-hover:rotate-[45deg] transition-transform" />
            </button>
          </>
        )}
      </div>

      {/* Material Configurator Panel (Right side) */}
      {viewMode === 'walkthrough' && (activeRoom || selectedFurnId) && (
        <div className="absolute top-24 right-6 z-10 w-48 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col gap-4 animate-slideInRight shadow-2xl">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-[#00f5d4] uppercase tracking-widest">Configurator</span>
            <button 
              onClick={() => { setActiveRoom(null); setSelectedFurnId(null); }} 
              className="text-white/40 hover:text-white"
            >
              <Icon icon="solar:close-circle-bold" className="text-sm" />
            </button>
          </div>
          
          <div>
            <p className="text-[10px] text-white font-bold leading-tight mb-1">
              {activeRoom ? activeRoom : `Furniture: ${selectedFurnId}`}
            </p>
            <p className="text-[8px] text-white/40 uppercase tracking-wider font-bold">
              {activeRoom ? 'Customize Finish' : 'Pick Material'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {activeRoom ? (
              [
                { id: 'wood', label: 'Oak Wood', icon: 'solar:palette-bold' },
                { id: 'marble', label: 'Marble', icon: 'solar:box-bold' },
                { id: 'tile', label: 'Ceramic', icon: 'solar:widget-bold' },
                { id: 'none', label: 'Standard', icon: 'solar:stop-bold' },
              ].map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => {
                    const updatedLayout = { ...localLayout };
                    const floorLayout = getLayoutForFloor(updatedLayout, activeFloor);
                    const room = floorLayout.rooms?.find((r: any) => r.name === activeRoom);
                    if (room) {
                      room.texture = mat.id === 'none' ? undefined : mat.id;
                      setLocalLayout(updatedLayout);
                      trackEvent('material_change', { room: activeRoom, material: mat.id });
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <Icon icon={mat.icon} className="text-lg text-white/60 group-hover:text-[#00f5d4] transition-colors" />
                  <span className="text-[7px] font-bold text-white/40 uppercase tracking-tighter">{mat.label}</span>
                </button>
              ))
            ) : (
              [
                { id: '#2f4f4f', label: 'Dark Slate', icon: 'solar:palette-bold' },
                { id: '#6b8e23', label: 'Olive', icon: 'solar:palette-bold' },
                { id: '#8b4513', label: 'Saddle', icon: 'solar:palette-bold' },
                { id: '#222222', label: 'Onyx', icon: 'solar:palette-bold' },
              ].map((color) => (
                <button
                  key={color.id}
                  onClick={() => {
                    const updatedLayout = { ...localLayout };
                    const floorLayout = getLayoutForFloor(updatedLayout, activeFloor);
                    const furn = floorLayout.furniture?.find((f: any) => f.id === selectedFurnId);
                    if (furn) {
                      furn.color = color.id;
                      setLocalLayout(updatedLayout);
                      trackEvent('furniture_color_change', { id: selectedFurnId, color: color.id });
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color.id }} />
                  <span className="text-[7px] font-bold text-white/40 uppercase tracking-tighter">{color.label}</span>
                </button>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-white/5">
            <p className="text-[7px] text-white/30 italic leading-tight">Changing materials updates your view instantly.</p>
          </div>
        </div>
      )}

      {/* Floating Guided Tour Player widget (Bottom-Right) */}
      {tours.length > 0 && viewMode === 'walkthrough' && activeRoom === null && (
        <div className="absolute bottom-6 right-6 z-10 bg-black/60 backdrop-blur-md border border-white/15 px-4 py-2 rounded-full flex items-center gap-3">
          <span className="text-[9px] font-label-caps text-white font-bold tracking-widest uppercase">GUIDED TOUR</span>
          <div className="h-4 w-[1px] bg-white/20"></div>
          {isPlayingTour ? (
            <button
              onClick={handlePauseTour}
              className="w-9 h-9 bg-[#00f5d4] hover:bg-[#00f5d4]/85 text-black rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-[#00f5d4]/20"
            >
              <Icon icon="solar:pause-bold" className="text-sm" />
            </button>
          ) : (
            <button
              onClick={handlePlayTour}
              className="w-9 h-9 bg-white hover:bg-neutral-100 text-black rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
            >
              <Icon icon="solar:play-bold" className="text-sm ml-0.5" />
            </button>
          )}
          {isPlayingTour && (
            <span className="text-[9px] text-white/50 font-bold tracking-wide">
              Step {tourIndex + 1}/{tours[0].routeJson.length}
            </span>
          )}
        </div>
      )}

      {/* Hotspot details overlay modal */}
      {selectedHotspot && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex justify-center items-center p-6 transition-all duration-300">
          <div className="bg-[#0c0f16]/95 border border-white/15 max-w-sm w-full rounded-3xl p-6 shadow-2xl relative text-stone-100 animate-fadeIn overflow-hidden">
            {/* Ambient blur backdrop */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00f5d4]/10 blur-2xl rounded-full"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] font-label-caps tracking-widest text-[#00f5d4] font-bold block uppercase mb-1">{selectedHotspot.type} HOTSPOT</span>
                <h4 className="text-lg font-display-xl font-light text-white leading-tight">{selectedHotspot.contentJson.title}</h4>
              </div>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <Icon icon="solar:close-circle-bold" className="text-lg" />
              </button>
            </div>

            <p className="text-xs text-stone-400 font-body-md leading-relaxed mt-2">{selectedHotspot.contentJson.description}</p>

            {/* Custom Content render based on Hotspot Type */}
            {selectedHotspot.type === 'pricing' && (
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div>
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Investment Value</span>
                  <span className="text-xl font-display-xl font-bold text-[#00f5d4]">
                    ₹{(selectedHotspot.contentJson.price! / 10000000).toFixed(2)} Cr
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
                  AVAILABLE
                </span>
              </div>
            )}

            {selectedHotspot.type === 'video' && selectedHotspot.contentJson.videoUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 aspect-video bg-neutral-950">
                <video src={selectedHotspot.contentJson.videoUrl} controls autoPlay className="w-full h-full object-cover" />
              </div>
            )}

            {/* Footer actions inside hotspot modal */}
            <div className="mt-6 pt-6 border-t border-white/5 flex gap-3">
              <button
                onClick={() => setSelectedHotspot(null)}
                className="flex-1 py-3 text-[9px] font-bold uppercase tracking-wider border border-white/10 hover:bg-white/5 rounded-xl transition-colors text-center text-white"
              >
                Close View
              </button>
              {selectedHotspot.type === 'cta' && (
                <button
                  onClick={() => {
                    setSelectedHotspot(null);
                    const el = document.getElementById('inquiry');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex-1 py-3 text-[9px] font-bold uppercase tracking-wider bg-[#00f5d4] text-black font-semibold rounded-xl hover:bg-[#00f5d4]/85 transition-colors text-center"
                >
                  {selectedHotspot.contentJson.buttonText || 'Schedule visit'}
                </button>
              )}
              {selectedHotspot.type === 'brochure' && selectedHotspot.contentJson.linkUrl && (
                <a
                  href={selectedHotspot.contentJson.linkUrl}
                  onClick={() => setSelectedHotspot(null)}
                  className="flex-1 py-3 text-[9px] font-bold uppercase tracking-wider bg-white text-black font-semibold rounded-xl hover:bg-neutral-100 transition-colors text-center block"
                >
                  Read Layout Plan
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0f16]/85 backdrop-blur-sm z-20">
          <div className="w-10 h-10 border-4 border-[#00f5d4] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[9px] font-label-caps tracking-[0.2em] text-[#00f5d4] font-bold mt-6 uppercase">
            {viewMode === 'building' ? 'Loading Spatial Twin...' : 'Entering walkthrough environment...'}
          </span>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/20 backdrop-blur-md border border-red-500/20 rounded-3xl z-20">
          <span className="text-3xl mb-3">🛰️</span>
          <span className="text-xs text-red-400 font-bold uppercase tracking-wider">{error}</span>
        </div>
      )}
    </div>
  );
}
