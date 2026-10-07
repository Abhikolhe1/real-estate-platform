"use client";
import React, { useEffect, useState } from "react";
import type { CanonicalTwinV1, Correction } from "@aether/twin-schema";

export function ObjectInspector({
  twin,
  id,
  queue,
  reprocess,
}: {
  twin: CanonicalTwinV1;
  id: string | null;
  queue: (c: Correction) => void;
  reprocess: (config: Record<string, unknown>) => void;
}) {
  const room = twin.rooms.find((r) => r.id === id),
    wall = twin.walls.find((w) => w.id === id),
    opening = twin.openings.find((o) => o.id === id),
    source = twin.sourceEntities.find((e) => e.id === id);
  const obj = room || wall || opening || source;
  const [value, setValue] = useState(""),
    [reason, setReason] = useState("Reviewed against source drawing");
  const [error, setError] = useState("");
  useEffect(() => {
    setValue(
      room
        ? room.name
        : wall
          ? String(wall.thicknessM)
          : opening
            ? JSON.stringify(
                {
                  hostWallId: opening.hostWallId,
                  startOffsetM: opening.startOffsetM,
                  widthM: opening.widthM,
                  heightM: opening.heightM,
                  sillM: opening.sillM,
                  kind: opening.kind,
                },
                null,
                2,
              )
            : "",
    );
    setError("");
  }, [room, wall, opening]);
  const command = (type: string, value?: unknown) => {
    if (!reason.trim()) {
      setError("A review reason is required");
      return;
    }
    queue({ type, targetId: id || undefined, value, reason });
    setError("");
  };
  if (!obj)
    return (
      <p className="text-sm text-slate-500">
        Select a room, wall, opening or source entity.
      </p>
    );
  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-semibold">
        {room
          ? "Room"
          : wall
            ? "Wall"
            : opening
              ? opening.kind
              : "Source entity"}
      </h2>
      <p className="break-all text-xs">
        Object: {obj.id}
        <br />
        Revision: {twin.revision.id}
        <br />
        Asset: {twin.source.assetId}
      </p>
      {"evidence" in obj && (
        <p>
          {obj.evidence.method} · {obj.evidence.reviewState} · confidence{" "}
          {obj.evidence.confidence ?? "not scored"}
        </p>
      )}
      {obj.sourceRefs.map((r, i) => (
        <p key={i} className="text-xs break-all">
          Handle {r.handle || "none"} · {r.layer} · {r.entityType}
          <br />
          Block path: {r.instancePath.join(" / ") || "modelspace"}
        </p>
      ))}
      <label className="block">
        Review reason
        <input
          aria-label="Review reason"
          className="border p-2 w-full"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {room && (
        <>
          <label>
            Room name
            <input
              aria-label="Room name"
              className="border p-2 w-full"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <button onClick={() => command("RenameRoom", value)}>
            Queue rename
          </button>
          <details>
            <summary>Edit vertices in metres</summary>
            <textarea
              aria-label="Room footprint"
              className="border w-full h-32 font-mono text-xs"
              defaultValue={JSON.stringify(room.footprint, null, 2)}
              key={room.id}
              onBlur={(e) => {
                try {
                  const fp = JSON.parse(e.target.value);
                  if (JSON.stringify(fp) !== JSON.stringify(room.footprint))
                    command("AdjustRoomBoundary", fp);
                } catch {
                  setError("Footprint must be valid JSON with outer and holes");
                }
              }}
            />
          </details>
          <label>
            Merge with
            <select
              aria-label="Merge with room"
              className="border w-full"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) command("MergeRooms", e.target.value);
              }}
            >
              <option value="">Choose adjacent room</option>
              {twin.rooms
                .filter((r) => r.id !== room.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
          <details>
            <summary>Split by a line</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                try {
                  command("SplitRoom", JSON.parse(String(form.get("line"))));
                } catch {
                  setError("Use [[x,z],[x,z]] for the split line");
                }
              }}
            >
              <input
                aria-label="Split line"
                name="line"
                placeholder="[[2,-1],[2,5]]"
                className="border p-2 w-full"
              />
              <button>Queue split</button>
            </form>
          </details>
        </>
      )}
      {wall && (
        <>
          <label>
            Thickness (metres)
            <input
              aria-label="Wall thickness"
              type="number"
              step=".01"
              className="border p-2 w-full"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <button onClick={() => command("SetWallThickness", Number(value))}>
            Queue thickness
          </button>
          <p className="text-xs">
            To remove invalid wall linework, select its source entity and ignore
            it, then reconstruct.
          </p>
        </>
      )}
      {opening && (
        <>
          <label>
            Host and opening dimensions
            <textarea
              aria-label="Opening dimensions"
              className="border w-full h-40 font-mono text-xs"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <button
            onClick={() => {
              try {
                command("AdjustOpeningSpan", JSON.parse(value));
              } catch {
                setError("Opening dimensions must be valid JSON");
              }
            }}
          >
            Queue opening edit
          </button>
          <button className="ml-3" onClick={() => command("RejectOpening")}>
            Reject opening
          </button>
          <p className="text-xs break-all">
            Wall choices: {twin.walls.map((w) => w.id).join(", ")}
          </p>
        </>
      )}
      {source && (
        <>
          <p>Role: {source.role}</p>
          <button
            onClick={() =>
              reprocess({
                ignoredSourceIds: [
                  ...new Set([
                    ...(twin.config.ignoredSourceIds || []),
                    source.id,
                  ]),
                ],
              })
            }
          >
            Ignore source entity and reconstruct
          </button>
          {(source.role === "doors" || source.role === "windows") && (
            <details>
              <summary>Assign unresolved opening</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const data = new FormData(e.currentTarget);
                    command(
                      "AssignSourceOpening",
                      JSON.parse(String(data.get("opening"))),
                    );
                  } catch {
                    setError("Opening must be valid JSON");
                  }
                }}
              >
                <textarea
                  name="opening"
                  aria-label="Source opening assignment"
                  className="border w-full h-36 text-xs"
                  defaultValue={JSON.stringify(
                    {
                      hostWallId: twin.walls[0]?.id || "",
                      kind: source.role === "doors" ? "door" : "window",
                      startOffsetM: 0,
                      widthM: 1,
                      heightM: 2.1,
                      sillM: 0,
                    },
                    null,
                    2,
                  )}
                />
                <button>Queue assignment</button>
              </form>
            </details>
          )}
        </>
      )}
      {"evidence" in obj && (
        <button onClick={() => command("AcceptCandidate")}>
          Accept candidate
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
