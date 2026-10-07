import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  assetUrl,
  Manifest,
  ModelSource,
  validateManifest,
  disposeTree,
  Room,
} from "./model";

export async function loadModel(
  source: ModelSource,
  signal: AbortSignal,
  progress: (text: string) => void,
): Promise<{ root: THREE.Group; manifest: Manifest }> {
  if (source.canonical) {
    progress('Compiling approved canonical revision…');
    const { canonicalScene } = await import('./CanonicalSceneAdapter');
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return canonicalScene(source.canonical);
  }
  if (source.proceduralDemo) {
    const { defaultLayoutData } = await import('../default-layout');
    source = { ...source, layout: defaultLayoutData };
  }
  if (source.layout || source.floors) {
    progress('Preparing floor geometry…');
    const { TowerCompiler } = await import('../scene-compiler/TowerCompiler');
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const input =
      source.floors ||
      Array.from(
        { length: source.layout.floorsConfig?.length || 10 },
        (_, i) => ({
          id: `floor-${i}`,
          floorNumber: i,
          floorHeight: 3,
          structureJson: source.layout.floors?.[i] || source.layout,
        }),
      );
    const compiled = TowerCompiler.compile(
      input.map((f) => ({ floor: f, structureJson: f.structureJson })),
    );
    const manifest: Manifest = {
      version: 1,
      modelId: source.id,
      modelUrl: "",
      name: source.name,
      units: "meters",
      upAxis: "Y",
      elements: [],
      floors: [],
    };
    compiled.floorGroups.forEach((g, id) => {
      const f = input.find((x) => x.id === id),
        rooms: Room[] = (f?.structureJson?.rooms || []).map((r: any) => ({
          id: `${id}:${r.id}`,
          name: r.name,
          nodeNames: [],
          bounds: [
            [r.x, g.userData.baseElevation, r.z],
            [
              r.x + r.width,
              g.userData.baseElevation + g.userData.floorHeight,
              r.z + r.depth,
            ],
          ],
          cameraSpawn: [
            r.node?.x ?? r.x + r.width / 2,
            g.userData.baseElevation + 1.65,
            r.node?.z ?? r.z + r.depth / 2,
          ],
        }));
      manifest.floors.push({
        id,
        name: `Level ${f.floorNumber}`,
        elevation: g.userData.baseElevation,
        nodeNames: [g.name],
        flats: [
          {
            id: "layout",
            name: "Layout rooms (units unmapped)",
            nodeNames: [],
            rooms,
          },
        ],
      });
    });
    return { root: compiled.group, manifest };
  }
  const url = assetUrl(source.modelUrl, /\.(glb|gltf)$/i);
  let manifest: Manifest = {
    version: 1,
    modelId: source.id,
    modelUrl: source.modelUrl,
    name: source.name,
    units: "meters",
    upAxis: "Y",
    floors: [],
    elements: [],
  };
  // Fetch both assets together rather than waiting for the manifest before downloading geometry.
  const [response, manifestResponse] = await Promise.all([
    fetch(url, { signal, credentials: 'omit' }),
    source.manifestUrl ? fetch(assetUrl(source.manifestUrl, /\.json$/i), { signal, credentials: 'omit' }) : null,
  ]);
  if (manifestResponse) {
    if (!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
    manifest = validateManifest(await manifestResponse.json());
  }
  if (!response.ok)
    throw new Error(
      `Model HTTP ${response.status}: ${response.status === 404 ? "file not found" : "download failed"}`,
    );
  const total = Number(response.headers.get("content-length"));
  const reader = response.body?.getReader();
  let data: ArrayBuffer;
  if (reader) {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 150 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("Model exceeds the 150 MB MVP limit.");
      }
      chunks.push(part.value);
      progress(
        total
          ? `Loading model ${Math.round((length / total) * 100)}%`
          : `Loading model ${(length / 1024).toFixed(0)} KB`,
      );
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    chunks.forEach((c) => {
      bytes.set(c, offset);
      offset += c.length;
    });
    data = bytes.buffer;
  } else data = await response.arrayBuffer();
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  progress("Preparing architectural geometry…");
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((resource) =>
    /^(blob:|data:(image\/|application\/(octet-stream|gltf-buffer)))/.test(
      resource,
    )
      ? resource
      : assetUrl(resource, /\.(bin|png|jpe?g|webp|ktx2)$/i),
  );
  // GLTFLoader supports standard uncompressed GLB and glTF. Unsupported compression produces a clear error.
  const loader = new GLTFLoader(manager);
  let root: THREE.Group;
  try {
    root = (await loader.parseAsync(data, new URL(".", url).href)).scene;
  } catch (e) {
    throw new Error(
      `Invalid or unsupported GLB/GLTF: ${e instanceof Error ? e.message : String(e)}. Export uncompressed GLB; Draco/KTX2 decoders are not bundled.`,
    );
  }
  if (signal.aborted) {
    disposeTree(root);
    throw new DOMException("Cancelled", "AbortError");
  }
  try {
    validateManifest(manifest, root);
  } catch (e) {
    disposeTree(root);
    throw e;
  }
  if (manifest.units === "millimeters") root.scale.setScalar(0.001);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root),
    size = bounds.getSize(new THREE.Vector3());
  if (
    bounds.isEmpty() ||
    !Number.isFinite(size.length()) ||
    size.length() > 10000
  ) {
    disposeTree(root);
    throw new Error(
      "Model has empty, invalid or unsupported bounds. Verify Y-up units and origin.",
    );
  }
  root.traverse((n) => {
    if (n instanceof THREE.Mesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return { root, manifest };
}
