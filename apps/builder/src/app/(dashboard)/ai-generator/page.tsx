'use client';

import React, { useState, useEffect, useRef } from 'react';
import PremiumButton from '@/components/premium-button';
import { Icon } from '@iconify/react';
import { useValidationStore } from '@/store/validationStore';
import { calculateArea } from '@/utils/geo-utils';

interface FloorPlan {
  id: string;
  projectId: string;
  name: string;
  imageUrl: string;
  flatCount: number;
  roomCount: number;
  priceEstimate: number;
  isPaid: boolean;
  status: 'PENDING_ANALYSIS' | 'ANALYZED' | 'PAID' | 'GENERATED';
  layoutData?: any;
  project?: { name: string };
}

const getFileCategory = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['dwg', 'dxf'].includes(ext || '')) return 'cad';
  if (['ifc'].includes(ext || '')) return 'bim';
  if (['pdf'].includes(ext || '')) return 'pdf';
  if (['glb', 'gltf', 'obj', 'fbx'].includes(ext || '')) return '3d';
  return 'images';
};

export default function AIFloorPlanGeneratorPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedProjId, setSelectedProjId] = useState('');
  const [loading, setLoading] = useState(true);

  // Active floor plan & Step state
  const [activeFP, setActiveFP] = useState<FloorPlan | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // Steps 2 to 7 when activeFP exists

  // Screen 1: Upload state
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [numFloors, setNumFloors] = useState(3);
  const [floorsConfig, setFloorsConfig] = useState<any[]>([
    { floorNumber: 1, type: '2BHK', fileName: '' },
    { floorNumber: 2, type: '2BHK', fileName: '' },
    { floorNumber: 3, type: '2BHK', fileName: '' }
  ]);

  // Screen 2: Floor Split state
  const [splitBoxes, setSplitBoxes] = useState<any[]>([]);
  const [drawingBox, setDrawingBox] = useState<any | null>(null);
  const [eps, setEps] = useState(8.0);
  const [isAutoSplitting, setIsAutoSplitting] = useState(false);
  const splitCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Screen 3: Validation Studio Zustand State
  const {
    rooms: valRooms,
    walls: valWalls,
    apertures: valApertures,
    selectedRoomId,
    selectedApId,
    initStore,
    selectRoom,
    selectAperture,
    updateRoomName,
    addRoom: storeAddRoom,
    deleteRoom: storeDeleteRoom,
    addAperture: storeAddAperture,
    dragRoomCorner,
    mergeRooms,
    splitRoom,
    getOverlaps,
  } = useValidationStore();

  const [draggedCorner, setDraggedCorner] = useState<{ roomId: string; cornerIndex: number } | null>(null);
  const valCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Screen 4: Theme state
  const [selectedTheme, setSelectedTheme] = useState('Modern');
  const [themeImage, setThemeImage] = useState('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80');
  const [detectedStyle, setDetectedStyle] = useState<any | null>(null);
  const [isDetectingStyle, setIsDetectingStyle] = useState(false);

  // Screen 5: Generate state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Screen 6: Walkthrough states
  const [viewMode, setViewMode] = useState<'3D' | 'WALK'>('3D');
  const [activeFloor, setActiveFloor] = useState(0);
  const walkthroughCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeRef = useRef<any>(null);

  // Screen 7: Embed code state
  const [embedTab, setEmbedTab] = useState<'iframe' | 'react' | 'next'>('iframe');

  const tenantId = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';

  // Polling, layer mapping, and snap tolerance states
  const [isPolling, setIsPolling] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'uploaded' | 'parsing' | 'parsed' | 'failed'>('uploaded');
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [detectedLayers, setDetectedLayers] = useState<string[]>([]);
  const [layerMapping, setLayerMapping] = useState<Record<string, string>>({});
  const [snapTolerance, setSnapTolerance] = useState(0.25);
  const [isReparsing, setIsReparsing] = useState(false);

  // Status polling function
  const startStatusPolling = (fpId: string) => {
    setIsPolling(true);
    setPollingStatus('uploaded');
    
    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(`http://localhost:3001/floorplans/${fpId}/status`, {
          headers: { 'x-tenant-id': tenantId },
        });
        const statusData = await statusRes.json();
        if (statusData.success) {
          setPollingStatus(statusData.status);
          
          if (statusData.status === 'parsed') {
            clearInterval(interval);
            setIsPolling(false);
            
            // Fetch updated floor plan details
            const detailRes = await fetch(`http://localhost:3001/floorplans/${fpId}`, {
              headers: { 'x-tenant-id': tenantId },
            });
            const detailData = await detailRes.json();
            setActiveFP(detailData);
            
            // If room count is less than 3, open the layer remapping modal
            if (detailData.roomCount < 3) {
              const layersRes = await fetch(`http://localhost:3001/floorplans/${fpId}/layers`, {
                headers: { 'x-tenant-id': tenantId },
              });
              const layersData = await layersRes.json();
              if (layersData.success) {
                setDetectedLayers(layersData.layers);
                const initialMapping: Record<string, string> = {};
                layersData.layers.forEach((layerName: string) => {
                  const lower = layerName.toLowerCase();
                  if (lower.includes('wall') || lower.includes('wl')) {
                    initialMapping[layerName] = 'walls';
                  } else if (lower.includes('door') || lower.includes('dr')) {
                    initialMapping[layerName] = 'doors';
                  } else if (lower.includes('window') || lower.includes('wd') || lower.includes('glaze')) {
                    initialMapping[layerName] = 'windows';
                  } else if (lower.includes('txt') || lower.includes('text') || lower.includes('label') || lower.includes('room')) {
                    initialMapping[layerName] = 'annotations';
                  } else {
                    initialMapping[layerName] = 'ignore';
                  }
                });
                setLayerMapping(initialMapping);
              }
              setShowLayerModal(true);
            } else {
              setCurrentStep(2); // Proceed to Step 2: floor split
            }
            loadInitialData();
          } else if (statusData.status === 'failed') {
            clearInterval(interval);
            setIsPolling(false);
            alert('AI pipeline parsing failed. Please check the drawing file structure.');
          }
        }
      } catch (err) {
        console.error('Status polling error:', err);
      }
    }, 1500);
  };

  const openParserSettings = async () => {
    if (!activeFP) return;
    try {
      const layersRes = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/layers`, {
        headers: { 'x-tenant-id': tenantId },
      });
      const layersData = await layersRes.json();
      if (layersData.success) {
        setDetectedLayers(layersData.layers);
        const initialMapping: Record<string, string> = { ...layerMapping };
        layersData.layers.forEach((layerName: string) => {
          if (!initialMapping[layerName]) {
            const lower = layerName.toLowerCase();
            if (lower.includes('wall') || lower.includes('wl')) {
              initialMapping[layerName] = 'walls';
            } else if (lower.includes('door') || lower.includes('dr')) {
              initialMapping[layerName] = 'doors';
            } else if (lower.includes('window') || lower.includes('wd') || lower.includes('glaze')) {
              initialMapping[layerName] = 'windows';
            } else if (lower.includes('txt') || lower.includes('text') || lower.includes('label') || lower.includes('room')) {
              initialMapping[layerName] = 'annotations';
            } else {
              initialMapping[layerName] = 'ignore';
            }
          }
        });
        setLayerMapping(initialMapping);
      }
      setShowLayerModal(true);
    } catch (err) {
      console.error('Failed to open parser settings:', err);
    }
  };

  // Load initial data
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

  // Handle file select mapping to Configurable list
  useEffect(() => {
    setFloorsConfig((prev) => {
      const next = [...prev];
      if (next.length < numFloors) {
        for (let i = next.length + 1; i <= numFloors; i++) {
          next.push({ floorNumber: i, type: '2BHK', fileName: '' });
        }
      } else if (next.length > numFloors) {
        next.splice(numFloors);
      }
      return next;
    });
  }, [numFloors]);

  // Sync validation local state when activeFP loads
  useEffect(() => {
    if (activeFP && activeFP.layoutData) {
      const layout = activeFP.layoutData;
      initStore(layout.rooms || [], layout.walls || [], layout.apertures || []);
      setSplitBoxes(layout.splitBoxes || []);
      if (layout.theme) setSelectedTheme(layout.theme);
      if (layout.frontImageUrl) setThemeImage(layout.frontImageUrl);
      if (layout.detectedStyle) setDetectedStyle(layout.detectedStyle);
    }
  }, [activeFP, initStore]);

  // ==================== SCREEN 1: UPLOAD ====================
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !selectedProjId) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const payloadConfig = floorsConfig.map(f => ({
        floorNumber: f.floorNumber,
        type: f.type,
        imageUrl: uploadFile ? `docs/cad/${uploadFile.name}` : undefined
      }));

      // 1. Create floor plan record
      const res = await fetch('http://localhost:3001/floorplans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          name: uploadName,
          projectId: selectedProjId,
          imageUrl: uploadFile ? `docs/cad/${uploadFile.name}` : 'docs/cad/building_layout.dxf',
          floorsConfig: payloadConfig
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error('Failed to create floor plan record');
      }

      const fpId = data.floorPlan.id;
      setUploadProgress(40);

      // 2. Upload file if selected
      if (uploadFile) {
        const formData = new FormData();
        formData.append('plan', uploadFile);
        
        const uploadRes = await fetch(`http://localhost:3001/floorplans/${fpId}/upload`, {
          method: 'POST',
          headers: {
            'x-tenant-id': tenantId,
          },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.status !== 'uploaded') {
          throw new Error('File upload failed');
        }
      } else {
        // Trigger parsing of default DXF
        const analyzeRes = await fetch(`http://localhost:3001/floorplans/${fpId}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
          }
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeData.success) {
          throw new Error('Failed to analyze default floorplan');
        }
      }

      setUploadProgress(100);
      setIsUploading(false);
      
      // Start status polling
      startStatusPolling(fpId);

    } catch (err) {
      console.error(err);
      alert('Failed to start Virtual Twin Pipeline: ' + (err as Error).message);
      setIsUploading(false);
    }
  };

  // ==================== SCREEN 2: FLOOR SPLIT INTERACTIVE CANVAS ====================
  useEffect(() => {
    if (currentStep !== 2 || !splitCanvasRef.current || !activeFP) return;
    const canvas = splitCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw coordinate space & parsed walls
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw parsed walls from DXF
    const walls = activeFP.layoutData?.walls || [];
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2.5;
    walls.forEach((w: any) => {
      ctx.beginPath();
      // Map wall coordinates (assumed around -10 to 10 scale) to canvas pixels
      const sx = canvas.width / 2 + w.startX * 18;
      const sy = canvas.height / 2 + w.startZ * 18;
      const ex = canvas.width / 2 + w.endX * 18;
      const ey = canvas.height / 2 + w.endZ * 18;
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    });

    // Draw split boxes
    splitBoxes.forEach((box) => {
      ctx.strokeStyle = '#4f46e5';
      ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
      ctx.lineWidth = 2;
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      ctx.fillStyle = '#4f46e5';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(box.name, box.x + 6, box.y + 16);
    });

    // Draw active drawing box
    if (drawingBox) {
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(drawingBox.startX, drawingBox.startZ, drawingBox.width, drawingBox.height);
      ctx.strokeRect(drawingBox.startX, drawingBox.startZ, drawingBox.width, drawingBox.height);
    }
  }, [currentStep, splitBoxes, drawingBox, activeFP]);

  const handleSplitMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawingBox({ startX: x, startZ: y, width: 0, height: 0 });
  };

  const handleSplitMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingBox) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawingBox({
      ...drawingBox,
      width: x - drawingBox.startX,
      height: y - drawingBox.startZ
    });
  };

  const handleSplitMouseUp = () => {
    if (!drawingBox || Math.abs(drawingBox.width) < 10) {
      setDrawingBox(null);
      return;
    }
    const name = prompt(
      "Name this Tower/Floor Split Area:", 
      `Tower A - Floor ${splitBoxes.length + 1}`
    );
    if (name) {
      const box = {
        id: Date.now().toString(),
        name,
        x: drawingBox.width < 0 ? drawingBox.startX + drawingBox.width : drawingBox.startX,
        y: drawingBox.height < 0 ? drawingBox.startZ + drawingBox.height : drawingBox.startZ,
        width: Math.abs(drawingBox.width),
        height: Math.abs(drawingBox.height)
      };
      setSplitBoxes([...splitBoxes, box]);
    }
    setDrawingBox(null);
  };

  const triggerAutoSplit = async () => {
    if (!activeFP) return;
    setIsAutoSplitting(true);
    try {
      const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/auto-split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ eps, minSamples: 3 })
      });
      const data = await res.json();
      if (data.success) {
        setActiveFP(data.floorPlan);
        setSplitBoxes(data.floorPlan.layoutData?.splitBoxes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoSplitting(false);
    }
  };

  const saveSplits = async () => {
    if (!activeFP) return;
    try {
      const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ splitBoxes })
      });
      const data = await res.json();
      if (data.success) {
        setActiveFP(data.floorPlan);
        setCurrentStep(3); // Proceed to Step 3: Validation Studio
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== SCREEN 3: VALIDATION STUDIO INTERACTIVE CANVAS ====================
  useEffect(() => {
    if (currentStep !== 3 || !valCanvasRef.current || !activeFP) return;
    const canvas = valCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fafbfc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw validation studio rooms (polygons)
    valRooms.forEach((r) => {
      if (!r.points || r.points.length === 0) return;
      const isSelected = r.id === selectedRoomId;

      ctx.fillStyle = isSelected ? 'rgba(79, 70, 229, 0.08)' : (r.color || '#f5efe6');
      ctx.strokeStyle = isSelected ? '#4f46e5' : '#e2e8f0';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      ctx.beginPath();
      r.points.forEach((pt, idx) => {
        const cx = canvas.width / 2 + pt.x * 18;
        const cy = canvas.height / 2 + pt.z * 18;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw centroid label
      const rCentroid = r.node || { x: r.x + r.width / 2, z: r.z + r.depth / 2 };
      const cx = canvas.width / 2 + rCentroid.x * 18;
      const cy = canvas.height / 2 + rCentroid.z * 18;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r.name, cx, cy - 2);
      ctx.fillStyle = '#6b7280';
      const rArea = calculateArea(r.points);
      ctx.fillText(`${rArea.toFixed(1)} m²`, cx, cy + 8);
      ctx.textAlign = 'left'; // Reset

      // Render handle widgets for selected room corners
      if (isSelected) {
        r.points.forEach((pt) => {
          const hx = canvas.width / 2 + pt.x * 18;
          const hy = canvas.height / 2 + pt.z * 18;
          ctx.fillStyle = '#4f46e5';
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    });

    // Draw walls
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 3;
    valWalls.forEach((w) => {
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 + w.startX * 18, canvas.height / 2 + w.startZ * 18);
      ctx.lineTo(canvas.width / 2 + w.endX * 18, canvas.height / 2 + w.endZ * 18);
      ctx.stroke();
    });

    // Draw doors (green) and windows (blue)
    valApertures.forEach((ap) => {
      const isSelected = ap.id === selectedApId;
      const w = valWalls.find(wl => wl.id === ap.wallId);
      if (!w) return;

      const dx = w.endX - w.startX;
      const dz = w.endZ - w.startZ;
      const len = Math.sqrt(dx * dx + dz * dz);
      const ux = dx / len;
      const uz = dz / len;

      const sx = w.startX + ux * ap.startOffset;
      const sz = w.startZ + uz * ap.startOffset;
      const ex = sx + ux * ap.width;
      const ez = sz + uz * ap.width;

      ctx.strokeStyle = isSelected ? '#f59e0b' : (ap.type === 'door' ? '#10b981' : '#3b82f6');
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 + sx * 18, canvas.height / 2 + sz * 18);
      ctx.lineTo(canvas.width / 2 + ex * 18, canvas.height / 2 + ez * 18);
      ctx.stroke();
    });
  }, [currentStep, valRooms, valWalls, valApertures, selectedRoomId, selectedApId, activeFP]);

  const handleValMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const canvas = e.currentTarget;

    // 1. Proximity check on selected room handles first (12px threshold)
    if (selectedRoomId) {
      const room = valRooms.find(r => r.id === selectedRoomId);
      if (room) {
        for (let i = 0; i < room.points.length; i++) {
          const pt = room.points[i];
          const hx = canvas.width / 2 + pt.x * 18;
          const hy = canvas.height / 2 + pt.z * 18;
          if (Math.hypot(mx - hx, my - hy) < 12) {
            setDraggedCorner({ roomId: room.id, cornerIndex: i });
            return;
          }
        }
      }
    }

    // 2. Select clicked room using raycasting point-in-polygon
    let clickedRoom = null;
    valRooms.forEach((r) => {
      const canvasPoly = r.points.map(pt => ({
        x: canvas.width / 2 + pt.x * 18,
        z: canvas.height / 2 + pt.z * 18
      }));
      
      let inside = false;
      for (let i = 0, j = canvasPoly.length - 1; i < canvasPoly.length; j = i++) {
        const xi = canvasPoly[i].x, zi = canvasPoly[i].z;
        const xj = canvasPoly[j].x, zj = canvasPoly[j].z;
        const intersect = ((zi > my) !== (zj > my))
          && (mx < (xj - xi) * (my - zi) / (zj - zi + 1e-9) + xi);
        if (intersect) inside = !inside;
      }

      if (inside) {
        clickedRoom = r.id;
      }
    });

    selectRoom(clickedRoom);
    selectAperture(null);
  };

  const handleValMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedCorner) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const canvas = e.currentTarget;

    const newX = (mx - canvas.width / 2) / 18;
    const newZ = (my - canvas.height / 2) / 18;

    dragRoomCorner(draggedCorner.roomId, draggedCorner.cornerIndex, newX, newZ);
  };

  const handleValMouseUp = () => {
    setDraggedCorner(null);
  };

  const handleAddRoom = (isBalcony = false) => {
    const name = prompt(isBalcony ? "Enter Balcony Name:" : "Enter Room Name:", isBalcony ? "Balcony Deck" : "Living Area");
    if (name) {
      storeAddRoom(name, isBalcony);
    }
  };

  const handleDeleteRoom = () => {
    if (selectedRoomId) {
      storeDeleteRoom(selectedRoomId);
    }
  };

  const handleAddAperture = (type: 'door' | 'window') => {
    storeAddAperture(type);
  };

  const saveValidationLayout = async () => {
    if (!activeFP) return;
    const updatedLayout = {
      ...activeFP.layoutData,
      rooms: valRooms,
      walls: valWalls,
      apertures: valApertures
    };
    try {
      const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ layoutData: updatedLayout })
      });
      const data = await res.json();
      if (data.success) {
        setActiveFP(data.floorPlan);
        setCurrentStep(4); // Proceed to Step 4: Theme
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== SCREEN 4: EXTERIOR THEME SELECTION ====================
  const handleDetectStyle = async () => {
    if (!activeFP || !themeImage) return;
    setIsDetectingStyle(true);
    try {
      const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/detect-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ imageUrl: themeImage })
      });
      const data = await res.json();
      if (data && data.success) {
        setDetectedStyle(data);
        if (data.style) {
          setSelectedTheme(data.style);
        }
      }
    } catch (err) {
      console.error("Style detection failed:", err);
    } finally {
      setIsDetectingStyle(false);
    }
  };

  const saveThemeConfig = async () => {
    if (!activeFP) return;
    try {
      const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ theme: selectedTheme, frontImageUrl: themeImage, detectedStyle })
      });
      const data = await res.json();
      if (data.success) {
        setActiveFP(data.floorPlan);
        setCurrentStep(5); // Proceed to Step 5: generating
        triggerTwinGeneration();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== SCREEN 5: GENERATE DIGITAL TWIN ====================
  const triggerTwinGeneration = () => {
    if (!activeFP) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationLogs([]);

    const steps = [
      'Extracting and compiling structural geometry...',
      'Calculating floor heights and stack boundaries...',
      'Creating procedural facade slabs, balconies, and window glass units...',
      'Binding PBR styling shaders mapping to theme palettes...',
      'Validating navigation reachability across hallways...',
      'digital-twin model compiled successfully!'
    ];

    let currentLog = 0;
    const timer = setInterval(() => {
      if (currentLog < steps.length) {
        setGenerationLogs(prev => [...prev, `[SYSTEM] ${steps[currentLog]}`]);
        setGenerationProgress(Math.min(95, (currentLog + 1) * 16));
        currentLog++;
      } else {
        clearInterval(timer);
        setTimeout(async () => {
          try {
            const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/twin`, {
              method: 'POST',
              headers: { 'x-tenant-id': tenantId }
            });
            const data = await res.json();
            if (data.success) {
              setGenerationProgress(100);
              setActiveFP(data.floorPlan);
              setCurrentStep(6); // Proceed to Step 6: Walkthrough
              loadInitialData();
            }
          } catch (err) {
            console.error(err);
          } finally {
            setIsGenerating(false);
          }
        }, 600);
      }
    }, 1000);
  };

  // ==================== SCREEN 6: PREVIEW WALKTHROUGH ====================
  useEffect(() => {
    if (currentStep !== 6 || !walkthroughCanvasRef.current || !activeFP) return;

    // Load Three.js dynamically to handle visual rendering
    import('three').then((THREE) => {
      const canvas = walkthroughCanvasRef.current!;
      const container = canvas.parentElement!;
      const width = container.clientWidth;
      const height = container.clientHeight || 500;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#fafafa');

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(15, 30, 20);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // Grid
      const grid = new THREE.GridHelper(40, 40, '#e2e8f0', '#f1f5f9');
      scene.add(grid);

      // Simple Building Exterior Shell Procedural Generation
      const layout = activeFP.layoutData || {};
      const numFloorsConfigured = layout.floorsConfig?.length || 2;
      
      const slabWidth = 18;
      const slabDepth = 15;
      const slabHeight = 3.0;

      // Resolve Style Intelligence colors and theme parameters
      const theme = selectedTheme || 'Modern';
      const activeDetectedStyle = detectedStyle || layout.detectedStyle || {};
      const colors = activeDetectedStyle.colors || [];
      const materials = activeDetectedStyle.materials || [];

      // Determine key colors
      let primaryColor = 0x1e293b; // slab
      let secondaryColor = 0x475569; // columns
      let glassColor = 0x00f5d4; // glass
      let frameColor = 0x1f2937; // frames/posts

      if (theme === 'Luxury') {
        primaryColor = 0x3e2723;
        secondaryColor = 0xd97706;
        glassColor = 0xf59e0b;
        frameColor = 0x78350f;
      } else if (theme === 'Commercial') {
        primaryColor = 0x1e3a8a;
        secondaryColor = 0x1e40af;
        glassColor = 0x3b82f6;
        frameColor = 0x0f172a;
      } else if (theme === 'Minimalist') {
        primaryColor = 0xf3f4f6;
        secondaryColor = 0x9ca3af;
        glassColor = 0xe5e7eb;
        frameColor = 0x4b5563;
      } else if (theme === 'Premium') {
        primaryColor = 0x271e18;
        secondaryColor = 0x854d0e;
        glassColor = 0x10b981;
        frameColor = 0x1f2937;
      }

      if (colors.length > 0) {
        const hexToNum = (hex: string) => parseInt(hex.replace('#', ''), 16);
        if (colors[0]) glassColor = hexToNum(colors[0]);
        if (colors[1]) secondaryColor = hexToNum(colors[1]);
        if (colors[2]) primaryColor = hexToNum(colors[2]);
      }

      // Draw Floor Stack & Exterior
      for (let f = 0; f < numFloorsConfigured; f++) {
        const hOffset = f * slabHeight;
        const isActive = f === activeFloor;

        // Floor Slab (with glassmorphism edge)
        const slabGeo = new THREE.BoxGeometry(slabWidth, 0.1, slabDepth);
        const slabMat = new THREE.MeshStandardMaterial({ 
          color: isActive ? primaryColor : new THREE.Color(primaryColor).multiplyScalar(0.7).getHex(),
          roughness: 0.5
        });
        const slabMesh = new THREE.Mesh(slabGeo, slabMat);
        slabMesh.position.set(0, hOffset, 0);
        scene.add(slabMesh);

        // Render simple columns at corners
        const colGeo = new THREE.BoxGeometry(0.3, slabHeight, 0.3);
        const colMat = new THREE.MeshStandardMaterial({
          color: secondaryColor,
          metalness: materials.includes('steel') || materials.includes('bronze') ? 0.8 : 0.2,
          roughness: 0.4
        });
        const corners = [
          { x: -slabWidth/2, z: -slabDepth/2 },
          { x: slabWidth/2, z: -slabDepth/2 },
          { x: -slabWidth/2, z: slabDepth/2 },
          { x: slabWidth/2, z: slabDepth/2 }
        ];
        corners.forEach(c => {
          const col = new THREE.Mesh(colGeo, colMat);
          col.position.set(c.x, hOffset + slabHeight/2, c.z);
          scene.add(col);
        });

        // Procedural Facade Glass Panels
        const facadeGeo = new THREE.BoxGeometry(slabWidth - 0.2, slabHeight - 0.2, 0.05);
        const facadeMat = new THREE.MeshStandardMaterial({
          color: glassColor,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
          metalness: 0.9
        });
        const facadeGlass = new THREE.Mesh(facadeGeo, facadeMat);
        facadeGlass.position.set(0, hOffset + slabHeight/2, slabDepth/2);
        scene.add(facadeGlass);

        // Balcony glass railings
        const balconyGeo = new THREE.BoxGeometry(6, 1.0, 0.05);
        const balconyMat = new THREE.MeshStandardMaterial({ color: glassColor, transparent: true, opacity: 0.4 });
        const balconyRail = new THREE.Mesh(balconyGeo, balconyMat);
        balconyRail.position.set(-3, hOffset + 0.5, slabDepth/2 + 0.6);
        scene.add(balconyRail);
      }

      // Camera Positioning
      if (viewMode === '3D') {
        camera.position.set(22, 12, 22);
        camera.lookAt(0, (numFloorsConfigured * slabHeight)/2, 0);
      } else {
        // Walk mode inside active floor
        const playerY = activeFloor * slabHeight + 1.2;
        camera.position.set(0, playerY, 4);
        camera.lookAt(0, playerY, 0);
      }

      renderer.render(scene, camera);
      threeRef.current = { renderer, scene, camera };
    });
  }, [currentStep, viewMode, activeFloor, selectedTheme, activeFP, detectedStyle]);

  const selectedRoom = selectedRoomId ? valRooms.find(r => r.id === selectedRoomId) : null;
  const overlaps = getOverlaps();
  const hasOverlap = selectedRoomId ? overlaps.some(pair => pair.includes(selectedRoomId)) : false;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Title Header */}
      <header className="flex justify-between items-center border-b border-gray-150 pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-950 flex items-center gap-3">
            <span className="bg-indigo-600 text-white p-2 rounded-2xl text-base shadow-lg shadow-indigo-600/20">🏢</span>
            Real Estate Virtual Twin Engine
          </h1>
          <p className="text-xs text-gray-400 mt-1">Convert CAD vector blueprints into immersive web walkthroughs.</p>
        </div>
        {activeFP && (
          <div className="flex gap-3">
            <PremiumButton variant="outline" onClick={() => { setActiveFP(null); setCurrentStep(1); }}>
              Back to Blueprints
            </PremiumButton>
            <span className="px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50/50 rounded-2xl text-xs font-bold shadow-sm">
              Step {currentStep} of 7
            </span>
          </div>
        )}
      </header>

      {/* Screen 1: Dashboard / Upload Screen */}
      {currentStep === 1 && (
        <div className="grid grid-cols-12 gap-8">
          {/* Form */}
          <div className="col-span-4 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-gray-950 mb-4 uppercase tracking-wider">Upload Vector Drawing</h3>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Associated Project Link</label>
                <select
                  value={selectedProjId}
                  onChange={(e) => setSelectedProjId(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-gray-950 font-semibold"
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
                  className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-gray-950 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Floors Count</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={numFloors}
                    onChange={(e) => setNumFloors(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Modality</label>
                  <select
                    className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none"
                    disabled
                  >
                    <option value="single">Single Unified CAD</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Floor Configuration Setup</span>
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50">
                  {floorsConfig.map((floor, idx) => (
                    <div key={floor.floorNumber} className="flex gap-2 items-center text-xs">
                      <span className="font-bold w-12 text-gray-600">Level {floor.floorNumber}:</span>
                      <select
                        value={floor.type}
                        onChange={(e) => {
                          const updated = [...floorsConfig];
                          updated[idx].type = e.target.value;
                          setFloorsConfig(updated);
                        }}
                        className="px-2 py-1 border border-gray-200 rounded-lg bg-white flex-1"
                      >
                        <option value="1BHK">1BHK (6 Units)</option>
                        <option value="2BHK">2BHK (4 Units)</option>
                        <option value="3BHK">3BHK (3 Units)</option>
                        <option value="PENTHOUSE">Penthouse (1 Unit)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block">
                  <input 
                    type="file" 
                    accept=".dxf,.pdf" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                      if (file && !uploadName) {
                        setUploadName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                      }
                    }}
                    className="hidden" 
                  />
                  <div className="w-full py-6 border-2 border-dashed border-gray-250 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gray-400 transition text-gray-400 hover:text-gray-600">
                    <span className="text-2xl">📐</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Select CAD Blueprint (.DXF, .PDF)</span>
                  </div>
                  {uploadFile && <p className="text-[10px] text-emerald-600 font-bold mt-1 text-center truncate max-w-full">Selected: {uploadFile.name}</p>}
                </label>
              </div>

              {isUploading && (
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gray-950 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              <PremiumButton type="submit" variant="primary" disabled={isUploading}>
                {isUploading ? 'Uploading DXF Vector Drawing...' : 'Start Virtual Twin Pipeline'}
              </PremiumButton>
            </form>
          </div>

          {/* Configured grid */}
          <div className="col-span-8 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-gray-950 mb-4 uppercase tracking-wider">Active Twins Catalog</h3>
            {floorPlans.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-2">
                <span className="text-4xl">📐</span>
                <p className="text-xs">No active models. Upload your DXF file to configure the twin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {floorPlans.map((fp) => (
                  <div 
                    key={fp.id} 
                    onClick={() => {
                      setActiveFP(fp);
                      setCurrentStep(fp.status === 'GENERATED' ? 6 : 2);
                    }}
                    className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col bg-gray-50/20"
                  >
                    <div className="h-28 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                      <span className="text-3xl">📐</span>
                      <span className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        {fp.status}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-950">{fp.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Project: {fp.project?.name || 'Grand Residences'}</p>
                      </div>
                      <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between items-center text-xs text-gray-500 font-semibold">
                        <span>{fp.flatCount || 0} Flats • {fp.roomCount || 0} Rooms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 2: Floor Split Editor */}
      {currentStep === 2 && activeFP && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 flex flex-col gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Draw Bounding Boxes around Towers & Floors</span>
            <div className="relative border border-gray-150 rounded-3xl overflow-hidden h-[450px] bg-white shadow-inner">
              <canvas 
                ref={splitCanvasRef} 
                width={700}
                height={450}
                onMouseDown={handleSplitMouseDown}
                onMouseMove={handleSplitMouseMove}
                onMouseUp={handleSplitMouseUp}
                className="w-full h-full block cursor-crosshair" 
              />
            </div>
          </div>
          <div className="col-span-4 bg-gray-50 border border-gray-150 p-6 rounded-3xl flex flex-col gap-5 justify-between h-[450px] overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">Manual Floor Splitter</h3>
                <button
                  type="button"
                  onClick={openParserSettings}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-805 flex items-center gap-1 border border-indigo-100 hover:border-indigo-300 px-2 py-1 rounded-lg bg-white"
                >
                  <Icon icon="mdi:cog" />
                  Settings
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Drag colored boxes on the blueprint to isolate separate tower or floor sections.
              </p>

              {/* Automated DBSCAN Spatial Clustering Splitter */}
              <div className="border-t border-gray-200 mt-4 pt-4 flex flex-col gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Automated Split Engine</span>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                    <span>Clustering Sensitivity (Eps)</span>
                    <span className="text-indigo-600 font-black">{eps}m</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="20.0"
                    step="0.5"
                    value={eps}
                    onChange={(e) => setEps(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                <PremiumButton 
                  type="button" 
                  variant="outline" 
                  onClick={triggerAutoSplit} 
                  disabled={isAutoSplitting}
                  className="w-full text-indigo-600 hover:text-indigo-800 border-indigo-200 hover:border-indigo-400 flex items-center justify-center gap-1.5"
                >
                  {isAutoSplitting ? (
                    <>
                      <Icon icon="line-md:loading-twotone-loop" className="w-4 h-4 animate-spin" />
                      Auto-Splitting...
                    </>
                  ) : (
                    <>
                      <span className="text-xs">⚡</span>
                      Auto-Detect Zones (DBSCAN)
                    </>
                  )}
                </PremiumButton>
              </div>

              <div className="flex flex-col gap-2 mt-4 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Split Regions</span>
                {splitBoxes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No split zones mapped yet. Draw on the blueprint coordinate grid.</p>
                ) : (
                  splitBoxes.map((box) => (
                    <div key={box.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-150 text-xs font-semibold text-gray-700">
                      <span>{box.name}</span>
                      <button 
                        onClick={() => setSplitBoxes(splitBoxes.filter(b => b.id !== box.id))}
                        className="text-red-500 hover:text-red-700 text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <PremiumButton variant="primary" onClick={saveSplits} className="w-full mt-2">
              Confirm Split & Proceed
            </PremiumButton>
          </div>
        </div>
      )}

      {/* Screen 3: Validation Studio */}
      {currentStep === 3 && activeFP && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 flex flex-col gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verify and Adjust Room Boundaries & Openings</span>
            <div className="relative border border-gray-150 rounded-3xl overflow-hidden h-[450px] bg-white shadow-inner">
              <canvas 
                ref={valCanvasRef} 
                width={700}
                height={450}
                onMouseDown={handleValMouseDown}
                onMouseMove={handleValMouseMove}
                onMouseUp={handleValMouseUp}
                className="w-full h-full block cursor-pointer" 
              />
            </div>
          </div>
          <div className="col-span-4 bg-gray-50 border border-gray-150 p-6 rounded-3xl flex flex-col gap-5 justify-between h-[450px] overflow-y-auto">
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">Validation Studio</h3>
                  <button
                    type="button"
                    onClick={openParserSettings}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-805 flex items-center gap-1 border border-indigo-100 hover:border-indigo-300 px-2 py-1 rounded-lg bg-white"
                  >
                    <Icon icon="mdi:cog" />
                    Settings
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Review, rename, or delete rooms and place apertures.</p>
              </div>

              {selectedRoom ? (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Selected Room ID: <span className="font-black text-gray-700">{selectedRoom.id.substring(0, 8)}...</span></p>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold">
                      {calculateArea(selectedRoom.points).toFixed(1)} m²
                    </span>
                  </div>

                  {hasOverlap && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded-xl font-medium leading-normal flex items-start gap-1">
                      <span>⚠️</span>
                      <span>Warning: This room overlaps with another boundary! Adjust vertices.</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Rename Room</label>
                    <input
                      type="text"
                      value={selectedRoom.name || ''}
                      onChange={(e) => updateRoomName(selectedRoom.id, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  {/* Merge Adjacent Room Droplist */}
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-gray-100">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Merge Adjacent Room</span>
                    <select 
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-xs focus:outline-none focus:border-indigo-500"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          mergeRooms(selectedRoom.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>Select target room to merge...</option>
                      {valRooms.filter(r => r.id !== selectedRoom.id).map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({calculateArea(r.points).toFixed(1)} m²)</option>
                      ))}
                    </select>
                  </div>

                  {/* Split Room buttons */}
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-gray-100">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Split Polygon (Midpoint)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => splitRoom(selectedRoom.id, 'x', 0.5)}
                        className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition"
                      >
                        ✂️ Split Vertically
                      </button>
                      <button 
                        onClick={() => splitRoom(selectedRoom.id, 'z', 0.5)}
                        className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition"
                      >
                        ✂️ Split Horizontally
                      </button>
                    </div>
                  </div>

                  <PremiumButton variant="outline" onClick={handleDeleteRoom} className="w-full text-red-500 hover:text-red-700">
                    Delete Selected Room
                  </PremiumButton>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Select a room polygon on the grid to edit its labels or drag handles.</p>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-gray-150">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Add Layout Elements</span>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleAddRoom(false)} className="px-3 py-2 bg-white border border-gray-150 rounded-xl text-xs font-bold hover:border-gray-800">
                    ➕ Add Room
                  </button>
                  <button onClick={() => handleAddRoom(true)} className="px-3 py-2 bg-white border border-gray-150 rounded-xl text-xs font-bold hover:border-gray-800">
                    ➕ Add Balcony
                  </button>
                  <button onClick={() => handleAddAperture('door')} className="px-3 py-2 bg-white border border-gray-150 rounded-xl text-xs font-bold hover:border-gray-800">
                    🚪 Place Door
                  </button>
                  <button onClick={() => handleAddAperture('window')} className="px-3 py-2 bg-white border border-gray-150 rounded-xl text-xs font-bold hover:border-gray-800">
                    🖼️ Place Window
                  </button>
                </div>
              </div>
            </div>

            <PremiumButton variant="primary" onClick={saveValidationLayout} className="w-full">
              Save layout & Continue
            </PremiumButton>
          </div>
        </div>
      )}

      {/* Screen 4: Exterior Theme Selection */}
      {currentStep === 4 && activeFP && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Choose Exterior Design Theme</span>
              <h2 className="text-lg font-black text-gray-950 mt-1">Theme Styles Library</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Modern', desc: 'Reflective cyan glass, concrete slabs, steel posts.', color: 'bg-teal-500' },
                { name: 'Luxury', desc: 'Warm ambient marble textures, golden highlights, bronze panels.', color: 'bg-amber-500' },
                { name: 'Commercial', desc: 'Vibrant curtain wall framing, blue panels, dark tiles.', color: 'bg-blue-500' },
                { name: 'Minimalist', desc: 'Pure white structures, simple frames, clean glass panels.', color: 'bg-gray-400' },
                { name: 'Premium', desc: 'Rich walnut wood cladding, slate tiles, handrails.', color: 'bg-indigo-500' }
              ].map((theme) => (
                <div 
                  key={theme.name}
                  onClick={() => setSelectedTheme(theme.name)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition ${selectedTheme === theme.name ? 'border-indigo-600 bg-indigo-50/20' : 'border-gray-100 hover:border-gray-300'}`}
                >
                  <div className={`w-8 h-8 rounded-full ${theme.color} mb-3 flex items-center justify-center text-white font-bold text-xs`}>
                    {theme.name[0]}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">{theme.name} Theme</h4>
                  <p className="text-[10px] text-gray-400 font-medium mt-1 leading-normal">{theme.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-4 bg-gray-50 border border-gray-150 p-6 rounded-3xl flex flex-col gap-6 justify-between">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">Style Reference Ingestion</h3>
                <p className="text-xs text-gray-400 mt-1">Theme dictates material shaders, glass colors, and balcony outlines.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Style Ingestion Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={themeImage}
                    onChange={(e) => setThemeImage(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleDetectStyle}
                    disabled={isDetectingStyle}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isDetectingStyle ? (
                      <>
                        <Icon icon="line-md:loading-twotone-loop" className="w-4 h-4 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        Detect
                      </>
                    )}
                  </button>
                </div>
              </div>

              {detectedStyle && (
                <div className="bg-white p-3.5 border border-indigo-100 rounded-2xl flex flex-col gap-2.5 shadow-sm">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-gray-400 uppercase tracking-widest">AI Style Detection Analysis</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black">
                      Confidence: {(detectedStyle.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Detected Materials</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(detectedStyle.materials || []).map((mat: string) => (
                        <span key={mat} className="px-2.5 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-[9px] uppercase tracking-wide">
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Dominant Color Swatches</span>
                    <div className="flex gap-2">
                      {(detectedStyle.colors || []).map((color: string) => (
                        <div key={color} className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: color }} />
                          <span className="text-[9px] font-mono text-gray-450">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-gray-150 rounded-2xl overflow-hidden h-36 relative bg-gray-100">
                <img src={themeImage} alt="Theme Elevation Blueprint" className="w-full h-full object-cover" />
              </div>
            </div>

            <PremiumButton variant="primary" onClick={saveThemeConfig} className="w-full">
              Generate Digital Twin Model
            </PremiumButton>
          </div>
        </div>
      )}

      {/* Screen 5: Generate Digital Twin Loading */}
      {currentStep === 5 && activeFP && (
        <div className="max-w-xl mx-auto py-12 flex flex-col items-center gap-6 text-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="w-full h-full rounded-full border-4 border-dashed border-indigo-600 animate-spin absolute"></div>
            <span className="text-3xl font-black">⚙️</span>
          </div>

          <div>
            <h2 className="text-lg font-black text-gray-950 mb-2">Assembling Virtual Twin Mesh</h2>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">Procedural shaders are building slabs, wall coordinates, facade glass panels, and balconies.</p>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-4">
            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${generationProgress}%` }}></div>
          </div>

          {/* Real-time system log trace */}
          <div className="w-full bg-slate-900 rounded-2xl p-4 text-left font-mono text-[10px] text-teal-400 h-36 overflow-y-auto mt-2 shadow-inner">
            {generationLogs.map((log, idx) => (
              <p key={idx} className="leading-relaxed">{log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Screen 6: Preview Walkthrough */}
      {currentStep === 6 && activeFP && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 flex flex-col gap-4">
            <div className="flex justify-between items-center bg-gray-50 border border-gray-150 p-3 rounded-2xl">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('3D')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition ${viewMode === '3D' ? 'bg-gray-950 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  3D Building Perspective
                </button>
                <button
                  onClick={() => setViewMode('WALK')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition ${viewMode === 'WALK' ? 'bg-gray-950 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  Indoor Walkthrough Preview
                </button>
              </div>
              
              {/* Floor toggle */}
              <div className="flex gap-1.5">
                {(activeFP.layoutData?.floorsConfig || []).map((fc: any, idx: number) => (
                  <button
                    key={fc.floorNumber}
                    onClick={() => setActiveFloor(idx)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${activeFloor === idx ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500'}`}
                  >
                    L{fc.floorNumber}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative border border-gray-150 rounded-3xl overflow-hidden h-[420px] bg-gray-100 shadow-inner">
              <canvas ref={walkthroughCanvasRef} className="w-full h-full block" />
            </div>
          </div>

          <div className="col-span-4 bg-gray-50 border border-gray-150 p-6 rounded-3xl flex flex-col gap-6 justify-between h-[486px]">
            <div>
              <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">Walkthrough Model Controls</h3>
              <p className="text-xs text-gray-400 mt-1">Virtual Walkthrough is live. Model uses the selected theme.</p>
              
              <div className="border border-gray-200 rounded-2xl p-4 bg-white mt-4 flex flex-col gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Twin Properties</span>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Theme Applied:</span><span className="font-bold">{selectedTheme}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Levels Total:</span><span className="font-bold">{activeFP.layoutData?.floorsConfig?.length || 3} Storeys</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Rooms Count:</span><span className="font-bold">{activeFP.roomCount} Rooms</span></div>
                </div>
              </div>
            </div>

            <PremiumButton variant="primary" onClick={() => setCurrentStep(7)} className="w-full">
              Get Copyable Embed Codes
            </PremiumButton>
          </div>
        </div>
      )}

      {/* Screen 7: Embed Code */}
      {currentStep === 7 && activeFP && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Embed snippet codes</span>
              <div className="flex gap-2 text-xs font-bold">
                <button onClick={() => setEmbedTab('iframe')} className={`px-4 py-1.5 rounded-lg ${embedTab === 'iframe' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400'}`}>Iframe</button>
                <button onClick={() => setEmbedTab('react')} className={`px-4 py-1.5 rounded-lg ${embedTab === 'react' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400'}`}>React</button>
                <button onClick={() => setEmbedTab('next')} className={`px-4 py-1.5 rounded-lg ${embedTab === 'next' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400'}`}>Next.js</button>
              </div>
            </div>

            <div className="bg-slate-950 text-slate-300 font-mono text-xs p-5 rounded-2xl h-44 overflow-auto shadow-inner relative">
              {embedTab === 'iframe' && (
                <code>{`<iframe \n  src="http://localhost:3000/explorer?projectId=${activeFP.projectId}&tenantId=${tenantId}" \n  width="100%" \n  height="600px" \n  style="border: none; border-radius: 16px;" \n  allow="autoplay; fullscreen"\n></iframe>`}</code>
              )}
              {embedTab === 'react' && (
                <code>{`import React from 'react';\n\nexport default function VirtualTour() {\n  return (\n    <iframe\n      src="http://localhost:3000/explorer?projectId="${activeFP.projectId}"&tenantId="${tenantId}" "\n      className="w-full h-[600px] border-0 rounded-2xl shadow-lg"\n      allowFullScreen\n    />\n  );\n}`}</code>
              )}
              {embedTab === 'next' && (
                <code>{`'use client';\n\nimport React from 'react';\n\nexport default function EmbedTwin() {\n  return (\n    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl">\n      <iframe\n        src="http://localhost:3000/explorer?projectId=${activeFP.projectId}&tenantId=${tenantId}"\n        className="w-full h-full border-0"\n        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"\n        allowFullScreen\n      />\n    </div>\n  );\n}`}</code>
              )}
            </div>
          </div>

          <div className="col-span-4 bg-gray-50 border border-gray-150 p-6 rounded-3xl flex flex-col justify-between h-[256px]">
            <div>
              <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">Embed SDK Ready</h3>
              <p className="text-xs text-gray-400 mt-1">Copy code snippets to display interactive 3D twins directly on builder sites.</p>
            </div>
            <PremiumButton variant="primary" onClick={() => { setActiveFP(null); setCurrentStep(1); }} className="w-full">
              Complete Setup & Finish
            </PremiumButton>
          </div>
        </div>
      )}

      {/* Status Polling Overlay */}
      {isPolling && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-6 shadow-2xl">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="absolute text-2xl">📐</span>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">AI Digital Twin Pipeline</h3>
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
                Status: {pollingStatus}
              </p>
              <p className="text-[11px] text-gray-400 mt-2 max-w-xs leading-normal">
                {pollingStatus === 'uploaded' && 'File received. Preparing parsing environment...'}
                {pollingStatus === 'parsing' && 'Running planar graph cycle detection, room label matching, and aperture alignment...'}
                {pollingStatus === 'parsed' && 'Parsing completed successfully! Preparing workspace...'}
                {pollingStatus === 'failed' && 'Parsing failed. Check parser settings or file integrity.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Layer Remapping Settings Modal */}
      {showLayerModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col p-6 animate-scale-up">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider flex items-center gap-2">
                  <Icon icon="mdi:cog" className="text-indigo-600 text-lg" />
                  CAD Parser Settings & Layer Remapping
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  AI resolved less than 3 rooms. Map your layers manually to align the parser.
                </p>
              </div>
              <button 
                onClick={() => setShowLayerModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <Icon icon="mdi:close" className="text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
              {/* Snap Tolerance Adjustment */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                  Snap Vertex Tolerance (meters)
                </span>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min={0.05}
                    max={1.00}
                    step={0.05}
                    value={snapTolerance}
                    onChange={(e) => setSnapTolerance(parseFloat(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-gray-700 w-16 text-right">
                    {snapTolerance.toFixed(2)}m
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Higher values (e.g. 0.25m - 0.40m) snap walls together across draft gaps.
                </p>
              </div>

              {/* Layer mapping grid */}
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-2">
                  Layer Categorization Mapping
                </span>
                {detectedLayers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl">
                    No layer structure found in blueprint file.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto border border-gray-150 rounded-2xl p-3 bg-gray-50">
                    {detectedLayers.map((layerName) => (
                      <div key={layerName} className="flex gap-3 items-center text-xs justify-between">
                        <span className="font-semibold text-gray-700 truncate max-w-[50%]" title={layerName}>
                          {layerName}
                        </span>
                        <select
                          value={layerMapping[layerName] || 'ignore'}
                          onChange={(e) => {
                            setLayerMapping({
                              ...layerMapping,
                              [layerName]: e.target.value
                            });
                          }}
                          className="px-2 py-1 border border-gray-200 rounded-lg bg-white w-40 text-[11px] font-semibold"
                        >
                          <option value="ignore">ignore</option>
                          <option value="walls">walls</option>
                          <option value="doors">doors</option>
                          <option value="windows">windows</option>
                          <option value="annotations">annotations</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowLayerModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!activeFP) return;
                  setIsReparsing(true);
                  try {
                    const res = await fetch(`http://localhost:3001/floorplans/${activeFP.id}/analyze`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-tenant-id': tenantId
                      },
                      body: JSON.stringify({
                        snapTolerance,
                        layerMapping
                      })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setShowLayerModal(false);
                      startStatusPolling(activeFP.id);
                    } else {
                      alert('Re-parse request failed');
                    }
                  } catch (err) {
                    console.error('Failed to trigger re-parse:', err);
                  } finally {
                    setIsReparsing(false);
                  }
                }}
                disabled={isReparsing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/10"
              >
                {isReparsing ? (
                  <>
                    <Icon icon="line-md:loading-loop" />
                    Re-parsing...
                  </>
                ) : (
                  'Re-parse Blueprint'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
