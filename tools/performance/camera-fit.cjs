const { chromium } = require('playwright');
const THREE = require('three');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  // Measure the actual GLB bounds independently of the viewer framing code.
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const bytes = fs.readFileSync('apps/web/public/models/duplex/duplex.glb');
  const { scene } = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
  );
  const bounds = new THREE.Box3().setFromObject(scene);
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11'] });
  const results = [], errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 780 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/explorer', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => {
        const s = document.querySelector('[data-testid=property-canvas]')?.getViewerSnapshot?.();
        return s?.state.manifest?.modelId === 'bsi-duplex-v1' && s.stats.samples > 12;
      });
      const snapshot = await page.locator('[data-testid=property-canvas]').evaluate(el => el.getViewerSnapshot());
      const view = new THREE.Matrix4().fromArray(snapshot.viewMatrix);
      const projection = new THREE.Matrix4().fromArray(snapshot.projection);
      let maxX = 0, maxY = 0;
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const point = new THREE.Vector3(x, y, z).applyMatrix4(view).applyMatrix4(projection);
            maxX = Math.max(maxX, Math.abs(point.x));
            maxY = Math.max(maxY, Math.abs(point.y));
          }
      assert(maxX <= 1 && maxY <= 1, `Building clipped at ${viewport.width}px: ${maxX}, ${maxY}`);
      assert.equal(snapshot.meshCount, 277);
      results.push({ viewport, result: 'PASS', maxX, maxY, meshCount: snapshot.meshCount });
      if (viewport.width === 390) await page.screenshot({ path: 'evidence/performance/final-explorer-mobile.png' });
      if (viewport.width === 1440) await page.screenshot({ path: 'evidence/performance/final-desktop-ready.png' });
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    fs.writeFileSync('evidence/performance/camera-fit.json', JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify({ results, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
