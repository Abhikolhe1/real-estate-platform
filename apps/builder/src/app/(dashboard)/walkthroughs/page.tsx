'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@iconify/react';
import gsap from 'gsap';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneCompiler } from '@/components/scene-compiler/SceneCompiler';

interface Project {
  id: string;
  name: string;
}

interface DigitalTwinModel {
  id: string;
  projectId: string;
  name: string;
  modelUrl: string;
  modelType: 'exterior' | 'interior';
  fileSize: number;
  status: string;
}

interface Hotspot {
  id: string;
  name: string;
  type: 'info' | 'pricing' | 'video' | 'brochure' | 'cta';
  posX: number;
  posY: number;
  posZ: number;
  contentJson: any;
}

interface CameraPoint {
  id: string;
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
  routeJson: any[];
}

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
    { id: 'w-2bhk-out-top', startX: -8, startZ: -5, endX: 8, endZ: -5, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-right', startX: 8, startZ: -5, endX: 8, endZ: 6, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-bottom', startX: 8, startZ: 6, endX: -8, endZ: 6, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-out-left', startX: -8, startZ: 6, endX: -8, endZ: -5, thickness: 0.2, height: 3.0 },
    { id: 'w-2bhk-int-mid', startX: 0, startZ: -5, endX: 0, endZ: 4, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-lobby', startX: -8, startZ: 4, endX: 8, endZ: 4, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-a-horiz', startX: -8, startZ: -1, endX: 0, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-b-horiz', startX: 0, startZ: -1, endX: 8, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-a-vert', startX: -4, startZ: -5, endX: -4, endZ: -1, thickness: 0.15, height: 3.0 },
    { id: 'w-2bhk-int-flat-b-vert', startX: 4, startZ: -5, endX: 4, endZ: -1, thickness: 0.15, height: 3.0 }
  ],
  apertures: [
    { id: 'ap-entrance-a-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 3.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-entrance-b-2bhk', wallId: 'w-2bhk-int-lobby', type: 'door', startOffset: 11.5, width: 1.0, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-door-bedroom-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-arch-kitchen-a-2bhk', wallId: 'w-2bhk-int-flat-a-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
    { id: 'ap-door-bedroom-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'door', startOffset: 5.5, width: 0.9, height: 2.1, elevation: 0.0, swing: -1 },
    { id: 'ap-arch-kitchen-b-2bhk', wallId: 'w-2bhk-int-flat-b-horiz', type: 'arch', startOffset: 1.5, width: 1.2, height: 2.1, elevation: 0.0 },
    { id: 'ap-balcony-door-a-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 5.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
    { id: 'ap-balcony-door-b-2bhk', wallId: 'w-2bhk-out-top', type: 'door', startOffset: 13.5, width: 1.0, height: 2.1, elevation: 0.0, swing: 1 },
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

export default function WalkthroughsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId;

  // States
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [models, setModels] = useState<DigitalTwinModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<DigitalTwinModel | null>(null);
  
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [cameraPoints, setCameraPoints] = useState<CameraPoint[]>([]);
  const [tours, setTours] = useState<TourRoute[]>([]);

  const [localLayout, setLocalLayout] = useState<any>(null);
  const [structureFetchError, setStructureFetchError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  
  // Modals / Overlays
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHotspotDrawer, setShowHotspotDrawer] = useState(false);
  const [showViewpointModal, setShowViewpointModal] = useState(false);
  
  // Model Upload Form
  const [newModelName, setNewModelName] = useState('');
  const [newModelType, setNewModelType] = useState<'exterior' | 'interior'>('exterior');
  const [newModelUrl, setNewModelUrl] = useState('/building.glb');

  // Hotspot Drawer Form
  const [hotspotName, setHotspotName] = useState('');
  const [hotspotType, setHotspotType] = useState<'info' | 'pricing' | 'video' | 'brochure' | 'cta'>('info');
  const [hotspotDesc, setHotspotDesc] = useState('');
  const [hotspotPrice, setHotspotPrice] = useState(25000000);
  const [hotspotLink, setHotspotLink] = useState('');
  const [hotspotBtnText, setHotspotBtnText] = useState('View Details');
  const [clickCoord, setClickCoord] = useState<{ x: number; y: number; z: number } | null>(null);

  // Viewpoint Form
  const [viewpointName, setViewpointName] = useState('');
  const [tempCameraCoords, setTempCameraCoords] = useState<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loading3D, setLoading3D] = useState(false);

  // 3D Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    loadedModel: THREE.Group | null;
    pinsGroup: THREE.Group;
    cleanup: () => void;
  } | null>(null);

  // Active Placement mode states
  const [isPlacingHotspot, setIsPlacingHotspot] = useState(false);
  const [isPlayingTour, setIsPlayingTour] = useState(false);

  // Load Projects
  useEffect(() => {
    if (!token || !tenantId) return;

    fetch('http://localhost:3001/projects', {
      headers: {
        'x-tenant-id': tenantId,
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setSelectedProjectId(data[0].id);
        }
      })
      .catch((err) => console.error('Error fetching projects:', err));
  }, [token, tenantId]);

  // Fetch LayoutData and structureJson dynamically for the project
  useEffect(() => {
    if (!selectedProjectId || !token || !tenantId) return;

    setStructureFetchError(null);
    fetch(`http://localhost:3001/floorplans`, {
      headers: { 
        'x-tenant-id': tenantId,
        'Authorization': `Bearer ${token}`
      },
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (data && Array.isArray(data)) {
          // Find floorplan for the selected project
          const projFp = data.find((fp) => fp.projectId === selectedProjectId);
          if (projFp) {
            if (projFp.status === 'parsed' || projFp.status === 'GENERATED' || projFp.status === 'generated') {
              try {
                const resStruct = await fetch(`http://localhost:3001/structures/${projFp.structureId}`, {
                  headers: { 
                    'x-tenant-id': tenantId,
                    'Authorization': `Bearer ${token}`
                  },
                });
                if (resStruct.ok) {
                  const sJson = await resStruct.json();
                  setLocalLayout(sJson);
                  return;
                }
              } catch (err) {
                console.error('Failed to fetch structureJson:', err);
                setStructureFetchError('Failed to fetch structure details from server.');
              }
            }
            if (projFp.layoutData) {
              setLocalLayout(projFp.layoutData);
              return;
            }
          }
        }
        setLocalLayout(defaultLayoutData);
      })
      .catch((err) => {
        console.error('Error fetching floorplans:', err);
        setLocalLayout(defaultLayoutData);
      });
  }, [selectedProjectId, token, tenantId]);

  // Load Models when Project changes
  useEffect(() => {
    if (!selectedProjectId || !token || !tenantId) return;
    setLoading(true);
    fetch(`http://localhost:3001/digital-twin/models?projectId=${selectedProjectId}`, {
      headers: {
        'x-tenant-id': tenantId,
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setModels(data || []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedModel(data[0]);
        } else {
          setSelectedModel(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedProjectId, token, tenantId]);

  // Load Model-specific components
  useEffect(() => {
    if (!selectedModel || !token || !tenantId) {
      setHotspots([]);
      setCameraPoints([]);
      setTours([]);
      return;
    }

    const headers = {
      'x-tenant-id': tenantId,
      'Authorization': `Bearer ${token}`,
    };

    Promise.all([
      fetch(`http://localhost:3001/digital-twin/models/${selectedModel.id}/hotspots`, { headers }).then((r) => r.json()),
      fetch(`http://localhost:3001/digital-twin/models/${selectedModel.id}/camera-points`, { headers }).then((r) => r.json()),
      fetch(`http://localhost:3001/digital-twin/models/${selectedModel.id}/tours`, { headers }).then((r) => r.json()),
    ])
      .then(([hotspotsData, pointsData, toursData]) => {
        setHotspots(hotspotsData || []);
        setCameraPoints(pointsData || []);
        setTours(toursData || []);
      })
      .catch((err) => console.error('Error loading model assets:', err));
  }, [selectedModel, token, tenantId]);

  // Minimap canvas ref
  const minimapRef = useRef<HTMLCanvasElement>(null);

  // Walk state ref (persistent across renders, not causing re-renders)
  const walkRef = useRef({
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  });

  // Initialize and Render 3D Scene
  useEffect(() => {
    if (!canvasRef.current || !selectedModel) {
      if (threeRef.current) {
        threeRef.current.cleanup();
        threeRef.current = null;
      }
      return;
    }

    setLoading3D(true);
    const canvas = canvasRef.current;
    const container = canvas.parentElement!;
    const width = container.clientWidth;
    const height = 550;

    // ── Scene ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const isInterior = selectedModel.modelType === 'interior';
    scene.background = new THREE.Color(isInterior ? 0x0c0f16 : 0xf8fafc);

    // ── Camera ────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(isInterior ? 75 : 45, width / height, 0.05, 1000);
    camera.position.set(0, isInterior ? 1.6 : 35, isInterior ? 5.0 : 35);

    // ── Renderer ──────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Orbit Controls ────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    if (isInterior) {
      // First-person mode: disable zoom/pan, very restricted distance
      controls.target.set(0, 1.6, 5.05);
      controls.maxPolarAngle = Math.PI / 2 + 0.3; // allow slight downward look
      controls.minPolarAngle = Math.PI / 6;        // can't look straight up
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minDistance = 0.01;
      controls.maxDistance = 0.1;
      controls.rotateSpeed = 0.5;
    } else {
      controls.target.set(0, 10, 0);
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minDistance = 5;
      controls.maxDistance = 120;
    }

    // ── Lights ────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, isInterior ? 0.45 : 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isInterior ? 1.2 : 0.85);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(isInterior ? 0x00f5d4 : 0x6366f1, 0.35);
    fillLight.position.set(-15, 10, -15);
    scene.add(fillLight);

    // ── Grid (exterior only) ──────────────────────────────────────────
    if (!isInterior) {
      const gridHelper = new THREE.GridHelper(50, 25, 0x6366f1, 0xe2e8f0);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);
    } else {
      // Interior: add a dark floor plane + grid
      const floorGeo = new THREE.PlaneGeometry(40, 40);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.name = 'walkthroughFloor';
      floor.userData.isFloor = true;
      floor.receiveShadow = true;
      scene.add(floor);

      const gridHelper = new THREE.GridHelper(40, 20, 0x00f5d4, 0x1f2937);
      if (gridHelper.material instanceof THREE.Material) {
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
      }
      gridHelper.position.y = 0.01;
      scene.add(gridHelper);

      // Hover ring for floor teleportation
      const ringGeo = new THREE.RingGeometry(0.28, 0.42, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f5d4, transparent: true, opacity: 0.75,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const hoverRing = new THREE.Mesh(ringGeo, ringMat);
      hoverRing.name = 'hoverRing';
      hoverRing.visible = false;
      scene.add(hoverRing);

      // Mouse-move: project hover ring on floor
      const floorRaycaster = new THREE.Raycaster();
      const floorMouse = new THREE.Vector2();
      const handleMouseMove = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        floorMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        floorMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        floorRaycaster.setFromCamera(floorMouse, camera);
        const floorMeshes: THREE.Mesh[] = [];
        scene.traverse(o => { if (o instanceof THREE.Mesh && o.userData.isFloor) floorMeshes.push(o); });
        const hits = floorRaycaster.intersectObjects(floorMeshes, false);
        if (hits.length > 0) {
          hoverRing.position.set(hits[0].point.x, hits[0].point.y + 0.02, hits[0].point.z);
          hoverRing.visible = true;
          ringMat.opacity = 0.55 + Math.sin(Date.now() * 0.006) * 0.2;
        } else {
          hoverRing.visible = false;
        }
      };
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
    }

    // ── Pins Group ────────────────────────────────────────────────────
    const pinsGroup = new THREE.Group();
    scene.add(pinsGroup);

    // ── Load / Compile Scene (procedural compiler with GLTF fallback) ─
    let loadedModel: THREE.Group | null = null;
    const proceduralGroup = new THREE.Group();
    proceduralGroup.name = "procedural_building";

    const activeFloor = 0;
    const floorOffset = activeFloor * 3.2;
    const floorLayout = getLayoutForFloor(localLayout, activeFloor);

    if (!localLayout || !localLayout.rooms || localLayout.rooms.length === 0) {
      // Fallback: Load GLTF model
      const loader = new GLTFLoader();
      loader.load(
        selectedModel.modelUrl,
        (gltf) => {
          loadedModel = gltf.scene;
          loadedModel.traverse(child => {
            if (child instanceof THREE.Mesh) {
              const nameLC = child.name.toLowerCase();
              if (nameLC.includes('floor') || nameLC.includes('ground') || nameLC.includes('tile')) {
                child.userData.isFloor = true;
              }
            }
          });
          scene.add(loadedModel);
          if (threeRef.current) threeRef.current.loadedModel = loadedModel;
          setLoading3D(false);
        },
        undefined,
        () => { setLoading3D(false); }
      );
    } else {
      loadedModel = proceduralGroup;
      // Procedural scene compiler
      if (!isInterior) {
        const configFloors = localLayout?.floorsConfig || [];
        const numFloors = configFloors.length || 10;
        for (let fNum = 0; fNum < numFloors; fNum++) {
          const fOffset = fNum * 3.2;
          const fLayout = getLayoutForFloor(localLayout, fNum);
          
          try {
            const compiler = new SceneCompiler({
              structureJson: fLayout,
              wallHeight: 3.0,
              wallThickness: 0.15,
              floorElevation: fOffset,
            });
            const compiledGroup = compiler.compile();
            proceduralGroup.add(compiledGroup);
          } catch (err) {
            console.error(`Error compiling floor ${fNum} scene:`, err);
          }
        }
        scene.add(proceduralGroup);
        if (threeRef.current) threeRef.current.loadedModel = proceduralGroup;
        setLoading3D(false);
      } else {
        try {
          const compiler = new SceneCompiler({
            structureJson: floorLayout,
            wallHeight: 3.0,
            wallThickness: 0.15,
            floorElevation: floorOffset,
          });
          const compiledGroup = compiler.compile();
          proceduralGroup.add(compiledGroup);
        } catch (err) {
          console.error('Error compiling walkthrough scene:', err);
        }

        // Add walkable nodes
        if (floorLayout?.rooms) {
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

        scene.add(proceduralGroup);
        if (threeRef.current) threeRef.current.loadedModel = proceduralGroup;
        setLoading3D(false);
      }
    }

    // ── Click vs Drag detection ───────────────────────────────────────
    // We track where mousedown started. Only if the mouse barely moved
    // (<6px) do we treat mouseup as a "click" for teleportation.
    // A real drag (>6px movement) is just the OrbitControls look-around.
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseDownX = 0;
    let mouseDownY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
    };

    const handleMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - mouseDownX;
      const dy = e.clientY - mouseDownY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only treat as click if mouse barely moved (not a drag)
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      if (isPlacingHotspot) {
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          const hitPoint = intersects[0].point;
          setClickCoord({ x: hitPoint.x, y: hitPoint.y, z: hitPoint.z });
          setHotspotName(''); setHotspotDesc(''); setHotspotLink('');
          setShowHotspotDrawer(true);
          setIsPlacingHotspot(false);
        }
        return;
      }

      // Selection & Teleportation
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        // Find if we hit a wall first
        const wallHit = intersects.find(h => h.object.userData?.type === 'wall');
        const floorHit = intersects.find(h => h.object.userData?.isFloor || h.object.userData?.type === 'floor');
        
        const wallDist = wallHit ? wallHit.distance : Infinity;
        const floorDist = floorHit ? floorHit.distance : Infinity;

        if (wallHit && wallDist < floorDist) {
          const wallData = wallHit.object.userData;
          const parentFloorLayout = getLayoutForFloor(localLayout, 0);
          const apCount = (parentFloorLayout?.apertures || []).filter((ap: any) => ap.wallId === wallData.wallId).length;
          
          setSelectedWall({
            wallId: wallData.wallId,
            length: wallData.length,
            thickness: wallData.thickness,
            height: wallData.height,
            aperturesCount: apCount
          });
          setSelectedRoom(null);
          return;
        }

        if (floorHit) {
          const roomData = floorHit.object.userData;
          if (roomData && roomData.roomId) {
            setSelectedRoom({
              id: roomData.roomId,
              name: roomData.name || 'Unnamed Room',
              width: roomData.width || 0,
              depth: roomData.depth || 0,
              areaSqFt: roomData.areaSqFt || Math.round((roomData.width * roomData.depth * 10.7639 * 10) / 10) || 0,
              color: roomData.color || '#cbd5e1',
              flatId: roomData.flatId || 'Standard Unit'
            });
            setSelectedWall(null);

            // Animate floor mesh color using GSAP!
            const mesh = floorHit.object as THREE.Mesh;
            if (mesh.material && 'color' in mesh.material) {
              const origColor = (mesh.material as any).color.clone();
              const highlightColor = new THREE.Color(0x00f5d4);
              
              gsap.to((mesh.material as any).color, {
                r: highlightColor.r,
                g: highlightColor.g,
                b: highlightColor.b,
                duration: 0.3,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                  gsap.to((mesh.material as any).color, {
                    r: origColor.r,
                    g: origColor.g,
                    b: origColor.b,
                    duration: 0.5
                  });
                }
              });
            }
          }

          if (isInterior) {
            const pt = floorHit.point;
            const lookDir = new THREE.Vector3();
            camera.getWorldDirection(lookDir);
            lookDir.y = 0; lookDir.normalize();
            const destPos = new THREE.Vector3(pt.x, 1.6, pt.z);
            const destLook = destPos.clone().add(lookDir.multiplyScalar(0.05));
            controls.enabled = false;
            gsap.to(camera.position, { x: destPos.x, y: destPos.y, z: destPos.z, duration: 1.4, ease: 'power2.inOut' });
            gsap.to(controls.target, {
              x: destLook.x, y: destLook.y, z: destLook.z, duration: 1.4, ease: 'power2.inOut',
              onComplete: () => {
                controls.enabled = true;
                controls.enableZoom = false;
                controls.enablePan = false;
                controls.minDistance = 0.01;
                controls.maxDistance = 0.1;
              },
            });
          }
          return;
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);

    // ── WASD Keyboard Walkthrough ─────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInterior) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k in walkRef.current) { e.preventDefault(); (walkRef.current as any)[k] = true; }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k in walkRef.current) (walkRef.current as any)[k] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ── Scroll-to-zoom (walkthrough = FOV, exterior = orbit) ──────────
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isInterior) {
        camera.fov = Math.max(40, Math.min(90, camera.fov + (e.deltaY < 0 ? -2 : 2)));
        camera.updateProjectionMatrix();
      }
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // ── Minimap draw ──────────────────────────────────────────────────
    const drawMinimap = (cam: THREE.PerspectiveCamera) => {
      const mc = minimapRef.current;
      if (!mc) return;
      const ctx = mc.getContext('2d');
      if (!ctx) return;
      const w = mc.width, h = mc.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(3, 3, w - 6, h - 6);

      const scale = 4;
      const mmx = (x: number) => w / 2 + x * scale;
      const mmz = (z: number) => h / 2 + z * scale;

      const px = mmx(cam.position.x);
      const pz = mmz(cam.position.z);
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      const angle = Math.atan2(dir.x, dir.z);

      ctx.fillStyle = 'rgba(0,245,212,0.12)';
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.arc(px, pz, 20, angle - 0.45, angle + 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#00f5d4';
      ctx.shadowColor = '#00f5d4';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(px, pz, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // ── Animation Loop ────────────────────────────────────────────────
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // WASD movement (interior only)
      if (isInterior) {
        const keys = walkRef.current;
        const anyPressed = keys.w || keys.a || keys.s || keys.d ||
          keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;

        if (anyPressed) {
          const lookDir = new THREE.Vector3();
          camera.getWorldDirection(lookDir);
          lookDir.y = 0; lookDir.normalize();
          const sideDir = new THREE.Vector3().crossVectors(lookDir, camera.up).normalize();
          const mv = new THREE.Vector3();
          const speed = 0.06;
          if (keys.w || keys.ArrowUp) mv.add(lookDir);
          if (keys.s || keys.ArrowDown) mv.sub(lookDir);
          if (keys.a || keys.ArrowLeft) mv.sub(sideDir);
          if (keys.d || keys.ArrowRight) mv.add(sideDir);
          if (mv.lengthSq() > 0) {
            mv.normalize().multiplyScalar(speed);
            camera.position.add(mv);
            controls.target.add(mv);
            camera.position.y = 1.6;
            controls.target.y = 1.6;
            camera.position.x = Math.max(-20, Math.min(20, camera.position.x));
            camera.position.z = Math.max(-20, Math.min(20, camera.position.z));
          }
        }

        drawMinimap(camera);
      }

      // Always enforce eye-height + bounds (catches WASD, OrbitControls drift, GSAP, everything)
      if (isInterior) {
        camera.position.y = 1.6;
        controls.target.y = 1.6;
        camera.position.x = Math.max(-19, Math.min(19, camera.position.x));
        camera.position.z = Math.max(-19, Math.min(19, camera.position.z));
        controls.target.x = Math.max(-19, Math.min(19, controls.target.x));
        controls.target.z = Math.max(-19, Math.min(19, controls.target.z));
      }

      renderer.render(scene, camera);
    };
    animate();

    // (drawMinimap defined above animate loop)

    // ── Resize ────────────────────────────────────────────────────────
    const handleResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    // ── Cleanup ───────────────────────────────────────────────────────
    const cleanup = () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };

    threeRef.current = {
      scene, camera, renderer, controls, loadedModel, pinsGroup, cleanup,
    };

    return cleanup;
  }, [selectedModel, isPlacingHotspot, localLayout]);

  // Sync Hotspot Pins in the 3D canvas
  useEffect(() => {
    if (!threeRef.current || !hotspots) return;
    const { pinsGroup } = threeRef.current;
    
    // Clear old pins
    while (pinsGroup.children.length > 0) {
      pinsGroup.remove(pinsGroup.children[0]);
    }

    // Add visual marker/spheres for hotspots
    hotspots.forEach((h) => {
      const geo = new THREE.SphereGeometry(0.35, 16, 16);
      const color = 
        h.type === 'pricing' ? 0x22c55e :
        h.type === 'video' ? 0x3b82f6 :
        h.type === 'cta' ? 0xec4899 :
        0xeab308; // yellow info

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(h.posX, h.posY, h.posZ);
      pinsGroup.add(mesh);
    });
  }, [hotspots]);

  // Trigger Model Upload API
  const handleUploadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId || !selectedProjectId) return;

    try {
      const res = await fetch('http://localhost:3001/digital-twin/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          name: newModelName,
          modelUrl: newModelUrl,
          modelType: newModelType,
          fileSize: newModelType === 'exterior' ? 257516 : 267956,
          status: 'active',
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setModels((prev) => [created, ...prev]);
        setSelectedModel(created);
        setShowUploadModal(false);
        setNewModelName('');
      } else {
        alert('Failed to register walkthrough model.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Model API
  const handleDeleteModel = async (id: string) => {
    if (!window.confirm('Delete this 3D model? All hotspots, camera points, and tours will be removed.')) return;
    if (!token || !tenantId) return;

    try {
      const res = await fetch(`http://localhost:3001/digital-twin/models/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const remaining = models.filter((m) => m.id !== id);
        setModels(remaining);
        if (remaining.length > 0) {
          setSelectedModel(remaining[0]);
        } else {
          setSelectedModel(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Hotspot Pin API
  const handleSaveHotspot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !clickCoord || !token || !tenantId) return;

    const contentJson: any = {
      title: hotspotName,
      description: hotspotDesc,
    };
    if (hotspotType === 'pricing') {
      contentJson.price = hotspotPrice;
    } else if (hotspotType === 'video') {
      contentJson.videoUrl = hotspotLink;
    } else if (hotspotType === 'brochure') {
      contentJson.linkUrl = hotspotLink;
    } else if (hotspotType === 'cta') {
      contentJson.buttonText = hotspotBtnText;
    }

    try {
      const res = await fetch(`http://localhost:3001/digital-twin/models/${selectedModel.id}/hotspots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: hotspotName,
          type: hotspotType,
          posX: clickCoord.x,
          posY: clickCoord.y,
          posZ: clickCoord.z,
          contentJson,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setHotspots((prev) => [...prev, saved]);
        setShowHotspotDrawer(false);
        setClickCoord(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Hotspot API
  const handleDeleteHotspot = async (id: string) => {
    if (!token || !tenantId) return;

    try {
      const res = await fetch(`http://localhost:3001/digital-twin/hotspots/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setHotspots((prev) => prev.filter((h) => h.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Capture viewpoint coordinates
  const triggerCaptureViewpoint = () => {
    if (!threeRef.current) return;
    const { camera, controls } = threeRef.current;
    
    setTempCameraCoords({
      pos: camera.position.clone(),
      target: controls.target.clone(),
    });
    setViewpointName('');
    setShowViewpointModal(true);
  };

  // Save Viewpoint Camera Point API
  const handleSaveViewpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !tempCameraCoords || !token || !tenantId) return;

    try {
      const res = await fetch(`http://localhost:3001/digital-twin/models/${selectedModel.id}/camera-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: viewpointName,
          posX: tempCameraCoords.pos.x,
          posY: tempCameraCoords.pos.y,
          posZ: tempCameraCoords.pos.z,
          targetX: tempCameraCoords.target.x,
          targetY: tempCameraCoords.target.y,
          targetZ: tempCameraCoords.target.z,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setCameraPoints((prev) => [...prev, saved]);
        setShowViewpointModal(false);
        setTempCameraCoords(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Viewpoint API
  const handleDeleteCameraPoint = async (id: string) => {
    if (!token || !tenantId) return;

    try {
      const res = await fetch(`http://localhost:3001/digital-twin/camera-points/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setCameraPoints((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create or Update Guided Tour Path sequence
  const handleSaveTour = async () => {
    if (!selectedModel || cameraPoints.length === 0 || !token || !tenantId) return;

    // Create a path route using all captured camera points in the listed order
    const routeJson = cameraPoints.map((pt) => ({
      name: pt.name,
      posX: pt.posX,
      posY: pt.posY,
      posZ: pt.posZ,
      targetX: pt.targetX,
      targetY: pt.targetY,
      targetZ: pt.targetZ,
    }));

    try {
      const res = await fetch(`http://localhost:3001/digital-twin/models/${selectedModel.id}/tours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          routeName: 'Guided Property Showcase',
          routeJson,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setTours([saved]);
        alert('Guided walkthrough tour route saved successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Play Tour Preview inside editor viewport using GSAP transitions
  const playTourPreview = () => {
    if (!threeRef.current || cameraPoints.length === 0) return;
    const { camera, controls } = threeRef.current;
    
    setIsPlayingTour(true);
    controls.enabled = false;

    const tl = gsap.timeline({
      onComplete: () => {
        controls.enabled = true;
        setIsPlayingTour(false);
      },
    });

    cameraPoints.forEach((pt, index) => {
      tl.to(camera.position, {
        x: pt.posX,
        y: pt.posY,
        z: pt.posZ,
        duration: index === 0 ? 1.5 : 2.5,
        ease: 'power2.inOut',
      }, index === 0 ? 0 : '+=0.5');

      tl.to(controls.target, {
        x: pt.targetX,
        y: pt.targetY,
        z: pt.targetZ,
        duration: index === 0 ? 1.5 : 2.5,
        ease: 'power2.inOut',
      }, index === 0 ? 0 : '<');
    });
  };

  const resetCamera = () => {
    if (!threeRef.current || !selectedModel) return;
    const { camera, controls } = threeRef.current;
    const isInterior = selectedModel.modelType === 'interior';
    
    controls.enabled = false;
    if (isInterior) {
      gsap.to(camera.position, { x: 0, y: 1.6, z: 5.0, duration: 1.5, ease: 'power2.inOut' });
      gsap.to(controls.target, {
        x: 0, y: 1.6, z: 5.05,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => {
          controls.enabled = true;
        }
      });
    } else {
      gsap.to(camera.position, { x: 0, y: 35, z: 35, duration: 1.5, ease: 'power2.inOut' });
      gsap.to(controls.target, {
        x: 0, y: 10, z: 0,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => {
          controls.enabled = true;
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">3D Virtual Experience Studio</h1>
          <p className="text-xs text-gray-400 mt-1">Configure digital twin models, place spatial information hotspots, and define smooth guided walkthrough paths.</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-100"
          >
            <Icon icon="solar:upload-minimalistic-bold" className="text-sm" />
            <span>Link 3D Model</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Model Selector & Info (3 Cols) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Model Library</h3>
            {loading ? (
              <div className="py-20 flex justify-center"><Icon icon="eos-icons:loading" className="text-2xl text-indigo-600 animate-spin" /></div>
            ) : models.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Icon icon="solar:box-bold-duotone" className="text-3xl mx-auto mb-2 text-gray-300" />
                <p className="text-xs">No models linked. Link a GLB file to start.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedModel?.id === model.id
                        ? 'border-indigo-600 bg-indigo-50/20'
                        : 'border-gray-150 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-gray-950 truncate max-w-[80%]">{model.name}</h4>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteModel(model.id); }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" className="text-xs" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-[10px] text-gray-400">
                      <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full uppercase">
                        {model.modelType}
                      </span>
                      <span>{(model.fileSize / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: 3D Viewport Editor (6 Cols) */}
        <div className="lg:col-span-6 relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between min-h-[550px]">
          {/* Controls Overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200/50 text-[10px] font-black text-gray-800 tracking-wider flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedModel ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
              <span>{selectedModel ? selectedModel.name.toUpperCase() : 'NO MODEL LOADED'}</span>
            </div>
            
            {selectedModel && (
              <div className="flex gap-2 pointer-events-auto">
                <button
                  onClick={() => setIsPlacingHotspot(!isPlacingHotspot)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                    isPlacingHotspot 
                      ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm'
                  }`}
                >
                  <Icon icon="solar:pin-bold" className="text-sm" />
                  <span>{isPlacingHotspot ? 'Click on 3D Surface...' : 'Add Hotspot'}</span>
                </button>
                <button
                  onClick={triggerCaptureViewpoint}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Icon icon="solar:camera-bold" className="text-sm" />
                  <span>Capture View</span>
                </button>
                <button
                  onClick={resetCamera}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Icon icon="solar:refresh-circle-bold" className="text-sm" />
                  <span>Reset Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Viewport Canvas */}
          {selectedModel ? (
            <div className={`relative w-full h-[550px] ${selectedModel.modelType === 'interior' ? 'bg-[#0c0f16]' : 'bg-gray-50'} rounded-b-2xl overflow-hidden`}>
              <canvas ref={canvasRef} className="w-full h-full block" />

              {/* Loading overlay */}
              {loading3D && (
                <div className={`absolute inset-0 flex flex-col justify-center items-center gap-3 ${selectedModel.modelType === 'interior' ? 'bg-[#0c0f16]/80' : 'bg-white/70'}`}>
                  <Icon icon="eos-icons:loading" className={`text-3xl animate-spin ${selectedModel.modelType === 'interior' ? 'text-[#00f5d4]' : 'text-indigo-600'}`} />
                  <p className={`text-[10px] font-black uppercase tracking-widest ${selectedModel.modelType === 'interior' ? 'text-[#00f5d4]' : 'text-gray-400'}`}>
                    {selectedModel.modelType === 'interior' ? 'Initialising walkthrough environment...' : 'Loading 3D asset scene...'}
                  </p>
                </div>
              )}

              {/* Error overlay */}
              {structureFetchError && (
                <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 bg-[#0c0f16]/90 text-center px-6 z-20">
                  <Icon icon="solar:info-circle-bold-duotone" className="text-4xl text-red-400" />
                  <p className="text-sm font-bold text-white max-w-sm">
                    {structureFetchError}
                  </p>
                </div>
              )}

              {/* Minimap (interior only) */}
              {selectedModel.modelType === 'interior' && (
                <div className="absolute bottom-14 left-4 rounded-xl overflow-hidden border border-white/10 shadow-xl opacity-70 hover:opacity-100 transition-opacity">
                  <canvas ref={minimapRef} width={130} height={100} className="block" />
                  <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] text-[#00f5d4]/60 font-bold tracking-widest">MAP</div>
                </div>
              )}

              {/* Controls hint */}
              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 backdrop-blur-md px-4 py-1.5 border rounded-full shadow-sm pointer-events-none text-center flex items-center gap-3 ${
                selectedModel.modelType === 'interior'
                  ? 'bg-black/60 border-white/10 text-white/60'
                  : 'bg-white/90 border-gray-200/50 text-gray-500'
              }`}>
                {isPlacingHotspot ? (
                  <span className="text-[9px] text-red-400 font-extrabold animate-pulse">🔴 Click anywhere on the 3D surface to drop a hotspot</span>
                ) : selectedModel.modelType === 'interior' ? (
                  <span className="text-[9px] font-bold tracking-wide flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {['W','A','S','D'].map(k => (
                        <span key={k} className="w-4 h-4 bg-white/10 border border-white/20 rounded text-[8px] flex items-center justify-center font-bold">{k}</span>
                      ))}
                    </span>
                    <span className="opacity-60">Walk</span>
                    <span className="w-px h-3 bg-white/20" />
                    <span className="opacity-60">Drag to look</span>
                    <span className="w-px h-3 bg-white/20" />
                    <span className="text-[#00f5d4] font-bold">Click floor → Teleport</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-bold">Left-click drag to rotate • Right-click drag to pan • Scroll to zoom</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-400 gap-3 py-24">
              <Icon icon="solar:globus-bold-duotone" className="text-5xl text-gray-200" />
              <p className="text-sm">Select or Link a 3D twin model to initialize canvas.</p>
            </div>
          )}
        </div>

        {/* Right: Asset Managers (3 Cols) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          {/* Section: Room & Wall Inspector */}
          {(selectedRoom || selectedWall) && (
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-md flex flex-col gap-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-150 pb-2">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Inspector</h3>
                <button
                  onClick={() => { setSelectedRoom(null); setSelectedWall(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="solar:close-circle-bold" className="text-base" />
                </button>
              </div>

              {selectedRoom && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedRoom.color || '#cbd5e1' }} />
                    <p className="font-bold text-gray-900 text-sm">{selectedRoom.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50 text-gray-500">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400">Dimensions</p>
                      <p className="font-bold text-gray-800">{selectedRoom.width}m × {selectedRoom.depth}m</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400">Area</p>
                      <p className="font-bold text-gray-800">{selectedRoom.areaSqFt} sq. ft.</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400">Type / Flat</p>
                      <p className="font-bold text-gray-800 capitalize">{selectedRoom.flatId || 'Standard Unit'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedWall && (
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-gray-900 text-sm">Wall: {selectedWall.wallId}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50 text-gray-500">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400">Length</p>
                      <p className="font-bold text-gray-800">{selectedWall.length.toFixed(2)}m</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400">Thickness</p>
                      <p className="font-bold text-gray-800">{selectedWall.thickness.toFixed(2)}m</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400">Apertures Count</p>
                      <p className="font-bold text-gray-800">{selectedWall.aperturesCount}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section A: Hotspots */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col justify-between min-h-[260px]">
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Hotspots</h3>
              {hotspots.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hotspots created. Click "Add Hotspot" above to drop pins on model.</p>
              ) : (
                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                  {hotspots.map((h) => (
                    <div key={h.id} className="flex justify-between items-center p-2.5 rounded-lg border border-gray-100 bg-gray-50/40 text-xs">
                      <div className="truncate max-w-[80%]">
                        <p className="font-bold text-gray-900 truncate">{h.name}</p>
                        <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest">{h.type}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteHotspot(h.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section B: Tour Builder */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guided Tour</h3>
                {cameraPoints.length > 0 && (
                  <button
                    onClick={playTourPreview}
                    disabled={isPlayingTour}
                    className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                  >
                    <Icon icon={isPlayingTour ? "eos-icons:loading" : "solar:play-bold"} className="text-sm" />
                    <span>Preview Tour</span>
                  </button>
                )}
              </div>
              {cameraPoints.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No viewpoints captured. Position camera and click "Capture View" above.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {cameraPoints.map((pt, index) => (
                    <div key={pt.id} className="flex justify-between items-center p-2.5 rounded-lg border border-gray-100 bg-gray-50/40 text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[80%]">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[9px]">{index + 1}</span>
                        <p className="font-bold text-gray-900 truncate">{pt.name}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCameraPoint(pt.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cameraPoints.length > 0 && (
              <button
                onClick={handleSaveTour}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all duration-300 active:scale-[0.98] shadow-lg shadow-indigo-600/10 mt-4 flex items-center justify-center gap-2"
              >
                <Icon icon="solar:diskette-bold" className="text-sm" />
                Save Tour Route
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODAL 1: Upload Model */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-sm text-gray-950 uppercase tracking-widest">Link New Walkthrough Asset</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-700"><Icon icon="solar:close-circle-bold" /></button>
            </div>
            <form onSubmit={handleUploadModel} className="space-y-4 text-xs font-semibold text-gray-500">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sapphire Tower Lobby"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Model View Type</label>
                <select
                  value={newModelType}
                  onChange={(e) => setNewModelType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                >
                  <option value="exterior">Building Exterior (building.glb)</option>
                  <option value="interior">Corridor Walkthrough (floor_walkthrough.glb)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pre-uploaded Asset Path</label>
                <input
                  type="text"
                  required
                  value={newModelUrl}
                  onChange={(e) => setNewModelUrl(e.target.value)}
                  placeholder="e.g. /building.glb"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors uppercase tracking-wider text-[10px] mt-2"
              >
                Register Model Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Viewpoint capture name */}
      {showViewpointModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xl max-w-xs w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-sm text-gray-950 uppercase tracking-widest">Capture Viewpoint</h3>
              <button onClick={() => setShowViewpointModal(false)} className="text-gray-400 hover:text-gray-700"><Icon icon="solar:close-circle-bold" /></button>
            </div>
            <form onSubmit={handleSaveViewpoint} className="space-y-4 text-xs font-semibold text-gray-500">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Viewpoint Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corridor Entrance"
                  value={viewpointName}
                  onChange={(e) => setViewpointName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors uppercase tracking-wider text-[10px] mt-2"
              >
                Save Viewpoint coordinates
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Hotspot configuration form (slide in from right) */}
      {showHotspotDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowHotspotDrawer(false)} />
          <div className="relative bg-white w-80 h-full shadow-2xl border-l border-gray-200 p-6 flex flex-col justify-between z-10 animate-slideLeft">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-150 pb-4">
                <h3 className="font-black text-sm text-gray-950 uppercase tracking-widest">Setup Pin Data</h3>
                <button onClick={() => setShowHotspotDrawer(false)} className="text-gray-400 hover:text-gray-700"><Icon icon="solar:close-circle-bold" className="text-lg" /></button>
              </div>
              
              <form onSubmit={handleSaveHotspot} className="space-y-4 text-xs font-semibold text-gray-500">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hotspot Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Bedroom View"
                    value={hotspotName}
                    onChange={(e) => setHotspotName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hotspot Pin Type</label>
                  <select
                    value={hotspotType}
                    onChange={(e) => setHotspotType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                  >
                    <option value="info">Info Tooltip</option>
                    <option value="pricing">Pricing & Inventory</option>
                    <option value="video">Embedded Video Tour</option>
                    <option value="brochure">Brochure Leaflet</option>
                    <option value="cta">Call to Action (CTA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tooltip description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide details displayed inside visual tag popup..."
                    value={hotspotDesc}
                    onChange={(e) => setHotspotDesc(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white resize-none"
                  />
                </div>

                {hotspotType === 'pricing' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Unit Flat Pricing (₹)</label>
                    <input
                      type="number"
                      required
                      value={hotspotPrice}
                      onChange={(e) => setHotspotPrice(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                    />
                  </div>
                )}

                {['video', 'brochure'].includes(hotspotType) && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {hotspotType === 'video' ? 'Video Frame Link' : 'Brochure PDF / Layout Link'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={hotspotType === 'video' ? 'e.g. Video stream url' : 'e.g. /amenities'}
                      value={hotspotLink}
                      onChange={(e) => setHotspotLink(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                    />
                  </div>
                )}

                {hotspotType === 'cta' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Button CTA Text</label>
                    <input
                      type="text"
                      required
                      value={hotspotBtnText}
                      onChange={(e) => setHotspotBtnText(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-900 bg-white"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors uppercase tracking-wider text-[10px] mt-4"
                >
                  Save Hotspot Pin
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
