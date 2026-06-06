'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

const defaultLayoutData = {
  rooms: [
    { id: 'room-1', name: 'Living Room (Flat A)', x: -4, z: -4, width: 4.5, depth: 5.5, color: '#f5efe6', node: { x: -1.75, z: -1.25 } },
    { id: 'room-2', name: 'Master Bed (Flat A)', x: 1, z: -4, width: 4, depth: 4, color: '#e3ece9', node: { x: 3, z: -2 } },
    { id: 'room-3', name: 'Kitchen (Flat A)', x: -4, z: 2.5, width: 4.5, depth: 3, color: '#f4ece1', node: { x: -1.75, z: 4 } },
    { id: 'room-4', name: 'Living Room (Flat B)', x: 6, z: -4, width: 4.5, depth: 5.5, color: '#f5efe6', node: { x: 8.25, z: -1.25 } },
    { id: 'room-5', name: 'Guest Bed (Flat B)', x: 11, z: -4, width: 4, depth: 4, color: '#ece8f2', node: { x: 13, z: -2 } }
  ],
  walls: [
    { id: 'w-1-1', startX: -4, startZ: -4, endX: 0.5, endZ: -4, thickness: 0.2, height: 3.0 },
    { id: 'w-1-2', startX: 0.5, startZ: -4, endX: 0.5, endZ: 1.5, thickness: 0.2, height: 3.0 },
    { id: 'w-1-3', startX: 0.5, startZ: 1.5, endX: -4, endZ: 1.5, thickness: 0.2, height: 3.0 },
    { id: 'w-1-4', startX: -4, startZ: 1.5, endX: -4, endZ: -4, thickness: 0.2, height: 3.0 },
    
    { id: 'w-2-1', startX: 1, startZ: -4, endX: 5, endZ: -4, thickness: 0.2, height: 3.0 },
    { id: 'w-2-2', startX: 5, startZ: -4, endX: 5, endZ: 0, thickness: 0.2, height: 3.0 },
    { id: 'w-2-3', startX: 5, startZ: 0, endX: 1, endZ: 0, thickness: 0.2, height: 3.0 },
    { id: 'w-2-4', startX: 1, startZ: 0, endX: 1, endZ: -4, thickness: 0.2, height: 3.0 },

    { id: 'w-3-1', startX: -4, startZ: 2.5, endX: 0.5, endZ: 2.5, thickness: 0.2, height: 3.0 },
    { id: 'w-3-2', startX: 0.5, startZ: 2.5, endX: 0.5, endZ: 5.5, thickness: 0.2, height: 3.0 },
    { id: 'w-3-3', startX: 0.5, startZ: 5.5, endX: -4, endZ: 5.5, thickness: 0.2, height: 3.0 },
    { id: 'w-3-4', startX: -4, startZ: 5.5, endX: -4, endZ: 2.5, thickness: 0.2, height: 3.0 },

    { id: 'w-4-1', startX: 6, startZ: -4, endX: 10.5, endZ: -4, thickness: 0.2, height: 3.0 },
    { id: 'w-4-2', startX: 10.5, startZ: -4, endX: 10.5, endZ: 1.5, thickness: 0.2, height: 3.0 },
    { id: 'w-4-3', startX: 10.5, startZ: 1.5, endX: 6, endZ: 1.5, thickness: 0.2, height: 3.0 },
    { id: 'w-4-4', startX: 6, startZ: 1.5, endX: 6, endZ: -4, thickness: 0.2, height: 3.0 },

    { id: 'w-5-1', startX: 11, startZ: -4, endX: 15, endZ: -4, thickness: 0.2, height: 3.0 },
    { id: 'w-5-2', startX: 15, startZ: -4, endX: 15, endZ: 0, thickness: 0.2, height: 3.0 },
    { id: 'w-5-3', startX: 15, startZ: 0, endX: 11, endZ: 0, thickness: 0.2, height: 3.0 },
    { id: 'w-5-4', startX: 11, startZ: 0, endX: 11, endZ: -4, thickness: 0.2, height: 3.0 }
  ],
  apertures: [
    { id: 'ap-1', wallId: 'w-1-1', type: 'window', startOffset: 1.5, width: 1.5, height: 1.2, elevation: 0.9 },
    { id: 'ap-2', wallId: 'w-1-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
    { id: 'ap-3', wallId: 'w-2-1', type: 'window', startOffset: 1.2, width: 1.5, height: 1.2, elevation: 0.9 },
    { id: 'ap-4', wallId: 'w-2-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
    { id: 'ap-5', wallId: 'w-3-3', type: 'window', startOffset: 1.5, width: 1.2, height: 1.2, elevation: 0.9 },
    { id: 'ap-6', wallId: 'w-3-1', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
    { id: 'ap-7', wallId: 'w-4-1', type: 'window', startOffset: 1.5, width: 1.5, height: 1.2, elevation: 0.9 },
    { id: 'ap-8', wallId: 'w-4-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 },
    { id: 'ap-9', wallId: 'w-5-1', type: 'window', startOffset: 1.2, width: 1.5, height: 1.2, elevation: 0.9 },
    { id: 'ap-10', wallId: 'w-5-3', type: 'door', startOffset: 1.0, width: 0.9, height: 2.1, elevation: 0 }
  ],
  furniture: [
    { id: 'f-1', type: 'sofa', roomId: 'room-1', x: -3.5, z: -2.5, rotation: 0 },
    { id: 'f-2', type: 'bed', roomId: 'room-2', x: 3, z: -2.5, rotation: 90 },
    { id: 'f-3', type: 'table', roomId: 'room-3', x: -2, z: 3, rotation: 0 },
    { id: 'f-4', type: 'sofa', roomId: 'room-4', x: 6.5, z: -2.5, rotation: 0 },
    { id: 'f-5', type: 'bed', roomId: 'room-5', x: 13, z: -2.5, rotation: 90 }
  ]
};

function buildFloorPlanMesh(layout: typeof defaultLayoutData, floorHeightOffset: number, isActiveFloor: boolean) {
  const floorGroup = new THREE.Group();

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = Infinity;
  layout.rooms.forEach(r => {
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.width);
    minZ = Math.min(minZ, r.z);
    maxZ = Math.max(maxZ, r.z + r.depth);
  });
  
  minX -= 1;
  maxX += 1;
  minZ -= 1;
  maxZ += 1;

  const slabWidth = maxX - minX;
  const slabDepth = maxZ - minZ;

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

  layout.rooms.forEach(r => {
    const rGeo = new THREE.BoxGeometry(r.width, 0.02, r.depth);
    const rMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r.color || '#374151'),
      roughness: 0.6
    });
    const rMesh = new THREE.Mesh(rGeo, rMat);
    rMesh.position.set(r.x + r.width / 2, 0.01 + floorHeightOffset, r.z + r.depth / 2);
    rMesh.receiveShadow = true;
    floorGroup.add(rMesh);
  });

  layout.walls.forEach(w => {
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

    const wallApertures = (layout.apertures || []).filter(ap => ap.wallId === w.id);

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

      sortedAps.forEach(ap => {
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
            opacity: 0.4,
            roughness: 0.1,
            metalness: 0.9
          });
          const glassMesh = new THREE.Mesh(glassGeo, glassMat);
          
          const windowGroup = new THREE.Group();
          windowGroup.add(frameMesh);
          windowGroup.add(glassMesh);

          windowGroup.position.set(px, ap.elevation + ap.height / 2 + floorHeightOffset, pz);
          windowGroup.rotation.y = -angle;
          floorGroup.add(windowGroup);
        } else if (ap.type === 'door') {
          const frameGeo = new THREE.BoxGeometry(ap.width, ap.height, thickness * 1.2);
          const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.6 });
          const frameMesh = new THREE.Mesh(frameGeo, frameMat);

          frameMesh.position.set(px, ap.elevation + ap.height / 2 + floorHeightOffset, pz);
          frameMesh.rotation.y = -angle;
          floorGroup.add(frameMesh);
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

  if (isActiveFloor && layout.furniture) {
    layout.furniture.forEach(f => {
      const furnGroup = new THREE.Group();
      let color = 0x8b5a2b;
      let w = 1.0, h = 0.5, d = 1.0;

      if (f.type === 'sofa') {
        color = 0x3b82f6;
        w = 1.8; h = 0.8; d = 0.9;
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
        base.position.y = 0.2;
        base.castShadow = true;
        furnGroup.add(base);
        const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 0.25), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
        back.position.set(0, 0.5, -d/2 + 0.125);
        back.castShadow = true;
        furnGroup.add(back);
      } else if (f.type === 'bed') {
        color = 0x8b5cf6;
        w = 1.6; h = 0.5; d = 2.0;
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.8 }));
        base.position.y = 0.15;
        base.castShadow = true;
        furnGroup.add(base);
        const mat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.25, d - 0.1), new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.9 }));
        mat.position.y = 0.425;
        mat.castShadow = true;
        furnGroup.add(mat);
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
        pillow.position.set(0, 0.58, -d/2 + 0.3);
        furnGroup.add(pillow);
      } else if (f.type === 'table') {
        color = 0xd97706;
        w = 1.2; h = 0.75; d = 0.8;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
        top.position.y = h;
        top.castShadow = true;
        furnGroup.add(top);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, h);
        for (let i = 0; i < 4; i++) {
          const leg = new THREE.Mesh(legGeo, legMat);
          const lx = (i % 2 === 0 ? 1 : -1) * (w / 2 - 0.1);
          const lz = (i < 2 ? 1 : -1) * (d / 2 - 0.1);
          leg.position.set(lx, h / 2, lz);
          leg.castShadow = true;
          furnGroup.add(leg);
        }
      }

      furnGroup.position.set(f.x, floorHeightOffset, f.z);
      furnGroup.rotation.y = (f.rotation * Math.PI) / 180;
      floorGroup.add(furnGroup);
    });
  }

  return floorGroup;
}

