"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Runtime, ViewerState } from "./Runtime";
import { ModelSource, sampleSource } from "./model";
import { getBuilder, publicJson } from "@/lib/public-data";
import { useSearchParams } from "next/navigation";

export interface ExternalNavigation {
  viewMode: "building" | "walkthrough";
  activeFloor: number;
  activeRoom: string | null;
  setViewMode?: (mode: "building" | "walkthrough") => void;
  setActiveFloor?: (floor: number) => void;
  setActiveRoom: (room: string | null) => void;
}

export default function PropertyExperience({
  models,
  layout,
  projectId = "demo-duplex",
  navigation,
  proceduralDemo = false,
}: {
  models?: ModelSource[];
  layout?: any;
  projectId?: string;
  navigation?: ExternalNavigation;
  proceduralDemo?: boolean;
}) {
  const params = useSearchParams();
  const builderSlug = params.get("builder") || "aethelgard";
  const container = useRef<HTMLDivElement>(null),
    runtime = useRef<Runtime>();
  const [state, setState] = useState<ViewerState | null>(null),
    [startupError, setStartupError] = useState("");
  const [controlsOpen, setControlsOpen] = useState(true);
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const bridgeReady = useRef(false);
  const published = useRef("");
  const [sourceId, setSourceId] = useState(models?.[0]?.id || sampleSource.id),
    [low, setLow] = useState(false),
    [furnitureOpen, setFurnitureOpen] = useState(false),
    [diagnostics, setDiagnostics] = useState(false);
  const [url, setUrl] = useState(""),
    [manifestUrl, setManifestUrl] = useState(""),
    [custom, setCustom] = useState<ModelSource | null>(null);
  const [projectModels, setProjectModels] = useState<ModelSource[]>([]);
  const [fixture, setFixture] = useState<ModelSource | null>(null);
  useEffect(() => {
    const test = new URLSearchParams(location.search).get("fixture");
    if (!["dxf-single", "dxf-tower"].includes(test || "")) return;
    const abort = new AbortController();
    fetch("/models/dxf-fixture.json", { signal: abort.signal })
      .then((r) => r.json())
      .then((data) => {
        const source: ModelSource = {
          id: test!,
          name:
            test === "dxf-tower"
              ? "DXF regression: 10 repeated levels"
              : "DXF regression: single level",
          projectId: "dxf-regression",
          modelUrl: "",
          floors: Array.from(
            { length: test === "dxf-tower" ? 10 : 1 },
            (_, i) => ({
              id: `dxf-${i}`,
              floorNumber: i,
              floorHeight: 3,
              structureJson: data,
            }),
          ),
        };
        setFixture(source);
        setSourceId(source.id);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  const sources = useMemo(
    () => [
      ...(models?.length ? models : [sampleSource, ...projectModels]),
      ...(layout || proceduralDemo
        ? [
            {
              id: "procedural-demo",
              name: "Procedural tower · existing layout",
              projectId,
              modelUrl: "",
              layout,
              proceduralDemo: !layout && proceduralDemo,
            },
          ]
        : []),
      ...(custom ? [custom] : []),
      ...(fixture ? [fixture] : []),
    ],
    [models, layout, proceduralDemo, projectId, custom, projectModels, fixture],
  );
  useEffect(() => {
    if (models?.length) return;
    const abort = new AbortController();
    setProjectModels([]);
    (async () => {
      try {
        const theme = await getBuilder(builderSlug);
        if (!theme.id || abort.signal.aborted) return;
        const query =
          projectId === "demo-duplex"
            ? ""
            : `?projectId=${encodeURIComponent(projectId)}`;
        const data = await publicJson(`/digital-twin/models${query}`, theme.id);
        if (!abort.signal.aborted && Array.isArray(data))
          setProjectModels(
            data.filter(
              (m) =>
                m.id &&
                m.projectId &&
                /\.(glb|gltf)(?:[?#]|$)/i.test(m.modelUrl),
            ),
          );
      } catch {
        /* The self-contained demo remains available when the local API is offline. */
      }
    })();
    return () => abort.abort();
  }, [models, projectId, builderSlug]);
  const source = sources.find((s) => s.id === sourceId) || sources[0];
  useEffect(() => {
    if (!container.current) return;
    try {
      runtime.current = new Runtime(container.current, (next) => {
        setState(next);
        const external = navigationRef.current;
        if (!external || !bridgeReady.current || !next.manifest) return;
        const signature = [next.mode, next.floorId, next.roomId].join(":");
        if (signature === published.current) return;
        published.current = signature;
        external.setViewMode?.(
          next.mode === "walkthrough" ? "walkthrough" : "building",
        );
        const floors = next.manifest.floors.filter((f) => f.flats.length);
        const index = floors.findIndex((f) => f.id === next.floorId);
        if (index >= 0) external.setActiveFloor?.(index);
        const room = floors
          .flatMap((f) => f.flats.flatMap((u) => u.rooms))
          .find((r) => r.id === next.roomId);
        external.setActiveRoom(
          next.mode === "walkthrough" ? room?.name || null : null,
        );
      });
    } catch (e) {
      setStartupError(`Unable to start WebGL: ${String(e)}`);
    }
    return () => {
      runtime.current?.dispose();
      runtime.current = undefined;
    };
  }, []);
  useEffect(() => {
    bridgeReady.current = false;
    if (source) void runtime.current?.load(source);
  }, [source]);
  useEffect(() => {
    const current = runtime.current,
      external = navigationRef.current;
    if (!current || !external || !state?.manifest) return;
    const floors = state.manifest.floors.filter((f) => f.flats.length);
    const floor =
      floors[Math.min(Math.max(external.activeFloor, 0), floors.length - 1)];
    if (external.viewMode === "walkthrough") {
      if (floor && current.state.floorId !== floor.id)
        current.selectFloor(floor.id);
      const room = floor?.flats
        .flatMap((u) => u.rooms)
        .find(
          (r) => r.name === external.activeRoom || r.id === external.activeRoom,
        );
      if (room && current.state.roomId !== room.id) current.selectRoom(room.id);
      if (current.state.mode !== "walkthrough") current.view("walkthrough");
    } else if (current.state.mode === "walkthrough") current.view("exterior");
    bridgeReady.current = true;
  }, [
    navigation?.viewMode,
    navigation?.activeFloor,
    navigation?.activeRoom,
    state?.manifest,
  ]);
  useEffect(() => {
    runtime.current?.surface.quality(low);
  }, [low]);
  const floor = state?.manifest?.floors.find((f) => f.id === state?.floorId),
    flat = floor?.flats.find((f) => f.id === state?.flatId);
  const selectClass =
    "w-full rounded-lg border border-white/15 bg-[#202a2d] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-300";
  const buttonClass =
    "rounded-lg border border-white/15 px-3 py-2 text-xs text-white hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-teal-300";
  return (
    <section
      aria-label="Property exploration"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#d9e1e4] shadow-2xl text-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#172124] px-5 py-4">
        <div>
          <span className="text-[10px] uppercase tracking-[.25em] text-teal-300">
            Aether / Property explorer
          </span>
          <h2 className="mt-1 text-lg font-medium">
            {state?.manifest?.name || source?.name || "Property explorer"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={buttonClass}
            aria-expanded={controlsOpen}
            onClick={() => setControlsOpen(!controlsOpen)}
          >
            {controlsOpen ? "Hide controls" : "Show controls"}
          </button>
          <button
            className={buttonClass}
            onClick={() => setLow(!low)}
            aria-pressed={low}
          >
            Performance {low ? "on" : "off"}
          </button>
          <button
            className={buttonClass}
            onClick={() => {
              const el = container.current?.parentElement;
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void el?.requestFullscreen().catch(() =>
                  runtime.current?.patch({
                    notice: "Fullscreen is unavailable in this browser.",
                  }),
                );
            }}
          >
            Fullscreen
          </button>
        </div>
      </div>
      <div
        className="relative h-[calc(100dvh-185px)] min-h-[480px] max-h-[1000px]"
        data-testid="property-viewport"
      >
        <div
          ref={container}
          data-testid="property-canvas"
          className="absolute inset-0 touch-none"
        />
        <aside
          hidden={!controlsOpen}
          className="absolute left-4 top-4 z-10 w-56 max-h-[520px] overflow-y-auto rounded-xl bg-[#172124]/95 p-4 shadow-xl backdrop-blur-md max-sm:w-44 max-sm:p-3"
        >
          <label
            className="mb-1 block text-[10px] uppercase tracking-widest text-white/60"
            htmlFor="property-model"
          >
            Building / source
          </label>
          <select
            id="property-model"
            className={selectClass}
            value={source?.id}
            onChange={(e) => setSourceId(e.target.value)}
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label
            className="mb-1 mt-4 block text-[10px] uppercase tracking-widest text-white/60"
            htmlFor="property-floor"
          >
            Floor
          </label>
          <select
            id="property-floor"
            className={selectClass}
            disabled={!!state?.loading || !state?.manifest?.floors.length}
            value={state?.floorId || ""}
            onChange={(e) => runtime.current?.selectFloor(e.target.value)}
          >
            <option value="">All floors</option>
            {state?.manifest?.floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {floor && (
            <>
              <label
                className="mb-1 mt-4 block text-[10px] uppercase tracking-widest text-white/60"
                htmlFor="property-flat"
              >
                Unit / room group
              </label>
              <select
                id="property-flat"
                className={selectClass}
                value={state?.flatId}
                disabled={!floor.flats.length}
                onChange={(e) => runtime.current?.selectFlat(e.target.value)}
              >
                {!floor.flats.length && <option>No mapped units</option>}
                {floor.flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <label
                className="mb-1 mt-4 block text-[10px] uppercase tracking-widest text-white/60"
                htmlFor="property-room"
              >
                Room
              </label>
              <select
                id="property-room"
                className={selectClass}
                value={state?.roomId}
                disabled={!flat?.rooms.length}
                onChange={(e) => runtime.current?.selectRoom(e.target.value)}
              >
                {!flat?.rooms.length && <option>No mapped rooms</option>}
                {flat?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                className="mt-4 w-full rounded-lg bg-teal-300 px-3 py-2 text-sm font-semibold text-[#172124] disabled:opacity-30"
                disabled={!state?.roomId || !!state.loading}
                onClick={() => runtime.current?.view("walkthrough")}
              >
                Enter room
              </button>
            </>
          )}
          <details className="mt-4 border-t border-white/10 pt-3 text-xs">
            <summary className="cursor-pointer text-white/65">
              Load another asset
            </summary>
            <label className="mt-3 block">
              Sun elevation
              <input
                aria-label="Sun elevation"
                type="range"
                min="10"
                max="80"
                defaultValue="55"
                className="mt-2 w-full"
                onChange={(e) => {
                  const angle = (Number(e.target.value) * Math.PI) / 180;
                  runtime.current?.surface.sun.position.set(
                    35 * Math.cos(angle),
                    35 * Math.sin(angle),
                    12,
                  );
                }}
              />
            </label>
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const c = {
                  id: `custom:${url}`,
                  name: "Imported property",
                  projectId,
                  modelUrl: url,
                  manifestUrl: manifestUrl || undefined,
                };
                setCustom(c);
                setSourceId(c.id);
              }}
            >
              <label>
                GLB / GLTF URL
                <input
                  aria-label="Model URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={selectClass}
                  placeholder="/models/property.glb"
                  required
                />
              </label>
              <label>
                Manifest URL (optional)
                <input
                  aria-label="Manifest URL"
                  value={manifestUrl}
                  onChange={(e) => setManifestUrl(e.target.value)}
                  className={selectClass}
                  placeholder="/models/manifest.json"
                />
              </label>
              <button className={buttonClass}>Load asset</button>
            </form>
            <button
              className={`${buttonClass} mt-2 w-full`}
              onClick={() => runtime.current?.unload()}
            >
              Unload model
            </button>
            <button
              className={`${buttonClass} mt-2 w-full`}
              onClick={() => source && void runtime.current?.load(source)}
            >
              Reload model
            </button>
          </details>
        </aside>
        <div className="absolute bottom-24 left-4 right-4 z-10 flex justify-between gap-4 pointer-events-none">
          <p
            role="status"
            className="max-w-lg rounded-lg bg-[#172124]/90 px-3 py-2 text-xs leading-relaxed text-white/80"
          >
            {state?.notice || "Preparing your property…"}
          </p>
          <button
            className={`${buttonClass} pointer-events-auto self-end bg-[#172124]/95`}
            aria-expanded={furnitureOpen}
            onClick={() => setFurnitureOpen(!furnitureOpen)}
          >
            Furnish room
          </button>
        </div>
        {furnitureOpen && (
          <aside
            aria-label="Furniture panel"
            className="absolute right-4 top-4 z-20 w-60 rounded-xl bg-[#172124]/95 p-4 shadow-xl"
          >
            <div className="mb-3 flex justify-between">
              <h3 className="text-sm font-semibold">Make it your space</h3>
              <button
                aria-label="Close furniture panel"
                onClick={() => setFurnitureOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="mb-3 text-xs text-white/60">
              Choose a room, then add a piece.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["sofa", "bed", "table"] as const).map((type) => (
                <button
                  key={type}
                  className={buttonClass}
                  disabled={!state?.roomId}
                  onClick={() => runtime.current?.addFurniture(type)}
                >
                  Add {type}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-xs">
              Selected furniture
              <select
                aria-label="Selected furniture"
                className={`${selectClass} mt-1`}
                value={state?.selected || ""}
                onChange={(e) =>
                  runtime.current?.selectFurniture(e.target.value)
                }
              >
                <option value="">Select an object</option>
                {state?.furniture.map((p, i) => (
                  <option key={p.id} value={p.id}>
                    {p.type} {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["move", "rotate", "reset", "delete"] as const).map(
                (action) => (
                  <button
                    key={action}
                    className={buttonClass}
                    disabled={!state?.selected}
                    onClick={() => runtime.current?.furnitureAction(action)}
                  >
                    {action[0].toUpperCase() + action.slice(1)}
                  </button>
                ),
              )}
            </div>
            <button
              className="mt-4 w-full rounded-lg bg-teal-300 py-2 text-xs font-semibold text-[#172124]"
              onClick={() => runtime.current?.furnitureAction("save")}
            >
              Save configuration
            </button>
            <p className="mt-2 text-[10px] text-white/50">
              Stored in this browser for this project and model.
            </p>
          </aside>
        )}
        <nav
          aria-label="Viewer modes"
          className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-[#172124]/95 p-3 shadow-xl"
        >
          {(["exterior", "floor", "walkthrough"] as const).map((mode) => (
            <button
              key={mode}
              className={`${buttonClass} ${state?.mode === mode ? "bg-teal-300/20 border-teal-300/50" : ""}`}
              aria-pressed={state?.mode === mode}
              disabled={
                !state?.manifest || (mode === "walkthrough" && !state.roomId)
              }
              onClick={() => runtime.current?.view(mode)}
            >
              {mode === "floor"
                ? "Floor overview"
                : mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
          <button
            className={buttonClass}
            onClick={() =>
              state?.mode === "walkthrough"
                ? runtime.current?.enter()
                : runtime.current?.frame()
            }
          >
            Reset camera
          </button>
          <button
            className={buttonClass}
            aria-pressed={state?.doorsOpen}
            onClick={() => runtime.current?.openDoors(!state?.doorsOpen)}
          >
            {state?.doorsOpen ? "Close doors" : "Open doors"}
          </button>
          <button
            className={buttonClass}
            onClick={() => setDiagnostics(!diagnostics)}
          >
            Metrics
          </button>
        </nav>
        {state?.mode === "walkthrough" && (
          <div
            className="absolute right-5 top-5 z-10 flex gap-1 rounded-xl bg-[#172124]/90 p-2"
            aria-label="Touch movement"
          >
            {[
              { text: "←", forward: 0, side: -1 },
              { text: "↑", forward: 1, side: 0 },
              { text: "↓", forward: -1, side: 0 },
              { text: "→", forward: 0, side: 1 },
            ].map((k) => (
              <button
                key={k.text}
                aria-label={`Move ${k.text}`}
                className={`${buttonClass} touch-none`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  if (runtime.current) runtime.current.touch = k;
                }}
                onPointerUp={() => {
                  if (runtime.current)
                    runtime.current.touch = { forward: 0, side: 0 };
                }}
                onPointerCancel={() => {
                  if (runtime.current)
                    runtime.current.touch = { forward: 0, side: 0 };
                }}
              >
                {k.text}
              </button>
            ))}
          </div>
        )}
        {diagnostics && state?.stats && (
          <output className="absolute right-4 top-20 z-10 rounded-lg bg-black/80 p-3 font-mono text-[11px]">
            {state.stats.fps.toFixed(1)} FPS · p95{" "}
            {state.stats.p95Ms.toFixed(1)} ms
            <br />
            {state.stats.drawCalls} calls ·{" "}
            {state.stats.triangles.toLocaleString()} triangles
            <br />
            {state.stats.geometries} geometries · {state.stats.textures}{" "}
            textures
            <br />
            Renderer #{state.stats.rendererId} · load {state.loadMs.toFixed(0)}{" "}
            ms
          </output>
        )}
        {(state?.loading || state?.error || startupError) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#172124]/70 p-6 backdrop-blur-sm">
            <div
              className="max-w-lg rounded-xl bg-[#172124] p-6"
              role={state?.error || startupError ? "alert" : "status"}
            >
              <p>{state?.error || startupError || state?.loading}</p>
              {state?.error && (
                <div className="mt-4 flex gap-2">
                  <button
                    className={buttonClass}
                    onClick={() => runtime.current?.load(source)}
                  >
                    Retry
                  </button>
                  <button
                    className={buttonClass}
                    onClick={() => runtime.current?.patch({ error: "" })}
                  >
                    Choose another model
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <footer className="flex flex-wrap justify-between gap-2 bg-[#172124] px-5 py-3 text-[10px] text-white/50">
        <span>
          {state?.manifest?.attribution ||
            "Aether real-time property exploration"}
        </span>
        {source.canonical ? (
          <span>Source SHA-256: {source.canonical.source.sha256}</span>
        ) : (
          <a href="/models/duplex/ATTRIBUTION.md" className="underline">
            Model source & attribution
          </a>
        )}
      </footer>
    </section>
  );
}
