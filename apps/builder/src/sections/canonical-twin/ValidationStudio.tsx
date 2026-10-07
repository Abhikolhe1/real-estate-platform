"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useAuthStore } from "@/store/authStore";
import { useCanonicalValidationStore } from "@/store/canonicalValidationStore";
import { API_URL } from "@/config/api";
import { twinClient, TwinStatus } from "@/api/canonical-twins";
import { SourceOverlay } from "./SourceOverlay";
import { ObjectInspector } from "./ObjectInspector";
import { CalibrationPanel } from "./CalibrationPanel";
import { IssuesPanel } from "./IssuesPanel";

type Resource = { id: string; name: string };
export default function ValidationStudio() {
  const { token, user } = useAuthStore(),
    tenant = user?.tenantId || "";
  const [projects, setProjects] = useState<Resource[]>([]),
    [floors, setFloors] = useState<Resource[]>([]);
  const [projectId, setProjectId] = useState(""),
    [floorId, setFloorId] = useState("");
  const [status, setStatus] = useState<TwinStatus | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const { revision, commands, selectedId, load, queue, undo, clear, select } =
    useCanonicalValidationStore();
  const followDraft = useRef(true);
  const client = useMemo(
    () => twinClient(token || "", tenant, projectId, floorId),
    [token, tenant, projectId, floorId],
  );
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenant,
      "Content-Type": "application/json",
    }),
    [token, tenant],
  );
  const task = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }, []);
  const refresh = useCallback(async () => {
    const s = await client.status();
    setStatus(s);
    return s;
  }, [client]);
  useEffect(() => {
    const controller = new AbortController();
    if (token)
      fetch(`${API_URL}/projects`, { headers, signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error("Could not load projects");
          setProjects(await r.json());
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    return () => controller.abort();
  }, [token, headers]);
  useEffect(() => {
    setFloorId("");
    setStatus(null);
    clear();
    if (!projectId) return;
    const controller = new AbortController();
    fetch(`${API_URL}/floorplans?projectId=${encodeURIComponent(projectId)}`, {
      headers,
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load floorplans");
        const list = await r.json();
        setFloors(
          list.filter((f: { projectId: string }) => f.projectId === projectId),
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [projectId, headers, clear]);
  useEffect(() => {
    clear();
    setStatus(null);
    followDraft.current = true;
    if (!floorId) return;
    let stopped = false;
    const poll = async () => {
      try {
        const s = await client.status();
        if (stopped) return;
        setStatus(s);
        const current = useCanonicalValidationStore.getState();
        if (
          followDraft.current &&
          s.draftRevisionId &&
          current.revision?.revision.id !== s.draftRevisionId &&
          !current.commands.length
        ) {
          const r = await client.revision(s.draftRevisionId);
          if (!stopped) load(r.canonical);
        }
      } catch (e) {
        if (!stopped)
          setError(e instanceof Error ? e.message : "Status unavailable");
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [floorId, client, load, clear]);
  const reconstruct = (config: Record<string, unknown>) =>
    void task(async () => {
      if (!revision) return;
      if (commands.length)
        throw new Error("Save or discard queued edits before reconstructing");
      await client.reprocess(revision.revision.id, config);
      await refresh();
      setMessage("Reconstruction queued. Previous approval remains available.");
    });
  const blockers =
    revision?.issues.filter((i) => i.severity === "blocking" && !i.resolved)
      .length || 0;
  const active = status?.jobs.some((j) =>
    ["queued", "reconstructing"].includes(j.stage),
  );
  return (
    <main className="p-6 max-w-[1800px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">DXF Validation Studio</h1>
        <p className="text-slate-600 mt-1">
          Upload one floor, compare its source drawing, review geometry and
          approve a revision for the 3D viewer.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap items-end">
        <label>
          Project
          <select
            aria-label="Project"
            className="block border rounded p-2"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={busy || commands.length > 0}
          >
            <option value="">Choose project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Floorplan
          <select
            aria-label="Floorplan"
            className="block border rounded p-2"
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            disabled={busy || commands.length > 0}
          >
            <option value="">Choose floorplan</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            void task(async () => {
              const name = String(new FormData(form).get("name"));
              const r = await fetch(`${API_URL}/floorplans`, {
                method: "POST",
                headers,
                body: JSON.stringify({ projectId, name }),
              });
              if (!r.ok) throw new Error("Could not create floorplan");
              const data = await r.json();
              const f = data.floorPlan;
              setFloors((fs) => [...fs, f]);
              setFloorId(f.id);
              form.reset();
            });
          }}
        >
          <input
            name="name"
            aria-label="New floorplan name"
            required
            placeholder="New floorplan name"
            className="border rounded p-2"
          />
          <button disabled={!projectId || busy} className="border rounded p-2">
            Create floorplan
          </button>
        </form>
        <label
          className={`rounded border p-2 ${!floorId || busy || active ? "opacity-50" : ""}`}
        >
          Upload DXF
          <input
            aria-label="DXF file"
            className="block text-sm"
            type="file"
            accept=".dxf"
            disabled={!floorId || busy || active || commands.length > 0}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void task(async () => {
                  if (file.size > 10 * 1024 * 1024)
                    throw new Error("DXF must be at most 10 MiB");
                  await client.upload(file);
                  await refresh();
                  setMessage("Source saved and reconstruction queued.");
                });
            }}
          />
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-slate-600">
          {message}
        </p>
      )}
      {status && (
        <section
          className="border rounded-lg p-3 text-sm space-y-2"
          aria-label="Processing status"
        >
          <p>
            Draft: {status.draftRevisionId || "none"} | Approved:{" "}
            {status.approvedRevisionId || "none"}
          </p>
          {status.jobs.slice(0, 5).map((j) => (
            <p key={j.id}>
              Job {j.id.slice(0, 8)}: <b>{j.stage.replaceAll("_", " ")}</b>{" "}
              {j.failure?.message}
              {["queued", "reconstructing"].includes(j.stage) && (
                <button
                  className="ml-3 underline"
                  onClick={() =>
                    void task(async () => {
                      await client.cancel(j.id);
                      await refresh();
                    })
                  }
                >
                  Cancel
                </button>
              )}
            </p>
          ))}
          <label>
            Revision history
            <select
              aria-label="Revision history"
              className="border ml-2 p-1"
              value={revision?.revision.id || ""}
              disabled={busy || commands.length > 0}
              onChange={(e) =>
                void task(async () => {
                  followDraft.current =
                    e.target.value === status.draftRevisionId;
                  const r = await client.revision(e.target.value);
                  load(r.canonical);
                })
              }
            >
              <option value="">Choose revision</option>
              {status.revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.state} / {new Date(r.createdAt).toLocaleString()} /{" "}
                  {r.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          {status.approvedRevisionId && (
            <a
              className="ml-4 underline"
              href={`${process.env.NEXT_PUBLIC_VIEWER_URL || "http://localhost:3000"}/twin?projectId=${encodeURIComponent(projectId)}&floorplanId=${encodeURIComponent(floorId)}`}
              target="_blank"
              rel="noreferrer"
            >
              View approved floor
            </a>
          )}
          {(revision?.source.assetId || status.sourceAssetId) && (
            <button
              className="ml-4 underline"
              onClick={() =>
                void task(async () => {
                  const blob = await client.download(
                    revision?.source.assetId || status.sourceAssetId!,
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "source.dxf";
                  a.click();
                  URL.revokeObjectURL(url);
                })
              }
            >
              Download source
            </button>
          )}
        </section>
      )}
      {revision && (
        <fieldset className="space-y-4" disabled={busy}>
          <div className="flex gap-2 items-center flex-wrap text-sm">
            <b>
              {revision.revision.state.replaceAll("_", " ")} · {blockers}{" "}
              blocking issues · {commands.length} queued edits
            </b>
            <button
              className="border rounded p-2"
              disabled={!commands.length || busy}
              onClick={undo}
            >
              Undo queued edit
            </button>
            <button
              className="border rounded p-2"
              disabled={!commands.length || busy}
              onClick={() => load(revision)}
            >
              Discard edits
            </button>
            <button
              className="border rounded p-2 bg-slate-900 text-white disabled:opacity-40"
              disabled={
                !commands.length ||
                busy ||
                active ||
                status?.draftRevisionId !== revision.revision.id
              }
              onClick={() =>
                void task(async () => {
                  const r = await client.correct(
                    revision.revision.id,
                    commands,
                  );
                  load(r.canonical);
                  await refresh();
                  setMessage("Corrections saved as a new immutable revision.");
                })
              }
            >
              Save corrections
            </button>
            <button
              className="border rounded p-2"
              disabled={busy || commands.length > 0}
              onClick={() =>
                void task(async () => {
                  const r = await client.validate(revision.revision.id);
                  setMessage(
                    r.canApprove
                      ? "Validation passed; revision is ready for approval."
                      : `${r.issues.filter((i) => i.severity === "blocking").length} blocking issues remain.`,
                  );
                })
              }
            >
              Validate revision
            </button>
            <button
              className="rounded p-2 bg-green-700 text-white disabled:opacity-40"
              disabled={
                busy ||
                active ||
                blockers > 0 ||
                commands.length > 0 ||
                status?.draftRevisionId !== revision.revision.id ||
                revision.revision.state === "approved"
              }
              onClick={() =>
                void task(async () => {
                  const r = await client.approve(revision.revision.id);
                  load(r.canonical);
                  await refresh();
                  setMessage(
                    "Revision approved. The viewer now uses this exact revision.",
                  );
                })
              }
            >
              Approve revision
            </button>
          </div>
          {commands.length > 0 && (
            <details>
              <summary>Queued corrections</summary>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(commands, null, 2)}
              </pre>
            </details>
          )}
          <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
            <section className="border rounded-lg p-3 min-w-0">
              <SourceOverlay
                twin={revision}
                selectedId={selectedId}
                onSelect={select}
                queue={queue}
              />
            </section>
            <aside className="border rounded-lg p-4 max-h-[620px] overflow-auto">
              <ObjectInspector
                twin={revision}
                id={selectedId}
                queue={queue}
                reprocess={reconstruct}
              />
            </aside>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <CalibrationPanel
              twin={revision}
              queue={queue}
              reprocess={reconstruct}
            />
            <section className="border rounded-lg p-3">
              <h2 className="font-semibold mb-2">Dimensions and review</h2>
              <p className="text-sm mb-3">
                Default wall thickness: {revision.config.wallThicknessM} m.
                Floor height: {revision.floors[0].heightM} m. Door height: 2.1
                m. Window sill: 0.9 m, height: 1.2 m. These require source
                review.
              </p>
              <button
                className="border rounded p-2 text-sm"
                onClick={() =>
                  queue({
                    type: "AcceptDefaults",
                    reason:
                      "Reviewed inferred wall, floor, slab and opening dimensions against source",
                  })
                }
              >
                Accept reviewed default dimensions
              </button>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  queue({
                    type: "SetFloorHeight",
                    targetId: revision.floors[0].id,
                    value: Number(new FormData(e.currentTarget).get("height")),
                    reason: "Corrected floor height against source",
                  });
                }}
              >
                <input
                  aria-label="Floor height"
                  name="height"
                  type="number"
                  min="1.81"
                  max="20"
                  step=".01"
                  defaultValue={revision.floors[0].heightM}
                  className="border p-2 min-w-0"
                />
                <button>Queue floor height</button>
              </form>
            </section>
          </div>
          <h2 className="font-semibold">Validation issues</h2>
          <IssuesPanel twin={revision} select={select} queue={queue} />
        </fieldset>
      )}
    </main>
  );
}