interface BuildingViewerProps {
  activeFloor: number;
  viewMode: 'building' | 'walkthrough';
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

export default function BuildingViewer({
  activeFloor,
  viewMode,
  activeRoom,
  setActiveRoom,
  isEmbedded = false,
  initialModels,
  initialHotspots,
  initialTours,
  initialTenantId,
  projectId,
  sdkKey,
}: BuildingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Unique Session ID for analytics tracking
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(initialTenantId || null);
  const [models, setModels] = useState<DigitalTwinModel[]>(initialModels || []);
  const [activeModel, setActiveModel] = useState<DigitalTwinModel | null>(null);
  const [layoutData, setLayoutData] = useState<any>(null);
  
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots || []);
  const [tours, setTours] = useState<TourRoute[]>(initialTours || []);
  
  // Interactive UI
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [tourIndex, setTourIndex] = useState<number>(0);
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
          const fpWithLayout = data.find((fp) => fp.layoutData && fp.layoutData.rooms);
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

  // Handle room tours (glide camera inside room center)
  useEffect(() => {
    if (viewMode !== 'walkthrough' || !cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (activeRoom === null) {
      controls.enabled = false;
      gsap.to(camera.position, { x: 0, y: 1.6, z: 4.0, duration: 1.8, ease: 'power2.inOut' });
      gsap.to(controls.target, {
        x: 0,
        y: 1.6,
        z: 4.05,
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
    } else {
      controls.enabled = false;
      gsap.to(camera.position, {
        x: targetCameraPosRef.current.x,
        y: targetCameraPosRef.current.y,
        z: targetCameraPosRef.current.z,
        duration: 2.2,
        ease: 'power2.inOut',
      });
      gsap.to(controls.target, {
        x: targetControlsTargetRef.current.x,
        y: targetControlsTargetRef.current.y,
        z: targetControlsTargetRef.current.z,
        duration: 2.2,
        ease: 'power2.inOut',
        onComplete: () => {
          controls.enabled = true;
          controls.enableZoom = false;
          controls.enablePan = false;
          controls.minDistance = 0.01;
          controls.maxDistance = 0.1;
        },
      });
    }
  }, [activeRoom, viewMode]);

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
    container.appendChild(renderer.domElement);

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
      camera.fov = 70;
      camera.updateProjectionMatrix();
      camera.position.set(0, 1.6, 4.0);
      controls.target.set(0, 1.6, 4.05);
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minDistance = 0.01;
      controls.maxDistance = 0.1;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    // Generate Procedural Structure from Layout
    const activeLayout = layoutData || defaultLayoutData;
    const proceduralGroup = new THREE.Group();
    proceduralGroup.name = "procedural_building";

    if (viewMode === 'building') {
      // Stack multiple floors (procedural building shell)
      const numFloors = 10;
      for (let fNum = 0; fNum < numFloors; fNum++) {
        const floorOffset = fNum * 3.2;
        const isAct = fNum === activeFloor;
        const floorMesh = buildFloorPlanMesh(activeLayout, floorOffset, isAct);
        proceduralGroup.add(floorMesh);
      }
      scene.add(proceduralGroup);
      setLoading(false);
    } else {
      // Walkthrough mode: render active floor and add walkable nodes
      const floorOffset = activeFloor * 3.2;
      const floorMesh = buildFloorPlanMesh(activeLayout, floorOffset, true);
      proceduralGroup.add(floorMesh);

      // Add walkable nodes
      activeLayout.rooms.forEach((r: any) => {
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

      scene.add(proceduralGroup);

      // Position camera appropriately
      if (activeRoom === null) {
        camera.position.set(0, 1.6 + floorOffset, 5.0);
        controls.target.set(0, 1.6 + floorOffset, 5.05);
      } else {
        const currentRoom = activeLayout.rooms.find((r: any) => r.name === activeRoom);
        if (currentRoom) {
          camera.position.set(currentRoom.node.x, 1.6 + floorOffset, currentRoom.node.z);
          controls.target.set(currentRoom.node.x, 1.6 + floorOffset, currentRoom.node.z + 0.05);
        }
      }
      setLoading(false);
    }

    // Raycast click handler for hotspots & nodes
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (viewMode !== 'walkthrough') return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let clickedObj: THREE.Object3D | null = intersects[0].object;
        let nodeName = '';

        let tempObj: THREE.Object3D | null = clickedObj;
        while (tempObj && tempObj !== scene) {
          if (tempObj.name.startsWith('node_')) {
            nodeName = tempObj.name;
            break;
          }
          tempObj = tempObj.parent;
        }

        if (nodeName) {
          const roomId = nodeName.replace('node_', '');
          const room = activeLayout.rooms.find((r: any) => r.id === roomId);
          if (room) {
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

        // Fallback door clicks
        let doorMesh: THREE.Object3D | null = null;
        let doorName = '';

        while (clickedObj && clickedObj !== scene) {
          if (clickedObj.name.toLowerCase().includes('door')) {
            doorMesh = clickedObj;
            doorName = clickedObj.name;
            break;
          }
          clickedObj = clickedObj.parent;
        }

        if (doorMesh && doorName) {
          const doorWorldPos = new THREE.Vector3();
          doorMesh.getWorldPosition(doorWorldPos);

          const calculatedCameraPos = new THREE.Vector3();
          const calculatedControlsTarget = new THREE.Vector3();

          if (doorWorldPos.x < -2) {
            calculatedCameraPos.set(doorWorldPos.x - 3.0, 1.6, doorWorldPos.z);
            calculatedControlsTarget.set(doorWorldPos.x - 3.05, 1.6, doorWorldPos.z);
          } else if (doorWorldPos.x > 2) {
            calculatedCameraPos.set(doorWorldPos.x + 3.0, 1.6, doorWorldPos.z);
            calculatedControlsTarget.set(doorWorldPos.x + 3.05, 1.6, doorWorldPos.z);
          } else {
            calculatedCameraPos.set(doorWorldPos.x, 1.6, doorWorldPos.z + 3.0);
            calculatedControlsTarget.set(doorWorldPos.x, 1.6, doorWorldPos.z + 3.05);
          }

          targetCameraPosRef.current.copy(calculatedCameraPos);
          targetControlsTargetRef.current.copy(calculatedControlsTarget);

          const suffix = doorName.replace(/DoorGroup_/i, '').replace(/Door_/i, '').replace(/Mesh/i, '').trim();
          setActiveRoom(suffix ? `Flat ${suffix}` : 'Flat Interior');
        }
      }
    };

    renderer.domElement.addEventListener('click', handlePointerDown);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

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
      renderer.domElement.removeEventListener('click', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeModel, activeFloor, viewMode, layoutData]);

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

    const activeLayout = layoutData || defaultLayoutData;

    // Define 2D layouts translation (scale walk range x: -10..10, z: -10..10 to fit canvas)
    const scale = 4.2; // pixel multiplier
    const mapX = (x3d: number) => w / 2 + x3d * scale;
    const mapZ = (z3d: number) => h / 2 + z3d * scale; 

    // Draw procedural rooms
    activeLayout.rooms.forEach(r => {
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
    activeLayout.rooms.forEach(r => {
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mapX(r.node.x), mapZ(r.node.z), 3, 0, Math.PI * 2);
      ctx.stroke();
    });

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
      {viewMode === 'walkthrough' && activeRoom === null && (
        <div className="absolute bottom-6 left-6 z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 opacity-60 hover:opacity-100">
          <canvas ref={minimapCanvasRef} width={140} height={110} className="block" />
        </div>
      )}

      {/* Floating Viewport Controls widget (Top-Right) */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all"
          title="Toggle Fullscreen"
        >
          <Icon icon={isFullscreen ? "solar:minimize-square-bold-duotone" : "solar:maximize-square-bold-duotone"} className="text-lg" />
        </button>
        <button
          onClick={() => handleZoom('in')}
          className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all"
          title="Zoom In"
        >
          <Icon icon="solar:maximize-bold-duotone" className="text-lg text-primary" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all"
          title="Zoom Out"
        >
          <Icon icon="solar:minimize-bold-duotone" className="text-lg text-primary" />
        </button>
        {viewMode === 'building' && (
          <>
            <button
              onClick={() => handleRotate('left')}
              className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all"
              title="Rotate Left"
            >
              <Icon icon="solar:restart-bold-duotone" className="text-lg flip-x" />
            </button>
            <button
              onClick={() => handleRotate('right')}
              className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center transition-all"
              title="Rotate Right"
            >
              <Icon icon="solar:restart-bold-duotone" className="text-lg" />
            </button>
          </>
        )}
      </div>

      {/* Floating Guided Tour Player widget (Bottom-Right) */}
      {tours.length > 0 && viewMode === 'walkthrough' && activeRoom === null && (
        <div className="absolute bottom-6 right-6 z-10 bg-black/60 backdrop-blur-md border border-white/15 px-4 py-2 rounded-full flex items-center gap-3">
          <span className="text-[9px] font-label-caps text-white font-bold tracking-widest uppercase">GUIDED TOUR</span>
          <div className="h-4 w-[1px] bg-white/20"></div>
          {isPlayingTour ? (
            <button
              onClick={handlePauseTour}
              className="w-7 h-7 bg-[#00f5d4] hover:bg-[#00f5d4]/85 text-black rounded-full flex items-center justify-center transition-colors"
            >
              <Icon icon="solar:pause-bold" className="text-xs" />
            </button>
          ) : (
            <button
              onClick={handlePlayTour}
              className="w-7 h-7 bg-white hover:bg-neutral-100 text-black rounded-full flex items-center justify-center transition-colors"
            >
              <Icon icon="solar:play-bold" className="text-xs ml-0.5" />
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
