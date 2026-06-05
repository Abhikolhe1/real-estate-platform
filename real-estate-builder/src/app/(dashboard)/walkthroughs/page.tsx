'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@iconify/react';
import gsap from 'gsap';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    if (selectedModel.modelType === 'exterior') {
      camera.position.set(35, 20, 35);
    } else {
      camera.position.set(0, 1.6, 4.0); // lobby default
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    if (selectedModel.modelType === 'exterior') {
      controls.target.set(0, 10, 0);
    } else {
      controls.target.set(0, 1.6, 4.05); // locked target first person look
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x6366f1, 0.35); // Blue tint
    fillLight.position.set(-15, 10, -15);
    scene.add(fillLight);

    // Grid helper (exterior only)
    let gridHelper: THREE.GridHelper | null = null;
    if (selectedModel.modelType === 'exterior') {
      gridHelper = new THREE.GridHelper(50, 25, 0x6366f1, 0xe2e8f0);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);
    }

    // Pins Group
    const pinsGroup = new THREE.Group();
    scene.add(pinsGroup);

    // Load Model
    let loadedModel: THREE.Group | null = null;
    const loader = new GLTFLoader();
    loader.load(
      selectedModel.modelUrl,
      (gltf) => {
        loadedModel = gltf.scene;
        scene.add(loadedModel);
        setLoading3D(false);
      },
      undefined,
      (err) => {
        console.error('Error loading 3D GLB model:', err);
        setLoading3D(false);
      }
    );

    // Raycaster for mouse click (hotspot placement)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (!isPlacingHotspot) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        setClickCoord({ x: hitPoint.x, y: hitPoint.y, z: hitPoint.z });
        
        // Show Form
        setHotspotName('');
        setHotspotDesc('');
        setHotspotLink('');
        setShowHotspotDrawer(true);
        setIsPlacingHotspot(false);
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
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

    // Setup cleanup
    const cleanup = () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      loadedModel,
      pinsGroup,
      cleanup,
    };

    return cleanup;
  }, [selectedModel, isPlacingHotspot]);

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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                    isPlacingHotspot 
                      ? 'bg-red-500 text-white border-red-500' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm'
                  }`}
                >
                  <Icon icon="solar:pin-bold" />
                  <span>{isPlacingHotspot ? 'Click on 3D Model...' : 'Add Hotspot'}</span>
                </button>
                <button
                  onClick={triggerCaptureViewpoint}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm transition-all"
                >
                  <Icon icon="solar:camera-bold" />
                  <span>Capture View</span>
                </button>
              </div>
            )}
          </div>

          {/* Viewport Canvas */}
          {selectedModel ? (
            <div className="relative w-full h-[550px]">
              <canvas ref={canvasRef} className="w-full h-full block" />
              {loading3D && (
                <div className="absolute inset-0 bg-white/70 flex flex-col justify-center items-center gap-3">
                  <Icon icon="eos-icons:loading" className="text-3xl text-indigo-600 animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading 3D asset scene...</p>
                </div>
              )}
              
              {/* Controls prompt */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-1.5 border border-gray-200/50 text-[9px] font-bold text-gray-500 tracking-wide rounded-full shadow-sm pointer-events-none text-center">
                {isPlacingHotspot ? (
                  <span className="text-red-500 font-extrabold animate-pulse">🔴 Click anywhere on the 3D surface mesh to drop a hotspot</span>
                ) : (
                  <span>Left-click drag to rotate • Right-click drag to pan • Scroll to zoom</span>
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
                    className="flex items-center gap-1.5 px-2 py-0.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 rounded-lg text-[10px] font-bold transition-all"
                  >
                    <Icon icon={isPlayingTour ? "eos-icons:loading" : "solar:play-bold"} />
                    <span>Preview</span>
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
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors mt-4"
              >
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
