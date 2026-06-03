'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

interface BuildingViewerProps {
  activeFloor: number;
  viewMode: 'building' | 'walkthrough';
  activeRoom: string | null;
  setActiveRoom: (roomName: string | null) => void;
}

export default function BuildingViewer({
  activeFloor,
  viewMode,
  activeRoom,
  setActiveRoom,
}: BuildingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep refs to allow webgl variables to be accessed across state changes
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const loadedModelRef = useRef<THREE.Group | null>(null);
  const originalMaterials = useRef<Map<string, THREE.Material>>(new Map());
  const highlightMaterial = useRef<THREE.MeshStandardMaterial | null>(null);

  // Refs for dynamic walkthrough positions (enables compatibility with any new GLB file)
  const targetCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetControlsTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetDoorGroupRef = useRef<THREE.Group | null>(null);
  const targetDoorRotationRef = useRef<number>(0);

  // Initialize highlight material
  useEffect(() => {
    highlightMaterial.current = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.5,
    });
  }, []);

  // Floor highlighting logic (Runs only in building/exterior mode)
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

  // Handle room tours (moving camera inside room vs returning to lobby)
  useEffect(() => {
    if (viewMode !== 'walkthrough' || !cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (activeRoom === null) {
      // 1. Return to lobby
      console.log('Transitioning camera to Lobby...');
      controls.enabled = false;

      // Close the active door group if we have one
      if (targetDoorGroupRef.current) {
        gsap.to(targetDoorGroupRef.current.rotation, { y: 0, duration: 1.2, ease: 'power2.out' });
      }

      // Reset camera position and target back to the lobby center (stationary first-person look-around)
      gsap.to(camera.position, {
        x: 0,
        y: 1.6,
        z: 4.0,
        duration: 1.8,
        ease: 'power2.inOut',
      });
      gsap.to(controls.target, {
        x: 0,
        y: 1.6,
        z: 4.05,
        duration: 1.8,
        ease: 'power2.inOut',
        onComplete: () => {
          controls.enabled = true;
          // Set first-person look constraints
          controls.enableZoom = false; // Disable distance zoom
          controls.enablePan = false;  // Disable panning outside walls
          controls.minDistance = 0.01;
          controls.maxDistance = 0.1;  // Keep camera locked at target center
        },
      });
    } else {
      // 2. Glide into a flat interior using the dynamically calculated positions
      console.log(`Entering flat: ${activeRoom}`);
      controls.enabled = false;

      // Open the active door group
      if (targetDoorGroupRef.current) {
        gsap.to(targetDoorGroupRef.current.rotation, {
          y: targetDoorRotationRef.current,
          duration: 1.2,
          ease: 'power2.out'
        });
      }

      // Smooth camera transition into the room center
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
          // Keep camera locked in first-person mode at room center to avoid wall clipping
          controls.enableZoom = false; // Disable distance zoom
          controls.enablePan = false;  // Disable panning
          controls.minDistance = 0.01;
          controls.maxDistance = 0.1;
        },
      });
    }
  }, [activeRoom, viewMode]);

  // Main canvas renderer setup & GLB loading
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0c0f16);

    // 2. Camera setup - default FOV is 45
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 5. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight1.position.set(25, 40, 15);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f5d4, 0.4); // Neo-cyan glow fill
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

    // Set configuration based on viewMode
    setLoading(true);
    setError(null);
    originalMaterials.current.clear();
    targetDoorGroupRef.current = null;

    let modelPath = '/building.glb';

    if (viewMode === 'building') {
      camera.fov = 45; // Standard FOV for exterior
      camera.updateProjectionMatrix();
      camera.position.set(40, 25, 45);
      controls.target.set(0, 16, 0);
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minDistance = 15;
      controls.maxDistance = 80;
      controls.enableZoom = true;
      controls.enablePan = true;
    } else {
      // Walkthrough mode starts inside lobby facing z = 5 (directly towards Door C)
      camera.fov = 70; // Wide angle FOV to see the entire corridor/room clearly
      camera.updateProjectionMatrix();
      camera.position.set(0, 1.6, 4.0);
      controls.target.set(0, 1.6, 4.05); // Locked first-person rotation
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minDistance = 0.01;
      controls.maxDistance = 0.1;
      controls.enableZoom = false; // Disable OrbitControls distance zoom
      controls.enablePan = false;  // Disable panning
      modelPath = '/floor_walkthrough.glb';
    }

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
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

        // Initialize active floor highlight for building mode
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
        console.error(`Error loading model (${modelPath}):`, err);
        setError('Failed to load spatial model.');
        setLoading(false);
      }
    );

    // 6. Raycasting for Door interactions in Walkthrough Mode
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
        // Trace up the hierarchy of the clicked object to find any object containing "Door"
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
          console.log('Detected click on door:', doorName);

          // Find the DoorGroup parent to animate the hinge rotation
          let doorGroup: THREE.Group | null = null;
          let p: THREE.Object3D | null = doorMesh;
          while (p && p !== scene) {
            if (p.name.startsWith('DoorGroup_')) {
              doorGroup = p as THREE.Group;
              break;
            }
            p = p.parent;
          }

          // Fallback: If no DoorGroup is defined, use the doorMesh itself as the rotation group
          if (!doorGroup) {
            doorGroup = doorMesh as THREE.Group;
          }

          // Get the world position of the door to calculate dynamic navigation positions
          const doorWorldPos = new THREE.Vector3();
          doorMesh.getWorldPosition(doorWorldPos);

          const calculatedCameraPos = new THREE.Vector3();
          const calculatedControlsTarget = new THREE.Vector3();
          let calculatedDoorRotation = 0;

          // Determine navigation direction and angle based on door's relative position in the lobby
          if (doorWorldPos.x < -2) {
            // Door is on the left wall -> glide left into Flat A center
            calculatedCameraPos.set(doorWorldPos.x - 3.0, 1.6, doorWorldPos.z);
            calculatedControlsTarget.set(doorWorldPos.x - 3.05, 1.6, doorWorldPos.z);
            calculatedDoorRotation = -Math.PI / 1.7; // Swing open inward
          } else if (doorWorldPos.x > 2) {
            // Door is on the right wall -> glide right into Flat B center
            calculatedCameraPos.set(doorWorldPos.x + 3.0, 1.6, doorWorldPos.z);
            calculatedControlsTarget.set(doorWorldPos.x + 3.05, 1.6, doorWorldPos.z);
            calculatedDoorRotation = Math.PI / 1.7; // Swing open inward
          } else if (doorWorldPos.z > 4) {
            // Door is on the front wall -> glide forward into Flat C center
            calculatedCameraPos.set(doorWorldPos.x, 1.6, doorWorldPos.z + 3.0);
            calculatedControlsTarget.set(doorWorldPos.x, 1.6, doorWorldPos.z + 3.05);
            calculatedDoorRotation = -Math.PI / 1.7; // Swing open inward
          } else {
            // Default generic fallback
            calculatedCameraPos.set(doorWorldPos.x, 1.6, doorWorldPos.z + 3.0);
            calculatedControlsTarget.set(doorWorldPos.x, 1.6, doorWorldPos.z + 3.05);
            calculatedDoorRotation = -Math.PI / 1.7;
          }

          // Save calculated values to refs for the animation hook
          targetCameraPosRef.current.copy(calculatedCameraPos);
          targetControlsTargetRef.current.copy(calculatedControlsTarget);
          targetDoorGroupRef.current = doorGroup;
          targetDoorRotationRef.current = calculatedDoorRotation;

          // Resolve Flat Suffix (e.g. "Door_A" -> "Flat A", "Door_1" -> "Flat 1")
          const suffix = doorName.replace(/DoorGroup_/i, '').replace(/Door_/i, '').replace(/Mesh/i, '').trim();
          const roomLabel = suffix ? `Flat ${suffix}` : 'Flat Interior';

          setActiveRoom(roomLabel);
        }
      }
    };

    const handlePointerMove = (event: MouseEvent) => {
      if (viewMode !== 'walkthrough' || activeRoom !== null) {
        document.body.style.cursor = 'default';
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let clickedObj: THREE.Object3D | null = intersects[0].object;
        let isDoor = false;
        while (clickedObj && clickedObj !== scene) {
          if (clickedObj.name.toLowerCase().includes('door')) {
            isDoor = true;
            break;
          }
          clickedObj = clickedObj.parent;
        }

        if (isDoor) {
          document.body.style.cursor = 'pointer';
          return;
        }
      }
      document.body.style.cursor = 'default';
    };

    // 7. Custom FOV-zoom handler for first-person walkthrough mode
    // Adjusting FOV operates like a wide-angle/telescopic lens: it changes visible room space without moving camera outside walls.
    const handleWheelZoom = (event: WheelEvent) => {
      if (viewMode !== 'walkthrough') return;
      event.preventDefault();

      // Adjust camera FOV based on scroll direction
      let fov = camera.fov + event.deltaY * 0.04;
      // Clamp FOV between 35 (narrow zoom-in) and 85 (wide-angle zoom-out)
      fov = Math.max(35, Math.min(85, fov));
      
      camera.fov = fov;
      camera.updateProjectionMatrix();
    };

    renderer.domElement.addEventListener('click', handlePointerDown);
    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('wheel', handleWheelZoom, { passive: false });

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      document.body.style.cursor = 'default';
      renderer.domElement.removeEventListener('click', handlePointerDown);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('wheel', handleWheelZoom);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [viewMode]);

  return (
    <div className="relative w-full h-full min-h-[550px] bg-black/20 rounded-3xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />
      
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0f16]/80 backdrop-blur-md rounded-3xl z-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-label-caps tracking-[0.2em] text-primary font-bold mt-6 uppercase">
            {viewMode === 'building' ? 'Loading Spatial 3D Twins...' : 'Entering Virtual Walkthrough...'}
          </span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/20 backdrop-blur-md border border-red-500/20 rounded-3xl z-20">
          <span className="text-3xl mb-3">🛰️</span>
          <span className="text-xs text-red-400 font-bold uppercase tracking-wider">{error}</span>
        </div>
      )}
    </div>
  );
}
