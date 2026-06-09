# Shapespark 3D Walkthrough and Interaction Engine Analysis

This document provides a detailed breakdown of the features, UX flows, and technical implementation mechanics of Shapespark's interactive real estate platform. It maps out how we can integrate these premium visual and navigation standards directly into our SaaS platform embeds and visitor viewers.

---

## Interactive Shapespark Reference Model (Embed)

You can interact with the live Shapespark showcase model directly below to experience the walkthrough, floor clicks, and configurations:

<iframe src="https://demo.shapespark.com/product-tour/" width="100%" height="500px" style="border:1px solid rgba(255,255,255,0.1); border-radius: 16px; background: #0c0f16;"></iframe>

*Try testing: Single click on floors to glide, keyboard WASD to move, and the interactive configurator on the dining table/kitchen cabinets.*

---

## 1. Shapespark Architectural Overview & 3D Model Flow

### A. Pre-rendered Baked Lightmaps (Global Illumination)
Shapespark achieves photorealistic, 60 FPS rendering in standard web browsers by avoiding real-time lighting calculations.
* **Flow**:
  1. Builders model the space in SketchUp, Revit, Blender, or 3ds Max.
  2. The model is imported into Shapespark's desktop software.
  3. The software **bakes** global illumination (static lighting, soft shadows, bounce light) directly into the model's texture maps (lightmaps).
  4. In WebGL, the browser loads these textures as basic emissive/lightmapped shaders, requiring negligible GPU processing while looking extremely realistic.
* **Our Integration Plan**:
  * For procedurally generated plans, we simulate baked lightmaps using high-quality PBR (Physically Based Rendering) materials, ambient occlusion maps, and an HDRI environment light map (`PMREMGenerator` in Three.js) to mimic photorealism without static desktop baking.

---

## 2. Navigation Flow & Camera Movement Mechanics

Shapespark uses a highly polished camera system to prevent motion sickness while remaining intuitive.

### A. Point-and-Click Teleportation (Floor Clicking)
Instead of continuous sliding, clicking on the floor glides the viewer to that location.
* **UX Flow**:
  1. Hovering the mouse over the floor displays a circular indicator (projection ring) on the ground.
  2. Clicking triggers a smooth camera translation. The camera moves in a straight horizontal line to the clicked point.
  3. During movement, the camera height (Y-level) is locked at eye level (`1.6m` above the target floor mesh).
* **Technical Implementation**:
  * **Ground Raycaster**: Perform a raycast from the mouse coordinates, intersecting only with meshes labeled `floor`.
  * **GSAP Easing**: Use an ease-in-out interpolation curve over `0.8s` to `1.2s`:
    ```typescript
    gsap.to(camera.position, {
      x: clickPoint.x,
      z: clickPoint.z,
      duration: 1.0,
      ease: "power2.inOut"
    });
    ```

### B. Viewport Look-Around & Orbiting
* **Drag-to-Look**: Mouse dragging (or finger dragging on mobile) rotates the camera around the current eye position.
* **OrbitControls Lock**: In walkthrough mode, OrbitControls' `minDistance` and `maxDistance` are locked close together (`0.01` to `0.1`), effectively placing the pivot point right in front of the camera, turning the orbit control into a first-person look control.

### C. Keyboard WASD Navigation with sliding collision
To allow natural movement, keyboard keys walk forward, backward, and strafe side-to-side.
* **Wall & Furniture Collision**:
  * Before the camera's position is updated, cast short ray probes (e.g., `0.5m` length) in the direction of the movement vector from the player's position.
  * If a ray intersects a mesh labeled as `wall` or `furniture`, project the movement vector parallel to the obstacle plane (sliding collision) or zero out the movement vector to prevent clipping:
    ```typescript
    const playerDirection = movementVector.clone().normalize();
    const collisionRaycaster = new THREE.Raycaster(camera.position, playerDirection, 0, 0.6);
    const intersects = collisionRaycaster.intersectObjects(scene.children, true);
    
    if (intersects.length === 0) {
      camera.position.add(movementVector);
    }
    ```

---

## 3. Interactive Hotspots & Configurators

Shapespark tours are highly interactive, serving as virtual sales tools.

