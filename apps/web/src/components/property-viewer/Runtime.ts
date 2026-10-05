import * as THREE from "three";
import { Surface } from "./Surface";
import { loadModel } from "./loadModel";
import {
  disposeTree,
  Manifest,
  ModelSource,
  Room,
  SceneIndex,
  Vec3,
  visible,
} from "./model";
import { Navigation } from "./Navigation";
import { Furniture, Placement } from "./Furniture";

export type View = "exterior" | "floor" | "walkthrough";
export interface ViewerState {
  loading: string;
  error: string;
  notice: string;
  manifest: Manifest | null;
  floorId: string;
  flatId: string;
  roomId: string;
  mode: View;
  furniture: Placement[];
  selected: string | null;
  doorsOpen: boolean;
  stats: ReturnType<Surface["stats"]> | null;
  loadMs: number;
}
const initial: ViewerState = {
  loading: "",
  error: "",
  notice: "",
  manifest: null,
  floorId: "",
  flatId: "",
  roomId: "",
  mode: "exterior",
  furniture: [],
  selected: null,
  doorsOpen: false,
  stats: null,
  loadMs: 0,
};

export class Runtime {
  readonly surface: Surface;
  state: ViewerState = { ...initial };
  root?: THREE.Group;
  index?: SceneIndex;
  nav?: Navigation;
  furniture?: Furniture;
  private abort?: AbortController;
  private generation = 0;
  private disposed = false;
  private raf = 0;
  private last = 0;
  private lastUi = 0;
  private keys = new Set<string>();
  private transition?: {
    start: THREE.Vector3;
    target: THREE.Vector3;
    look: THREE.Vector3;
    startTime: number;
  };
  private moveId: string | null = null;
  private highlight?: THREE.BoxHelper;
  private pendingMove?: Vec3;
  private handlers: (() => void)[] = [];
  touch = { forward: 0, side: 0 };
  constructor(
    container: HTMLElement,
    readonly publish: (state: ViewerState) => void,
  ) {
    this.surface = new Surface(container, true);
    const { renderer, pointer, orbit } = this.surface;
    const listen = (target: EventTarget, event: string, fn: EventListener) => {
      target.addEventListener(event, fn);
      this.handlers.push(() => target.removeEventListener(event, fn));
    };
    listen(window, "keydown", ((e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pointer.unlock();
        this.keys.clear();
        this.cancelMove();
        return;
      }
      if (
        /INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement)?.tagName) ||
        this.state.mode !== "walkthrough"
      )
        return;
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.key)
      ) {
        e.preventDefault();
        this.keys.add(e.key.toLowerCase());
      }
    }) as EventListener);
    listen(window, "keyup", ((e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    }) as EventListener);
    listen(window, "blur", () => {
      this.keys.clear();
      this.touch = { forward: 0, side: 0 };
    });
    listen(document, "visibilitychange", () => {
      this.keys.clear();
      this.last = performance.now();
    });
    listen(renderer.domElement, "click", ((e: MouseEvent) => {
      if (this.state.mode === "walkthrough") {
        try {
          pointer.lock();
        } catch {
          this.patch({
            notice:
              "Pointer lock unavailable. Use drag-to-look or touch controls.",
          });
        }
        return;
      }
      if (this.moveId && this.pendingMove) {
        const ok = this.furniture?.transform(this.moveId, this.pendingMove);
        this.patch({
          notice: ok
            ? "Furniture moved. Save to keep this arrangement."
            : "Placement blocked by a wall, object or room boundary.",
        });
        this.moveId = null;
        this.pendingMove = undefined;
        orbit.enabled = true;
        renderer.domElement.style.cursor = "grab";
        this.syncFurniture();
        return;
      }
      const ray = this.ray(e);
      const hits = ray.intersectObjects(
        this.furniture ? [this.furniture.group] : [],
        true,
      );
      if (hits[0]) {
        let n: THREE.Object3D | null = hits[0].object;
        while (n && !n.userData.furnitureId) n = n.parent;
        if (n) this.selectFurniture(n.userData.furnitureId);
      } else {
        const door = ray.intersectObjects(
          this.index?.doors.filter(visible) || [],
          false,
        )[0];
        if (door) this.openDoors(!this.state.doorsOpen);
      }
    }) as EventListener);
    let look: { x: number; y: number } | null = null;
    listen(renderer.domElement, "pointerdown", ((e: PointerEvent) => {
      if (this.state.mode === "walkthrough" && !pointer.isLocked) {
        look = { x: e.clientX, y: e.clientY };
        renderer.domElement.setPointerCapture(e.pointerId);
      }
    }) as EventListener);
    listen(renderer.domElement, "pointerup", () => {
      look = null;
    });
    listen(renderer.domElement, "pointermove", ((e: PointerEvent) => {
      if (look && this.state.mode === "walkthrough" && !pointer.isLocked) {
        const rotation = new THREE.Euler().setFromQuaternion(
          this.surface.camera.quaternion,
          "YXZ",
        );
        rotation.y -= (e.clientX - look.x) * 0.003;
        rotation.x = THREE.MathUtils.clamp(
          rotation.x - (e.clientY - look.y) * 0.003,
          -1.4,
          1.4,
        );
        this.surface.camera.quaternion.setFromEuler(rotation);
        look = { x: e.clientX, y: e.clientY };
      }
      if (!this.moveId || !this.index) return;
      const hit = this.ray(e).intersectObjects(
        this.index.floors.filter(visible),
        false,
      )[0];
      this.pendingMove = hit ? (hit.point.toArray() as Vec3) : undefined;
    }) as EventListener);
    listen(document, "pointerlockerror", () =>
      this.patch({
        notice:
          "Mouse capture unavailable. Drag inside the viewport to look around.",
      }),
    );
    pointer.addEventListener("lock", () => {
      orbit.enabled = false;
    });
    pointer.addEventListener("unlock", () => {
      this.keys.clear();
    });
    const animate = (now: number) => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(animate);
      const dt = Math.min(Math.max((now - this.last) / 1000, 0), 0.05);
      this.last = now;
      if (document.hidden || !this.surface.inViewport) return;
      const { camera, scene } = this.surface;
      if (this.transition) {
        const t = Math.min(1, (now - this.transition.startTime) / 650),
          ease = t * t * (3 - 2 * t);
        camera.position.lerpVectors(
          this.transition.start,
          this.transition.target,
          ease,
        );
        camera.lookAt(this.transition.look);
        if (t === 1) this.transition = undefined;
      } else if (this.state.mode === "walkthrough" && this.nav) {
        let f =
          (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) -
          (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) +
          this.touch.forward;
        let s =
          (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
          (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0) +
          this.touch.side;
        const length = Math.max(1, Math.hypot(f, s));
        f /= length;
        s /= length;
        if (f || s) {
          const forward = camera.getWorldDirection(new THREE.Vector3());
          forward.y = 0;
          forward.normalize();
          const right = new THREE.Vector3()
            .crossVectors(forward, camera.up)
            .normalize();
          this.nav.move(
            camera.position,
            forward
              .multiplyScalar(f * 2 * dt)
              .addScaledVector(right, s * 2 * dt),
            this.floor?.elevation || 0,
          );
        }
      } else if (orbit.enabled) orbit.update();
      this.highlight?.update();
      renderer.render(scene, camera);
      this.surface.record(now);
      if (now - this.lastUi > 1000) {
        this.lastUi = now;
        this.patch({ stats: this.surface.stats() });
      }
    };
    this.raf = requestAnimationFrame(animate);
    // A read-only snapshot makes measured QA reproducible without fabricated counters.
    (
      container as HTMLElement & { getViewerSnapshot?: () => unknown }
    ).getViewerSnapshot = () => this.snapshot();
  }
  patch(next: Partial<ViewerState>) {
    this.state = { ...this.state, ...next };
    if (!this.disposed) this.publish(this.state);
  }
  get floor() {
    return this.state.manifest?.floors.find((f) => f.id === this.state.floorId);
  }
  get room() {
    return this.floor?.flats
      .flatMap((u) => u.rooms)
      .find((r) => r.id === this.state.roomId);
  }
  private ray(e: MouseEvent) {
    const rect = this.surface.renderer.domElement.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.surface.camera,
    );
    return ray;
  }
  async load(source: ModelSource) {
    const generation = ++this.generation;
    this.abort?.abort();
    this.abort = new AbortController();
    this.clearModel();
    this.patch({ ...initial, loading: "Loading model…" });
    const start = performance.now();
    try {
      const result = await loadModel(source, this.abort.signal, (text) => {
        if (generation === this.generation) this.patch({ loading: text });
      });
      if (this.disposed || generation !== this.generation) {
        disposeTree(result.root);
        return;
      }
      this.root = result.root;
      this.surface.scene.add(this.root);
      this.index = new SceneIndex(this.root, result.manifest);
      this.nav = new Navigation(this.index);
      this.furniture = new Furniture(
        `aether:furniture:v1:${encodeURIComponent(source.projectId)}:${encodeURIComponent(source.id)}`,
        source.modelUrl,
        result.manifest,
        this.nav,
      );
      this.surface.scene.add(this.furniture.group);
      this.patch({
        manifest: result.manifest,
        loading: "",
        loadMs: performance.now() - start,
        notice: result.manifest.floors.length
          ? "Select a floor to explore its rooms."
          : "No semantic manifest supplied. Exterior inspection is available; floors and rooms are unmapped.",
      });
      try {
        const count = this.furniture.restore();
        if (count)
          this.patch({
            notice: `Restored ${count} furniture object(s) from this browser.`,
          });
      } catch (e) {
        this.patch({ notice: `Furniture not restored: ${String(e)}` });
      }
      this.syncFurniture();
      this.view("exterior");
      this.surface.loadEnvironment();
    } catch (e) {
      if (generation !== this.generation || this.disposed) return;
      this.patch({
        loading: "",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  private cancelMove() {
    this.moveId = null;
    this.pendingMove = undefined;
    this.surface.renderer.domElement.style.cursor = "grab";
    this.surface.orbit.enabled = this.state.mode !== "walkthrough";
  }
  selectFloor(id: string) {
    this.surface.pointer.unlock();
    this.transition = undefined;
    this.keys.clear();
    this.cancelMove();
    this.surface.camera.fov = 45;
    this.surface.camera.updateProjectionMatrix();
    const f = this.state.manifest?.floors.find((f) => f.id === id);
    this.patch({
      floorId: f?.id || "",
      flatId: f?.flats[0]?.id || "",
      roomId: f?.flats[0]?.rooms[0]?.id || "",
      mode: id ? "floor" : "exterior",
    });
    this.applyVisibility();
    this.syncFurniture();
    this.frame();
  }
  selectFlat(id: string) {
    const flat = this.floor?.flats.find((f) => f.id === id);
    this.patch({
      flatId: id,
      roomId: flat?.rooms[0]?.id || "",
      notice:
        "Unit selection shows its IFC rooms. Shared walls and slabs remain visible.",
    });
  }
  selectRoom(id: string) {
    this.patch({ roomId: id });
    if (this.state.mode === "walkthrough") this.enter();
  }
  view(mode: View) {
    if (mode === "walkthrough") {
      this.enter();
      return;
    }
    this.surface.pointer.unlock();
    this.transition = undefined;
    this.keys.clear();
    this.moveId = null;
    this.surface.orbit.enabled = true;
    this.surface.camera.fov = 45;
    this.surface.camera.updateProjectionMatrix();
    if (mode === "exterior")
      this.patch({ mode, floorId: "", flatId: "", roomId: "" });
    else if (!this.floor) {
      const f = this.state.manifest?.floors.find((f) => f.flats.length);
      if (f) {
        this.selectFloor(f.id);
        return;
      } else return;
    } else this.patch({ mode });
    this.applyVisibility();
    this.frame();
  }
  private applyVisibility() {
    if (!this.index) return;
    const f = this.floor;
    // Floors are authored product groups, with slab support explicitly retained at the selected elevation.
    for (const mesh of this.index.meshes) {
      const type = mesh.userData.semanticType;
      let show = !f || mesh.userData.floorId === f.id;
      if (f && type === "IfcSlab") {
        const b = new THREE.Box3().setFromObject(mesh);
        show = Math.abs(b.max.y - f.elevation) < 0.25;
      }
      if (
        f &&
        (type === "ceiling" || type === "IfcCovering") &&
        this.state.mode === "floor"
      )
        show = false;
      if (this.state.doorsOpen && this.index.doors.includes(mesh)) show = false;
      mesh.visible = show;
    }
    this.furniture?.objects.forEach((object, id) => {
      const p = this.furniture!.placements.find((p) => p.id === id);
      object.visible = !f || this.furniture!.floor(p!.roomId)?.id === f.id;
    });
  }
  frame() {
    if (!this.root) return;
    const bounds = new THREE.Box3();
    if (this.floor && this.index) {
      this.index.meshes
        .filter(visible)
        .forEach((m) => bounds.expandByObject(m));
    } else bounds.setFromObject(this.root);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3()),
      size = bounds.getSize(new THREE.Vector3()),
      direction = new THREE.Vector3(0.75, 0.65, 0.9);
    const { camera, orbit } = this.surface;
    // Fit both camera axes so portrait screens show the whole building.
    let distance = Math.max(size.x, size.y, size.z) * 0.95 * direction.length();
    direction.normalize();
    const rotation = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(direction, new THREE.Vector3(), camera.up),
    ).invert();
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
      horizontal = vertical * camera.aspect;
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const corner = new THREE.Vector3(x, y, z).sub(center).applyQuaternion(rotation);
          distance = Math.max(
            distance,
            corner.z + 1.08 * Math.max(Math.abs(corner.x) / horizontal, Math.abs(corner.y) / vertical),
          );
        }
    orbit.enabled = true;
    orbit.minDistance = 1;
    orbit.maxDistance = Math.max(200, distance * 3);
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.target.copy(center);
    camera.position
      .copy(center)
      .addScaledVector(direction, distance);
    camera.lookAt(center);
    orbit.update();
  }
  enter() {
    if (!this.room || !this.nav || !this.floor) {
      this.patch({ notice: "Choose a mapped floor and room first." });
      return;
    }
    this.moveId = null;
    this.openDoors(true);
    const target = new THREE.Vector3().fromArray(this.room.cameraSpawn),
      elevation = this.floor.elevation;
    if (!this.nav.fits(target, elevation)) {
      let found = false;
      const r = this.room;
      for (
        let x = r.bounds[0][0] + 0.4;
        x < r.bounds[1][0] - 0.4 && !found;
        x += 0.4
      )
        for (
          let z = r.bounds[0][2] + 0.4;
          z < r.bounds[1][2] - 0.4 && !found;
          z += 0.4
        ) {
          target.set(x, elevation + 1.65, z);
          if (this.nav.fits(target, elevation)) found = true;
        }
      if (!found) {
        this.patch({
          notice:
            "This room has no validated standing position. Choose another room.",
        });
        return;
      }
    }
    target.y = this.nav.ground(target.x, target.z, elevation)! + 1.65;
    this.surface.pointer.unlock();
    this.surface.orbit.enabled = false;
    this.surface.camera.fov = 65;
    this.surface.camera.updateProjectionMatrix();
    // Fade/transition through overview space is an explicit room teleport, not walking through walls.
    let lookDirection = new THREE.Vector3(0, 0, -1),
      clearance = 0;
    const ray = new THREE.Raycaster();
    for (let i = 0; i < 16; i++) {
      const direction = new THREE.Vector3(
        Math.cos((i * Math.PI) / 8),
        0,
        Math.sin((i * Math.PI) / 8),
      );
      ray.set(target, direction);
      ray.far = 12;
      const hit = ray.intersectObjects(
        this.nav.candidates(target, 12),
        false,
      )[0];
      const distance = hit?.distance || 12;
      if (distance > clearance) {
        clearance = distance;
        lookDirection = direction;
      }
    }
    this.transition = {
      start: this.surface.camera.position.clone(),
      target,
      look: target.clone().add(lookDirection),
      startTime: performance.now(),
    };
    this.patch({
      mode: "walkthrough",
      notice:
        "Click to look with mouse. WASD to walk; Esc releases the mouse. Floor changes use the selector; stairs are not enabled.",
    });
    this.applyVisibility();
  }
  openDoors(open: boolean) {
    this.patch({ doorsOpen: open });
    this.applyVisibility();
  }
  addFurniture(type: Placement["type"]) {
    try {
      if (!this.room) throw new Error("Choose a room first.");
      this.view("floor");
      this.furniture?.add(type, this.room);
      this.syncFurniture();
      this.patch({
        notice: "Furniture added. Use Move, then click a floor position.",
      });
    } catch (e) {
      this.patch({ notice: String(e) });
    }
  }
  selectFurniture(id: string) {
    if (this.furniture) {
      this.furniture.selected = id;
      this.syncFurniture();
    }
  }
  furnitureAction(action: "move" | "rotate" | "delete" | "reset" | "save") {
    try {
      const f = this.furniture;
      if (!f) return;
      if (action === "save") {
        f.save();
        this.patch({
          notice:
            "Configuration saved in this browser. It is not shared across devices or users.",
        });
        return;
      }
      const id = f.selected;
      if (!id) return;
      if (action === "move") {
        this.view("floor");
        this.moveId = id;
        this.surface.orbit.enabled = false;
        this.surface.renderer.domElement.style.cursor = "crosshair";
        this.patch({
          notice:
            "Click the floor to place the selected object. Walls and room boundaries are checked.",
        });
      }
      if (action === "rotate") {
        const p = f.placements.find((p) => p.id === id)!;
        if (!f.transform(id, undefined, p.rotation + Math.PI / 4))
          this.patch({
            notice: "Rotation blocked by a wall, object or room boundary.",
          });
      }
      if (action === "delete") f.delete(id);
      if (action === "reset" && !f.reset(id))
        this.patch({ notice: "Original position is now occupied." });
      this.syncFurniture();
    } catch (e) {
      this.patch({ notice: `Unable to save configuration: ${String(e)}` });
    }
  }
  private syncFurniture() {
    if (this.highlight) {
      disposeTree(this.highlight);
      this.highlight = undefined;
    }
    const f = this.furniture;
    if (f?.selected) {
      const object = f.objects.get(f.selected);
      if (object && object.visible) {
        this.highlight = new THREE.BoxHelper(object, 0x00aa99);
        this.surface.scene.add(this.highlight);
      }
    }
    this.patch({
      furniture: f ? [...f.placements] : [],
      selected: f?.selected || null,
    });
  }
  snapshot() {
    return {
      state: this.state,
      stats: this.surface.stats(),
      camera: this.surface.camera.position.toArray(),
      projection: this.surface.camera.projectionMatrix.toArray(),
      viewMatrix: this.surface.camera.matrixWorldInverse.toArray(),
      visibleMeshes: this.index?.meshes.filter(visible).length || 0,
      meshCount: this.index?.meshes.length || 0,
      materials: new Set(
        this.index?.meshes.flatMap((m) =>
          Array.isArray(m.material) ? m.material : [m.material],
        ),
      ).size,
      colliders: this.index?.walls.length || 0,
      rootId: this.root?.uuid,
    };
  }
  private clearModel() {
    this.cancelMove();
    this.touch = { forward: 0, side: 0 };
    this.surface.pointer.unlock();
    this.transition = undefined;
    this.keys.clear();
    if (this.highlight) {
      disposeTree(this.highlight);
      this.highlight = undefined;
    }
    this.furniture?.dispose();
    this.furniture = undefined;
    if (this.root) disposeTree(this.root);
    this.root = undefined;
    this.index = undefined;
    this.nav = undefined;
    this.surface.renderer.renderLists.dispose();
  }
  unload() {
    this.generation++;
    this.abort?.abort();
    this.clearModel();
    this.patch({
      ...initial,
      notice: "Model unloaded. Select a model to load it again.",
    });
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.abort?.abort();
    cancelAnimationFrame(this.raf);
    this.handlers.forEach((fn) => fn());
    this.clearModel();
    delete (
      this.surface.container as HTMLElement & {
        getViewerSnapshot?: () => unknown;
      }
    ).getViewerSnapshot;
    this.surface.dispose();
  }
}
