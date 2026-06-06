# PHASE_11_AI_CAD_TO_3D_CONVERSION_AND_EDITOR.md

# AI Powered Real Estate Virtual Experience Platform
## Phase 11 - AI CAD-to-3D Conversion Engine & Interactive Builder Editor

Version: 1.0
Owner: Founding Team
Status: Planning

---

# Vision

The objective of this phase is to build the automated CAD-to-3D pipeline and its companion interactive layout corrector.

This enables a builder to upload a raw engineering file (DXF, DWG, or PDF plan) and instantly receive a procedurally generated, walk-through-ready 3D digital twin.

If the AI conversion contains minor alignment issues, the builder can correct room boundaries, place or relocate windows/doors, and position furniture (sofas, beds, tables) visually via the dashboard.

Once approved, the generated walkthrough becomes instantly queryable and embeddable on any client website via the dynamic SDK script/iframe player.

---

# Architectural Flow

```
CAD File Upload (.dxf / .dwg / .pdf)
         ↓
Vector Parser / CV Edge Detector
         ↓
Procedural Floor & Room Extrusion
         ↓
Window, Door, & Balcony Auto-Generation
         ↓
Default Furniture Layout Auto-Placement
         ↓
Interactive Builder Layout Editor (Review & Corrections)
         ↓
WebGL GLB/JSON Compilation & Asset Serving
         ↓
Dynamic SDK Iframe Embed Player (Real-Time Website Updates)
```

---

# 1. What We Currently Have

### A. Dynamic Embed & SDK Engine
* **Location**: `real-estate-web/src/app/embed/project/[id]/page.tsx`
* **Features**:
  * Validates third-party domains and SDK authorization keys (`apiKey`) via the backend endpoint `/sdk/embeds/resolve`.
  * Renders a dedicated full-screen embed canvas wrapper feeding on resolved project parameters.
  * Supports real-time client page loading of models, hotspots, and guided walkthrough tours.

### B. Interactive 3D Spatial Viewer (Client Portal)
* **Location**: `real-estate-web/src/components/building-viewer.tsx`
* **Features**:
  * Loads exterior shell (`/building.glb`) and interior hallway (`/floor_walkthrough.glb`) assets.
  * Raycasting click listener: Detects if the user clicks on flat doors (e.g. `DoorGroup_Flat_A`) and glides the camera inside the corresponding room center.
  * Street view-style node transitions: Moves the camera from room to room with smooth GSAP animations.
  * Canvas-rendered 2D vector minimap showing real-time player coordinates and field-of-view (FOV) frustums.
  * HTML hotspot overlays projected dynamically from 3D coordinates.

### C. 3D Blueprint Visualizer & Editor (Builder Portal)
* **Location**: `real-estate-builder/src/app/(dashboard)/ai-generator/page.tsx`
* **Features**:
  * Uses custom Three.js geometries to procedurally render rooms as flat floor planes and extruded 3D partition walls.
  * Spawns modular furniture meshes (sofas, beds, dining tables, plants) according to 2D coordinates.
  * Supports picking and placing items, clicking rooms to change paint colors, and updating database values.
  * DXF Exporter: Generates and downloads a clean, vector-based 2D CAD engineering blueprint directly in-browser.

---

# 2. What is Missing (Remaining to Implement)

### A. Procedural Building Extrusion Engine (CAD-to-3D)
* **Status**: Currently simulated via static fallback models (`/building.glb` and `/floor_walkthrough.glb`).
* **Remaining Tasks**:
  * Develop the parser to read extracted CAD polyline layers (e.g., `Walls_Exterior`, `Walls_Interior`) and build custom 3D mesh walls on the fly using `THREE.ExtrudeGeometry`.
  * Automate the stacking of multiple floors: Stacking individual floor geometries sequentially along the Y-axis to build a whole tower exterior structure procedurally.
  * Segment tower structures automatically into lobbies, corridors, balconies, and individual flats based on wall boundaries.

### B. Automated Window and Aperture Generation
* **Status**: Currently missing (walls are solid extruded boxes).
* **Remaining Tasks**:
  * Detect window layer coordinates from the vector drawings or image contours.
  * Programmatically carve out gaps in the extruded wall meshes (using constructive solid geometry (CSG) techniques or segmented wall spans).
  * Auto-populate gaps with procedural window frame geometries and semi-transparent glass meshes.

### C. Google Street View-Style Walking Walkthrough
* **Status**: Currently uses a free-look OrbitControls setup restricted to a single coordinate point.
* **Remaining Tasks**:
  * Implement collision detection in walkthrough mode (`viewMode: 'WALK'`) to prevent the camera from clipping through interior walls.
  * Set up walkable nodes (node graphs) mapped dynamically to the center of each generated room.
  * Add point-and-click traversal links (ground circles/bubbles) to glide the player between nodes, mimicking Google Street View navigation.

### D. Advanced Builder Corrections Editor
* **Status**: The visual editor is currently limited to coordinate modifications and item additions.
* **Remaining Tasks**:
  * Drag-and-drop wall adjustment: Allow builders to select wall segments and stretch or slide them to correct AI detection errors.
  * Window/Door tool: Allow adding, removing, or resizing windows and doors directly on the 3D walls.
  * Auto-snapping: Enable furniture assets to snap to adjacent walls and align automatically with the floor grid when dragged.

---

# 3. New DB Schema Specifications

```sql
-- Track procedural 3D generations connected to projects
CREATE TABLE generated_building_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
    structure_json JSONB NOT NULL, -- Contains extruded walls, floors, ceilings polylines
    materials_config JSONB,        -- Maps texture files to specific surfaces
    scale_multiplier FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Store dynamically placed furniture and windows/doors mappings
CREATE TABLE structural_apertures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    floor_number INT NOT NULL,
    flat_number VARCHAR(50) NOT NULL,
    aperture_type VARCHAR(20) NOT NULL, -- 'window', 'door', 'balcony_railing'
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    rotation FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

# 4. Success Criteria

1. **Procedural Stacking**: A builder can upload a single floor plan layout and stack it to automatically generate a multi-floor tower with accurate lobbies and balconies.
2. **Snapping & Windows**: Interactive apertures (doors/windows) automatically create openings in the procedural walls.
3. **Walkthrough Traversal**: Users can traverse the generated walkthrough with proper wall boundaries and click-to-teleport ground rings.
4. **Real-time Embed Sync**: Saving a layout correction in the Builder Dashboard instantly updates the dynamic iframe embedded on external client sites.
