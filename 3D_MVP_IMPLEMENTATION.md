# 3D MVP implementation

Status: working functional MVP; the imported sample sustained approximately 60 FPS in three 60-second production measurements on Intel graphics. Software-rendered performance remains poor. See the performance and test reports before treating this as a production release.

## Run and entry points

From the repository root, with dependencies installed:

```powershell
npm run dev --workspace=real-estate-web
```

Open `http://localhost:3000/explorer`. The bundled Duplex Apartment and its manifest require no API, account, database seed or IFC runtime. The page can also discover existing tenant-authorized `DigitalTwinModel.modelUrl` records through the application's existing API convention. Remote models need public or signed browser-readable URLs and CORS; arbitrary authenticated/private storage is not implemented.

`/explorer?legacy=1` retains the advanced procedural explorer, inventory controls, floorplan, dollhouse, tours and hotspots. `/explorer?fixture=dxf-single` and `?fixture=dxf-tower` expose reproducible parser regression fixtures. The latter explicitly repeats the parsed layout ten times; it does not infer ten distinct storeys from the filename.

## Architecture and scope

The existing Next.js, NestJS, TypeORM/PostgreSQL and Python service remain in place. No schema migration, database write, deployment or production configuration change was performed for this work. Other pre-existing or concurrently edited files in this checkout are not part of this viewer implementation.

Installed versions inspected: Next 14.2.35, React 18.3.1, Three 0.184.0, GSAP 3.15.0, Nest 10.4.22, TypeORM 0.3.31. The supplied audit is preserved at `docs/3d/PROJECT_3D_MASTER_AUDIT.md`. Its lifecycle and repeated traversal findings were verified against the actual source. Its suggested percentage gains were not treated as measurements. A large ground plane is two triangles; changing its width alone is not a meaningful triangle optimization. The actual compiler's solid wall geometry required openings, not just a transparency change.

New responsibilities are in `apps/web/src/components/property-viewer/`:

| Module | Responsibility |
| --- | --- |
| `Surface.ts` | Renderer, cameras, controls, resize, daylight/HDR, quality, resource statistics |
| `loadModel.ts` | Separate GLTFLoader and existing TowerCompiler producers, progress, errors, cancellation |
| `model.ts` | Versioned manifest validation, semantic indexes, resource ownership/disposal |
| `Navigation.ts` | Nearby collision candidates, body probes, floor support and ceiling clearance |
| `Furniture.ts` | Existing furniture factory, validated transforms, versioned persistence |
| `Runtime.ts` | One animation loop, model subtree lifecycle, visibility, modes and input |
| `PropertyExperience.tsx` | Integrated controls, model/source selection, errors and metrics |

Ordinary GLB and GLTF use the installed Three loader, including embedded glTF buffers. External buffers/textures resolve relative to the model. URL validation accepts HTTP(S), checks file extensions, rejects credentials and HTTPS downgrade. Main model downloads have a 150 MB limit. Draco/Meshopt/KTX2 decoder support is not bundled; unsupported assets receive an explicit error. Subresource fetches inside GLTFLoader cannot all be aborted, but generation checks prevent stale attachment and dispose obsolete completed models.

`BuildingViewer` retains its public export and procedural props. Actual GLB/GLTF `initialModels` select the imported runtime; an adapter connects external building/walkthrough and room controls. Imported `activeFloor` is a zero-based index among manifest floors containing rooms. Existing imported records without semantic metadata expose exterior inspection and clearly report unmapped floors/rooms. A `manifestUrl` can accompany a source object in local integration, or be supplied through Load another asset; no new database column was introduced.

The two producers share Surface, indexes and resource cleanup. The advanced procedural UI is deliberately retained, rather than rewritten. It now keeps one renderer across mode/floor changes and caches generated groups per visited floor. Only one cached representation is attached. Indexes replace repeated wall/floor/ceiling/navigation traversal; minimap and hotspot DOM updates run at most 10 Hz within the existing render loop. Cached content is invalidated by actual geometry inputs and disposed at unmount. Legacy cutaways hide exterior context that would cover the active floor; toolbars occupy separate rows. Mode switching animates the selected camera, door picking respects depth, and aborted hotspot/tour requests cannot replace the active model's metadata. Shared application texture/material caches have explicit ownership; inventory/transparency clones remain subtree-owned.

SceneCompiler now cuts actual rectangular wall openings compatible with collision, merges static visual wall parts, and keeps door leaf/handles under a hinge group used by the existing animation. Expensive architectural glass transmission was replaced with transparent standard materials. The existing DXF parser, AutoPlacer and FurnitureFactory remain available.

## Architectural sample and attribution

The real source is `Duplex_A_20110907.ifc` from buildingSMART Community Sample Test Files. It was downloaded as the actual IFC, checked for `ISO-10303-21` (not a Git LFS pointer), tessellated with IfcOpenShell 0.8.5 and exported with trimesh 4.11.5. This is an existing BIM tessellator, not a new IFC engine.

Original IFC SHA-256: `b347a2c8aa8fff6db896a4417a9c50c22ac0ccd7c5cfc22b99b8d29336c606ed`.

