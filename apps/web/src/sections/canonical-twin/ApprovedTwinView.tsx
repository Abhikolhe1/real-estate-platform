"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { assertCanonicalTwin, CanonicalTwinV1 } from "@aether/twin-schema";
import { API_URL } from "@/config/api";
import PropertyExperience from "@/components/property-viewer/PropertyExperience";

/** A private consumer obtains only the floorplan's explicit approved pointer. */
export default function ApprovedTwinView() {
  const params = useSearchParams(),
    projectId = params.get("projectId") || "",
    floorplanId = params.get("floorplanId") || "";
  const [identity, setIdentity] = useState<{
      token: string;
      tenantId: string;
    } | null>(null),
    [twin, setTwin] = useState<CanonicalTwinV1 | null>(null);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("aether-viewer-session");
      if (saved) setIdentity(JSON.parse(saved));
    } catch {
      sessionStorage.removeItem("aether-viewer-session");
    }
  }, []);
  useEffect(() => {
    if (!identity || !projectId || !floorplanId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setTwin(null);
    fetch(
      `${API_URL}/canonical/projects/${encodeURIComponent(projectId)}/floorplans/${encodeURIComponent(floorplanId)}/approved`,
      {
        headers: {
          Authorization: `Bearer ${identity.token}`,
          "x-tenant-id": identity.tenantId,
        },
        signal: controller.signal,
        cache: "no-store",
      },
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            typeof data.message === "string"
              ? data.message
              : "Approved floor is unavailable",
          );
        setTwin(assertCanonicalTwin(data.canonical, true));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [identity, projectId, floorplanId]);
  const sources = useMemo(
    () =>
      twin
        ? [
            {
              id: `canonical:${twin.revision.id}`,
              projectId,
              name: twin.building.name,
              modelUrl: "",
              canonical: twin,
            },
          ]
        : [],
    [twin, projectId],
  );
  if (twin)
    return (
      <main className="h-screen flex flex-col bg-slate-950">
        <div className="px-4 py-2 text-xs text-white flex justify-between">
          <span>Approved floor · Revision {twin.revision.id}</span>
          <button
            onClick={() => {
              sessionStorage.removeItem("aether-viewer-session");
              setIdentity(null);
              setTwin(null);
            }}
          >
            Sign out
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <PropertyExperience models={sources} projectId={projectId} />
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="max-w-md w-full rounded-xl bg-white border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Approved floor viewer</h1>
        {!projectId || !floorplanId ? (
          <p>Open an approved floor from Validation Studio.</p>
        ) : !identity ? (
          <>
            <p>Sign in with your project account to view this floor.</p>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError("");
                try {
                  const data = new FormData(e.currentTarget);
                  const res = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: data.get("email"),
                      password: data.get("password"),
                    }),
                  });
                  const body = await res.json();
                  if (!res.ok)
                    throw new Error(body.message || "Sign in failed");
                  const auth = {
                    token: body.accessToken,
                    tenantId: body.user.tenantId,
                  };
                  if (!auth.token || !auth.tenantId)
                    throw new Error("This account has no project access");
                  sessionStorage.setItem(
                    "aether-viewer-session",
                    JSON.stringify(auth),
                  );
                  setIdentity(auth);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Sign in failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <label className="block">
                Email
                <input
                  name="email"
                  aria-label="Email"
                  required
                  type="email"
                  autoComplete="username"
                  className="block border p-2 w-full"
                />
              </label>
              <label className="block">
                Password
                <input
                  name="password"
                  aria-label="Password"
                  required
                  type="password"
                  autoComplete="current-password"
                  className="block border p-2 w-full"
                />
              </label>
              <button
                className="rounded bg-slate-900 text-white p-2 w-full"
                disabled={loading}
              >
                Sign in
              </button>
            </form>
          </>
        ) : (
          <p>
            {loading ? "Loading approved floor…" : "No approved floor loaded."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
