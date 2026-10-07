import { API_URL } from "@/config/api";
import type {
  CanonicalTwinV1,
  Correction,
  TwinIssue,
} from "@aether/twin-schema";

export interface RevisionRecord {
  id: string;
  canonical: CanonicalTwinV1;
  state: string;
  canonicalSha256: string;
}
export interface TwinStatus {
  draftRevisionId?: string;
  approvedRevisionId?: string;
  sourceAssetId?: string;
  jobs: {
    id: string;
    stage: string;
    failure?: { message: string };
    issueCounts: Record<string, number>;
  }[];
  revisions: { id: string; state: string; createdAt: string }[];
}
export function twinClient(
  token: string,
  tenantId: string,
  projectId: string,
  floorplanId: string,
) {
  const base = `/canonical/projects/${encodeURIComponent(projectId)}/floorplans/${encodeURIComponent(floorplanId)}`;
  async function request<T>(
    route: string,
    body?: unknown,
    form?: FormData,
  ): Promise<T> {
    const res = await fetch(`${API_URL}${base}${route}`, {
      method: body !== undefined || form ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
        ...(!form ? { "Content-Type": "application/json" } : {}),
      },
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        typeof data.message === "string" ? data.message : JSON.stringify(data),
      );
    return data;
  }
  return {
    status: () => request<TwinStatus>(""),
    revision: (id: string) => request<RevisionRecord>(`/revisions/${id}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append("plan", file);
      return request("/source", undefined, form);
    },
    correct: (baseRevisionId: string, commands: Correction[]) =>
      request<RevisionRecord>("/corrections", { baseRevisionId, commands }),
    reprocess: (baseRevisionId: string, config: Record<string, unknown>) =>
      request("/reprocess", { baseRevisionId, config }),
    validate: (baseRevisionId: string) =>
      request<{ canApprove: boolean; issues: TwinIssue[] }>("/validate", {
        baseRevisionId,
      }),
    approve: (baseRevisionId: string) =>
      request<RevisionRecord>("/approve", { baseRevisionId }),
    cancel: (id: string) => request(`/jobs/${id}/cancel`, {}),
    download: async (id: string) => {
      const res = await fetch(`${API_URL}${base}/sources/${id}`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
      });
      if (!res.ok) throw new Error("Source download failed");
      return res.blob();
    },
  };
}