Bundled output: `apps/web/public/models/duplex/duplex.glb`, 2,051,496 bytes, 277 mesh nodes, 26,348 source triangles. Model bounds in metres are approximately `[-0.2415, -1.55, -4.3827]` to `[9.0415, 6.6348, 22.1827]`. IFC world coordinates are transformed `[X,Y,Z] -> [X,Z,-Y]`, without arbitrary recentering. The scene retains authored element GUIDs and material groups. Space/opening volumes are metadata, not visible solids. Sharp normals were generated; roof green was muted and glazing opacity adjusted while keeping opaque frames. The source has no photographic material textures. It is a credible BIM visualization, not a photorealistic marketing asset.

An independent Three GLTFLoader page and trimesh inspection verified the export before integration. `tools/3d/independent.html` and `evidence/3d/independent.png` preserve the independent check.

Required credit: **BSI (2020) "Duplex Apartment Test Files," buildingSMART International**, CC BY 4.0. Source, license, source README and transformation details are in the asset's `SOURCE.md` and `ATTRIBUTION.md`. No unverified model-specific author is asserted. The 1K Venice Sunset HDR is by Greg Zaal, Poly Haven, CC0; its source and license are in `public/environments/ATTRIBUTION.md`.

To reproduce conversion, place the legitimate IFC in `.cache/Duplex_A_20110907.ifc`, install `ifcopenshell==0.8.5 trimesh==4.11.5 numpy shapely` into a Python environment, then run:

```powershell
python tools/3d/prepare_duplex.py .cache/Duplex_A_20110907.ifc
```

The generator writes GLB and metadata to the bundled duplex directory. Dependency download needs network access. Running the web demo does not.

## Semantics and navigation

The v1 manifest uses Y-up coordinates. All elevations, room bounds and camera spawns are in world metres, including when `units: millimeters` requests a `.001` scale for the model geometry. Floors contain explicitly named scene nodes, flats and rooms. Elements supply node names, IFC type and floor ID for collision classification. Parent node mappings are inherited by meshes. References must exist in the actual model; invalid IDs, coordinates and room spawns are rejected.

Sample storeys come from IFC building-storey relationships: foundation, Ground floor, First floor and roof. Units A/B come from actual IFC space codes, documented in conversion metadata. Room bounds/spawns come from those spaces. Stairs and undefined spaces are excluded from room navigation. Selecting a unit selects its real rooms; shared walls/slabs are not arbitrarily divided into invented unit meshes. Floor isolation hides real unrelated meshes, keeps appropriate slab support and hides overhead coverings in overview.

Walking uses 1.65 m eye height, 2 m/s movement, bounded delta time, 0.22 m horizontal body probes at multiple heights and movement substeps no larger than 0.08 m. Rays test actual wall triangles, so authored door openings remain traversable. Floor rays and ceiling clearance prevent unsupported positions. This is an MVP collision controller, not a general physics/capsule solver. Stairs and automatic level changes are disabled; choose another floor or room explicitly. Room transitions are camera teleports, not claims of physically walking along the interpolated path.

Imported door assemblies can be opened/closed by changing their visibility. Hinge animations require authored pivots not present in this export. Existing procedural doors retain their animated pivots. WASD, pointer lock, Escape and drag-to-look work; touch movement buttons are provided. Full physical-device touch testing remains pending.

## Furniture and rendering

Sofa, bed and table reuse FurnitureFactory. Add, mouse place, rotate 45 degrees, reset, delete, save and restore operate on actual Three objects. Placement samples the real slab surface (ground living-room support is 0.019 m), checks room bounds, wall bounds, support at corners and other user furniture. AABBs conservatively reject some otherwise possible placements. Authored BIM furniture remains part of the source model; it is not editable or included in user-furniture collision.

Persistence is browser-local, explicitly labelled, with schema version 1, project/source key, manifest identity, model URL and separate object transforms. Invalid or incompatible data produces a notice and is not silently applied. It is not shared between users/devices. Local storage is not a database persistence claim.

Renderer configuration: sRGB output, ACES tone mapping, licensed HDR/PMREM, hemisphere/sun lighting, 1024 shadow map, corrected shadow bias, DPR cap 1.5 (1 in performance mode), 45 degree overview and 65 degree interior FOV. Performance mode disables shadows. The advanced asset panel exposes sun elevation, and the main controls can be hidden to reveal more of the model. Standard source PBR materials/textures are preserved by GLTFLoader. No synthetic normal map or heavy postprocessing is added.

## Remaining work

The imported sample demonstrated smooth rendering on Intel Direct3D11; SwiftShader and the much heavier legacy tower remain separate limitations documented in the performance report. No arbitrary CAD-to-photorealistic conversion, optimized external furniture asset importer, imported-model inventory overlays/tours, server furniture persistence, stair physics, or generic decoder pipeline is claimed. Advanced inventory/hotspot/tour behavior belongs to the existing procedural path. Broader desktop GPU and physical mobile QA remain release requirements.
