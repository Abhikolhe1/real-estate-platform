"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CanonicalTwinV1, Point2, Correction } from "@aether/twin-schema";

export function SourceOverlay({
  twin,
  selectedId,
  onSelect,
  queue,
}: {
  twin: CanonicalTwinV1;
  selectedId: string | null;
  onSelect: (id: string) => void;
  queue?: (c: Correction) => void;
}) {
  const [layers, setLayers] = useState({
    source: true,
    ignored: false,
    walls: true,
    rooms: true,
    doors: true,
    windows: true,
    text: true,
    issues: true,
  });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: number[] } | null>(null);
  const vertex = useRef<{
    roomId: string;
    index: number;
    footprint: CanonicalTwinV1["rooms"][number]["footprint"];
  } | null>(null);
  const [preview, setPreview] = useState<
    CanonicalTwinV1["rooms"][number]["footprint"] | null
  >(null);
  const points = useMemo(
    () =>
      twin.sourceEntities.flatMap((e) =>
        e.localPoints.length
          ? e.localPoints
          : e.sourcePoints.map((p) => [p[0], p[1]] as Point2),
      ),
    [twin],
  );
  const fit = useMemo(() => {
    const xs = points.map((p) => p[0]),
      zs = points.map((p) => p[1]);
    const x = xs.length ? Math.min(...xs) : 0,
      z = zs.length ? Math.min(...zs) : 0;
    return [
      x - 1,
      z - 1,
      Math.max(2, Math.max(...xs) - x + 2),
      Math.max(2, Math.max(...zs) - z + 2),
    ];
  }, [points]);
  const [view, setView] = useState(fit);
  useEffect(() => {
    setView(fit);
  }, [fit]);
  useEffect(() => {
    if (!selectedId) return;
    const source = twin.sourceEntities.find((e) => e.id === selectedId);
    const wall = twin.walls.find((w) => w.id === selectedId),
      room = twin.rooms.find((r) => r.id === selectedId);
    const pts = source
      ? source.localPoints.length
        ? source.localPoints
        : source.sourcePoints.map((p) => [p[0], p[1]])
      : wall
        ? [wall.start, wall.end]
        : room?.footprint.outer;
    if (pts?.length) {
      const center = pts.reduce(
        (a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length],
        [0, 0],
      );
      setView((v) => [center[0] - v[2] / 2, center[1] - v[3] / 2, v[2], v[3]]);
    }
  }, [selectedId, twin]);
  const scale = view[2] / 900;
  const polyline = (pts: number[][]) => pts.map((p) => p.join(",")).join(" ");
  const path = (rings: number[][][]) =>
    rings.map((r) => `M${r.map((p) => p.join(",")).join("L")}Z`).join("");
  const issueIds = new Set(
    twin.issues.filter((i) => !i.resolved).flatMap((i) => i.objectIds),
  );
  const openingLine = (o: CanonicalTwinV1["openings"][number]) => {
    const w = twin.walls.find((w) => w.id === o.hostWallId)!;
    const len = Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]);
    return [o.startOffsetM, o.startOffsetM + o.widthM].map((v) => [
      w.start[0] + ((w.end[0] - w.start[0]) * v) / len,
      w.start[1] + ((w.end[1] - w.start[1]) * v) / len,
    ]);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-3 py-2 text-xs">
        {Object.entries(layers).map(([key, value]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) =>
                setLayers({ ...layers, [key]: e.target.checked })
              }
            />{" "}
            {key}
          </label>
        ))}
        <button type="button" onClick={() => setView(fit)}>
          Fit drawing
        </button>
        <button
          type="button"
          onClick={() =>
            setView((v) => [
              v[0] + v[2] / 4,
              v[1] + v[3] / 4,
              v[2] / 2,
              v[3] / 2,
            ])
          }
        >
          Zoom in
        </button>
        <button
          type="button"
          onClick={() =>
            setView((v) => [
              v[0] - v[2] / 2,
              v[1] - v[3] / 2,
              v[2] * 2,
              v[3] * 2,
            ])
          }
        >
          Zoom out
        </button>
      </div>
      <svg
        ref={svg}
        role="img"
        aria-label="Source and canonical geometry"
        className="w-full h-[560px] bg-slate-50 border rounded-lg touch-none"
        viewBox={view.join(" ")}
        onWheel={(e) => {
          const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
          setView((v) => [
            v[0] + (v[2] * (1 - factor)) / 2,
            v[1] + (v[3] * (1 - factor)) / 2,
            v[2] * factor,
            v[3] * factor,
          ]);
        }}
        onPointerDown={(e) => {
          if (e.target === svg.current) {
            drag.current = { x: e.clientX, y: e.clientY, view };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (vertex.current) {
            const pt = e.currentTarget.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const local = pt.matrixTransform(
              e.currentTarget.getScreenCTM()!.inverse(),
            );
            const v = vertex.current;
            v.footprint.outer[v.index] = [
              Math.round(local.x * 1000) / 1000,
              Math.round(local.y * 1000) / 1000,
            ];
            setPreview(structuredClone(v.footprint));
          } else if (drag.current) {
            const rect = e.currentTarget.getBoundingClientRect(),
              d = drag.current;
            setView([
              d.view[0] - ((e.clientX - d.x) * d.view[2]) / rect.width,
              d.view[1] - ((e.clientY - d.y) * d.view[3]) / rect.height,
              d.view[2],
              d.view[3],
            ]);
          }
        }}
        onPointerUp={() => {
          drag.current = null;
          if (vertex.current) {
            const v = vertex.current;
            queue?.({
              type: "AdjustRoomBoundary",
              targetId: v.roomId,
              value: v.footprint,
              reason: "Moved shared boundary vertex against source overlay",
            });
            vertex.current = null;
            setPreview(null);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          vertex.current = null;
          setPreview(null);
        }}
      >
        {layers.rooms &&
          twin.rooms.map((r) => {
            const fp = r.id === selectedId && preview ? preview : r.footprint;
            return (
              <path
                data-room-id={r.id}
                key={r.id}
                d={path([fp.outer, ...fp.holes])}
                fill={selectedId === r.id ? "#fbbf2470" : "#34d39925"}
                fillRule="evenodd"
                stroke="#10b981"
                strokeWidth={scale}
                onClick={() => onSelect(r.id)}
              >
                <title>{r.name}</title>
              </path>
            );
          })}
        {twin.sourceEntities
          .filter((e) => (e.role === "ignore" ? layers.ignored : layers.source))
          .map((e) => {
            const pts = e.localPoints.length
              ? e.localPoints
              : e.sourcePoints.map((p) => [p[0], p[1]]);
            return (
              <g key={e.id} onClick={() => onSelect(e.id)}>
                <polyline
                  points={polyline(pts)}
                  fill="none"
                  stroke={
                    selectedId === e.id
                      ? "#f59e0b"
                      : layers.issues && issueIds.has(e.id)
                        ? "#ef4444"
                        : "#64748b"
                  }
                  opacity={e.role === "ignore" ? 0.25 : 0.65}
                  strokeWidth={scale * 1.5}
                >
                  <title>
                    {e.sourceRefs
                      .map((r) => `${r.handle} · ${r.layer} · ${r.entityType}`)
                      .join("\n")}
                  </title>
                </polyline>
                {layers.text && e.text && pts[0] && (
                  <text
                    pointerEvents="none"
                    x={pts[0][0]}
                    y={pts[0][1]}
                    fontSize={scale * 11}
                    fill="#334155"
                  >
                    {e.text}
                  </text>
                )}
              </g>
            );
          })}
        {layers.walls &&
          twin.walls.map((w) => (
            <polyline
              key={w.id}
              points={polyline([w.start, w.end])}
              fill="none"
              stroke={selectedId === w.id ? "#f59e0b" : "#1d4ed8"}
              strokeWidth={Math.max(w.thicknessM, scale * 2)}
              opacity=".65"
              onClick={() => onSelect(w.id)}
            />
          ))}
        {twin.openings
          .filter((o) => (o.kind === "door" ? layers.doors : layers.windows))
          .map((o) => (
            <polyline
              key={o.id}
              points={polyline(openingLine(o))}
              stroke={
                selectedId === o.id
                  ? "#f59e0b"
                  : o.kind === "door"
                    ? "#a855f7"
                    : "#06b6d4"
              }
              strokeWidth={scale * 6}
              onClick={() => onSelect(o.id)}
            />
          ))}
        {queue &&
          twin.rooms
            .find((r) => r.id === selectedId)
            ?.footprint.outer.map((p, i) => (
              <circle
                key={i}
                aria-label={`Boundary vertex ${i + 1}`}
                cx={preview?.outer[i][0] ?? p[0]}
                cy={preview?.outer[i][1] ?? p[1]}
                r={scale * 6}
                fill="#f59e0b"
                stroke="white"
                strokeWidth={scale}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  vertex.current = {
                    roomId: selectedId!,
                    index: i,
                    footprint: structuredClone(
                      twin.rooms.find((r) => r.id === selectedId)!.footprint,
                    ),
                  };
                  svg.current!.setPointerCapture(e.pointerId);
                }}
              />
            ))}
      </svg>
      <p className="text-xs text-slate-500 mt-2">
        {twin.frame.scaleToMeters === null
          ? "Uncalibrated source units. Metric geometry requires calibration."
          : "Metres in the local X/Z plane."}{" "}
        Drag the background to pan; select geometry to inspect its source.
      </p>
    </div>
  );
}
