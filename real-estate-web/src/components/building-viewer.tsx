'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

interface BuildingViewerProps {
  activeFloor: number;
  viewMode: 'building' | 'walkthrough';
  activeRoom: string | null;
  setActiveRoom: (roomName: string | null) => void;
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
}: BuildingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Loading & State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [models, setModels] = useState<DigitalTwinModel[]>([]);
  const [activeModel, setActiveModel] = useState<DigitalTwinModel | null>(null);
  
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [tours, setTours] = useState<TourRoute[]>([]);
  
  // Interactive UI
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [tourIndex, setTourIndex] = useState<number>(0);
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  }, []);

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
  }, [activeModel, tenantId]);

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

  // Main Canvas Renderer & GLB loading
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

    // Load Model asset
    const loader = new GLTFLoader();
    loader.load(
      activeModel.modelUrl,
      (gltf) => {
        const model = gltf.scene;
        loadedModelRef.current = model;
        scene.add(model);

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            originalMaterials.current.set(child.uuid, child.material as THREE.Material);
          }
        });

        // Trigger active floor highlight exterior
        if (viewMode === 'building' && highlightMaterial.current) {
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              let parent: THREE.Object3D | null = child.parent;
              let floorName = '';
              while (parent && parent !== model) {
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
                }
              }
            }
          });
        }
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Error loading GLB:', err);
        setError('Failed to load spatial 3D twin.');
        setLoading(false);
      }
    );

    // Raycast click handler for door units
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (viewMode !== 'walkthrough' || activeRoom !== null) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let clickedObj: THREE.Object3D | null = intersects[0].object;
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
  }, [activeModel]);

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

    // Define 2D layouts translation (scale walk range x: -10..10, z: 0..10 to fits canvas width/height)
    // Map center is x=w/2, z=h/2
    const scale = 5.5; // pixel multiplier
    const mapX = (x3d: number) => w / 2 + x3d * scale;
    const mapZ = (z3d: number) => h / 2 - (z3d - 5) * scale; // offset center

    // Draw Corridor hallway
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(mapX(-1.5), mapZ(8.0), 3 * scale, 8 * scale);

    // Draw Suite A (Left)
    ctx.fillStyle = '#1e293b';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(mapX(-9.0), mapZ(6.5), 6.5 * scale, 5 * scale);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(mapX(-9.0), mapZ(6.5), 6.5 * scale, 5 * scale);
    
    // Draw Suite B (Right)
    ctx.fillStyle = '#1e293b';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(mapX(2.5), mapZ(6.5), 6.5 * scale, 5 * scale);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(mapX(2.5), mapZ(6.5), 6.5 * scale, 5 * scale);

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '7px sans-serif';
    ctx.fillText('FLAT A', mapX(-7.5), mapZ(4.0));
    ctx.fillText('FLAT B', mapX(4.0), mapZ(4.0));
    ctx.fillText('HALLWAY', mapX(-1.2), mapZ(7.5));

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
