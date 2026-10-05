# 3D MVP manual test guide

## Start

1. From the repository root run `npm install` if dependencies are missing, then `npm run dev --workspace=real-estate-web`.
2. Open `http://localhost:3000/explorer` in a WebGL2-capable desktop browser. The bundled demo works with the API offline. Wait for Duplex Apartment to finish loading.
3. Drag the exterior to orbit, scroll to zoom, and press Reset camera. Toggle Performance and inspect Metrics. FPS is measured, not a target guarantee. Open Fullscreen if the browser permits it.

## Floors and real rooms

1. Choose Ground floor. Verify upper storey and roof disappear while the ground slab and walls remain.
2. Choose First floor, then return to Ground floor. The canvas should remain continuous.
3. Choose Unit A and `A102 ? Living Room`. Select Enter room.
4. Click the viewport to capture the mouse. Use mouse/WASD; hold W toward a solid wall and verify stopping. Use Escape to release the mouse. Without capture, drag to look. Arrow buttons provide touch movement.
5. Doors are opened automatically on entry. Navigate between living room, foyer and kitchen through openings. Close doors to restore authored door geometry. Imported doors are shown/hidden; procedural door leaves animate.
6. Use the room selector to teleport to another mapped space. Use floor selector for level changes; stairs are disabled.
7. Press Exterior to show the complete building again. Unit selection changes the room list; it does not hide shared walls as if they belonged to only one apartment.

## Furniture

1. Select Ground floor / Unit A / A102 Living Room. Press Furnish room, then Add sofa. The viewer enters floor overview.
2. Press Move, move the cursor to a clear point on the living-room floor and click. The floor location is raycast against actual geometry.
3. Rotate, then Reset. Verify both object orientation and original position restore. Try placing across a wall/outside the room; the transformation should be rejected with a notice.
4. Save configuration, refresh the page, and select the same floor. The arrangement should reappear. Storage is local to this browser/project/model.
5. Select the object, Delete, Save configuration, refresh and verify it stays deleted. Beds and tables can be tested in a sufficiently large room.

## Replacement and errors

1. Expand Load another asset. Press Unload model, then Reload model. There should be one viewer canvas after each load.
2. Load `/models/missing.glb` without a manifest. Verify the HTTP 404 message. Dismiss with Choose another model and select Duplex Apartment.
3. Try `/models/unsupported.ifc`. Verify the unsupported URL/extension error.
4. Load `/models/duplex/duplex.glb` with `/models/duplex/manifest.json` for the complete sample. Without a manifest, the same GLB supports exterior inspection and reports unmapped semantics.
5. Switch to Procedural tower and back. During slow loading switch sources again; the obsolete GLB must not attach.

## Existing pipeline and advanced viewer

1. Open `/explorer?fixture=dxf-single`. Verify the existing parser's room/wall output renders.
2. Open `/explorer?fixture=dxf-tower`. Inspect levels 0, 9 and 4. This is a labelled ten-level repetition for regression, not automatic ten-storey inference.
3. Open `/explorer?legacy=1`. Change Level 01/02, enter the flat tour, switch Inside / Dollhouse / Floor Plan, and return to the exterior.
4. Click a visible procedural door to test its hinge animation. With real authorized tenant data, inspect inventory colors/filtering, hotspots and the guided-tour play/pause control. These checks must use appropriate project data; the demo's empty API fallback cannot prove them.

## Reproduce automated evidence

Install Playwright Chromium once with `npx playwright install chromium`. For the project-local browser installation used here set `$env:PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/browsers"`.

With the web server running, from the repository root:

```powershell
node tools/3d/core-tests.mjs
node tools/3d/browser-tests.cjs
node tools/3d/error-tests.cjs
node tools/3d/regression-performance.cjs
node tools/3d/additional-tests.cjs
node tools/3d/legacy-tests.cjs
```

The browser scripts intercept API requests with read-only local fixtures. No production data or authenticated writes are needed. For the legacy after benchmark:

```powershell
$env:TARGET='http://localhost:3000/explorer?legacy=1'
$env:REPORT='legacy-after'
node tools/3d/baseline.cjs
```

Do not run the default baseline command over the preserved `baseline.json` unless intentionally replacing evidence. Use a new REPORT name.

For a hardware benchmark, run a headed browser on the intended GPU, ensure it is not falling back to SwiftShader, use a fixed 1280x900 viewport, wait for shader compilation, then record at least 60 seconds per mode using browser Performance tools and the Metrics panel. Repeat warm tests on the same code/configuration and report background load, DPR, quality, WebGL renderer, FPS and p50/p95 frame times. Metrics uses a rolling window and includes transitions; the benchmark script uses separate timed windows. Do not compare different models as an optimization percentage.

## Production preview and measured Windows GPU run

`node tools/3d/build.cjs` compiles an isolated copy without reading production environment configuration. Start it with `node node_modules/next/dist/bin/next start .cache/3d-build -p 3100`. Set `$env:BASE_URL='http://localhost:3100'` for browser scripts. On Windows, `$env:GPU='d3d11'` selects verified hardware acceleration for the main suite and regression-performance script. The dedicated `node tools/3d/hardware-benchmark.cjs` records three 60-second Intel/Direct3D11 samples. This flag is platform-specific; other systems should choose their native hardware backend and verify the reported renderer.
