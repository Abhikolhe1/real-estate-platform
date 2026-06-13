# 🏗️ MASTER BUILD PLAN — Real Estate SaaS Platform (Aether / BuilderOS)

> **How to use this file:**
> - Work through tasks top to bottom within each phase.
> - When a task is done, change `[ ]` to `[x]`.
> - When an entire phase is done, send me an **audit message** with a screenshot or description of what you built and I'll verify it's correct before you move to the next phase.
> - **Never skip a phase.** Each phase's output is the foundation for the next.
>
> **Free / Open Source tools used throughout:** `ezdxf`, `PaddleOCR`, `OpenCV`, `Shapely`, `NetworkX`, `Three.js`, `DBSCAN (sklearn)`, `pypdf`, `sharp` (Node image processing).
>
> **Paid AI APIs (only where free tools can't do the job):**
> - 🔑 **Google Gemini 1.5 Flash** — cheapest Vision API for PDF plan analysis and style detection (free tier: 15 req/min, 1M tokens/day). Get key at: https://aistudio.google.com/app/apikey
> - 🔑 **Anthropic Claude claude-haiku-4-5** — for structured data extraction from scanned plans and room labelling fallback (extremely cheap, ~$0.25/M tokens). Get key at: https://console.anthropic.com
> - Both are optional — the system degrades gracefully to pure open-source if keys are absent.

---

## 📊 Progress Overview

| Phase | Title | Status | Est. Days |
|-------|-------|--------|-----------|
| 0 | Foundation & Dev Environment | ✅ Completed | 2 |
| 1 | AI Pipeline — End to End | ✅ Completed | 5 |
| 2 | Procedural 3D Renderer (JSON → Three.js) | ✅ Completed | 7 |
| 3 | Multi-Floor & Tower System | ✅ Completed | 4 |
| 4 | Building Exterior Generation | ✅ Completed | 3 |
| 5 | Walkthrough — First-Person Camera | ✅ Completed | 4 |
| 6 | Inventory System — Live Unit Status in 3D | ✅ Completed | 4 |
| 7 | Amenities 3D Module | ✅ Completed | 4 |
| 8 | Multi-Tenant Subdomain Routing | ⬜ Not Started | 3 |
| 9 | Website Section Builder | ⬜ Not Started | 6 |
| 10 | CRM & Buyer Journey Analytics | ⬜ Not Started | 4 |
| 11 | Billing & Subscription (Razorpay) | ⬜ Not Started | 4 |
| 12 | Embed SDK | ⬜ Not Started | 3 |
| 13 | Mobile 3D Optimization | ⬜ Not Started | 3 |
| 14 | Security, Auth Hardening & Testing | ⬜ Not Started | 3 |
| 15 | Production Deploy & DevOps | ⬜ Not Started | 3 |

---

## PHASE 0 — Foundation & Dev Environment

> **Goal:** Make sure every app starts cleanly, env vars are correct, DB migrates properly, and the AI service is reachable. No building on a broken foundation.

### 0.1 — Environment Setup

- [x] **0.1.1** Create a single root `.env` file with all keys. Copy `apps/api/.env.example` → `.env.example` at root and document every variable.
- [x] **0.1.2** Add these env variables to `.env`:
  ```
  DATABASE_URL=postgresql://user:pass@localhost:5432/aether
  REDIS_URL=redis://localhost:6379
  AI_SERVICE_URL=http://localhost:8000
  GEMINI_API_KEY=           # optional — get from aistudio.google.com
  CLAUDE_API_KEY=           # optional — get from console.anthropic.com
  JWT_SECRET=your_secret_here
  RAZORPAY_KEY_ID=          # Phase 11
  RAZORPAY_KEY_SECRET=      # Phase 11
  UPLOAD_DIR=./apps/api/uploads
  ```
- [x] **0.1.3** Add a `docker-compose.dev.yml` at root that spins up PostgreSQL 16 and Redis 7 with correct ports and persistent volumes.
- [x] **0.1.4** Confirm `npm run dev:all` starts all 5 services without errors (api :3001, web :3000, builder :3002, admin :3003, ai-service :8000).
- [x] **0.1.5** Confirm `GET http://localhost:8000/health` returns `{"status":"healthy"}`.
- [x] **0.1.6** Confirm `GET http://localhost:3001/api/health` returns 200.

### 0.2 — Database

- [x] **0.2.1** Run TypeORM migrations. All 30+ entities should create tables cleanly with no errors.
- [x] **0.2.2** Run `npm run seed` (or `ts-node apps/api/src/seed.ts`) to create the default admin user and test builder.
- [x] **0.2.3** Verify in your DB client that these tables exist: `builder`, `project`, `tower`, `floor`, `flat`, `generated_structure`, `digital_twin_model`, `floorplan`, `structural_aperture`.
- [x] **0.2.4** Add a `structureJson` JSONB column to `generated_structure` entity if not already present — this holds the full parsed output from the AI service.
- [x] **0.2.5** Add a `pdfRasterPath` varchar column to `floorplan` entity — used in Phase 1 for PDF processing.

### 0.3 — Uploads Directory

- [x] **0.3.1** Ensure `apps/api/uploads/` directory exists and is git-ignored.
- [x] **0.3.2** Create subdirectory structure: `uploads/dxf/`, `uploads/pdf/`, `uploads/images/`, `uploads/exports/`.
- [x] **0.3.3** Confirm the NestJS `MulterModule` in `app.module.ts` is configured to write to the correct `UPLOAD_DIR` from env.

**⬛ AUDIT CHECKPOINT 0:** Send me: (1) screenshot of all 5 services running in terminal, (2) screenshot of DB tables in your DB client.

---

## PHASE 1 — AI Pipeline End-to-End (Upload → Parse → Persist → Serve)

> **Goal:** A builder uploads a `.dxf` or `.pdf` file → API receives it → calls AI service → AI service parses it → result is saved to DB → API returns a `structureId` → frontend can fetch the structure JSON. This is the single most important pipeline in the entire product.

### 1.1 — File Upload Endpoint (API)

- [x] **1.1.1** In `floorplan.controller.ts`, add a `POST /floorplans/:id/upload` endpoint that accepts `multipart/form-data` with a file field named `plan`.
- [x] **1.1.2** Save the file to `uploads/dxf/` (for `.dxf`) or `uploads/pdf/` (for `.pdf`). Store the filename as `floorplan.filePath` in the DB.
- [x] **1.1.3** After saving, return `{ floorplanId, filePath, status: 'uploaded' }` immediately (don't wait for parsing — that's async).
- [x] **1.1.4** Trigger a background job (use a Bull queue or simply `setImmediate`) that calls the parse pipeline described in 1.2.
- [x] **1.1.5** Add a `GET /floorplans/:id/status` endpoint that returns `{ status: 'uploaded' | 'parsing' | 'parsed' | 'failed', structureId? }`.

### 1.2 — AI Service Integration (NestJS → Python)

- [x] **1.2.1** In `twins.service.ts`, add method `async parseFloorplan(filePath: string, fileType: 'dxf' | 'pdf'): Promise<ParsedStructure>`.
- [x] **1.2.2** This method calls `POST http://${AI_SERVICE_URL}/parse` with body `{ filePath }` using NestJS `HttpService`.
- [x] **1.2.3** Handle the response: if `success: true`, return `data` object. If error, log and throw with meaningful message.
- [x] **1.2.4** Add 30 second timeout to the HTTP call — DXF parsing can be slow for large files.
- [x] **1.2.5** Update `floorplan.status` to `'parsing'` before the call and `'parsed'` or `'failed'` after.

### 1.3 — Persist Parsed Structure

- [x] **1.3.1** In `twins.service.ts`, after successful parse, create a `GeneratedStructure` entity with:
  ```typescript
  {
    floorplanId: floorplan.id,
    builderId: floorplan.builderId,
    projectId: floorplan.projectId,
    structureJson: parsedData,   // the full rooms/walls/apertures/furniture object
    wallCount: parsedData.walls.length,
    roomCount: parsedData.rooms.length,
    status: 'generated'
  }
  ```
- [x] **1.3.2** Save and return `generatedStructure.id` as the `structureId`.
- [x] **1.3.3** Update `floorplan.structureId` foreign key to point to the saved structure.
- [x] **1.3.4** Add `GET /structures/:id` endpoint in a new `structures.controller.ts` that returns the full `structureJson` for a given structure ID.
- [x] **1.3.5** Make sure this endpoint checks the requesting builder's tenancy — a builder can only fetch their own structures.

### 1.4 — PDF Processing in AI Service

- [x] **1.4.1** In `apps/ai-service/`, add `pdf_processor.py`. Install `pdf2image` + `poppler` for PDF-to-image rasterization.
- [x] **1.4.2** In `pdf_processor.py`, rasterize each PDF page to a 300 DPI PNG using `pdf2image.convert_from_path()`.
- [x] **1.4.3** Pass the rasterized image to PaddleOCR to extract text labels AND their bounding box coordinates on the page.
- [x] **1.4.4** Use OpenCV `cv2.Canny` + `cv2.findContours` on the grayscale page to detect room boundary polygons.
- [x] **1.4.5** Match OCR labels (by containment check) to detected contours to name each room polygon.
- [x] **1.4.6** Detect scale: OCR look for patterns like `3600`, `4200` next to dimension lines. Use the ratio of pixel distance to dimension value to set meters-per-pixel.
- [x] **1.4.7** Convert pixel polygons to meter coordinates using the detected scale, output the same `rooms/walls/apertures` JSON format as the DXF parser.
- [x] **1.4.8** In `main.py`, route `.pdf` files to `pdf_processor.py` instead of `CADParser`.
- [x] **1.4.9** Gemini Vision fallback (if `GEMINI_API_KEY` set): if OpenCV contour detection finds < 3 rooms, call Gemini Flash with the page image and this prompt:
  ```
  Analyze this architectural floor plan image. Return ONLY a JSON object with:
  { "rooms": [{"name": "Living Room", "approxWidthMeters": 4.5, "approxDepthMeters": 3.2}], "scale": "1:100" }
  No explanation. Only JSON.
  ```
- [x] **1.4.10** Merge Gemini room names with OpenCV polygon shapes for best result.

### 1.5 — Layer Remapping UI (for non-standard DXF files)

- [x] **1.5.1** In `main.py`, add `GET /layers?filePath=...` endpoint that reads a DXF file and returns all unique layer names without parsing.
- [x] **1.5.2** In the builder dashboard `ai-generator/page.tsx`, after file upload, if parsing returns `roomCount < 3`, show a layer remapping modal.
- [x] **1.5.3** Modal shows a list of all detected layers with a dropdown for each: `[ walls | doors | windows | annotations | ignore ]`.
- [x] **1.5.4** On submit, call `POST /parse` again with an additional `layerMapping` parameter that overrides the keyword detection.
- [x] **1.5.5** In `parser.py`, accept an optional `layerMapping` dict and use it to override the layer keyword matching.
- [x] **1.5.6** Save the layer mapping to the `Builder` entity as `dxfLayerPreferences` JSONB — reuse for future uploads from the same builder.

### 1.6 — Snap Tolerance Improvement

- [x] **1.6.1** Increase default `snap_tolerance` in `GeometryEngine` from `0.08` to `0.25` (25cm — better for Indian CAD drawings with gap imprecision).
- [x] **1.6.2** Add `POST /parse` optional `snapTolerance` parameter (float, 0.05–1.0) so the frontend can let the builder adjust it.
- [x] **1.6.3** Add a "Re-parse with settings" button in the builder dashboard that lets the builder tweak snap tolerance and re-trigger parsing without re-uploading the file.

**⬛ AUDIT CHECKPOINT 1:** Send me: (1) Postman/Thunder Client screenshot of `POST /floorplans/:id/upload` with a `.dxf` file returning a `structureId`, (2) `GET /structures/:id` response showing parsed rooms and walls JSON.

---

## PHASE 2 — Procedural 3D Renderer (JSON → Three.js Scene)

> **Goal:** Replace the static `building.glb` placeholder with a live Three.js scene generated from the `structureJson`. This is the heart of the product.

### 2.1 — Core Scene Compiler

- [x] **2.1.1** Create `apps/builder/src/components/scene-compiler/` directory.
- [x] **2.1.2** Create `SceneCompiler.ts` — a class that takes `structureJson` as input and returns a `THREE.Group` containing all geometry.
- [x] **2.1.3** Constructor params: `{ structureJson, wallHeight: number = 3.0, wallThickness: number = 0.15, floorElevation: number = 0 }`.
- [x] **2.1.4** Add `compile(): THREE.Group` method that calls `buildWalls()`, `buildFloor()`, `buildCeiling()`, `buildApertures()` and returns the combined group.

### 2.2 — Wall Geometry Builder

- [x] **2.2.1** In `buildWalls(walls: Wall[])`: for each wall segment, compute: length = distance between start and end points, midpoint, rotation angle.
- [x] **2.2.2** Create a `THREE.BoxGeometry(length, wallHeight, thickness)` for each wall.
- [x] **2.2.3** Position the mesh at the wall midpoint, rotate by the wall's angle.
- [x] **2.2.4** Apply a default white/cream `MeshStandardMaterial` with `roughness: 0.8`.
- [x] **2.2.5** Set `mesh.castShadow = true` and `mesh.receiveShadow = true`.
- [x] **2.2.6** Assign `userData.wallId = wall.id` to each mesh for click detection.
- [x] **2.2.7** Merge all wall meshes with the same material into a single `BufferGeometry` using `THREE.BufferGeometryUtils.mergeGeometries()` for performance.

### 2.3 — Floor & Ceiling Geometry

- [x] **2.3.1** In `buildFloor(rooms: Room[])`: for each room, create a `THREE.PlaneGeometry(room.width, room.depth)`.
- [x] **2.3.2** Position at room center, rotate -90° on X axis to lay flat.
- [x] **2.3.3** Apply room color from `room.color` as `MeshStandardMaterial` color.
- [x] **2.3.4** Set `mesh.receiveShadow = true`.
- [x] **2.3.5** Assign `userData.roomId = room.id` for click detection.
- [x] **2.3.6** `buildCeiling(rooms)`: same as floor but Y offset = wallHeight, use a near-white color, set `side: THREE.BackSide`.

### 2.4 — Door & Window Apertures (Cut Opening in Wall)

> Note: True Boolean CSG is expensive. Use the "subtraction mesh" visual trick instead — place a dark/transparent box in the opening to simulate a cut.

- [x] **2.4.1** In `buildApertures(apertures, walls)`: for each aperture, find its parent wall by `wallId`.
- [x] **2.4.2** Compute the aperture's world position: start from wall start point, move `startOffset` units along the wall direction, center the aperture width.
- [x] **2.4.3** For **doors**: create a `BoxGeometry(width, height, thickness * 1.2)` with a dark transparent material `(color: 0x000000, opacity: 0.7, transparent: true)`. This visually simulates the door opening.
- [x] **2.4.4** For **windows**: same geometry at `elevation` Y offset above floor. Use a light blue semi-transparent material `(color: 0xadd8e6, opacity: 0.4, transparent: true)`.
- [x] **2.4.5** For **door swing arcs**: create a thin quarter-circle `THREE.RingGeometry` on the floor to show door swing direction. Only visible in top-down mode.
- [x] **2.4.6** Assign `userData.apertureId`, `userData.type` to each aperture mesh.

### 2.5 — Furniture Geometry

- [x] **2.5.1** Create `FurnitureFactory.ts` — a factory that returns a `THREE.Group` for each furniture type.
- [x] **2.5.2** Implement these furniture types using primitive geometries (no external GLB needed):
  - `bed`: box for mattress + 2 smaller boxes for pillows + box for headboard.
  - `sofa`: wide flat box for seat + thinner tall box for backrest.
  - `table`: thin flat box for top + 4 cylinder legs.
  - `wardrobe`: tall box with a vertical line texture (door suggest).
  - `toilet`: box + smaller rounded box on top.
  - `sink`: small box with a hole visual.
  - `counter` (kitchen): long flat box along a wall.
- [x] **2.5.3** In `buildFurniture(furniture, rooms)`: for each furniture item, call `FurnitureFactory.create(type)`, position at `(item.x, 0, item.z)`, rotate by `item.rotation`.
- [x] **2.5.4** All furniture meshes get `userData.furnitureId`, `userData.type`.
- [x] **2.5.5** Auto-placement fallback (if `furniture[]` is empty from parser): in `buildFurniture`, call `AutoPlacer.placeForRooms(rooms)` which returns a furniture array using the rules:
  - Room name contains "bed" → add bed + wardrobe.
  - Room name contains "living" or "hall" → add sofa + table.
  - Room name contains "kitchen" → add counter along longest wall.
  - Room name contains "bath" or "toilet" → add toilet + sink.

### 2.6 — Lighting Setup

- [x] **2.6.1** Add `THREE.AmbientLight(0xffffff, 0.6)` as base fill light.
- [x] **2.6.2** Add `THREE.DirectionalLight(0xffffff, 1.0)` positioned at (10, 20, 10) with `castShadow: true`.
- [x] **2.6.3** Set shadow map size to `2048x2048` for sharp shadows.
- [x] **2.6.4** Add a `THREE.HemisphereLight(0xffffff, 0xccaa88, 0.4)` for warm floor bounce.
- [x] **2.6.5** For window openings, add small `THREE.RectAreaLight` on each window face to simulate daylight streaming in (only when window count < 10 for perf).

### 2.7 — Replace Static GLB with Compiled Scene

- [x] **2.7.1** In the building viewer component (`building-viewer.tsx` in `apps/web` and the digital twin viewer in `apps/builder`):
  - Remove the `GLTFLoader` / static `.glb` loading code.
  - On component mount, fetch `GET /structures/:structureId` to get the JSON.
  - Pass JSON to `SceneCompiler` and add the returned group to the Three.js scene.
- [x] **2.7.2** Show a loading progress bar while compiling (large plans with 200+ walls can take ~500ms to compile).
- [x] **2.7.3** Add an error state: if structure fetch fails, show "Plan not yet generated — upload a floor plan to get started."
- [x] **2.7.4** Keep the orbit controls working after switching to the compiled scene.
- [x] **2.7.5** Add a "reset camera" button that flies back to the default overview position.

### 2.8 — Room Click Interaction

- [x] **2.8.1** Add a `THREE.Raycaster` on mouse click events.
- [x] **2.8.2** On click, find the first intersected object with `userData.roomId`.
- [x] **2.8.3** Highlight the clicked room: briefly animate its floor mesh color to a lighter shade using `TWEEN.js` or manual lerp.
- [x] **2.8.4** Show a room info panel (right sidebar or bottom sheet on mobile): room name, dimensions (width × depth × height), area in sq.ft., assigned flat.
- [x] **2.8.5** On clicking a wall, show wall info: wall ID, length, thickness, any apertures on it.

**⬛ AUDIT CHECKPOINT 2:** Send me a video/screenshot of the 3D viewer showing a real parsed floor plan (from a DXF file) rendered as actual walls, floors, and furniture — not the static GLB placeholder.

---

## PHASE 3 — Multi-Floor & Tower System

> **Goal:** Stack multiple floor plans vertically to form a complete tower. Each floor is an independent scene compiled from its own DXF/structureJson.

### 3.1 — Floor Data Model

- [x] **3.1.1** In the builder dashboard, add a "Floors" management page (route already exists at `floors/page.tsx`).
- [x] **3.1.2** UI: create tower → add floors to tower (Floor 1, Floor 2, ... Floor N).
- [x] **3.1.3** Each floor has: `floorNumber`, `floorHeight` (default 3.0m), `floorplanId` (FK to uploaded plan), `flatType` (1BHK/2BHK/3BHK), `unitsPerFloor`.
- [x] **3.1.4** Floors can share a `floorplanId` (typical — same flat layout repeated). Floor 1 (ground/lobby) gets its own unique plan.
- [x] **3.1.5** Add `GET /towers/:id/floors` endpoint that returns all floors with their associated structure JSON.

### 3.2 — Multi-Floor Scene Compiler

- [x] **3.2.1** Create `TowerCompiler.ts` that takes an array of `{ floor: FloorData, structureJson }` and returns a single `THREE.Group` for the entire tower.
- [x] **3.2.2** For each floor: call `SceneCompiler.compile()` with `floorElevation = (floorNumber - 1) * floorHeight`.
- [x] **3.2.3** Offset the compiled group on the Y axis by `floorElevation`.
- [x] **3.2.4** Add a thin `PlaneGeometry` slab between floors (the concrete ceiling/floor slab, ~0.25m thick) in gray concrete material.
- [x] **3.2.5** The ground floor (floor 0): add a slightly thicker slab (0.5m) representing the foundation/podium.
- [x] **3.2.6** At the very top: add a flat roof slab + a parapet wall (thin BoxGeometry) around the perimeter.

### 3.3 — Floor Selector UI

- [x] **3.3.1** Add a vertical slider or stepper UI (fixed left side of viewer) showing floor numbers: B2, B1, G, 1, 2, ... N.
- [x] **3.3.2** Clicking a floor: all other floors fade to 10% opacity (`material.opacity = 0.1, transparent = true`) — selected floor stays at 100%.
- [x] **3.3.3** Camera smoothly animates (using `TWEEN.js`) to look at the selected floor at eye level.
- [x] **3.3.4** "Show All" button restores all floors to full opacity.
- [x] **3.3.5** Add a "Explode View" button: spreads floors apart vertically (Y offset × 2) so you can see all floors simultaneously with gaps between them. Toggle back to compressed view.

### 3.4 — Flat Navigation

- [x] **3.4.1** Each flat (unit) in the floor plan should be clickable as a group (not just individual rooms).
- [x] **3.4.2** When a flat is clicked: show a Flat Info card overlay with: flat number, BHK type, area sqft, current status (available/booked/sold), price.
- [x] **3.4.3** "View inside" button in the flat info card: switches to walkthrough mode inside that flat (Phase 5).
- [x] **3.4.4** Flat boundaries are determined by grouping rooms that share the same `flatId` — ensure the `GeneratedStructure` parsing assigns `flatId` to rooms based on the flat type.

**⬛ AUDIT CHECKPOINT 3:** Send me a screenshot of a multi-floor tower (minimum 5 floors) visible in the 3D viewer, with the floor selector working.

---

## PHASE 4 — Building Exterior Generation

> **Goal:** Auto-generate a realistic building exterior shell from the floor plan data. No manual modeling needed.

### 4.1 — Exterior Shell from Floor Footprint

- [x] **4.1.1** Create `ExteriorGenerator.ts` that takes a tower's ground floor `structureJson` and total `buildingHeight`.
- [x] **4.1.2** Compute building footprint: the bounding box of all wall endpoints (`minX`, `maxX`, `minZ`, `maxZ`).
- [x] **4.1.3** For an initial rectangular building: create 4 exterior wall faces using `PlaneGeometry` sized to the footprint sides × building height.
- [x] **4.1.4** Apply a default exterior material: light grey concrete texture (use a simple `MeshStandardMaterial` with a procedural noise color, no external texture files needed yet).
- [x] **4.1.5** For each floor level: add a thin horizontal band (0.1m high box) around the perimeter to represent the floor slab edge / cornice lines.
- [x] **4.1.6** Add a podium base (ground floor plinth): slight extrusion 0.5m beyond the building footprint, 1.5m tall.

### 4.2 — Window Grid on Exterior

- [x] **4.2.1** For each floor, detect which walls are exterior (on the building perimeter — they have no rooms on both sides).
- [x] **4.2.2** On each exterior wall face, generate a grid of windows: based on detected `apertures` of type `window` from the floor plan.
- [x] **4.2.3** Each window: a blue tinted semi-transparent `PlaneGeometry` slightly recessed (0.05m) from the wall face.
- [x] **4.2.4** Add window frame geometry: 4 thin `BoxGeometry` strips around each window opening.
- [x] **4.2.5** For units with `balcony` rooms detected in the floor plan: add protruding balcony slab (thin `BoxGeometry` extending 1.2m beyond exterior wall) + glass railing (transparent thin box).

### 4.3 — Facade Texture Upload

- [x] **4.3.1** In builder dashboard, add a "Building Appearance" tab in the project settings.
- [x] **4.3.2** Facade texture options: Concrete (default), Brick, Glass Curtain, Stone, Sandstone. These are procedural materials — no image upload needed.
- [x] **4.3.3** Each option is a `MeshStandardMaterial` with specific color + roughness + metalness values:
  - Concrete: `color: #c8c4be, roughness: 0.9, metalness: 0.0`
  - Brick: `color: #b5652b, roughness: 0.95, metalness: 0.0`
  - Glass Curtain: `color: #88b4d4, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7`
  - Stone: `color: #8b7355, roughness: 0.85, metalness: 0.0`
- [x] **4.3.4** Custom texture image upload: accept JPG/PNG, upload to `uploads/images/`, apply as `THREE.TextureLoader` on the exterior mesh.
- [x] **4.3.5** Save the selected facade option to the `Project` entity as `exteriorConfig` JSONB.

### 4.4 — Site Context (Ground Plane + Sky)

- [x] **4.4.1** Add a ground plane: large `PlaneGeometry` (200m × 200m) with a grass-green material under the building.
- [x] **4.4.2** Add a simple sky background: `THREE.Color` for the renderer `clearColor` — light blue gradient (simulate with a large sphere around the scene with `BackSide` rendering).
- [x] **4.4.3** Add ambient occlusion post-processing (`THREE.SSAOPass` from examples) for shadow depth at base of building — makes it feel grounded.
- [x] **4.4.4** Add a subtle environment light using `THREE.PMREMGenerator` with a simple gradient env map — improves glass reflections.

**⬛ AUDIT CHECKPOINT 4:** Send me a screenshot of the building exterior view showing the full tower height, window grids, balconies, and site ground plane.

---

## PHASE 5 — First-Person Walkthrough Camera

> **Goal:** Let buyers "walk inside" a flat using WASD + mouse (desktop) or touch + gyroscope (mobile). This is the biggest buyer engagement feature.

### 5.1 — PointerLock First-Person Controller

- [x] **5.1.1** Import `PointerLockControls` from `three/examples/jsm/controls/PointerLockControls`.
- [x] **5.1.2** On entering walkthrough mode: call `controls.lock()` to capture the pointer.
- [x] **5.1.3** Show an overlay instruction: "Click to start walking · WASD to move · Mouse to look · ESC to exit".
- [x] **5.1.4** Keyboard controls: W/S = forward/backward, A/D = strafe left/right.
- [x] **5.1.5** Set camera height to `1.65m` (average eye level).
- [x] **5.1.6** Movement speed: 2m/s walking, 4m/s when Shift is held (running).
- [x] **5.1.7** On `Escape`: release pointer lock, return to orbit camera mode.

### 5.2 — Collision Detection

- [x] **5.2.1** Collect all wall meshes into a `collisionObjects[]` array.
- [x] **5.2.2** On each frame, cast 4 horizontal rays from the camera position in the 4 movement directions (forward, back, left, right) — ray length = 0.4m (body radius).
- [x] **5.2.3** If any ray hits a wall mesh: prevent movement in that direction.
- [x] **5.2.4** Cast 1 downward ray (length = 2m) to keep the camera on the floor — prevents falling through gaps.
- [x] **5.2.5** Cast 1 upward ray (length = 0.5m) to prevent camera clipping through ceiling.

### 5.3 — Teleport Points

- [x] **5.3.1** In walkthrough mode, show floating circular "teleport pads" at the center of each room (the `room.node` coordinates from the structure JSON).
- [x] **5.3.2** On clicking a teleport pad: smoothly animate the camera to that room's center position (using `TWEEN.js` lerp over 0.5 seconds).
- [x] **5.3.3** Teleport pads show the room name label above them (use `THREE.Sprite` with canvas-rendered text).
- [x] **5.3.4** In the builder dashboard, allow setting "custom camera points" at specific positions — saved as `CameraPoint` entities (entity already exists).

### 5.4 — Mobile Touch Walkthrough

- [x] **5.4.1** Detect mobile (`navigator.maxTouchPoints > 0`).
- [x] **5.4.2** On mobile: show an on-screen joystick (left side) for movement and a drag area (right side) for looking.
- [x] **5.4.3** Use `DeviceOrientationEvent` (gyroscope) for looking when permission is granted — feels most natural on mobile.
- [x] **5.4.4** Add a "Tap to walk forward" mode for simplest interaction: tap in front of you to move toward that point.
- [x] **5.4.5** Reduce shadow map resolution to `512x512` and disable post-processing on mobile for performance.

### 5.5 — Guided Tour Playback (Connect Existing UI)

- [x] **5.5.1** The tour player UI already exists. Wire it to the first-person camera: each `TourRoute` waypoint moves the camera to a `CameraPoint` position.
- [x] **5.5.2** Between waypoints: smoothly interpolate camera position and look direction (slerp for rotation).
- [x] **5.5.3** Each waypoint can have a dwell time (seconds to pause at that point) and an audio narration URL.
- [x] **5.5.4** Add a "Record Tour" mode in the builder dashboard: builder walks through the flat in first-person and clicks "Add Waypoint" at each interesting stop — saves `CameraPoint` automatically.
- [x] **5.5.5** Export tour as a shareable link that auto-plays on the buyer-facing website.

**⬛ AUDIT CHECKPOINT 5:** Send me a screen recording of walking through a flat in first-person mode with collision detection working (camera doesn't pass through walls).

---

## PHASE 6 — Inventory System — Live Unit Status in 3D

> **Goal:** Buyers can see at a glance which flats are available, booked, or sold — highlighted directly on the 3D building and floor plan.

### 6.1 — Unit Status Color System

- [x] **6.1.1** Define a color scheme for unit status:
  - Available: `#22c55e` (green)
  - Booked / Under Negotiation: `#f59e0b` (amber)
  - Sold: `#ef4444` (red)
  - Not Released / Locked: `#6b7280` (gray)
- [x] **6.1.2** In the 3D building exterior view: color each floor's flat sections using these colors. Create a flat-to-mesh mapping so each unit can be individually colored.
- [x] **6.1.3** For the floor plan walkthrough view: color the floor `PlaneGeometry` of each flat with its status color (at 30% opacity as a tint overlay).
- [x] **6.1.4** Status data comes from `GET /flats?projectId=X&towerId=Y` — fetch on viewer load and refresh every 60 seconds.

### 6.2 — Inventory Filter Panel

- [x] **6.2.1** Add a collapsible filter panel (left drawer in the 3D viewer) with:
  - BHK Type: checkboxes for 1BHK, 2BHK, 3BHK, 4BHK, Penthouse.
  - Status: checkboxes for Available, Booked, Sold.
  - Floor Range: min/max slider.
  - Price Range: min/max slider (in ₹ lakhs / crores).
  - Facing: East, West, North, South.
- [x] **6.2.2** When filters are applied: unhighlighted flats fade to 10% opacity; matching flats pulse briefly in their status color.
- [x] **6.2.3** Show a count: "12 units match your criteria."

### 6.3 — Flat Detail Card

- [x] **6.3.1** On clicking a flat in the 3D view: show a slide-in card with:
  - Flat number, tower name, floor.
  - BHK type, carpet area (sq.ft.), super built-up area.
  - Facing direction.
  - Price: base price + extras.
  - Status badge (Available/Booked/Sold).
  - "View Flat" button → launches walkthrough of this flat's interior.
  - "Enquire" button → opens lead capture form.
  - "Add to Shortlist" button → saves to buyer's shortlist (stored in localStorage).
- [x] **6.3.2** Flat detail data comes from `GET /flats/:id` endpoint.
- [x] **6.3.3** In the builder dashboard, add an inventory table view (`inventory/page.tsx` — already exists) with bulk status update (select multiple flats → mark as Sold/Booked/Available).

### 6.4 — 2D Floor Plan Mode

- [x] **6.4.1** Add a toggle "3D View / 2D Plan" in the viewer toolbar.
- [x] **6.4.2** 2D mode: switch the camera to top-down orthographic (`THREE.OrthographicCamera`), hide ceiling meshes, show door swing arcs.
- [x] **6.4.3** In 2D mode: flat boundaries are clearly visible as room outlines with the status color fill.
- [x] **6.4.4** 2D mode is especially useful for very large projects — no 3D performance cost.
- [x] **6.4.5** Allow panning and zooming in 2D mode using `MapControls` instead of `OrbitControls`.

**⬛ AUDIT CHECKPOINT 6:** Send me a screenshot of the 3D building with some units colored green (available), amber (booked), red (sold), and a flat detail card visible on click.

---

## PHASE 7 — Amenities 3D Module

> **Goal:** Show the project's amenities (pool, gym, garden, parking) on a site plan in 3D. Buyers can explore common areas, not just flats.

### 7.1 — Amenity Asset Library

> All assets are built from Three.js primitives — no external GLB files needed.

- [x] **7.1.1** Create `AmenityFactory.ts` with a `create(type: AmenityType): THREE.Group` factory method.
- [x] **7.1.2** Implement these amenity types:
  - `swimming_pool`: a large flat PlaneGeometry with blue water material + tile border edges + a few cylinder poolside lights.
  - `gym`: a room box with small cylinder/box "equipment" primitives inside.
  - `clubhouse`: a building box (smaller than the main tower) with pitched roof (pyramid geometry).
  - `garden`: flat green plane with randomly placed cylinder "trees" (brown cylinder trunk + green sphere canopy).
  - `parking`: flat gray plane with parking bay lines (thin BoxGeometry lines) + small car-shaped box primitives.
  - `kids_play_area`: colorful small box shapes (slide, swing frames using thin cylinders).
  - `jogging_track`: an oval/path shape using `THREE.TubeGeometry` along a CatmullRom curve.
  - `tennis_court`: a flat plane with court lines + net (thin BoxGeometry).
- [x] **7.1.3** Each amenity type has a default `footprint` (width × depth in meters) for placement purposes.

### 7.2 — Site Plan Editor (2D Drag & Drop)

- [x] **7.2.1** In builder dashboard, add an "Amenities" tab with a 2D site plan editor.
- [x] **7.2.2** The site plan is a top-down canvas showing the building footprint as a gray rectangle.
- [x] **7.2.3** Builders drag amenity icons from a left panel and drop them onto the site plan at desired positions.
- [x] **7.2.4** Amenities snap to a 1m grid. Overlap detection prevents placing two amenities at the same location.
- [x] **7.2.5** Each placed amenity is saved as an `Amenity` entity: `{ type, x, z, rotation, label, description }`. Add this entity to the API if not already present.
- [x] **7.2.6** Save button: `POST /projects/:id/amenities` saves the full amenity layout.

### 7.3 — Amenities in 3D Site View

- [x] **7.3.1** In the exterior 3D viewer, add a "Site View" camera mode: camera zooms out to show the entire site including the building + surrounding amenities.
- [x] **7.3.2** On loading, fetch `GET /projects/:id/amenities` and call `AmenityFactory.create()` for each, positioned at `(amenity.x, 0, amenity.z)`.
- [x] **7.3.3** Add amenity labels using `THREE.Sprite` floating above each amenity.
- [x] **7.3.4** Clicking an amenity: show an info card with name, description, image (if uploaded), timings.
- [x] **7.3.5** Amenity hotspots: reuse existing `Hotspot` entity — add hotspots of type `amenity` that can contain description + photo gallery.

**⬛ AUDIT CHECKPOINT 7:** Send me a screenshot of the site view showing the building + at least 3 amenities (pool, gym, garden) placed and visible in 3D.

---

## PHASE 8 — Multi-Tenant Subdomain Routing

> **Goal:** Each builder gets their own website at `builder-slug.yourplatform.com`. This is what makes it "Shopify for builders."

### 8.1 — Builder Slug & Domain

- [ ] **8.1.1** Add a `slug` field to the `Builder` entity (unique, lowercase, URL-safe, e.g. `prestige-heights`).
- [ ] **8.1.2** Add a `customDomain` field to `Builder` entity (optional, e.g. `www.prestigeheights.com`).
- [ ] **8.1.3** Auto-generate a slug from the builder's company name on registration.
- [ ] **8.1.4** In the builder dashboard settings, allow editing the slug (with uniqueness check) and adding a custom domain.
- [ ] **8.1.5** Add `GET /builders/by-slug/:slug` and `GET /builders/by-domain/:domain` endpoints (public, no auth) that return the builder's public profile + active projects.

### 8.2 — Next.js Middleware for Subdomain Resolution

- [ ] **8.2.1** Create `apps/web/src/middleware.ts` (Next.js edge middleware).
- [ ] **8.2.2** Extract subdomain from `request.headers.get('host')`:
  ```typescript
  const host = req.headers.get('host');
  const subdomain = host.split('.')[0]; // 'prestige-heights' from 'prestige-heights.yourplatform.com'
  ```
- [ ] **8.2.3** If subdomain is not `www` and not `app`: add a `x-builder-slug` header and rewrite the URL to the same path (don't redirect — rewrite so the page renders with builder context).
- [ ] **8.2.4** If host exactly matches a known custom domain: look it up via `GET /builders/by-domain/:domain` and set `x-builder-slug` accordingly.
- [ ] **8.2.5** In all `web` app page components: read `x-builder-slug` from headers and fetch builder-specific data.

### 8.3 — Builder-Specific Public Website Pages

- [ ] **8.3.1** Update `apps/web/src/app/page.tsx` (home): if `builderSlug` is present in context, fetch that builder's project data and render their homepage. Otherwise render the platform's own landing page.
- [ ] **8.3.2** Do the same for: `about/`, `amenities/`, `gallery/`, `inventory/`, `location/`, `virtual-tour/`, `contact/`.
- [ ] **8.3.3** All fetches inside these pages pass `builderId` (resolved from slug) as a query parameter.
- [ ] **8.3.4** Add a `BuilderProvider` context at the root layout that resolves and stores the current builder — avoids repeated slug lookups.

### 8.4 — DNS & Wildcard Setup Documentation

- [ ] **8.4.1** Create `docs/SUBDOMAIN_SETUP.md` documenting:
  - How to add a wildcard DNS record: `*.yourplatform.com → your server IP`.
  - How to configure Nginx/Caddy to pass wildcard subdomains to the Next.js web app.
  - How builders should configure their DNS for a custom domain: `CNAME www → yourplatform.com`.
- [ ] **8.4.2** In the builder dashboard, add a "Domain Setup" guide page with step-by-step instructions.

**⬛ AUDIT CHECKPOINT 8:** Send me a screenshot of the same `web` app serving two different builder homepages when accessed from two different subdomains (can use `/etc/hosts` locally for testing).

---

## PHASE 9 — Website Section Builder

> **Goal:** Builders can compose their project website by arranging pre-built sections (Hero, Gallery, Amenities, Floor Plans, etc.) without writing code.

### 9.1 — Section Component Library

- [ ] **9.1.1** Create `apps/web/src/sections/components/` with these section templates:
  - `HeroSection`: full-screen background image/video, project name, tagline, CTA button.
  - `OverviewSection`: project highlights grid (RERA number, possession date, units, price range).
  - `GallerySection`: masonry photo/video grid with lightbox.
  - `AmenitiesSection`: icon grid of amenity features with images.
  - `FloorPlansSection`: tab per BHK type, shows 2D floor plan image + 3D viewer embed button.
  - `InventorySection`: embeds the live inventory table/3D viewer.
  - `LocationSection`: Google Maps embed + nearby landmarks list.
  - `VirtualTourSection`: full-height 3D walkthrough viewer embed.
  - `ContactSection`: lead capture form (name, phone, email, message, preferred BHK, budget).
  - `TestimonialsSection`: quote cards from past buyers.
  - `ConstructionUpdateSection`: photo/video timeline of construction progress.
- [ ] **9.1.2** Each section component accepts a `config` prop (JSON) that controls its content and appearance.
- [ ] **9.1.3** Each section is fully responsive (Tailwind CSS).

### 9.2 — Section Editor in Builder Dashboard

- [ ] **9.2.1** Create `apps/builder/src/sections/website-builder/` page.
- [ ] **9.2.2** UI layout: left panel (section library + settings), center canvas (live preview), right panel (selected section's config form).
- [ ] **9.2.3** Left panel: list of all available section types with a "+" add button for each.
- [ ] **9.2.4** Center canvas: renders the actual website as it will look to buyers. Sections are stacked vertically. Drag handles allow reordering.
- [ ] **9.2.5** Clicking a section in the canvas: selects it (highlights with blue border) and opens its config form in the right panel.
- [ ] **9.2.6** Right panel config form fields vary by section type (e.g. HeroSection has: background image upload, heading text, subheading, CTA button text + link).

### 9.3 — Page Persistence

- [ ] **9.3.1** Save button: `POST /pages` with `{ builderId, projectId, sections: SectionConfig[] }`. Updates `Page` entity.
- [ ] **9.3.2** Each save creates a `PageRevision` entity (entity already defined) — allows rollback to previous versions.
- [ ] **9.3.3** Show a "revision history" panel in the builder dashboard: list of past saves with timestamp, "restore" button.
- [ ] **9.3.4** Draft vs Published state: builder must explicitly click "Publish" for changes to go live. Draft changes are visible only in preview mode.
- [ ] **9.3.5** `GET /pages/:builderId/:projectId` endpoint returns the published sections config. The `web` app uses this to render the live public website.

### 9.4 — Dynamic Page Renderer (Public Website)

- [ ] **9.4.1** Update `apps/web/src/components/dynamic-page-renderer.tsx` to receive `sections: SectionConfig[]` and dynamically render the correct section component for each config.
- [ ] **9.4.2** Section components are lazy-loaded (`next/dynamic`) — only the sections present on a page are loaded.
- [ ] **9.4.3** SEO: each page should have proper Open Graph tags (project name, image, description) pulled from the project data. Use Next.js `generateMetadata()`.
- [ ] **9.4.4** Performance: Hero section image is preloaded with `priority`. All other section images use lazy loading.

**⬛ AUDIT CHECKPOINT 9:** Send me a screenshot of the section editor with at least 3 sections configured and a screenshot of the live public website rendering those sections correctly.

---

## PHASE 10 — CRM & Buyer Journey Analytics

> **Goal:** Give builders a full picture of every buyer's behavior — which flats they viewed, how long they spent in walkthrough, what they clicked, and lead scoring.

### 10.1 — Analytics Event Tracking

- [ ] **10.1.1** In the frontend viewer, emit events using a `trackEvent(eventType, payload)` utility (already partially exists).
- [ ] **10.1.2** Send all events to `POST /analytics/events` endpoint. Events to track:
  - `viewer_open`: buyer opened the 3D viewer. Payload: `{ projectId, source }`.
  - `flat_viewed`: buyer clicked on a flat. Payload: `{ flatId, flatType, floor, durationMs }`.
  - `walkthrough_entered`: buyer entered walkthrough mode. Payload: `{ flatId, entryMethod }`.
  - `walkthrough_time`: periodic ping every 30s while in walkthrough. Payload: `{ flatId, totalSeconds }`.
  - `hotspot_clicked`: buyer clicked a hotspot. Payload: `{ hotspotId, hotspotType }`.
  - `brochure_downloaded`: buyer clicked brochure download. Payload: `{ flatId }`.
  - `enquiry_submitted`: buyer submitted the contact form. Payload: `{ flatId, bhkPreference, budget }`.
  - `shortlist_added`: buyer added a flat to shortlist.
- [ ] **10.1.3** Associate events with a `sessionId` (UUID stored in localStorage) and `leadId` (if the buyer has submitted an enquiry).
- [ ] **10.1.4** Save events asynchronously (fire-and-forget POST, don't block the UI).

### 10.2 — CRM Lead Management

- [ ] **10.2.1** In builder dashboard `leads/page.tsx`: show a table of all leads with columns: name, phone, email, source, date, status, lead score.
- [ ] **10.2.2** Lead status pipeline: `New → Contacted → Site Visit Scheduled → Site Visit Done → Negotiation → Booked → Lost`.
- [ ] **10.2.3** Drag-and-drop Kanban view as an alternative to table view.
- [ ] **10.2.4** Lead score calculation (automatic, computed on the backend):
  - Opened viewer: +5 points.
  - Viewed a flat: +10 points per flat.
  - Spent 2+ min in walkthrough: +20 points.
  - Downloaded brochure: +15 points.
  - Clicked pricing hotspot: +25 points.
  - Submitted enquiry: +50 points.
- [ ] **10.2.5** "Hot lead" badge (score > 80). Notify the builder via browser notification or email when a new hot lead is detected.

### 10.3 — Buyer Journey Timeline

- [ ] **10.3.1** `GET /leads/:id/journey` returns all analytics events for that lead's session, ordered by time.
- [ ] **10.3.2** In the lead detail page, show a timeline: "10:32 AM — Opened viewer → 10:34 AM — Viewed Flat 1203 (2BHK) → 10:36 AM — Entered walkthrough → Spent 4 minutes → 10:41 AM — Downloaded brochure."
- [ ] **10.3.3** Show a heatmap: which rooms in the flat did the buyer spend most time in (based on walkthrough position tracking).
- [ ] **10.3.4** Shortlisted flats are visible in the lead detail — "Flat 1203 (2BHK, Floor 12) — ₹1.2Cr".

### 10.4 — Analytics Dashboard

- [ ] **10.4.1** In builder dashboard `analytics/page.tsx`: show key metrics:
  - Total views this month.
  - Average time in walkthrough.
  - Most viewed flat type.
  - Conversion rate: viewers → enquiries.
  - Lead source breakdown (direct link, embed, QR code).
- [ ] **10.4.2** Line chart: viewer sessions per day over last 30 days.
- [ ] **10.4.3** Funnel chart: Opened → Flat Viewed → Walkthrough → Enquiry → Booked.

**⬛ AUDIT CHECKPOINT 10:** Send me a screenshot of the CRM leads table with lead scores and a screenshot of at least one lead's journey timeline.

---

## PHASE 11 — Billing & Subscription (Razorpay)

> **Goal:** Monetize the platform. Builders pay monthly to use Aether. Gate features by plan tier.

### 11.1 — Subscription Plans

- [ ] **11.1.1** Define 3 plans (save in DB seed):
  - **Starter** (₹4,999/month): 1 project, 1 tower, 10 floors, basic 3D viewer, no walkthrough, no SDK.
  - **Pro** (₹14,999/month): 3 projects, unlimited towers/floors, full 3D walkthrough, CRM, analytics, custom domain.
  - **Enterprise** (₹39,999/month): unlimited projects, white-label, SDK embed, API access, priority support, custom AI model training.
- [ ] **11.1.2** Add plan tier checks to the following features:
  - Walkthrough mode: Pro+ only.
  - Custom domain: Pro+ only.
  - SDK embed: Enterprise only.
  - Analytics dashboard: Pro+ only.
  - Number of projects: enforced by `billing.guard.ts`.

### 11.2 — Razorpay Integration

- [ ] **11.2.1** Install `razorpay` npm package in the API.
- [ ] **11.2.2** In `billing.service.ts`:
  - `createSubscription(builderId, planId)`: creates a Razorpay subscription → returns a `subscriptionId` and `payment_link`.
  - `handleWebhook(payload, signature)`: verifies and processes Razorpay webhook events.
  - `cancelSubscription(builderId)`: cancels the active subscription.
- [ ] **11.2.3** Webhook endpoint `POST /billing/webhook`: handle events:
  - `subscription.activated` → set `builder.subscriptionStatus = 'active'`, record `Subscription` entity.
  - `subscription.charged` → create `Invoice` entity with amount, date, PDF URL.
  - `subscription.cancelled` → downgrade to free tier, set `subscriptionStatus = 'cancelled'`.
  - `payment.failed` → send email alert, set `subscriptionStatus = 'payment_failed'`.
- [ ] **11.2.4** In `billing.controller.ts`, add `POST /billing/create-subscription`, `GET /billing/invoices`, `POST /billing/cancel`.
- [ ] **11.2.5** In builder dashboard: add a "Billing" page showing current plan, next billing date, invoice history with download links.

### 11.3 — Feature Gating

- [ ] **11.3.1** Create `PlanGuard` in `guards/plan.guard.ts`: decorator `@RequiresPlan('pro')` checks the builder's active plan before allowing access.
- [ ] **11.3.2** In the 3D viewer: if a builder is on Starter plan and tries to enable walkthrough, show a "Upgrade to Pro" modal with plan comparison.
- [ ] **11.3.3** Enforce project count limits: if a Starter builder tries to create a 2nd project, return a 402 error with upgrade prompt.
- [ ] **11.3.4** 14-day free trial for all new builders on the Pro plan (no credit card required). After 14 days, prompt for payment to continue.

**⬛ AUDIT CHECKPOINT 11:** Send me a screenshot of the billing page in the builder dashboard and a working Razorpay test mode subscription flow.

---

## PHASE 12 — Embed SDK

> **Goal:** Allow third-party real estate portals to embed the Aether 3D viewer on their own websites with a single script tag.

### 12.1 — SDK Bundle

- [ ] **12.1.1** Create `packages/sdk/` in the monorepo.
- [ ] **12.1.2** Create `src/index.ts` that exports an `AetherViewer` class:
  ```typescript
  class AetherViewer {
    constructor(container: HTMLElement, options: AetherViewerOptions)
    init(): void
    destroy(): void
    on(event: string, handler: Function): void
  }
  ```
- [ ] **12.1.3** `AetherViewerOptions`:
  ```typescript
  {
    sdkKey: string,        // from EmbedConfig entity
    projectId: string,
    mode: 'building' | 'walkthrough' | 'inventory',
    primaryColor?: string,
    showBranding?: boolean,
    onEnquiry?: (leadData) => void
  }
  ```
- [ ] **12.1.4** The SDK creates an `<iframe>` pointing to `https://yourplatform.com/embed/project/:projectId?key=:sdkKey&mode=:mode`.
- [ ] **12.1.5** Communication between parent page and iframe via `window.postMessage` for events (enquiry submitted, flat selected, etc.).
- [ ] **12.1.6** Build the SDK with Rollup/esbuild into a single minified UMD file (`aether-sdk.min.js`).

### 12.2 — Embed Page

- [ ] **12.2.1** `apps/web/src/app/embed/project/[id]/page.tsx` already exists — style it for embedded use: no navigation, no footer, just the 3D viewer filling 100% of the iframe.
- [ ] **12.2.2** Validate the `key` query param against `EmbedConfig` entity — reject if key is invalid or for a different project.
- [ ] **12.2.3** Apply the `primaryColor` from the embed config to the viewer UI accents.
- [ ] **12.2.4** If `showBranding: false` (Enterprise plan only): hide the "Powered by Aether" watermark.

### 12.3 — SDK Key Management

- [ ] **12.3.1** In builder dashboard `sdk/page.tsx`: show existing SDK keys, create new key, revoke key.
- [ ] **12.3.2** Each SDK key can be restricted to specific domains (origin whitelist) — prevent unauthorized embedding.
- [ ] **12.3.3** SDK keys are visible only to Enterprise plan builders.
- [ ] **12.3.4** Add usage analytics per SDK key: how many times the viewer was embedded, on which domains.

**⬛ AUDIT CHECKPOINT 12:** Send me a screenshot of the SDK viewer working inside a simple HTML page (`<script>` tag embed) on a different port from your main app.

---

## PHASE 13 — Mobile 3D Optimization

> **Goal:** The 3D viewer must work smoothly on a mid-range Android phone (e.g. Redmi Note 11, 4GB RAM). Most Indian buyers use mobile, not desktop.

### 13.1 — Device Detection & LOD

- [ ] **13.1.1** Create `DeviceCapabilityDetector.ts`:
  - Check `navigator.hardwareConcurrency` (CPU cores).
  - Check `navigator.deviceMemory` (RAM, if available).
  - Check GPU renderer string via a test WebGL context.
  - Classify device as `low | medium | high` performance tier.
- [ ] **13.1.2** On `low` tier devices: reduce wall segment count, disable furniture, disable shadows, reduce pixel ratio to `1.0`.
- [ ] **13.1.3** On `medium` tier: keep furniture, enable shadows at `512x512`, pixel ratio `Math.min(1.5, devicePixelRatio)`.
- [ ] **13.1.4** On `high` tier: full quality, shadows at `2048x2048`, pixel ratio `Math.min(2.0, devicePixelRatio)`.

### 13.2 — Geometry Optimization

- [ ] **13.2.1** Merge all static wall meshes (same material) into a single `BufferGeometry` — reduces draw calls from N to 1.
- [ ] **13.2.2** Merge all floor plane meshes into a single instanced mesh per material.
- [ ] **13.2.3** Use `THREE.InstancedMesh` for repeated furniture items (e.g. all beds in a multi-floor building are one instanced mesh).
- [ ] **13.2.4** Implement frustum culling correctly — ensure `mesh.frustumCulled = true` for all meshes (it's the default but confirm it's not disabled anywhere).
- [ ] **13.2.5** Add `THREE.LOD` for furniture: at distance > 10m, replace detailed furniture mesh with a simple box. At > 20m, hide furniture entirely.

### 13.3 — Texture & Material Optimization

- [ ] **13.3.1** All texture images: compress to WebP format using `sharp` in a Node.js pre-processing script.
- [ ] **13.3.2** Texture dimensions: cap at 512×512 for mobile (1024×1024 for desktop).
- [ ] **13.3.3** Use `THREE.MeshLambertMaterial` (cheaper) instead of `MeshStandardMaterial` on `low` tier devices.
- [ ] **13.3.4** Disable `antialias` in `WebGLRenderer` on `low` and `medium` devices — use FXAA post-processing pass instead (cheaper).

### 13.4 — Progressive Loading

- [ ] **13.4.1** Show the building exterior first (fast to compile — just a box + windows).
- [ ] **13.4.2** Load the selected floor's interior geometry only when the buyer clicks "View Floor."
- [ ] **13.4.3** Load furniture last, after walls and floors are visible.
- [ ] **13.4.4** Add a `<ProgressBar>` component that shows loading percentage based on geometry compilation progress.
- [ ] **13.4.5** Cache compiled geometry in `localStorage` (serialized as JSON) — second load of the same structure is instant.

**⬛ AUDIT CHECKPOINT 13:** Send me a performance profiling screenshot (Chrome DevTools Performance tab) showing the 3D viewer running at 30+ FPS on a mid-range device (or emulated low-power device in Chrome DevTools).

---

## PHASE 14 — Security, Auth Hardening & Testing

> **Goal:** The platform handles sensitive buyer and property data. Fix all auth gaps before going live.

### 14.1 — Multi-Tenancy Security Audit

- [ ] **14.1.1** Go through every service method in the API. For every DB query that fetches by `id`, add a `where: { id, builderId: ctx.builderId }` condition. No exceptions.
- [ ] **14.1.2** Write a security test suite: for every protected endpoint, test that Builder A cannot access Builder B's data.
- [ ] **14.1.3** Add a TypeORM `EntitySubscriber` that automatically injects `builderId` from the request context into all queries — prevents forgetting it.
- [ ] **14.1.4** Rate limiting: add `@nestjs/throttler` — limit `/auth/login` to 5 requests/minute, all other endpoints to 100 requests/minute per IP.
- [ ] **14.1.5** Add `helmet()` middleware for HTTP security headers.
- [ ] **14.1.6** Validate all file uploads: check MIME type (not just extension), scan for path traversal in filenames, set max file size (50MB for DXF/PDF).

### 14.2 — Input Validation

- [ ] **14.2.1** Ensure all DTOs use `class-validator` decorators. Add `ValidationPipe` globally in `main.ts` with `whitelist: true, forbidNonWhitelisted: true`.
- [ ] **14.2.2** Sanitize all text inputs (builder profile fields, project names, section content) to prevent XSS.
- [ ] **14.2.3** Validate that `structureId`, `projectId`, `towerId` passed in URLs actually belong to the authenticated builder — add a `ResourceOwnerGuard`.

### 14.3 — Testing

- [ ] **14.3.1** Write unit tests for `GeometryEngine.detect_rooms()` using the test DXF file at `docs/cad/test_building_blueprint.dxf`. Assert: roomCount >= 3, every room has name, width > 0, depth > 0.
- [ ] **14.3.2** Write unit tests for `SceneCompiler` — assert that compiling a known structureJson produces a Three.js group with meshes.
- [ ] **14.3.3** Write E2E tests (using Playwright) for the builder registration → upload DXF → view 3D flow.
- [ ] **14.3.4** Write E2E tests for the public website: subdomain resolves → correct builder project is shown.

**⬛ AUDIT CHECKPOINT 14:** Send me a screenshot of the security test suite passing (all Builder A cannot access Builder B data tests: green).

---

## PHASE 15 — Production Deploy & DevOps

> **Goal:** Deploy everything to a real server. Set up CI/CD, monitoring, and backups.

### 15.1 — Docker & Compose

- [ ] **15.1.1** Verify all 4 `Dockerfile`s (api, web, builder, admin) build without errors.
- [ ] **15.1.2** Create `docker-compose.prod.yml` with all services, a production PostgreSQL instance, Redis, and the Python AI service.
- [ ] **15.1.3** Add Nginx reverse proxy service: routes `*.yourplatform.com` to the `web` app, `app.yourplatform.com` to the `builder` app, `admin.yourplatform.com` to the `admin` app, `api.yourplatform.com` to the API.
- [ ] **15.1.4** Add SSL termination at Nginx using Let's Encrypt / Certbot for wildcard `*.yourplatform.com` cert.
- [ ] **15.1.5** Add `healthcheck:` to each Docker service so Compose restarts failing containers automatically.

### 15.2 — CI/CD

- [ ] **15.2.1** Add `.github/workflows/ci.yml`: on every PR, run TypeScript type check, run Python unit tests, build all Docker images.
- [ ] **15.2.2** Add `.github/workflows/deploy.yml`: on push to `main`, build images, push to Docker Hub / GHCR, SSH to production server and run `docker-compose pull && docker-compose up -d`.

### 15.3 — Monitoring & Backups

- [ ] **15.3.1** Add `Sentry` error tracking to the API (`@sentry/nestjs`) and frontend apps (`@sentry/nextjs`). Free tier is sufficient.
- [ ] **15.3.2** Add a daily PostgreSQL backup cron job: `pg_dump` → compress → upload to S3 (or Backblaze B2 — cheaper).
- [ ] **15.3.3** Add uptime monitoring: use `UptimeRobot` (free) to ping `/api/health` every 5 minutes and alert on downtime.
- [ ] **15.3.4** Set up log aggregation: route Docker container logs to a single file, rotate daily, keep 30 days.

### 15.4 — Performance & CDN

- [ ] **15.4.1** Serve all uploaded files (images, DXF, PDF) from object storage (AWS S3 or Cloudflare R2 — R2 has free egress) instead of local disk. Update `media.service.ts` accordingly.
- [ ] **15.4.2** Put Cloudflare in front of the domain — free DDoS protection, CDN for static assets, caching.
- [ ] **15.4.3** Enable Next.js Image Optimization for all builder-uploaded images.
- [ ] **15.4.4** Set correct `Cache-Control` headers on static assets: `max-age=31536000, immutable` for hashed assets.

**⬛ AUDIT CHECKPOINT 15 (FINAL):** Send me: (1) screenshot of the live production URL loading a builder's project website, (2) screenshot of Docker containers all healthy in production, (3) screenshot of Sentry showing no critical errors.

---

## 🔑 AI API Keys Reference

| Service | Use Case | Free Tier | Cost (Paid) | Get Key |
|---------|----------|-----------|-------------|---------|
| **Google Gemini 1.5 Flash** | PDF floor plan analysis, style detection from images | 15 req/min, 1M tokens/day FREE | $0.075/1M tokens | https://aistudio.google.com/app/apikey |
| **Anthropic claude-haiku-4-5** | Structured data extraction fallback, room labelling from scanned plans | None | $0.25/1M input, $1.25/1M output | https://console.anthropic.com |
| **PaddleOCR** | Text extraction from DXF/PDF plans | 100% FREE, runs locally | Free | Already in `requirements.txt` |
| **OpenCV** | Image contour detection, scale detection | 100% FREE | Free | Already in `requirements.txt` (`cv2`) |
| **ezdxf** | DXF parsing | 100% FREE | Free | Already in `requirements.txt` |
| **Shapely + NetworkX** | Room polygon detection from walls | 100% FREE | Free | Already in `requirements.txt` |
| **DBSCAN (sklearn)** | Wall clustering for tower detection | 100% FREE | Free | Add `scikit-learn` to `requirements.txt` |
| **Razorpay** | Payment processing | Test mode FREE | 2% per transaction | https://razorpay.com |

> **Recommendation:** Start with only Gemini Flash for the PDF fallback. It has a generous free tier and is the cheapest Vision API. Add Claude Haiku only if you need more structured data extraction precision. All geometry processing should stay in the free open-source stack.

---

## 📋 Quick Reference — What Each Audit Should Include

| Phase | What to send me |
|-------|----------------|
| 0 | Terminal showing all 5 services running + DB tables screenshot |
| 1 | Postman POST `/upload` response with `structureId` + GET `/structures/:id` JSON |
| 2 | Video/screenshot of 3D viewer showing real parsed geometry (not static GLB) |
| 3 | Screenshot of multi-floor tower (5+ floors) in viewer + floor selector working |
| 4 | Screenshot of building exterior with window grid, balconies, ground plane |
| 5 | Screen recording of first-person walkthrough with collision detection |
| 6 | Screenshot of 3D building with status-colored units + flat detail card |
| 7 | Screenshot of site view with building + 3 amenities in 3D |
| 8 | Two different builder websites on two different subdomains |
| 9 | Section editor screenshot + live public website screenshot |
| 10 | CRM leads table with scores + one lead's journey timeline |
| 11 | Billing page + Razorpay test subscription flow |
| 12 | SDK viewer working inside a standalone HTML page |
| 13 | Chrome DevTools performance profile showing 30+ FPS on mobile emulation |
| 14 | Security test suite — all green |
| 15 | Live production URL + Docker health + Sentry no errors |

---

*Last updated: Phase 0 — not started. Total estimated completion: 12–14 weeks working solo, 6–8 weeks with 2 developers.*
