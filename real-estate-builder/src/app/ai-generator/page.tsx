'use client';

import React, { useState, useEffect, useRef } from 'react';
import PremiumButton from '@/components/premium-button';

interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string;
  flatCount: number;
  roomCount: number;
  priceEstimate: number;
  isPaid: boolean;
  status: 'PENDING_ANALYSIS' | 'ANALYZED' | 'PAID' | 'GENERATED';
  layoutData?: {
    rooms: Array<{ id: string; name: string; x: number; z: number; width: number; depth: number; color: string }>;
    furniture: Array<{ id: string; type: string; roomId: string; x: number; z: number; rotation: number }>;
  };
  project?: { name: string };
}

export default function AIFloorPlanGeneratorPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedProjId, setSelectedProjId] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Active workflow floor plan
  const [activeFP, setActiveFP] = useState<FloorPlan | null>(null);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Checkout state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Editor states
  const [viewMode, setViewMode] = useState<'2D' | '3D' | 'WALK'>('3D');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedFurnId, setSelectedFurnId] = useState<string | null>(null);
  const [paintColor, setPaintColor] = useState('#f5efe6');
  const [isSaving, setIsSaving] = useState(false);

  // Three.js refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeRef = useRef<any>(null);

  const tenantId = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

  // Load Initial Data
  const loadInitialData = async () => {
    try {
      const projRes = await fetch('http://localhost:3001/projects', {
        headers: { 'x-tenant-id': tenantId },
      });
      const projData = await projRes.json();
      setProjects(projData);
      if (projData.length > 0) setSelectedProjId(projData[0].id);

      const fpRes = await fetch('http://localhost:3001/floorplans', {
        headers: { 'x-tenant-id': tenantId },
      });
      const fpData = await fpRes.json();
      setFloorPlans(fpData);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle Mock Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !selectedProjId) return;

    setIsUploading(true);
    setUploadProgress(10);

    // Simulate progress
    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + 20;
      });
    }, 150);

    setTimeout(async () => {
      try {
        const res = await fetch('http://localhost:3001/floorplans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
          },
          body: JSON.stringify({
            name: uploadName,
            projectId: selectedProjId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setUploadProgress(100);
          setUploadName('');
          setUploadFile(null);
          setActiveFP(data.floorPlan);
          loadInitialData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
        clearInterval(timer);
      }
    }, 1000);
  };

  // Handle AI Analysis Simulation
  const handleAnalyze = async () => {
    if (!activeFP) return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisLogs([]);

    const steps = [
      { log: 'Initializing computer vision blueprint processor...', progress: 10 },
      { log: 'Tracing primary exterior concrete walls...', progress: 30 },
      { log: 'Identifying doorway thresholds and window structures...', progress: 50 },
      { log: 'Differentiating flat unit boundary partitions...', progress: 70 },
      { log: 'Calculating total bedroom, bathroom, and kitchen configurations...', progress: 90 },
      { log: 'AI extraction completed. Formulating valuation estimate...', progress: 100 },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAnalysisLogs((prev) => [...prev, `[AI LOG] ${steps[currentStep].log}`]);
        setAnalysisProgress(steps[currentStep].progress);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(async () => {
          try {
            const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/analyze`, {
              method: 'POST',
              headers: { 'x-tenant-id': tenantId },
            });
            const data = await res.json();
            if (data.success) {
              setActiveFP(data.floorPlan);
              loadInitialData();
            }
          } catch (err) {
            console.error(err);
          } finally {
            setIsAnalyzing(false);
          }
        }, 800);
      }
    }, 1000);
  };

  // Handle Simulated Payment Checkout
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFP) return;

    setIsPaying(true);
    setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/pay`, {
          method: 'POST',
          headers: { 'x-tenant-id': tenantId },
        });
        const data = await res.json();
        if (data.success) {
          setActiveFP(data.floorPlan);
          setViewMode('3D');
          loadInitialData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsPaying(false);
      }
    }, 1500);
  };

  // Save layout updates
  const saveLayout = async () => {
    if (!activeFP || !activeFP.layoutData) return;
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          layoutData: activeFP.layoutData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveFP(data.floorPlan);
        loadInitialData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate and download a 2D engineering CAD DXF file
  const downloadCADFile = () => {
    if (!activeFP || !activeFP.layoutData) return;
    const layout = activeFP.layoutData;

    let dxf = `  0
SECTION
  2
ENTITIES
`;

    // 1. Export Rooms (Exterior Walls & Inner Partitions)
    layout.rooms.forEach((room) => {
      const x1 = room.x;
      const y1 = room.z;
      const x2 = room.x + room.width;
      const y2 = room.z + room.depth;

      // Add 4 Wall Lines
      // North Wall
      dxf += `  0\nLINE\n  8\nWalls_Exterior\n 10\n${x1}\n 20\n${y1}\n 30\n0.0\n 11\n${x2}\n 21\n${y1}\n 31\n0.0\n`;
      // South Wall
      dxf += `  0\nLINE\n  8\nWalls_Exterior\n 10\n${x1}\n 20\n${y2}\n 30\n0.0\n 11\n${x2}\n 21\n${y2}\n 31\n0.0\n`;
      // West Wall
      dxf += `  0\nLINE\n  8\nWalls_Exterior\n 10\n${x1}\n 20\n${y1}\n 30\n0.0\n 11\n${x1}\n 21\n${y2}\n 31\n0.0\n`;
      // East Wall
      dxf += `  0\nLINE\n  8\nWalls_Exterior\n 10\n${x2}\n 20\n${y1}\n 30\n0.0\n 11\n${x2}\n 21\n${y2}\n 31\n0.0\n`;

      // Room Center Points for Labels
      const cx = room.x + room.width / 2;
      const cy = room.z + room.depth / 2;
      
      // Room Name Label
      dxf += `  0\nTEXT\n  8\nRoom_Labels\n 10\n${cx - 1.0}\n 20\n${cy}\n 30\n0.0\n 40\n0.25\n  1\n${room.name}\n`;
      // Room Dimensions Label
      dxf += `  0\nTEXT\n  8\nRoom_Labels\n 10\n${cx - 0.5}\n 20\n${cy - 0.3}\n 30\n0.0\n 40\n0.18\n  1\n${room.width.toFixed(1)}m x ${room.depth.toFixed(1)}m\n`;
    });

    // 2. Export Furniture Layouts
    layout.furniture.forEach((f) => {
      const fx = f.x;
      const fy = f.z;
      const size = 0.8;
      const x1 = fx - size / 2;
      const y1 = fy - size / 2;
      const x2 = fx + size / 2;
      const y2 = fy + size / 2;

      // Box Boundary
      dxf += `  0\nLINE\n  8\nFurniture_Layout\n 10\n${x1}\n 20\n${y1}\n 30\n0.0\n 11\n${x2}\n 21\n${y1}\n 31\n0.0\n`;
      dxf += `  0\nLINE\n  8\nFurniture_Layout\n 10\n${x1}\n 20\n${y2}\n 30\n0.0\n 11\n${x2}\n 21\n${y2}\n 31\n0.0\n`;
      dxf += `  0\nLINE\n  8\nFurniture_Layout\n 10\n${x1}\n 20\n${y1}\n 30\n0.0\n 11\n${x1}\n 21\n${y2}\n 31\n0.0\n`;
      dxf += `  0\nLINE\n  8\nFurniture_Layout\n 10\n${x2}\n 20\n${y1}\n 30\n0.0\n 11\n${x2}\n 21\n${y2}\n 31\n0.0\n`;

      // Furniture Text tag
      dxf += `  0\nTEXT\n  8\nFurniture_Labels\n 10\n${x1}\n 20\n${fy}\n 30\n0.0\n 40\n0.12\n  1\n${f.type.toUpperCase()}\n`;
    });

    dxf += `  0\nENDSEC\n  0\nEOF\n`;

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeFP.name.toLowerCase().replace(/\s+/g, '_')}_cad_draft.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Three.js Render Logic
  useEffect(() => {
    if (!activeFP || !activeFP.layoutData || !canvasRef.current) return;

    // Dynamically import Three.js to prevent SSR crashes
    import('three').then((THREE) => {
      const canvas = canvasRef.current!;
      const container = canvas.parentElement!;
      const width = container.clientWidth;
      const height = container.clientHeight || 550;

      // 1. Setup Scene & Renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#fafafa');

      // 2. Setup Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;

      // 3. Setup Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(10, 20, 15);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // Floor grid helper
      const gridHelper = new THREE.GridHelper(30, 30, '#e5e7eb', '#f3f4f6');
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);

      // 4. Load Layout from activeFP
      const layout = activeFP.layoutData!;
      const roomMeshes: any[] = [];
      const furnitureMeshes: any[] = [];

      // Materials helper
      const createWallMaterial = (colorStr: string) => {
        return new THREE.MeshStandardMaterial({ color: colorStr, roughness: 0.5 });
      };

      // Draw Rooms & Walls
      layout.rooms.forEach((room) => {
        // Floor Plane
        const floorGeo = new THREE.BoxGeometry(room.width, 0.05, room.depth);
        const floorMat = new THREE.MeshStandardMaterial({ color: room.color, roughness: 0.8 });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.set(room.x + room.width / 2, -0.025, room.z + room.depth / 2);
        floorMesh.receiveShadow = true;
        (floorMesh as any).userData = { type: 'room', id: room.id };
        scene.add(floorMesh);
        roomMeshes.push(floorMesh);

        // Walls (north, south, east, west)
        const wallH = 2.0;
        const wallT = 0.12; // thickness

        // North wall
        const wNGeo = new THREE.BoxGeometry(room.width, wallH, wallT);
        const wN = new THREE.Mesh(wNGeo, createWallMaterial(room.color));
        wN.position.set(room.x + room.width / 2, wallH / 2, room.z);
        scene.add(wN);

        // South wall
        const wSGeo = new THREE.BoxGeometry(room.width, wallH, wallT);
        const wS = new THREE.Mesh(wSGeo, createWallMaterial(room.color));
        wS.position.set(room.x + room.width / 2, wallH / 2, room.z + room.depth);
        scene.add(wS);

        // West wall
        const wWGeo = new THREE.BoxGeometry(wallT, wallH, room.depth);
        const wW = new THREE.Mesh(wWGeo, createWallMaterial(room.color));
        wW.position.set(room.x, wallH / 2, room.z + room.depth / 2);
        scene.add(wW);

        // East wall
        const wEGeo = new THREE.BoxGeometry(wallT, wallH, room.depth);
        const wE = new THREE.Mesh(wEGeo, createWallMaterial(room.color));
        wE.position.set(room.x + room.width, wallH / 2, room.z + room.depth / 2);
        scene.add(wE);
      });

      // Draw Furniture
      const buildFurnitureMesh = (type: string, color: string) => {
        const furnGroup = new THREE.Group();

        if (type === 'sofa') {
          // Main base
          const baseGeo = new THREE.BoxGeometry(1.8, 0.4, 0.8);
          const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
          const base = new THREE.Mesh(baseGeo, baseMat);
          base.position.y = 0.2;
          furnGroup.add(base);

          // Backrest
          const backGeo = new THREE.BoxGeometry(1.8, 0.6, 0.2);
          const back = new THREE.Mesh(backGeo, baseMat);
          back.position.set(0, 0.5, -0.3);
          furnGroup.add(back);

          // Armrests
          const armGeo = new THREE.BoxGeometry(0.2, 0.5, 0.8);
          const armL = new THREE.Mesh(armGeo, baseMat);
          armL.position.set(-0.9, 0.45, 0);
          const armR = armL.clone();
          armR.position.x = 0.9;
          furnGroup.add(armL, armR);
        } else if (type === 'bed') {
          // Mattress base
          const baseGeo = new THREE.BoxGeometry(1.6, 0.4, 2.0);
          const baseMat = new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.9 });
          const base = new THREE.Mesh(baseGeo, baseMat);
          base.position.y = 0.2;
          furnGroup.add(base);

          // Headboard
          const headGeo = new THREE.BoxGeometry(1.6, 0.9, 0.15);
          const headMat = new THREE.MeshStandardMaterial({ color: '#554d48', roughness: 0.6 });
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.set(0, 0.45, -1.0);
          furnGroup.add(head);

          // Pillow
          const pillowGeo = new THREE.BoxGeometry(1.2, 0.1, 0.4);
          const pillowMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
          const pillow = new THREE.Mesh(pillowGeo, pillowMat);
          pillow.position.set(0, 0.45, -0.7);
          furnGroup.add(pillow);
        } else if (type === 'table') {
          // Top plate
          const topGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16);
          const woodMat = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.4 });
          const top = new THREE.Mesh(topGeo, woodMat);
          top.position.y = 0.76;
          furnGroup.add(top);

          // Leg
          const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8);
          const metalMat = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.5 });
          const leg = new THREE.Mesh(legGeo, metalMat);
          leg.position.y = 0.36;
          furnGroup.add(leg);
        } else if (type === 'plant') {
          // Pot
          const potGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8);
          const potMat = new THREE.MeshStandardMaterial({ color: '#a0522d' });
          const pot = new THREE.Mesh(potGeo, potMat);
          pot.position.y = 0.25;
          furnGroup.add(pot);

          // Foliage
          const leafGeo = new THREE.SphereGeometry(0.45, 8, 8);
          const leafMat = new THREE.MeshStandardMaterial({ color: '#2e8b57', roughness: 0.9 });
          const foliage = new THREE.Mesh(leafGeo, leafMat);
          foliage.position.y = 0.7;
          furnGroup.add(foliage);
        } else {
          // Generic placeholder box
          const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
          const boxMat = new THREE.MeshStandardMaterial({ color: '#999999' });
          const box = new THREE.Mesh(boxGeo, boxMat);
          box.position.y = 0.4;
          furnGroup.add(box);
        }

        return furnGroup;
      };

      layout.furniture.forEach((item) => {
        const color = item.type === 'sofa' ? '#2f4f4f' : '#6b8e23';
        const mesh = buildFurnitureMesh(item.type, color);
        mesh.position.set(item.x, 0, item.z);
        mesh.rotation.y = (item.rotation * Math.PI) / 180;
        (mesh as any).userData = { type: 'furniture', id: item.id };
        scene.add(mesh);
        furnitureMeshes.push(mesh);
      });

      // 5. Setup Camera Position based on View Mode
      let targetRotX = -Math.PI / 4;
      let targetRotY = Math.PI / 6;
      let zoomDistance = 15;
      let playerPos = { x: 0, y: 0.8, z: 0 }; // for Walk mode

      const updateCamera = () => {
        if (viewMode === '2D') {
          camera.position.set(4, 20, 0);
          camera.lookAt(4, 0, 0);
        } else if (viewMode === '3D') {
          const posX = 4 + zoomDistance * Math.sin(targetRotY) * Math.cos(targetRotX);
          const posY = zoomDistance * Math.sin(-targetRotX);
          const posZ = zoomDistance * Math.cos(targetRotY) * Math.cos(targetRotX);
          camera.position.set(posX, posY, posZ);
          camera.lookAt(4, 0, 0);
        } else if (viewMode === 'WALK') {
          camera.position.set(playerPos.x, playerPos.y, playerPos.z);
          const targetX = playerPos.x + 3 * Math.sin(targetRotY);
          const targetZ = playerPos.z + 3 * Math.cos(targetRotY);
          camera.lookAt(targetX, playerPos.y, targetZ);
        }
      };

      updateCamera();

      // 6. Handle Mouse Drag Controls
      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        // Perform Raycasting to select room or furniture
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          // Find root interactive mesh/group
          let target: THREE.Object3D | null = intersects[0].object;
          while (target && target !== scene) {
            if ((target as any).userData && (target as any).userData.type) {
              const uData = (target as any).userData;
              if (uData.type === 'furniture') {
                setSelectedFurnId(uData.id);
                setSelectedRoomId(null);
                return;
              } else if (uData.type === 'room') {
                setSelectedRoomId(uData.id);
                setSelectedFurnId(null);
                return;
              }
            }
            target = target.parent;
          }
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || viewMode === '2D') return;

        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;

        targetRotY -= deltaX * 0.007;
        targetRotX -= deltaY * 0.007;

        // Clamp vertical rotation
        targetRotX = Math.max(-Math.PI / 2 + 0.05, Math.min(-0.05, targetRotX));

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        updateCamera();
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      const handleWheel = (e: WheelEvent) => {
        if (viewMode !== '3D') return;
        zoomDistance += e.deltaY * 0.01;
        zoomDistance = Math.max(5, Math.min(30, zoomDistance));
        updateCamera();
      };

      // 7. Handle WASD Walkthrough keyboard inputs
      const handleKeyDown = (e: KeyboardEvent) => {
        if (viewMode !== 'WALK') return;
        const speed = 0.3;
        const sin = Math.sin(targetRotY);
        const cos = Math.cos(targetRotY);

        if (e.key === 'w' || e.key === 'ArrowUp') {
          playerPos.x += speed * sin;
          playerPos.z += speed * cos;
        }
        if (e.key === 's' || e.key === 'ArrowDown') {
          playerPos.x -= speed * sin;
          playerPos.z -= speed * cos;
        }
        if (e.key === 'a' || e.key === 'ArrowLeft') {
          playerPos.x += speed * cos;
          playerPos.z -= speed * sin;
        }
        if (e.key === 'd' || e.key === 'ArrowRight') {
          playerPos.x -= speed * cos;
          playerPos.z += speed * sin;
        }
        updateCamera();
      };

      // Attach event listeners
      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      renderer.domElement.addEventListener('wheel', handleWheel);
      window.addEventListener('keydown', handleKeyDown);

      // Animation loop
      let animId = 0;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      // Store references
      threeRef.current = {
        scene,
        camera,
        renderer,
        roomMeshes,
        furnitureMeshes,
        cleanup: () => {
          cancelAnimationFrame(animId);
          renderer.domElement.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          renderer.domElement.removeEventListener('wheel', handleWheel);
          window.removeEventListener('keydown', handleKeyDown);
          renderer.dispose();
        },
      };

      return () => {
        if (threeRef.current && threeRef.current.cleanup) {
          threeRef.current.cleanup();
        }
      };
    });
  }, [activeFP?.id, viewMode]);

  // Add furniture mesh handler
  const handleAddFurniture = (type: string) => {
    if (!activeFP || !activeFP.layoutData) return;
    const layout = { ...activeFP.layoutData };
    const newId = `f-${Date.now()}`;
    layout.furniture.push({
      id: newId,
      type,
      roomId: selectedRoomId || 'room-1',
      x: selectedRoomId 
        ? (layout.rooms.find((r) => r.id === selectedRoomId)?.x || 0) + 1
        : 0,
      z: selectedRoomId
        ? (layout.rooms.find((r) => r.id === selectedRoomId)?.z || 0) + 1
        : 0,
      rotation: 0,
    });
    setActiveFP({ ...activeFP, layoutData: layout });
    setSelectedFurnId(newId);
  };

  // Move or rotate furniture
  const handleUpdateFurniture = (field: 'x' | 'z' | 'rotation', val: number) => {
    if (!activeFP || !activeFP.layoutData || !selectedFurnId) return;
    const layout = { ...activeFP.layoutData };
    const idx = layout.furniture.findIndex((f) => f.id === selectedFurnId);
    if (idx !== -1) {
      layout.furniture[idx][field] = val;
      setActiveFP({ ...activeFP, layoutData: layout });
    }
  };

  // Delete furniture
  const handleDeleteFurniture = () => {
    if (!activeFP || !activeFP.layoutData || !selectedFurnId) return;
    const layout = { ...activeFP.layoutData };
    layout.furniture = layout.furniture.filter((f) => f.id !== selectedFurnId);
    setActiveFP({ ...activeFP, layoutData: layout });
    setSelectedFurnId(null);
  };

  // Change room wall/floor color
  const handlePaintRoom = () => {
    if (!activeFP || !activeFP.layoutData || !selectedRoomId) return;
    const layout = { ...activeFP.layoutData };
    const idx = layout.rooms.findIndex((r) => r.id === selectedRoomId);
    if (idx !== -1) {
      layout.rooms[idx].color = paintColor;
      setActiveFP({ ...activeFP, layoutData: layout });
    }
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">AI 2D to 3D Floor Plan Generator</h1>
          <p className="text-gray-500 text-sm mt-1">Upload 2D blueprint, auto-calculate flat metrics, simulate checkout payments, and customize high-fidelity 3D models.</p>
        </div>
        {activeFP && activeFP.isPaid && (
          <div className="flex gap-4">
            <PremiumButton 
              variant="outline" 
              onClick={() => { setActiveFP(null); setSelectedRoomId(null); setSelectedFurnId(null); }}
            >
              ← Back to Gallery
            </PremiumButton>
            <PremiumButton variant="outline" onClick={downloadCADFile}>
              💾 Export 2D CAD (DXF)
            </PremiumButton>
            <PremiumButton variant="primary" onClick={saveLayout} disabled={isSaving}>
              {isSaving ? 'Saving Layout...' : 'Save 3D Improvements'}
            </PremiumButton>
          </div>
        )}
      </header>

      {/* Main workflow content */}
      {!activeFP ? (
        // Gallery / Upload View
        <div className="grid grid-cols-3 gap-8">
          {/* Upload card */}
          <div className="col-span-1 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-950 mb-4 uppercase tracking-wider">Generate New 3D Plan</h3>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Associated Project Link</label>
                <select
                  value={selectedProjId}
                  onChange={(e) => setSelectedProjId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-gray-950"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Blueprint Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower A Wing Floorplan"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-950"
                />
              </div>

              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">Upload 2D Blueprint (PNG / JPG)</span>
                <label className="border-2 border-dashed border-gray-200 hover:border-gray-950 rounded-2xl p-6 transition duration-300 cursor-pointer flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-xs text-gray-400 font-semibold">Drag & drop or click to upload file</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden" 
                  />
                  {uploadFile && <p className="text-[10px] text-emerald-600 font-bold mt-1">Selected: {uploadFile.name}</p>}
                </label>
              </div>

              {isUploading && (
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gray-950 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              <PremiumButton type="submit" variant="primary" disabled={isUploading}>
                {isUploading ? 'Uploading Blueprint...' : 'Upload & Start Process'}
              </PremiumButton>
            </form>
          </div>

          {/* Past Floorplans Grid list */}
          <div className="col-span-2 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-950 mb-4 uppercase tracking-wider">Configured Floor Plans</h3>
            {floorPlans.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-2">
                <span className="text-3xl">📐</span>
                <p className="text-xs">No active floor plan models. Upload one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {floorPlans.map((fp) => (
                  <div 
                    key={fp.id} 
                    onClick={() => setActiveFP(fp)}
                    className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col bg-gray-50/30"
                  >
                    <div className="h-32 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                      <img src={fp.imageUrl} alt={fp.name} className="w-full h-full object-cover opacity-80" />
                      <span className={`absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full ${
                        fp.status === 'GENERATED' ? 'bg-emerald-100 text-emerald-800' :
                        fp.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                        fp.status === 'ANALYZED' ? 'bg-purple-100 text-purple-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {fp.status}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-950">{fp.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Project: {fp.project?.name || 'Aethelgard Residences'}</p>
                      </div>
                      <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between items-center text-xs text-gray-500 font-semibold">
                        <span>{fp.flatCount || 0} Flats • {fp.roomCount || 0} Rooms</span>
                        <span className="font-black text-gray-900">₹{(fp.priceEstimate).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Active Workflow View
        <div className="bg-white border border-gray-150 rounded-3xl p-8 shadow-sm">
          {/* Header indicator */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-950">{activeFP.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Current Workflow Step: <span className="font-bold text-gray-800 uppercase tracking-wider">{activeFP.status}</span></p>
            </div>
            
            {/* Steps indicator */}
            <div className="flex gap-2">
              <span className={`w-3 h-3 rounded-full ${activeFP.status !== 'PENDING_ANALYSIS' ? 'bg-emerald-500' : 'bg-gray-200'}`}></span>
              <span className={`w-3 h-3 rounded-full ${['ANALYZED', 'PAID', 'GENERATED'].includes(activeFP.status) ? 'bg-emerald-500' : 'bg-gray-200'}`}></span>
              <span className={`w-3 h-3 rounded-full ${['PAID', 'GENERATED'].includes(activeFP.status) ? 'bg-emerald-500' : 'bg-gray-200'}`}></span>
            </div>
          </div>

          {/* Render Step depending on Status */}
          {activeFP.status === 'PENDING_ANALYSIS' && (
            <div className="flex flex-col items-center justify-center py-12 max-w-xl mx-auto text-center gap-6">
              <div className="relative w-full h-64 border border-gray-150 rounded-2xl overflow-hidden flex items-center justify-center bg-gray-50">
                <img src={activeFP.imageUrl} alt={activeFP.name} className="max-h-full object-contain" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col justify-between p-6">
                    <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${analysisProgress}%` }}></div>
                    </div>
                    
                    {/* Console Logs */}
                    <div className="bg-black/80 rounded-xl p-4 text-left font-mono text-[10px] text-emerald-400 h-32 overflow-y-auto mt-4">
                      {analysisLogs.map((log, index) => (
                        <p key={index}>{log}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!isAnalyzing ? (
                <div>
                  <h3 className="text-lg font-black text-gray-950 mb-2">Simulate AI Blueprint Scan</h3>
                  <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto">
                    Our AI model will parse the coordinates of your 2D blueprints, segregate boundary lines, count apartment segments, and compile room definitions automatically.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <PremiumButton variant="outline" onClick={() => setActiveFP(null)}>
                      Cancel
                    </PremiumButton>
                    <PremiumButton variant="primary" onClick={handleAnalyze}>
                      Analyze with AI Model
                    </PremiumButton>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-gray-400">Scanning blueprint and identifying rooms...</p>
              )}
            </div>
          )}

          {activeFP.status === 'ANALYZED' && (
            <div className="grid grid-cols-2 gap-12 items-center py-6">
              {/* Cost Summary */}
              <div className="bg-gray-50/50 border border-gray-150 rounded-3xl p-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest">AI Extraction Summary</h3>
                  <p className="text-xs text-gray-400 mt-1">Verification details for flat layouts extracted by neural net model.</p>
                </div>

                <div className="flex flex-col gap-4 border-y border-gray-100 py-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-semibold">Detected Flats Partition:</span>
                    <span className="font-black text-gray-900">{activeFP.flatCount} Units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-semibold">Total Segmented Rooms:</span>
                    <span className="font-black text-gray-900">{activeFP.roomCount} Rooms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-semibold">Base Price (₹15,000 per flat):</span>
                    <span className="font-black text-gray-900">₹{(activeFP.priceEstimate).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Value Estimate:</span>
                  <span className="text-2xl font-black text-gray-950">₹{(activeFP.priceEstimate).toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Form */}
              <div className="bg-white border border-gray-150 rounded-3xl p-8 shadow-sm">
                <h3 className="text-sm font-black text-gray-950 mb-4 uppercase tracking-wider">Simulated Checkout</h3>
                <form onSubmit={handlePayment} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-gray-950"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Credit Card Number</label>
                    <input
                      type="text"
                      required
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-gray-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Expiration Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-gray-950"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">CVV / Security Code</label>
                      <input
                        type="password"
                        required
                        placeholder="123"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-gray-950"
                      />
                    </div>
                  </div>

                  <PremiumButton type="submit" variant="primary" disabled={isPaying} className="mt-4">
                    {isPaying ? 'Processing Payment...' : `Pay ₹${(activeFP.priceEstimate).toLocaleString()}`}
                  </PremiumButton>
                </form>
              </div>
            </div>
          )}

          {['PAID', 'GENERATED'].includes(activeFP.status) && (
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: 3D canvas viewport */}
              <div className="col-span-8 flex flex-col gap-4">
                {/* View Switchers */}
                <div className="flex justify-between items-center bg-gray-50 border border-gray-150 p-3 rounded-2xl">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('2D')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        viewMode === '2D' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'
                      }`}
                    >
                      Blueprint View
                    </button>
                    <button
                      onClick={() => setViewMode('3D')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        viewMode === '3D' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'
                      }`}
                    >
                      Perspective 3D
                    </button>
                    <button
                      onClick={() => setViewMode('WALK')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        viewMode === 'WALK' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'
                      }`}
                    >
                      Walkthrough (WASD)
                    </button>
                  </div>
                  {viewMode === 'WALK' && (
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Use WASD or arrow keys to move camera inside</span>
                  )}
                </div>

                {/* 3D Canvas Box */}
                <div className="relative border border-gray-150 rounded-3xl overflow-hidden h-[500px] shadow-inner bg-gray-50">
                  <canvas ref={canvasRef} className="w-full h-full block focus:outline-none" />
                </div>
              </div>

              {/* Right Column: Editor Toolbox */}
              <div className="col-span-4 bg-gray-50/50 border border-gray-150 rounded-3xl p-6 flex flex-col gap-6 h-[560px] overflow-y-auto">
                <div>
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">Interactive Toolbox</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Customize rooms, move furniture, and personalize materials.</p>
                </div>

                {/* Room Inspector / Paint Tool */}
                <div className="border-t border-gray-150 pt-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Room Customizer</span>
                  {selectedRoomId ? (
                    <div className="flex flex-col gap-3 bg-white p-4 border border-gray-100 rounded-2xl">
                      <p className="text-xs font-bold text-gray-700">
                        Selected: <span className="text-gray-900 font-black">{activeFP.layoutData?.rooms.find((r) => r.id === selectedRoomId)?.name}</span>
                      </p>
                      
                      {/* Paint Palette */}
                      <div>
                        <span className="text-[9px] text-gray-400 block mb-1 font-bold uppercase">Wall Paint Color</span>
                        <div className="flex gap-2">
                          {['#f5efe6', '#e3ece9', '#ece8f2', '#f4ece1', '#e1ecf4'].map((color) => (
                            <button
                              key={color}
                              onClick={() => { setPaintColor(color); }}
                              className={`w-6 h-6 rounded-full border transition ${paintColor === color ? 'scale-110 border-gray-950' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <PremiumButton variant="outline" onClick={handlePaintRoom} className="w-full">
                        Paint Room Wall
                      </PremiumButton>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">Click a room floor on the canvas to inspect & paint.</p>
                  )}
                </div>

                {/* Furniture Catalog */}
                <div className="border-t border-gray-150 pt-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">3D Furniture catalog</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'sofa', label: '🛋️ Sofa' },
                      { type: 'bed', label: '🛏️ Bed' },
                      { type: 'table', label: '☕ Table' },
                      { type: 'plant', label: '🪴 Plant' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => handleAddFurniture(item.type)}
                        className="py-2.5 px-3 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:border-gray-900 hover:text-gray-950 transition duration-300 shadow-sm"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Furniture Controls */}
                <div className="border-t border-gray-150 pt-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Item Editor</span>
                  {selectedFurnId ? (
                    <div className="flex flex-col gap-4 bg-white p-4 border border-gray-100 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-700 uppercase">
                          {activeFP.layoutData?.furniture.find((f) => f.id === selectedFurnId)?.type} Model
                        </p>
                        <button onClick={handleDeleteFurniture} className="text-xs font-bold text-red-500 hover:text-red-700">
                          Delete
                        </button>
                      </div>

                      {/* Rotation Slider */}
                      <div>
                        <div className="flex justify-between text-[9px] text-gray-400 font-bold mb-1 uppercase">
                          <span>Rotate</span>
                          <span className="text-gray-800">
                            {activeFP.layoutData?.furniture.find((f) => f.id === selectedFurnId)?.rotation || 0}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="270"
                          step="90"
                          value={activeFP.layoutData?.furniture.find((f) => f.id === selectedFurnId)?.rotation || 0}
                          onChange={(e) => handleUpdateFurniture('rotation', Number(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-950"
                        />
                      </div>

                      {/* Position X and Z inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Pos X</label>
                          <input
                            type="number"
                            step="0.5"
                            value={activeFP.layoutData?.furniture.find((f) => f.id === selectedFurnId)?.x || 0}
                            onChange={(e) => handleUpdateFurniture('x', Number(e.target.value))}
                            className="w-full px-2 py-1 text-xs border border-gray-150 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Pos Z</label>
                          <input
                            type="number"
                            step="0.5"
                            value={activeFP.layoutData?.furniture.find((f) => f.id === selectedFurnId)?.z || 0}
                            onChange={(e) => handleUpdateFurniture('z', Number(e.target.value))}
                            className="w-full px-2 py-1 text-xs border border-gray-150 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">Click furniture on canvas to edit placement and rotation.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
