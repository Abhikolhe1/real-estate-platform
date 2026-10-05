import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { disposeTree } from "./model";

let serial = 0;
export class Surface {
  readonly id = ++serial;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  readonly ortho = new THREE.OrthographicCamera(-15, 15, 15, -15, 0.05, 1000);
  readonly renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  readonly orbit: OrbitControls;
  readonly map: MapControls;
  readonly pointer: PointerLockControls;
  readonly sun = new THREE.DirectionalLight(0xfff5e8, 2.4);
  private observer: ResizeObserver;
  private visibilityObserver: IntersectionObserver;
  inViewport = true;
  private environmentTimer?: ReturnType<typeof setTimeout>;
  private environmentRequested = false;
  private environment?: THREE.WebGLRenderTarget;
  private disposed = false;
  private frames: number[] = [];
  private last = 0;
  private samples = 0;
  constructor(readonly container: HTMLElement, deferEnvironment = false) {
    this.scene.background = new THREE.Color("#d9e1e4");
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.quality(false);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.dataset.rendererId = String(this.id);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.map = new MapControls(this.ortho, this.renderer.domElement);
    this.map.enabled = false;
    this.pointer = new PointerLockControls(
      this.camera,
      this.renderer.domElement,
    );
    this.scene.add(new THREE.HemisphereLight(0xddeeff, 0xbbb09e, 1.3));
    this.sun.position.set(15, 30, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.visibilityObserver = new IntersectionObserver(([entry]) => { this.inViewport = entry.isIntersecting; });
    this.visibilityObserver.observe(container);
    this.resize();
    if (!deferEnvironment) this.loadEnvironment();
  }
  /** Daylight is immediately usable; optional HDR lighting follows the first model paint. */
  loadEnvironment() {
    if (this.environmentRequested || this.disposed) return;
    this.environmentRequested = true;
    this.environmentTimer = setTimeout(async () => {
      try {
      const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
      if (this.disposed) return;
      new RGBELoader().load(
      "/environments/venice_sunset_1k.hdr",
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.environment = pmrem.fromEquirectangular(texture);
        this.scene.environment = this.environment.texture;
        this.scene.environmentIntensity = 0.6;
        texture.dispose();
        pmrem.dispose();
      },
      undefined,
      () => {
        this.container.dataset.environmentWarning =
          "HDR unavailable; daylight fallback active";
      },
    );
      } catch { this.container.dataset.environmentWarning = 'HDR unavailable; daylight fallback active'; }
    }, 500);
  }
  resize() {
    const w = Math.max(1, this.container.clientWidth),
      h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.ortho.left = (-15 * w) / h;
    this.ortho.right = (15 * w) / h;
    this.ortho.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  quality(low: boolean) {
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, low ? 1 : 1.5),
    );
    this.renderer.shadowMap.enabled = !low;
    this.sun.castShadow = !low;
    this.scene.traverse((n) => {
      if (n instanceof THREE.Mesh)
        (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
          m.needsUpdate = true;
        });
    });
  }
  record(now: number) {
    if (this.last && !document.hidden) {
      this.frames.push(now - this.last);
      if (this.frames.length > 600) this.frames.shift();
    }
    this.last = now;
    this.samples++;
  }
  stats() {
    const sorted = [...this.frames].sort((a, b) => a - b),
      sum = this.frames.reduce((a, b) => a + b, 0);
    return {
      rendererId: this.id,
      samples: this.samples,
      fps: sum ? (1000 * this.frames.length) / sum : 0,
      p50Ms: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
      slowFrames: this.frames.filter((x) => x > 50).length,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length || 0,
    };
  }
  dispose() {
    this.disposed = true;
    this.observer.disconnect();
    this.visibilityObserver.disconnect();
    clearTimeout(this.environmentTimer);
    this.pointer.unlock();
    this.pointer.dispose();
    this.orbit.dispose();
    this.map.dispose();
    disposeTree(this.scene);
    this.environment?.dispose();
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