### A. Billboarding Information Hotspots
* Floating circular icons (information, links, play icons) hover in 3D space.
* **Visuals**: They use billboard behavior, always rotating to face the camera.
* **Interaction**: Clicking displays an HTML modal overlay containing prices, floor plans, video walk-throughs, or payment links.

### B. Material Changers (Configurators)
Builders can offer clients the ability to customize finishes (e.g., choosing wood vs. marble countertops, or changing sofa fabrics).
* **UX Flow**:
  1. Clicking a paint bucket/material icon next to an object opens a material selection drawer.
  2. Selecting a material dynamically updates the texture map of the corresponding 3D mesh.
* **Technical Implementation**:
  * Set a unique name or custom userData ID on the target meshes.
  * Use Three.js `TextureLoader` to dynamically load and assign a new texture map:
    ```typescript
    const texture = new THREE.TextureLoader().load('/textures/countertop_marble.jpg');
    targetMesh.material.map = texture;
    targetMesh.material.needsUpdate = true;
    ```

### C. Mechanical Door Opening
* Clicking a door pivot group triggers a visual rotation animation to open/close doors.

---

## 4. Persistent 2D Floorplan & Minimap

* **Persistent Minimap**: The 2D floorplan is kept visible at all times in the corner of the viewport.
* **Camera View Cone**: A blue/neon marker on the minimap shows the player's active position, and a radiating cone (FOV) matches the camera's active look angle.
* **Minimap Click-to-Teleport**: Clicking anywhere on the minimap translates the coordinates to 3D space and triggers the GSAP teleportation, allowing users to jump between completely isolated flats or separate building sections instantly.

---

## 5. Architectural Comparison & Integration Blueprint

| Shapespark Feature | Our Current Implementation | Next Implementation Steps (Phase 11+) |
| :--- | :--- | :--- |
| **High Fidelity Lighting** | Orbit light / basic ambient lights | Introduce `PMREMGenerator` + HDRI Environment mapping + soft shadow maps |
| **Floor Teleportation** | Walkable Node Rings clicking | Implement Ground Raycaster + Hover Projector Ring + click-to-teleport on any floor surface |
| **Keyboard WASD Movement** | Added WASD controls in client / builder walkthroughs | Add Sliding Collision Raycasting to prevent walking through walls/furniture |
| **2D Minimap Teleport** | Added persistent minimap with click-to-teleport mapping | Complete |
| **Material Configurator** | Paint tool (color updates) | Implement texture-swapping maps for floors/furniture |

---

## 6. Implementation Action Plan

To make our walkthrough visual and navigation flow identical to Shapespark, we will implement the following steps:

1. **Step 1: Sliding Collision Probes for WASD**:
   * Add a collision check function in the `animate` loop of [building-viewer.tsx](file:///c:/xampp/htdocs/real-estate-platform/real-estate-web/src/components/building-viewer.tsx) that checks for wall geometries in front of the camera before applying keyboard position offsets.
2. **Step 2: Smooth Floor Hover Projection Ring**:
   * Create a circular helper mesh (`THREE.RingGeometry`) that follows the mouse cursor position on the floor using raycasting.
   * Clicking anywhere on the floor triggers the camera teleport glide.
3. **Step 3: Material Configurator Engine**:
   * Create a database mapping of selectable textures (e.g. wood, tile, carpet).
   * Render a custom material selection panel on the right sidebar in the builder and visitor views.

---

## 7. Our Comparative "Luxury Showroom" Layout Implementation
To show the capability of our procedural Three.js renderer without resorting to static external embeds, we have implemented a high-fidelity coordinates layout template named `LUXURY_SHOWROOM`.
* **Available Rooms**:
  - Reception & Lobby Lounge
  - Luxury Living Suite
  - Modern Gourmet Kitchen
  - Presidential Master Suite
  - Open Air Sun Deck (Balcony)
* **Interactive Features Included**:
  - Auto-extruded walls with custom thickness and height.
  - Carved-out apertures for multiple doors and windows.
  - Door pivot swing open animations on click.
  - Pre-arranged modular furniture groups (sofas, beds, dining tables, cylinder legs, plants).
  - Walkable node points in the center of all 5 luxury areas.
  - Persistent 2D minimap mapping click coordinates for instant flat-to-flat/room-to-room navigation.
